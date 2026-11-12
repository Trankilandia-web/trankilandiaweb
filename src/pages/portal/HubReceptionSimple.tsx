import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  QrCode,
  CalendarClock,
  UserPlus,
  ShoppingCart,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertCircle,
  Clock,
  MessageCircle,
  CreditCard,
  Plus,
  Minus,
  Sun,
  Sunset,
  Moon,
  IdCard,
  X,
  UserCheck,
  BadgePercent,
  Sparkles,
  Lock,
  Barcode,
} from 'lucide-react';
import PortalHeader from '../../components/portal/PortalHeader';
import MemberProfileModal from '../../components/portal/MemberProfileModal';
import {
  fetchSociosParaRecepcion,
  cargarAsistenciasActivas90Min,
  registerGymMember,
  obtenerProductosInventario,
  updateMemberProfile,
  payMemberBalance,
  deduplicarAsistenciasActivas,
  AsistenciaActiva,
  subscribeToGymRealtime,
  procesarColaAsistenciasOffline,
  procesarColaVentasOffline,
  buscarProductoPorCodigo,
  vincularCodigoBarrasAProducto,
} from '../../lib/supabaseDb';
import { GymMember, getStoredMembers, saveStoredMembers, generateNextMemberId } from '../../data/gymStore';
import { getStoredCatalogPlans, fetchPlansFromSupabase, CatalogPlanOption } from '../../data/plansStore';
import { extraerDniPeru } from '../../lib/dniParser';
import { getActiveStaffSession } from '../../lib/staffStore';
import {
  getLocalPeruDateString,
  calculateDaysRemaining,
  addDaysToLocalPeruDate,
} from '../../lib/dateUtils';
import { usePosCashier } from '../../hooks/usePosCashier';
import { useMemberAttendance } from '../../hooks/useMemberAttendance';
import { playGymAlert } from '../../lib/audioVoiceAlerts';

export default function HubReceptionSimple() {
  const [activeTab, setActiveTab] = useState<'acceso' | 'crm' | 'inscripcion' | 'pos'>('acceso');

  // Estado general de datos
  const [members, setMembers] = useState<GymMember[]>([]);
  const [asistencias, setAsistencias] = useState<AsistenciaActiva[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseConnected, setSupabaseConnected] = useState(true);

  // Hook modular: Escáner de Acceso y Asistencia de Socios (con control estricto de aforo y duplicados)
  const {
    scanInput,
    setScanInput,
    lastScannedSocio,
    setLastScannedSocio,
    lastScanStatus,
    lastScanMessage,
    scanInputRef,
    procesarQuery,
    procesarSocioDirecto,
  } = useMemberAttendance({ members, asistencias, setAsistencias });

  // Hook modular: Terminal POS y Carrito de Cobro
  const {
    productos,
    setProductos,
    carrito,
    posMetodoPago,
    setPosMetodoPago,
    posSuccessMsg,
    subtotalCarrito,
    descuentoMonto,
    setDescuentoMonto,
    descuentoMotivo,
    setDescuentoMotivo,
    totalCarrito,
    isProcessing: isPosProcessing,
    agregarAlCarrito,
    modificarCantidad,
    procesarVentaPOS,
  } = usePosCashier();

  // Modal de Gestión Integral de Socio (Editar nombres con números, DNI, teléfono, plan)
  const [socioParaGestionar, setSocioParaGestionar] = useState<GymMember | null>(null);
  const [gestionSuccessMsg, setGestionSuccessMsg] = useState<string | null>(null);

  // Selector de fecha de inicio para inscripciones
  const [tipoInicio, setTipoInicio] = useState<'hoy' | 'manana' | 'personalizado'>('hoy');
  const [fechaInicioManual, setFechaInicioManual] = useState<string>(getLocalPeruDateString());
  const [mesesDuracionPlan, setMesesDuracionPlan] = useState<number>(1);

  // Estado para desplegar el formulario de descuento en POS
  const [showDescuentoForm, setShowDescuentoForm] = useState(false);

  // CRM & Vencimientos
  const [crmFilter, setCrmFilter] = useState<'todos' | 'vencidos' | 'por_vencer' | 'deudas'>('todos');
  const [crmSearch, setCrmSearch] = useState('');

  // Estados para Liquidación de Deudas en CRM y Escáner
  const [liquidatingMember, setLiquidatingMember] = useState<GymMember | null>(null);
  const [montoCobroDeuda, setMontoCobroDeuda] = useState<number>(0);
  const [metodoPagoDeuda, setMetodoPagoDeuda] = useState<'efectivo' | 'yape'>('efectivo');
  const [isLiquidating, setIsLiquidating] = useState<boolean>(false);
  const [deudaSuccessMsg, setDeudaSuccessMsg] = useState<string | null>(null);

  // Nueva Inscripción / Renovación
  const [formDni, setFormDni] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formPlan, setFormPlan] = useState('Plan Libre Mensual (Adulto)');
  const [formPrecio, setFormPrecio] = useState(80);
  const [formTurno, setFormTurno] = useState<'manana' | 'tarde' | 'noche'>('manana');
  const [formMetodoPago, setFormMetodoPago] = useState<'efectivo' | 'yape' | 'plin' | 'tarjeta'>('efectivo');
  const [formTipoPago, setFormTipoPago] = useState<'full' | 'adelanto'>('full');
  const [formAdelanto, setFormAdelanto] = useState(80);
  const [formIsRenewal, setFormIsRenewal] = useState(false);
  const [formDniLocked, setFormDniLocked] = useState(false);
  const [formSuccessMsg, setFormSuccessMsg] = useState<string | null>(null);
  const [formCreatedMember, setFormCreatedMember] = useState<GymMember | null>(null);
  const [isSavingSocio, setIsSavingSocio] = useState(false);

  // Catálogo de Planes Categorizado
  const [catalogPlans, setCatalogPlans] = useState<CatalogPlanOption[]>(getStoredCatalogPlans);
  const [catalogCategory, setCatalogCategory] = useState<'todos' | '1mes' | 'promociones' | 'diario' | 'personalizado'>('todos');

  // Módulo de Promoción y Membresía Personalizada (Meses y Precio Libre)
  const [customPromoMeses, setCustomPromoMeses] = useState<number>(8);
  const [customPromoPrecio, setCustomPromoPrecio] = useState<number>(300);
  const [customPromoNombre, setCustomPromoNombre] = useState<string>('Promo Personalizada (8 Meses)');
  const [isCustomPlanApplied, setIsCustomPlanApplied] = useState<boolean>(false);

  // Búsqueda interactiva y escaneo rápido en la pestaña POS
  const [posSearchQuery, setPosSearchQuery] = useState<string>('');
  const posSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleUpdate = () => setCatalogPlans(getStoredCatalogPlans());
    window.addEventListener('gym-plans-updated', handleUpdate);
    return () => window.removeEventListener('gym-plans-updated', handleUpdate);
  }, []);

  const planesFiltrados = useMemo(() => {
    if (catalogCategory === '1mes') return catalogPlans.filter((p) => p.months === 1);
    if (catalogCategory === 'promociones') return catalogPlans.filter((p) => p.months > 1);
    if (catalogCategory === 'diario') return catalogPlans.filter((p) => p.months === 0);
    if (catalogCategory === 'personalizado') return [];
    return catalogPlans;
  }, [catalogPlans, catalogCategory]);

  // Modal para Asignar DNI a un socio buscado por nombre
  const [socioParaAsignarDni, setSocioParaAsignarDni] = useState<GymMember | null>(null);
  const [nuevoDniInput, setNuevoDniInput] = useState('');
  const [dniAsignadoSuccess, setDniAsignadoSuccess] = useState<string | null>(null);
  const [dniAsignadoError, setDniAsignadoError] = useState<string | null>(null);
  const [isSavingDni, setIsSavingDni] = useState(false);

  const handleGuardarNuevoDni = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socioParaAsignarDni) return;
    const clean = extraerDniPeru(nuevoDniInput) || nuevoDniInput.replace(/\D/g, '').slice(0, 8);
    if (!clean || clean.length !== 8) {
      setDniAsignadoError('El DNI debe tener exactamente 8 dígitos numéricos.');
      return;
    }

    // Verificar que otro socio no tenga ya este DNI
    const conflict = members.find((m) => m.id !== socioParaAsignarDni.id && m.dni && m.dni.trim() === clean);
    if (conflict) {
      setDniAsignadoError(`El DNI ${clean} ya pertenece al socio ${conflict.name}.`);
      return;
    }

    setIsSavingDni(true);
    setDniAsignadoError(null);
    try {
      const updatedList = await updateMemberProfile(socioParaAsignarDni.id, {
        dni: clean,
        email: `${clean}@socio.trankilandia.pe`,
      });
      setMembers(updatedList);
      if (lastScannedSocio && lastScannedSocio.id === socioParaAsignarDni.id) {
        setLastScannedSocio((prev) => (prev ? { ...prev, dni: clean } : null));
      }
      setDniAsignadoSuccess(`DNI ${clean} asignado a ${socioParaAsignarDni.name}. Ya puede ingresar a la web.`);
      setTimeout(() => {
        setSocioParaAsignarDni(null);
        setNuevoDniInput('');
        setDniAsignadoSuccess(null);
      }, 1500);
    } catch {
      setDniAsignadoError('Error al guardar el DNI en la base de datos.');
    } finally {
      setIsSavingDni(false);
    }
  };

  // 1. CARGA INICIAL DE DATOS DESDE SUPABASE
  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const [sociosSupabase, asistenciasSupabase, prodsSupabase] = await Promise.all([
        fetchSociosParaRecepcion(),
        cargarAsistenciasActivas90Min(),
        obtenerProductosInventario(),
        fetchPlansFromSupabase(),
      ]);

      // Refrescar catálogo sincronizado con Supabase
      setCatalogPlans(getStoredCatalogPlans());

      if (sociosSupabase && sociosSupabase.length > 0) {
        // Mapear a GymMember local
        const mappedMembers: GymMember[] = sociosSupabase.map((s) => ({
          id: s.id,
          name: s.nombre,
          dni: s.dni,
          phone: s.celular || '',
          email: s.email || `${s.dni || 'socio'}@cliente.trankilandia.pe`,
          plan: s.plan,
          planPrice: s.precio_plan,
          paymentType: s.tipo_pago,
          advancePaid: s.adelanto_pagado,
          balanceDue: s.saldo_pendiente,
          paymentDueDate: s.fecha_limite_pago || undefined,
          paymentMethod: 'efectivo',
          receiptNumber: s.numero_boleta || 'B001-000417',
          membershipStatus: s.estado_calculado === 'vencido' ? 'inactive' : 'active',
          expiresAt: s.fecha_fin,
          coachName: s.coach_asignado,
          shift: s.turno,
          registeredAt: getLocalPeruDateString(),
        }));
        setMembers(mappedMembers);
        saveStoredMembers(mappedMembers);
        setSupabaseConnected(true);
      } else {
        setMembers(getStoredMembers());
      }

      setAsistencias(asistenciasSupabase || []);
      setProductos(prodsSupabase || []);
    } catch {
      setMembers(getStoredMembers());
      setSupabaseConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();

    // Suscripción Realtime con desuscripción estricta en unmount para evitar memory leaks
    const unsubscribe = subscribeToGymRealtime({
      onAsistenciasChange: (payload) => {
        if (payload?.new) {
          const item = payload.new as AsistenciaActiva;
          const umbral = Date.now() - 90 * 60 * 1000;
          const itemTime = new Date(item.fecha_ingreso).getTime();
          if (isNaN(itemTime) || itemTime >= umbral) {
            setAsistencias((prev) => deduplicarAsistenciasActivas([item, ...prev]));
          }
        }
      },
    });

    const handleProductsUpdated = async () => {
      try {
        const prods = await obtenerProductosInventario();
        setProductos(prods);
      } catch {}
    };
    window.addEventListener('gym-products-updated', handleProductsUpdated);

    return () => {
      unsubscribe();
      window.removeEventListener('gym-products-updated', handleProductsUpdated);
    };
  }, []);

  // Purga periódica (cada 60s) de la ventana deslizante de 90 minutos para aforo en tiempo real sin nombres duplicados
  useEffect(() => {
    const intervalId = setInterval(() => {
      setAsistencias((prev) => deduplicarAsistenciasActivas(prev));
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Lista deduplicada en memo de atletas en sala para garantizar 0 nombres repetidos
  const asistenciasActivasDeduplicadas = useMemo(() => {
    return deduplicarAsistenciasActivas(asistencias);
  }, [asistencias]);

  // Sincronización automática de colas offline (asistencias y ventas POS)
  useEffect(() => {
    const sincronizarColas = async () => {
      try {
        await Promise.all([
          procesarColaAsistenciasOffline(),
          procesarColaVentasOffline(),
        ]);
      } catch (err) {
        console.warn('[HubReceptionSimple] Error sincronizando colas offline:', err);
      }
    };

    // Sincronizar al montar
    sincronizarColas();

    window.addEventListener('online', sincronizarColas);
    return () => {
      window.removeEventListener('online', sincronizarColas);
    };
  }, []);

  // Mantener el foco automático en el buscador de escaneo
  useEffect(() => {
    if (activeTab === 'acceso' && scanInputRef.current) {
      scanInputRef.current.focus();
    } else if (activeTab === 'pos' && posSearchInputRef.current) {
      posSearchInputRef.current.focus();
    }
  }, [activeTab]);

  // Escáner Global Continuo (Detección de ráfaga de pistola láser en cualquier pestaña)
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Notificación de Escáner en Punto de Venta (POS)
  const [posScannerNotice, setPosScannerNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Código de barras escaneado no vinculado para asignación en 1 toque
  const [unlinkedBarcode, setUnlinkedBarcode] = useState<string | null>(null);

  /**
   * Enrutador Inteligente de Códigos de Barras:
   * - 8 caracteres numéricos exactos -> DNI de Socio (Marca Ingreso / Acceso)
   * - 12 o 13 caracteres numéricos exactos -> Código EAN/UPC de Producto (Agrega a POS)
   * - Soporte para QR / PDF417 de DNI electrónico y SKU alfanuméricos
   */
  const procesarCodigoEscaneado = useCallback(
    async (rawCode: string) => {
      const code = rawCode.trim();
      if (!code) return;

      // REGLA 1: Exactamente 8 caracteres numéricos -> ES UN DNI (Ingreso de Socio)
      const esDni8 = /^\d{8}$/.test(code);

      // REGLA 2: Exactamente 12 o 13 caracteres numéricos -> ES UN PRODUCTO (Caja / POS)
      const esProducto12o13 = /^(\d{12}|\d{13})$/.test(code);

      if (esProducto12o13) {
        // Enrutamiento automático a pestaña POS
        setActiveTab('pos');

        const targetProd = buscarProductoPorCodigo(productos, code);

        if (targetProd) {
          agregarAlCarrito(targetProd);
          playGymAlert('producto_pos');
          setUnlinkedBarcode(null);
          setPosScannerNotice({
            type: 'success',
            text: `Producto agregado: ${targetProd.nombre} (S/. ${Number(targetProd.precio_venta || 0).toFixed(2)})`,
          });
          setTimeout(() => setPosScannerNotice(null), 4000);
        } else {
          playGymAlert('producto_no_encontrado');
          setUnlinkedBarcode(code);
          setPosScannerNotice({
            type: 'error',
            text: `Código de barras "${code}" (12/13 dígitos) no vinculado. Selecciona abajo a qué producto corresponde para asignarlo en 1 toque.`,
          });
          setTimeout(() => setPosScannerNotice(null), 8000);
        }
        return;
      }

      if (esDni8) {
        // Enrutamiento automático a Control de Acceso
        setActiveTab('acceso');
        await procesarQuery(code);
        return;
      }

      // Fallback 1: DNI Electrónico (PDF417)
      const dniExtraido = extraerDniPeru(code);
      if (dniExtraido && /^\d{8}$/.test(dniExtraido)) {
        setActiveTab('acceso');
        await procesarQuery(dniExtraido);
        return;
      }

      // Fallback 2: Producto por SKU o coincidencia por código/marca
      const prodPorSku = buscarProductoPorCodigo(productos, code);
      if (prodPorSku) {
        setActiveTab('pos');
        agregarAlCarrito(prodPorSku);
        playGymAlert('producto_pos');
        setUnlinkedBarcode(null);
        setPosScannerNotice({
          type: 'success',
          text: `Producto agregado: ${prodPorSku.nombre} (S/. ${Number(prodPorSku.precio_venta || 0).toFixed(2)})`,
        });
        setTimeout(() => setPosScannerNotice(null), 4000);
        return;
      }

      // Fallback 3: Búsqueda general en acceso
      setActiveTab('acceso');
      await procesarQuery(code);
    },
    [productos, agregarAlCarrito, procesarQuery]
  );

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = scanInput.trim();
    if (!query) return;

    if (/^(\d{12}|\d{13})$/.test(query)) {
      await procesarCodigoEscaneado(query);
      setScanInput('');
      return;
    }

    await procesarCodigoEscaneado(query);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const buffer = barcodeBufferRef.current.trim();
        if (buffer.length >= 6) {
          e.preventDefault();
          e.stopPropagation();
          procesarCodigoEscaneado(buffer);
          barcodeBufferRef.current = '';
          return;
        }
        barcodeBufferRef.current = '';
        return;
      }

      if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      const now = performance.now();
      const delta = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Las pistolas láser y escáneres Bluetooth disparan caracteres con ráfagas de hasta 220ms
      if (delta > 220) {
        barcodeBufferRef.current = e.key;
      } else {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [procesarCodigoEscaneado]);

  // Sugerencias de búsqueda en vivo al escribir en el buscador
  const sugerenciasBusqueda = useMemo(() => {
    const q = scanInput.trim().toLowerCase();
    if (q.length < 2) return [];
    return members
      .filter((m) =>
        m.name.toLowerCase().includes(q) ||
        (m.dni && m.dni.includes(q)) ||
        (m.phone && m.phone.includes(q))
      )
      .slice(0, 6);
  }, [members, scanInput]);

  // Cálculo dinámico de fecha de inicio y fin para inscripciones
  const fechaInicioSeleccionada = useMemo(() => {
    if (tipoInicio === 'hoy') return getLocalPeruDateString();
    if (tipoInicio === 'manana') return addDaysToLocalPeruDate(1);
    return fechaInicioManual || getLocalPeruDateString();
  }, [tipoInicio, fechaInicioManual]);

  const fechaFinCalculada = useMemo(() => {
    try {
      if (mesesDuracionPlan === 0) {
        // Pase Diario: Vence el mismo día
        return fechaInicioSeleccionada;
      }
      const base = new Date(fechaInicioSeleccionada + 'T12:00:00');
      base.setMonth(base.getMonth() + mesesDuracionPlan);
      return base.toISOString().split('T')[0];
    } catch {
      return addDaysToLocalPeruDate(mesesDuracionPlan * 30);
    }
  }, [fechaInicioSeleccionada, mesesDuracionPlan]);

  // Previsualización de vencimiento dinámico para la promo personalizada
  const previewCustomFechaFin = useMemo(() => {
    try {
      if (customPromoMeses === 0) {
        return fechaInicioSeleccionada;
      }
      const base = new Date(fechaInicioSeleccionada + 'T12:00:00');
      base.setMonth(base.getMonth() + customPromoMeses);
      return base.toISOString().split('T')[0];
    } catch {
      return addDaysToLocalPeruDate(customPromoMeses * 30);
    }
  }, [fechaInicioSeleccionada, customPromoMeses]);

  // 3. ENVÍO DE MENSAJE DE WHATSAPP CON 1 CLIC
  const enviarWhatsApp = (socio: GymMember) => {
    const phone = (socio.phone || '').replace(/\D/g, '');
    if (!phone || phone.length < 9) {
      alert(`El socio ${socio.name} no cuenta con un celular de 9 dígitos válido.`);
      return;
    }
    const cleanPhone = phone.length === 9 ? `51${phone}` : phone;
    const today = getLocalPeruDateString();
    const exp = socio.expiresAt || today;
    const diffDays = calculateDaysRemaining(exp, today);

    let mensaje = '';
    if (diffDays < 0) {
      mensaje = `Estimado(a) ${socio.name}, le saludamos de Trankilandia Gym. Le informamos cordialmente que su membresía de ${socio.plan} finalizó el ${socio.expiresAt}. Si desea renovar su inscripción, puede responder a este mensaje para coordinar su pago vía Yape o Plin al 999 787 489 o acercarse a nuestra sede en Huamanga. Atentamente, Administración Trankilandia Gym.`;
    } else if (socio.balanceDue > 0) {
      mensaje = `Estimado(a) ${socio.name}, le saludamos cordialmente de Trankilandia Gym. Le recordamos que mantiene un saldo pendiente de S/. ${socio.balanceDue}.00 correspondiente a su membresía. Puede cancelarlo en recepción o mediante Yape o Plin al 999 787 489. Muchas gracias por su atención.`;
    } else {
      mensaje = `Estimado(a) ${socio.name}, le saludamos de Trankilandia Gym. Le recordamos que su membresía finaliza en ${diffDays} días (${socio.expiresAt}). Lo invitamos a renovar con anticipación en recepción para asegurar la continuidad de su entrenamiento. Atentamente, Trankilandia Gym.`;
    }

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  // 4. GESTIÓN DE COBRO Y LIQUIDACIÓN DE DEUDAS
  const iniciarCobroDeuda = (member: GymMember) => {
    setLiquidatingMember(member);
    setMontoCobroDeuda(member.balanceDue);
    setMetodoPagoDeuda('efectivo');
  };

  const handleConfirmarLiquidacionDeuda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liquidatingMember || montoCobroDeuda <= 0 || isLiquidating) return;

    try {
      setIsLiquidating(true);
      const activeStaff = getActiveStaffSession();
      const updatedList = await payMemberBalance(
        liquidatingMember.id,
        metodoPagoDeuda,
        montoCobroDeuda,
        activeStaff?.nombre || 'Recepción'
      );
      setMembers(updatedList);
      saveStoredMembers(updatedList);

      if (lastScannedSocio && lastScannedSocio.id === liquidatingMember.id) {
        setLastScannedSocio((prev) =>
          prev
            ? {
                ...prev,
                saldo_pendiente: Math.max(0, prev.saldo_pendiente - montoCobroDeuda),
                tiene_deuda_activa: prev.saldo_pendiente - montoCobroDeuda > 0,
              }
            : null
        );
      }

      setDeudaSuccessMsg(
        `Cobro de S/. ${montoCobroDeuda.toFixed(2)} registrado exitosamente para ${liquidatingMember.name}. Saldo restante: S/. ${(liquidatingMember.balanceDue - montoCobroDeuda).toFixed(2)}`
      );
      setLiquidatingMember(null);
      setTimeout(() => setDeudaSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Error al procesar el cobro de la deuda.');
    } finally {
      setIsLiquidating(false);
    }
  };

  // 5. INICIAR RENOVACIÓN CON DATOS COMPLETOS Y DNI BLOQUEADO
  const iniciarRenovacionSocio = (socio: any) => {
    const rawDni = socio.dni || '';
    const cleanDni = extraerDniPeru(rawDni) || rawDni.replace(/\D/g, '').slice(0, 8);
    const nombre = socio.nombre || socio.name || '';
    const celular = (socio.celular || socio.phone || '').replace(/\D/g, '').slice(0, 9);
    const planActual = socio.plan || 'Plan Libre Mensual (Adulto)';
    const precioActual = Number(socio.precio_plan || socio.planPrice) || 80;
    const turno = (socio.turno || socio.shift || 'manana') as 'manana' | 'tarde' | 'noche';
    const fechaFinActual = socio.fecha_fin || socio.expiresAt || '';

    // Si aún no vence, inicia al día siguiente de su expiración para continuidad perfecta; si ya venció, inicia hoy
    const today = getLocalPeruDateString();
    let fechaInicioCalculada = today;
    if (fechaFinActual && fechaFinActual >= today) {
      fechaInicioCalculada = addDaysToLocalPeruDate(1, fechaFinActual);
    }

    setFormDni(cleanDni);
    setFormNombre(nombre);
    setFormTelefono(celular);
    setFormPlan(planActual);
    setFormPrecio(precioActual);
    setFormTurno(turno);
    setFormTipoPago('full');
    setFormAdelanto(precioActual);
    setFormIsRenewal(true);
    setFormDniLocked(true); // Bloquear DNI ya que es el identificador oficial de cuenta
    setTipoInicio('personalizado');
    setFechaInicioManual(fechaInicioCalculada);

    const catalog = getStoredCatalogPlans();
    const found = catalog.find((p) => p.name === planActual);
    setMesesDuracionPlan(found?.months ?? 1);

    setActiveTab('inscripcion');
  };

  // 6. INICIAR REGISTRO DE NUEVO SOCIO (EN BLANCO Y DNI DESBLOQUEADO)
  const iniciarNuevoSocio = () => {
    setFormDni('');
    setFormNombre('');
    setFormTelefono('');
    setFormPlan('Plan Libre Mensual (Adulto)');
    setFormPrecio(80);
    setFormTurno('manana');
    setFormTipoPago('full');
    setFormAdelanto(80);
    setFormIsRenewal(false);
    setFormDniLocked(false);
    setTipoInicio('hoy');
    setFechaInicioManual(getLocalPeruDateString());
    setMesesDuracionPlan(1);
    setIsCustomPlanApplied(false);
    setActiveTab('inscripcion');
  };

  // 7. AUTORELLENADO DE FORMULARIO SI EL DNI EXISTE (MODO RENOVACIÓN MANUAL)
  const handleDniChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 8);
    setFormDni(clean);

    if (clean.length === 8) {
      const existing = members.find((m) => m.dni && m.dni.trim() === clean);
      if (existing) {
        setFormNombre(existing.name);
        setFormTelefono(existing.phone || '');
        setFormPlan(existing.plan || 'Plan Libre Mensual (Adulto)');
        setFormPrecio(existing.planPrice || 80);
        setFormTurno((existing.shift as any) || 'manana');
        setFormIsRenewal(true);
        setFormDniLocked(true);
        return;
      } else if (formIsRenewal) {
        // Si venía de una renovación de otro socio y cambió a un DNI nuevo, limpiar campos
        setFormNombre('');
        setFormTelefono('');
        setFormIsRenewal(false);
        setFormDniLocked(false);
      }
    } else {
      if (formIsRenewal) {
        setFormNombre('');
        setFormTelefono('');
        setFormIsRenewal(false);
        setFormDniLocked(false);
      }
    }
  };

  const handlePlanSelect = (nombrePlan: string, precio: number, meses: number = 1) => {
    setFormPlan(nombrePlan);
    setFormPrecio(precio);
    setMesesDuracionPlan(meses);
    setIsCustomPlanApplied(false);
    if (formTipoPago === 'full') {
      setFormAdelanto(precio);
    } else {
      setFormAdelanto((prev) => Math.min(prev, precio));
    }
  };

  const handleCustomMesesChange = (meses: number) => {
    const valid = Math.max(1, Math.min(60, meses));
    setCustomPromoMeses(valid);
    if (!customPromoNombre || customPromoNombre.startsWith('Promo Personalizada')) {
      setCustomPromoNombre(`Promo Personalizada (${valid} Meses)`);
    }
  };

  const handleCustomPrecioChange = (precio: number) => {
    setCustomPromoPrecio(Math.max(0, precio));
  };

  const handleAplicarPromoPersonalizada = () => {
    const nombre = customPromoNombre.trim() || `Promo Personalizada (${customPromoMeses} Meses)`;
    setFormPlan(nombre);
    setFormPrecio(customPromoPrecio);
    setMesesDuracionPlan(customPromoMeses);
    setIsCustomPlanApplied(true);
    if (formTipoPago === 'full') {
      setFormAdelanto(customPromoPrecio);
    } else {
      setFormAdelanto((prev) => Math.min(prev, customPromoPrecio));
    }
  };

  const handleAplicarDescuentoRapido = (precioFinal: number) => {
    const p = Math.max(0, precioFinal);
    setFormPrecio(p);
    if (formTipoPago === 'full') {
      setFormAdelanto(p);
    } else {
      setFormAdelanto((prev) => Math.min(prev, p));
    }
  };

  const handleAplicarDescuentoDelta = (delta: number) => {
    const p = Math.max(0, formPrecio + delta);
    setFormPrecio(p);
    if (formTipoPago === 'full') {
      setFormAdelanto(p);
    } else {
      setFormAdelanto((prev) => Math.min(prev, p));
    }
  };

  // 8. REGISTRAR O RENOVAR SOCIO
  const handleGuardarSocio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingSocio) return;
    const cleanDni = extraerDniPeru(formDni) || formDni.replace(/\D/g, '').slice(0, 8);
    if (!cleanDni || cleanDni.length !== 8 || !formNombre.trim()) {
      alert('Ingresa un DNI de 8 dígitos numéricos y el nombre completo del atleta.');
      return;
    }

    try {
      setIsSavingSocio(true);
      const paid = formTipoPago === 'full' ? formPrecio : Math.min(formAdelanto, formPrecio);
      const balance = Math.max(0, formPrecio - paid);

      const existing = members.find((m) => m.dni && m.dni.trim() === cleanDni);
      const memberId = existing ? existing.id : generateNextMemberId(members);

      const memberToSave: GymMember = {
        id: memberId,
        dni: cleanDni,
        name: formNombre.trim(),
        phone: formTelefono.trim(),
        email: `${cleanDni}@socio.trankilandia.pe`,
        plan: formPlan,
        planPrice: formPrecio,
        paymentType: formTipoPago === 'full' ? 'full' : 'advance',
        advancePaid: paid,
        balanceDue: balance,
        paymentMethod: formMetodoPago,
        receiptNumber: `B001-000${members.length + 515}`,
        membershipStatus: 'active',
        expiresAt: fechaFinCalculada,
        coachName: formTurno === 'manana' ? 'Coach Marcos Rivas' : 'Coach Oficial',
        shift: formTurno,
        registeredAt: fechaInicioSeleccionada,
      };

      // 1. Guardar en Supabase
      try {
        await registerGymMember(memberToSave);
        setSupabaseConnected(true);
      } catch {}

      // 2. Guardar en memoria local
      const updated = [memberToSave, ...members.filter((m) => m.id !== memberId && (!m.dni || m.dni !== cleanDni))];
      setMembers(updated);
      saveStoredMembers(updated);

      setFormCreatedMember(memberToSave);
      const duracionTexto = mesesDuracionPlan === 0 ? 'Pase Diario' : `${mesesDuracionPlan} mes(es)`;
      setFormSuccessMsg(
        formIsRenewal
          ? `¡Membresía de ${memberToSave.name} renovada con éxito por ${duracionTexto}! (Vence: ${fechaFinCalculada})`
          : `¡Socio ${memberToSave.name} registrado con éxito en el sistema! Cuenta activada con DNI ${cleanDni}.`
      );

      // Si fue nuevo socio, resetear formulario para siguiente ingreso
      if (!formIsRenewal) {
        setFormDni('');
        setFormNombre('');
        setFormTelefono('');
        setFormDniLocked(false);
      }
    } finally {
      setIsSavingSocio(false);
    }
  };

  // Filtro de CRM
  const crmSociosFiltrados = useMemo(() => {
    const query = crmSearch.trim().toLowerCase();
    const today = getLocalPeruDateString();

    return members.filter((m) => {
      const matchSearch =
        !query ||
        m.name.toLowerCase().includes(query) ||
        (m.dni && m.dni.includes(query)) ||
        (m.phone && m.phone.includes(query));

      if (!matchSearch) return false;

      const exp = m.expiresAt || today;
      const diffDays = calculateDaysRemaining(exp, today);

      if (crmFilter === 'vencidos') return diffDays < 0;
      if (crmFilter === 'por_vencer') return diffDays >= 0 && diffDays <= 7;
      if (crmFilter === 'deudas') return m.balanceDue > 0;
      return true;
    });
  }, [members, crmFilter, crmSearch]);

  const crmCounts = useMemo(() => {
    const today = getLocalPeruDateString();
    let vencidos = 0;
    let porVencer = 0;
    let deudas = 0;

    members.forEach((m) => {
      const exp = m.expiresAt || today;
      const diffDays = calculateDaysRemaining(exp, today);
      if (diffDays < 0) vencidos++;
      else if (diffDays <= 7) porVencer++;
      if (m.balanceDue > 0) deudas++;
    });

    return { total: members.length, vencidos, porVencer, deudas };
  }, [members]);

  const catalogoAMostrar = useMemo(() => {
    const q = posSearchQuery.trim().toLowerCase();
    const mapped = productos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      precio: Number(p.precio_venta || p.precio || 0),
      categoria: p.categoria || 'Producto',
      stock: p.stock_actual ?? p.stock ?? 0,
      codigo_barras: p.codigo_barras || '',
    }));

    if (!q) return mapped;

    return mapped.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.codigo_barras && p.codigo_barras.toLowerCase().includes(q))
    );
  }, [productos, posSearchQuery]);

  const handlePosSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = posSearchQuery.trim();
    if (!q) return;

    // 1. Coincidencia inteligente por código de barras, SKU o marca
    const matchBusqueda = buscarProductoPorCodigo(productos, q);

    if (matchBusqueda) {
      agregarAlCarrito(matchBusqueda);
      playGymAlert('producto_pos');
      setUnlinkedBarcode(null);
      setPosScannerNotice({
        type: 'success',
        text: `Producto agregado: ${matchBusqueda.nombre} (S/. ${Number(matchBusqueda.precio_venta || 0).toFixed(2)})`,
      });
      setPosSearchQuery('');
      setTimeout(() => setPosScannerNotice(null), 3500);
      return;
    }

    // 2. Si hay exactamente 1 producto filtrado en el catálogo visible
    if (catalogoAMostrar.length === 1) {
      const unico = catalogoAMostrar[0];
      const prodOriginal = productos.find((p) => p.id === unico.id);
      if (prodOriginal) {
        agregarAlCarrito(prodOriginal);
        playGymAlert('producto_pos');
        setUnlinkedBarcode(null);
        setPosScannerNotice({
          type: 'success',
          text: `Producto agregado: ${prodOriginal.nombre} (S/. ${Number(prodOriginal.precio_venta || 0).toFixed(2)})`,
        });
        setPosSearchQuery('');
        setTimeout(() => setPosScannerNotice(null), 3500);
        return;
      }
    }

    // 3. Si no hay coincidencia
    if (catalogoAMostrar.length === 0) {
      playGymAlert('producto_no_encontrado');
      setPosScannerNotice({
        type: 'error',
        text: `No se encontró ningún producto con el código o nombre "${q}".`,
      });
      setTimeout(() => setPosScannerNotice(null), 4000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center font-mono">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-400">Cargando base en vivo de Trankilandia Gym...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col selection:bg-amber-400 selection:text-black">
      {/* Cabecera Exclusiva para Caja & Admin (Cero opción de cliente) */}
      <PortalHeader
        currentRole="caja"
        title="Recepción & Caja"
        subtitle="Control de Acceso, Cobro de Membresías y Venta Rápida"
      />

      {/* BARRA DE NAVEGACIÓN PRINCIPAL (4 PESTAÑAS GIGANTES Y TÁCTILES) */}
      <nav className="bg-zinc-900 border-b border-white/10 px-4 sm:px-8 py-3 sticky top-[65px] z-30 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('acceso')}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer whitespace-nowrap shadow-md ${
                activeTab === 'acceso'
                  ? 'bg-amber-400 text-black shadow-amber-400/20 scale-[1.02]'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <QrCode className="w-5 h-5" />
              <span>1. MARCAR INGRESO</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('crm')}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer whitespace-nowrap shadow-md ${
                activeTab === 'crm'
                  ? 'bg-amber-400 text-black shadow-amber-400/20 scale-[1.02]'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <CalendarClock className="w-5 h-5" />
              <span>2. VENCIMIENTOS & WHATSAPP</span>
              {crmCounts.porVencer > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                  {crmCounts.porVencer}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('inscripcion')}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer whitespace-nowrap shadow-md ${
                activeTab === 'inscripcion'
                  ? 'bg-amber-400 text-black shadow-amber-400/20 scale-[1.02]'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <UserPlus className="w-5 h-5" />
              <span>3. INSCRIBIR SOCIO</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer whitespace-nowrap shadow-md ${
                activeTab === 'pos'
                  ? 'bg-amber-400 text-black shadow-amber-400/20 scale-[1.02]'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>4. BEBIDAS & POS</span>
              {carrito.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black text-xs font-bold">
                  {carrito.reduce((s, i) => s + i.cantidad, 0)}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span
                className={`w-2.5 h-2.5 rounded-full ${supabaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}
              />
              <span>{supabaseConnected ? 'Supabase en Vivo' : 'Modo Local-First'}</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-300 font-bold">{members.length} Socios</span>
            </div>
          </div>
        </div>
      </nav>

      {/* CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-6">
        {/* =========================================================================
            PESTAÑA 1: CONTROL DE ACCESO (MARCAR INGRESO CON ALERTA GIGANTE)
            ========================================================================= */}
        {activeTab === 'acceso' && (
          <div className="space-y-6">
            {/* Buscador Gigante con Autofocus */}
            <form onSubmit={handleFormSubmit} className="relative">
              <input
                ref={scanInputRef}
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="ESCANEE EL CARNET O INGRESE DNI / NOMBRE..."
                className="w-full bg-zinc-900 border-2 border-amber-400/60 focus:border-amber-400 rounded-3xl py-6 px-8 text-xl sm:text-2xl font-black text-white placeholder-zinc-500 shadow-2xl focus:outline-none tracking-wide text-center uppercase font-display"
              />
              <button
                type="submit"
                className="mt-3 w-full sm:w-auto sm:absolute sm:right-3 sm:top-3 sm:bottom-3 px-8 py-4 sm:py-0 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-base transition-transform active:scale-95 cursor-pointer shadow-lg uppercase"
              >
                Marcar Ingreso
              </button>
            </form>

            {/* Indicador Visual de Reglas de Escáner Continuo */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-zinc-400 px-2 -mt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Lector de Barras Activo:
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-amber-400/10 text-amber-300 border border-amber-400/30 font-bold">
                  8 dígitos = DNI (Ingreso)
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-cyan-400/10 text-cyan-300 border border-cyan-400/30 font-bold">
                  12 ó 13 dígitos = Producto (Caja POS)
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 hidden sm:inline">
                Alertas acústicas: Saludable · Por vencer · Vencida · POS
              </span>
            </div>

            {/* PANEL FLOTANTE DE SUGERENCIAS DE BÚSQUEDA EN VIVO */}
            {sugerenciasBusqueda.length > 0 && scanInput.trim().length >= 2 && (
              <div className="bg-zinc-900 border-2 border-amber-400/50 rounded-3xl p-4 shadow-2xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-150 z-20">
                <div className="flex items-center justify-between px-2 py-1 border-b border-white/10 text-xs font-mono text-zinc-400">
                  <span className="font-bold uppercase tracking-wider text-amber-400">
                    Sugerencias Encontradas ({sugerenciasBusqueda.length})
                  </span>
                  <span className="hidden sm:inline">Haz clic para marcar ingreso o gestionar socio con 1 clic</span>
                </div>
                <div className="divide-y divide-white/5">
                  {sugerenciasBusqueda.map((socio) => {
                    const today = getLocalPeruDateString();
                    const exp = socio.expiresAt || today;
                    const diffDays = calculateDaysRemaining(exp, today);
                    const hasDebt = socio.balanceDue > 0;
                    const isExpired = diffDays < 0;

                    return (
                      <div
                        key={socio.id}
                        className="p-3 hover:bg-zinc-800/80 rounded-2xl transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 font-bold font-mono shrink-0">
                            {socio.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-base font-display">
                                {socio.name}
                              </span>
                              {isExpired ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-bold">
                                  Vencido ({socio.expiresAt})
                                </span>
                              ) : hasDebt ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 font-bold">
                                  Debe S/. {socio.balanceDue.toFixed(2)}
                                </span>
                              ) : diffDays <= 7 ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                                  Por vencer ({diffDays}d)
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                                  Al Día
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-zinc-400 mt-0.5">
                              <span>DNI: {socio.dni || 'Sin DNI'}</span> ·{' '}
                              <span>Tel: {socio.phone || 'Sin número'}</span> ·{' '}
                              <span className="text-zinc-300 font-semibold">{socio.plan}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => procesarSocioDirecto(socio)}
                            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs font-mono uppercase transition-all shadow-md active:scale-95 cursor-pointer"
                          >
                            Marcar Ingreso
                          </button>
                          <button
                            type="button"
                            onClick={() => setSocioParaGestionar(socio)}
                            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-mono text-xs font-bold transition-all border border-white/10 cursor-pointer flex items-center gap-1.5"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                            <span>Gestionar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TARJETA GIGANTE DE ESTADO (Colores claros estilo Toast / Square) */}
            {lastScanStatus && (
              <div
                className={`p-6 sm:p-8 rounded-3xl border-2 shadow-2xl transition-all animate-scale-up ${
                  lastScanStatus === 'activo'
                    ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                    : lastScanStatus === 'por_vencer'
                    ? 'bg-amber-950/70 border-amber-500 text-amber-300'
                    : lastScanStatus === 'vencido'
                    ? 'bg-red-950/70 border-red-500 text-red-300'
                    : lastScanStatus === 'deuda'
                    ? 'bg-orange-950/70 border-orange-500 text-orange-300'
                    : 'bg-zinc-900 border-white/20 text-zinc-300'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="flex items-start gap-5">
                    <div className="mt-1">
                      {lastScanStatus === 'activo' && <CheckCircle2 className="w-14 h-14 text-emerald-400" />}
                      {lastScanStatus === 'por_vencer' && <AlertTriangle className="w-14 h-14 text-amber-400" />}
                      {lastScanStatus === 'vencido' && <XCircle className="w-14 h-14 text-red-400" />}
                      {lastScanStatus === 'deuda' && <CreditCard className="w-14 h-14 text-orange-400" />}
                      {lastScanStatus === 'no_inscrito' && <Clock className="w-14 h-14 text-zinc-400" />}
                    </div>
                    <div>
                      <span className="text-xs font-mono uppercase font-bold tracking-widest block mb-1">
                        {lastScanStatus === 'activo' && 'PASE LIBRE · AUTORIZADO'}
                        {lastScanStatus === 'por_vencer' && 'MEMBRESÍA POR VENCER'}
                        {lastScanStatus === 'vencido' && 'ACCESO DENEGADO · MEMBRESÍA VENCIDA'}
                        {lastScanStatus === 'deuda' && 'SALDO PENDIENTE DE COBRO'}
                        {lastScanStatus === 'no_inscrito' && 'ATLETA NO REGISTRADO'}
                      </span>
                      <h2 className="text-2xl sm:text-4xl font-black text-white font-display uppercase tracking-tight">
                        {lastScannedSocio ? lastScannedSocio.nombre : 'No Registrado'}
                      </h2>
                      <p className="text-sm font-mono mt-1 opacity-90">{lastScanMessage}</p>
                      {lastScannedSocio && (
                        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs font-mono text-white/80">
                          <span className="bg-black/40 px-3 py-1 rounded-xl">Plan: {lastScannedSocio.plan}</span>
                          <span className="bg-black/40 px-3 py-1 rounded-xl">Vence: {lastScannedSocio.fecha_fin}</span>
                          <span className="bg-black/40 px-3 py-1 rounded-xl">Turno: {lastScannedSocio.turno}</span>
                          {lastScannedSocio.dni ? (
                            <span className="bg-black/40 px-3 py-1 rounded-xl font-bold">DNI: {lastScannedSocio.dni}</span>
                          ) : (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-xl font-bold">
                              Sin DNI Oficial
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones Rápidas con Botones Grandes */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {lastScannedSocio && (
                      <button
                        type="button"
                        onClick={() => {
                          const m = members.find((x) => x.id === lastScannedSocio.id || (x.dni && x.dni === lastScannedSocio.dni));
                          if (m) {
                            setSocioParaGestionar(m);
                          }
                        }}
                        className="px-6 py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white font-black text-sm uppercase shadow-xl cursor-pointer flex items-center gap-2"
                      >
                        <UserCheck className="w-5 h-5 text-amber-400" />
                        <span>Gestionar Socio</span>
                      </button>
                    )}
                    {lastScannedSocio && !lastScannedSocio.dni && (
                      <button
                        type="button"
                        onClick={() => {
                          const m = members.find((x) => x.id === lastScannedSocio.id);
                          if (m) {
                            setSocioParaAsignarDni(m);
                            setNuevoDniInput('');
                            setDniAsignadoError(null);
                          }
                        }}
                        className="px-6 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-sm uppercase shadow-xl cursor-pointer flex items-center gap-2"
                      >
                        <IdCard className="w-5 h-5" />
                        <span>Asignar DNI a este Socio</span>
                      </button>
                    )}
                    {lastScannedSocio && (lastScanStatus === 'deuda' || lastScannedSocio.saldo_pendiente > 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          const m = members.find((x) => x.id === lastScannedSocio.id || (x.dni && x.dni === lastScannedSocio.dni));
                          if (m) iniciarCobroDeuda(m);
                        }}
                        className="px-6 py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 text-black font-black text-sm uppercase shadow-xl cursor-pointer flex items-center gap-2"
                      >
                        <CreditCard className="w-5 h-5" />
                        <span>Cobrar Deuda (S/. {lastScannedSocio.saldo_pendiente}.00)</span>
                      </button>
                    )}
                    {(lastScanStatus === 'vencido' || lastScanStatus === 'por_vencer') && lastScannedSocio && (
                      <button
                        type="button"
                        onClick={() => iniciarRenovacionSocio(lastScannedSocio)}
                        className="px-6 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-sm uppercase shadow-xl cursor-pointer flex items-center gap-2"
                      >
                        <UserPlus className="w-5 h-5" />
                        <span>Renovar Membresía</span>
                      </button>
                    )}
                    {lastScanStatus === 'no_inscrito' && (
                      <button
                        type="button"
                        onClick={iniciarNuevoSocio}
                        className="px-6 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-sm uppercase shadow-xl cursor-pointer flex items-center gap-2"
                      >
                        <UserPlus className="w-5 h-5" />
                        <span>Registrar Nuevo Socio</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* LISTA DE ATLETAS EN SALA (ÚLTIMOS 90 MINUTOS SIN DUPLICADOS) */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-black text-white uppercase font-display">
                    Atletas en Sala Ahora (Últimos 90 minutos)
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold">
                  {asistenciasActivasDeduplicadas.length} personas entrenando
                </span>
              </div>

              {asistenciasActivasDeduplicadas.length === 0 ? (
                <p className="text-zinc-500 text-xs font-mono py-6 text-center">
                  No hay ingresos registrados en los últimos 90 minutos.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {asistenciasActivasDeduplicadas.map((a) => (
                    <div
                      key={a.id}
                      className="p-3.5 rounded-2xl bg-zinc-950 border border-white/10 flex items-center justify-between hover:border-amber-400/40 transition-colors"
                    >
                      <div>
                        <div className="font-bold text-white text-sm truncate max-w-[180px]">{a.nombre}</div>
                        <div className="text-[11px] font-mono text-zinc-400">DNI: {a.dni}</div>
                        <button
                          type="button"
                          onClick={() => {
                            const m = members.find((x) => x.id === a.socio_id || (x.dni && x.dni === a.dni));
                            if (m) setSocioParaGestionar(m);
                          }}
                          className="text-[10px] font-mono text-amber-400 hover:text-amber-300 underline mt-0.5 cursor-pointer block"
                        >
                          Gestionar Ficha
                        </button>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-400/10 text-amber-300 text-[10px] font-bold uppercase font-mono">
                          {a.turno}
                        </span>
                        <div className="text-[10px] font-mono text-zinc-500 mt-1">
                          {new Date(a.fecha_ingreso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 2: VENCIMIENTOS & WHATSAPP DIRECTO
            ========================================================================= */}
        {activeTab === 'crm' && (
          <div className="space-y-6">
            {/* 4 Filtros Grandes Arriba */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'todos', label: `Todos (${crmCounts.total})`, color: 'text-white' },
                { id: 'vencidos', label: `Vencidos (${crmCounts.vencidos})`, color: 'text-red-400' },
                { id: 'por_vencer', label: `Por Vencer 7 Días (${crmCounts.porVencer})`, color: 'text-amber-400' },
                { id: 'deudas', label: `Con Saldo (${crmCounts.deudas})`, color: 'text-orange-400' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCrmFilter(f.id as any)}
                  className={`p-4 rounded-2xl border text-center transition-all cursor-pointer font-bold text-sm shadow-md ${
                    crmFilter === f.id
                      ? 'bg-amber-400 text-black border-amber-400 scale-[1.02]'
                      : 'bg-zinc-900 border-white/10 text-zinc-300 hover:border-amber-400/40'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Buscador Rápido */}
            <div className="relative">
              <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={crmSearch}
                onChange={(e) => setCrmSearch(e.target.value)}
                placeholder="Buscar socio por Nombre, DNI o Teléfono..."
                className="w-full bg-zinc-900 border border-white/10 focus:border-amber-400 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none font-mono"
              />
            </div>

            {/* Tabla Limpia y Espaciosa */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-950 border-b border-white/10 text-zinc-400 uppercase">
                    <tr>
                      <th className="py-4 px-6 font-bold">Atleta</th>
                      <th className="py-4 px-6 font-bold">Plan</th>
                      <th className="py-4 px-6 font-bold">Vencimiento</th>
                      <th className="py-4 px-6 font-bold">Saldo</th>
                      <th className="py-4 px-6 font-bold text-right">Acción WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {crmSociosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-zinc-500">
                          No se encontraron socios en este filtro.
                        </td>
                      </tr>
                    ) : (
                      crmSociosFiltrados.slice(0, 50).map((socio) => {
                        const today = getLocalPeruDateString();
                        const exp = socio.expiresAt || today;
                        const diffDays = calculateDaysRemaining(exp, today);

                        return (
                          <tr key={socio.id} className="hover:bg-zinc-800/40 transition-colors">
                            <td className="py-4 px-6">
                              <div className="font-bold text-white text-sm font-sans">{socio.name}</div>
                              <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                                {socio.dni ? (
                                  <span>DNI: {socio.dni}</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSocioParaAsignarDni(socio);
                                      setNuevoDniInput('');
                                      setDniAsignadoError(null);
                                    }}
                                    className="px-2 py-0.5 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300 hover:bg-amber-400 hover:text-black font-bold font-mono text-[10px] cursor-pointer transition-colors"
                                  >
                                    + Asignar DNI
                                  </button>
                                )}
                                <span>·</span>
                                <span>Tel: {socio.phone || 'Sin número'}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-zinc-300 font-semibold">{socio.plan}</td>
                            <td className="py-4 px-6">
                              {diffDays < 0 ? (
                                <span className="text-red-400 font-bold">Venció hace {Math.abs(diffDays)}d</span>
                              ) : diffDays <= 7 ? (
                                <span className="text-amber-400 font-bold">Vence en {diffDays} días</span>
                              ) : (
                                <span className="text-emerald-400 font-bold">{diffDays} días restantes</span>
                              )}
                              <div className="text-[10px] text-zinc-500">{socio.expiresAt}</div>
                            </td>
                            <td className="py-4 px-6">
                              {socio.balanceDue > 0 ? (
                                <span className="text-orange-400 font-black">Debe S/. {socio.balanceDue}.00</span>
                              ) : (
                                <span className="text-emerald-400 font-bold">Al día</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {socio.balanceDue > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => iniciarCobroDeuda(socio)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-300 hover:bg-orange-500 hover:text-black font-black text-xs cursor-pointer transition-all shadow-md"
                                  >
                                    <CreditCard className="w-3.5 h-3.5" />
                                    <span>Cobrar Deuda (S/. {socio.balanceDue})</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => iniciarRenovacionSocio(socio)}
                                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs cursor-pointer transition-colors shadow-md"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>Renovar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSocioParaGestionar(socio)}
                                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-200 hover:text-white font-bold text-xs cursor-pointer transition-colors"
                                >
                                  <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Gestionar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => enviarWhatsApp(socio)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-transform active:scale-95 cursor-pointer shadow-md"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  <span>WhatsApp</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 3: NUEVA INSCRIPCIÓN O RENOVACIÓN (DISEÑO AMPLIO SIN SCROLL)
            ========================================================================= */}
        {activeTab === 'inscripcion' && (
          <div className="max-w-7xl mx-auto bg-zinc-900/90 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider ${
                    formIsRenewal
                      ? 'bg-amber-400/20 border border-amber-400/40 text-amber-300'
                      : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  }`}>
                    {formIsRenewal ? 'Modo Renovación de Membresía' : 'Registro de Nuevo Socio / Atleta'}
                  </span>
                  {formDniLocked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 border border-white/10 text-[10px] font-mono font-bold text-zinc-300">
                      <Lock className="w-2.5 h-2.5 text-amber-400" />
                      DNI Protegido
                    </span>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white font-display uppercase tracking-tight mt-1">
                  {formIsRenewal ? `Renovación para ${formNombre || 'Socio'}` : 'Inscribir Nuevo Socio en el Gimnasio'}
                </h2>
                <p className="text-zinc-400 text-xs font-sans mt-0.5">
                  {formIsRenewal
                    ? 'Los datos del atleta están precargados y su DNI protegido. Selecciona el nuevo período y confirma el cobro.'
                    : 'Ingresa los datos personales del socio, selecciona su plan oficial y habilita automáticamente su acceso al portal web.'}
                </p>
              </div>

              {formIsRenewal && (
                <button
                  type="button"
                  onClick={iniciarNuevoSocio}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-200 hover:text-white font-bold text-xs font-mono cursor-pointer transition-colors whitespace-nowrap self-start sm:self-center"
                >
                  + Inscribir Nuevo Socio (En blanco)
                </button>
              )}
            </div>

            {formSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500 text-emerald-300 font-mono text-xs flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>{formSuccessMsg}</span>
                </div>
                {formCreatedMember && formCreatedMember.phone && (
                  <button
                    type="button"
                    onClick={() => enviarWhatsApp(formCreatedMember)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Enviar Carnet por WhatsApp</span>
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleGuardarSocio} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start font-mono text-xs">
              {/* COLUMNA IZQUIERDA: DATOS DEL SOCIO, DNI, TURNO Y FECHA DE INICIO (5 COLS) */}
              <div className="lg:col-span-5 space-y-4 bg-zinc-950/70 border border-white/5 p-5 sm:p-6 rounded-2xl shadow-inner">
                <div className="text-sm font-black text-white uppercase font-display flex items-center gap-2 border-b border-white/10 pb-3">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <span>1. Identificación del Atleta & Turno</span>
                </div>

                {/* DNI con candado */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-zinc-300 uppercase font-bold flex items-center gap-1.5">
                      <span>DNI Oficial (8 dígitos)</span>
                      {formDniLocked && <Lock className="w-3 h-3 text-amber-400" />}
                    </label>
                    {formDniLocked ? (
                      <button
                        type="button"
                        onClick={() => setFormDniLocked(false)}
                        className="text-[10px] text-amber-400 hover:text-amber-300 underline font-mono cursor-pointer"
                      >
                        Modificar DNI
                      </button>
                    ) : (
                      <span className="text-[10px] text-zinc-500 font-mono">Identificador de cuenta</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={8}
                      required
                      readOnly={formDniLocked}
                      value={formDni}
                      onChange={(e) => handleDniChange(e.target.value)}
                      placeholder="Ej. 70447554"
                      className={`w-full rounded-xl px-4 py-3 text-lg font-bold font-mono focus:outline-none transition-all ${
                        formDniLocked
                          ? 'bg-zinc-900 border border-white/10 text-zinc-300 cursor-not-allowed select-none'
                          : 'bg-zinc-950 border border-white/15 focus:border-amber-400 text-white'
                      }`}
                    />
                    <IdCard className={`w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 ${formDniLocked ? 'text-zinc-500' : 'text-amber-400'}`} />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                    {formDniLocked
                      ? 'DNI bloqueado como identificador de acceso al portal web (usuario y contraseña inicial).'
                      : 'Al ingresar el DNI, se autocompletarán los datos si ya fue socio anteriormente.'}
                  </p>
                </div>

                {/* Nombre Completo */}
                <div>
                  <label className="block text-zinc-300 uppercase font-bold mb-1">Nombre Completo del Socio</label>
                  <input
                    type="text"
                    required
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    placeholder="Ej. Wilmer Fernandez"
                    className="w-full bg-zinc-950 border border-white/10 focus:border-amber-400 rounded-xl px-4 py-3 text-sm font-bold text-white font-sans focus:outline-none"
                  />
                </div>

                {/* Teléfono Celular */}
                <div>
                  <label className="block text-zinc-300 uppercase font-bold mb-1">Celular (WhatsApp para Notificaciones)</label>
                  <input
                    type="tel"
                    maxLength={9}
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="Ej. 958183360"
                    className="w-full bg-zinc-950 border border-white/10 focus:border-amber-400 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none"
                  />
                </div>

                {/* Turno Asignado */}
                <div>
                  <label className="block text-zinc-300 uppercase font-bold mb-1.5">Turno Asignado</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'manana', label: 'Mañana (6am-2pm)', icon: Sun },
                      { id: 'tarde', label: 'Tarde (2pm-6pm)', icon: Sunset },
                      { id: 'noche', label: 'Noche (6pm-10pm)', icon: Moon },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setFormTurno(t.id as any)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold cursor-pointer transition-all ${
                          formTurno === t.id
                            ? 'bg-amber-400 text-black border-amber-400 font-black shadow-md'
                            : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <t.icon className="w-4 h-4" />
                        <span className="capitalize">{t.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fecha de Inicio */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-zinc-300 uppercase font-bold">Fecha de Inicio de Membresía</label>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTipoInicio('hoy')}
                      className={`py-2 px-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                        tipoInicio === 'hoy'
                          ? 'bg-amber-400 text-black border-amber-400 font-black'
                          : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div>Hoy</div>
                      <div className="text-[10px] opacity-80 font-mono">{getLocalPeruDateString()}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoInicio('manana')}
                      className={`py-2 px-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                        tipoInicio === 'manana'
                          ? 'bg-amber-400 text-black border-amber-400 font-black'
                          : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div>Mañana</div>
                      <div className="text-[10px] opacity-80 font-mono">{addDaysToLocalPeruDate(1)}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoInicio('personalizado')}
                      className={`py-2 px-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                        tipoInicio === 'personalizado'
                          ? 'bg-amber-400 text-black border-amber-400 font-black'
                          : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div>Elegir Fecha</div>
                      <div className="text-[10px] opacity-80 font-mono">{fechaInicioManual || 'dd/mm/aaaa'}</div>
                    </button>
                  </div>

                  {tipoInicio === 'personalizado' && (
                    <div className="mt-2">
                      <input
                        type="date"
                        value={fechaInicioManual}
                        onChange={(e) => setFechaInicioManual(e.target.value)}
                        className="w-full bg-zinc-950 border border-amber-400/50 rounded-xl px-4 py-2 text-sm text-white font-mono focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Resumen destacado de vigencia calculada */}
                  <div className="mt-3 p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase text-zinc-400 font-bold">Fecha de Vencimiento:</div>
                      <div className="text-base font-black text-amber-300 font-mono mt-0.5">
                        {fechaFinCalculada}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 font-bold text-[10px]">
                      {mesesDuracionPlan === 0 ? '1 Día' : `${mesesDuracionPlan} Mes(es)`}
                    </span>
                  </div>
                </div>
              </div>

              {/* COLUMNA DERECHA: CATÁLOGO DE PLANES Y MODALIDAD DE COBRO (7 COLS) */}
              <div className="lg:col-span-7 space-y-4 bg-zinc-950/70 border border-white/5 p-5 sm:p-6 rounded-2xl shadow-inner">
                {/* Cabecera de Planes y Filtros por Duración */}
                <div className="border-b border-white/10 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="text-sm font-black text-white uppercase font-display flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>2. Seleccionar Plan Oficial</span>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold text-xs">
                      Seleccionado: {formPlan} · S/. {formPrecio}
                    </span>
                  </div>

                  {/* Banner de Acceso Rápido a Promo Personalizada */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-xs mb-3">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>¿Acuerdo especial o cliente recurrente? (Ej. 8 meses por 300 soles)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCatalogCategory('personalizado')}
                      className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-black text-[11px] uppercase tracking-wider transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
                    >
                      + Configurar Promo Libre
                    </button>
                  </div>

                  {/* Pestañas de Categoría para no amontonar planes */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {[
                      { id: 'todos', label: `Todos (${catalogPlans.length})` },
                      { id: '1mes', label: '1 Mes (Mensuales)' },
                      { id: 'promociones', label: '3 a 12 Meses (Promos)' },
                      { id: 'diario', label: 'Pases Diarios' },
                      { id: 'personalizado', label: '★ Promo Personalizada' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCatalogCategory(cat.id as any)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                          catalogCategory === cat.id
                            ? 'bg-amber-400 text-black border-amber-400 font-black'
                            : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {catalogCategory === 'personalizado' ? (
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-amber-400/40 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <h4 className="text-sm font-black text-amber-300 uppercase tracking-tight flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>Módulo de Membresía / Promo Personalizada</span>
                        </h4>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Personaliza libremente los meses de duración y el precio acordado para atletas recurrentes o promociones especiales.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold">
                        Modo Libre
                      </span>
                    </div>

                    {/* Selector de Meses con Presets */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-300 uppercase font-mono">
                          1. Cantidad de Meses de Vigencia:
                        </label>
                        <span className="text-xs font-mono font-black text-amber-400">
                          {customPromoMeses} {customPromoMeses === 1 ? 'Mes' : 'Meses'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCustomMesesChange(customPromoMeses - 1)}
                          className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-black text-lg flex items-center justify-center border border-white/10 cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={customPromoMeses}
                          onChange={(e) => handleCustomMesesChange(parseInt(e.target.value) || 1)}
                          className="flex-1 bg-zinc-950 border border-amber-400/40 rounded-xl py-2 px-3 text-center text-lg font-black font-mono text-white focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleCustomMesesChange(customPromoMeses + 1)}
                          className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-black text-lg flex items-center justify-center border border-white/10 cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Botones de Acceso Rápido a Meses */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {[1, 2, 3, 6, 8, 10, 12].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleCustomMesesChange(m)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer border ${
                              customPromoMeses === m
                                ? 'bg-amber-400 text-black border-amber-400 font-black shadow-sm'
                                : 'bg-zinc-950 text-zinc-400 border-white/10 hover:text-white hover:bg-zinc-800'
                            }`}
                          >
                            {m === 8 ? '8 Meses (Especial)' : `${m}M`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Precio Acordado en Soles */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-300 uppercase font-mono">
                          2. Precio Total Acordado (S/.):
                        </label>
                        <span className="text-[11px] font-mono text-zinc-400">
                          Equivalente a: <strong className="text-amber-300">S/. {(customPromoPrecio / (customPromoMeses || 1)).toFixed(2)} / mes</strong>
                        </span>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono font-bold text-amber-400">
                          S/.
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="5"
                          value={customPromoPrecio}
                          onChange={(e) => handleCustomPrecioChange(parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-950 border border-amber-400/40 rounded-xl py-2 pl-12 pr-4 text-base font-black font-mono text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      {/* Botones de Acceso Rápido a Precios */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {[80, 130, 150, 200, 250, 300, 350, 400].map((pr) => (
                          <button
                            key={pr}
                            type="button"
                            onClick={() => handleCustomPrecioChange(pr)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer border ${
                              customPromoPrecio === pr
                                ? 'bg-amber-400 text-black border-amber-400 font-black shadow-sm'
                                : 'bg-zinc-950 text-zinc-400 border-white/10 hover:text-white hover:bg-zinc-800'
                            }`}
                          >
                            S/. {pr}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Nombre / Concepto Oficial */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-300 uppercase font-mono">
                        3. Nombre o Concepto de la Promo (Editable):
                      </label>
                      <input
                        type="text"
                        value={customPromoNombre}
                        onChange={(e) => setCustomPromoNombre(e.target.value)}
                        placeholder="Ej. Promo Personalizada (8 Meses)"
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Resumen en Vivo de Vigencia */}
                    <div className="p-3 rounded-xl bg-zinc-950 border border-amber-400/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="text-zinc-400 text-[10px] uppercase font-bold block">Vigencia Calculada:</span>
                        <span className="font-mono text-amber-300 font-bold">
                          {fechaInicioSeleccionada} al {previewCustomFechaFin}
                        </span>
                      </div>
                      <div className="text-right sm:text-right">
                        <span className="text-zinc-400 text-[10px] uppercase font-bold block">Total a Facturar:</span>
                        <span className="text-base font-black font-mono text-white">
                          S/. {customPromoPrecio}.00
                        </span>
                      </div>
                    </div>

                    {/* Botón de Aplicación */}
                    <button
                      type="button"
                      onClick={handleAplicarPromoPersonalizada}
                      className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-400/20"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Aplicar Esta Promo al Formulario</span>
                    </button>

                    {isCustomPlanApplied && formPlan === (customPromoNombre.trim() || `Promo Personalizada (${customPromoMeses} Meses)`) && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Promo vinculada con éxito. Ya puedes completar el registro o cobro abajo.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Cuadrícula Táctil de Planes Ordenados */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[290px] overflow-y-auto pr-1">
                    {planesFiltrados.map((p) => {
                      const isSelected = formPlan === p.name;
                      return (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => handlePlanSelect(p.name, p.price, p.months)}
                          className={`p-3.5 rounded-2xl border text-left font-bold transition-all cursor-pointer flex flex-col justify-between min-h-[92px] ${
                            isSelected
                              ? 'bg-amber-400 text-black border-amber-400 shadow-lg shadow-amber-400/20 scale-[1.01]'
                              : 'bg-zinc-900 border-white/10 text-zinc-300 hover:border-amber-400/40 hover:bg-zinc-850'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className={`text-xs font-bold leading-snug ${isSelected ? 'text-black' : 'text-white'}`}>
                              {p.name}
                            </div>
                            {isSelected && (
                              <span className="w-4 h-4 rounded-full bg-black text-amber-400 flex items-center justify-center text-[10px] font-black shrink-0">
                                ✓
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <div className={`text-base font-black ${isSelected ? 'text-black' : 'text-amber-400'}`}>
                              S/. {p.price}.00
                            </div>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                              isSelected ? 'bg-black/20 text-black' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {p.months === 0 ? 'Pase Diario' : p.months === 1 ? '1 Mes' : `${p.months} Meses`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Sección 3: Modalidad de Pago y Confirmación */}
                <div className="border-t border-white/10 pt-4 space-y-4">
                  <div className="text-sm font-black text-white uppercase font-display flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    <span>3. Modalidad de Cobro & Caja</span>
                  </div>

                  {/* Control Interactivo de Precio y Descuento en Inscripción / Renovación */}
                  <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/10 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-mono text-zinc-400 font-bold uppercase flex items-center gap-1.5">
                          <BadgePercent className="w-4 h-4 text-amber-400" />
                          <span>Precio Final / Descuento a Cobrar:</span>
                        </div>
                        <span className="text-xs text-zinc-300 font-bold mt-0.5 block">
                          {formPlan}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-zinc-400">S/.</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={formPrecio}
                          onChange={(e) => {
                            const newPrice = Math.max(0, Number(e.target.value) || 0);
                            setFormPrecio(newPrice);
                            if (formTipoPago === 'full') {
                              setFormAdelanto(newPrice);
                            } else {
                              setFormAdelanto((prev) => Math.min(prev, newPrice));
                            }
                          }}
                          className="w-28 bg-zinc-950 border border-amber-400/50 focus:border-amber-400 rounded-xl px-3 py-2 text-right text-lg font-black font-mono text-amber-300 focus:outline-none shadow-inner"
                          title="Edita libremente el precio final acordado con el cliente"
                        />
                      </div>
                    </div>

                    {/* Presets Rápidos de Descuento */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/5">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold mr-1">
                        Ajuste Rápido:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAplicarDescuentoRapido(5)}
                        className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer border ${
                          formPrecio === 5
                            ? 'bg-amber-400 text-black border-amber-400'
                            : 'bg-zinc-950 text-amber-400 border-white/10 hover:bg-zinc-800'
                        }`}
                      >
                        Pase S/. 5
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAplicarDescuentoRapido(7)}
                        className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer border ${
                          formPrecio === 7
                            ? 'bg-amber-400 text-black border-amber-400'
                            : 'bg-zinc-950 text-amber-400 border-white/10 hover:bg-zinc-800'
                        }`}
                      >
                        Pase S/. 7
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAplicarDescuentoRapido(70)}
                        className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer border ${
                          formPrecio === 70
                            ? 'bg-amber-400 text-black border-amber-400'
                            : 'bg-zinc-950 text-amber-400 border-white/10 hover:bg-zinc-800'
                        }`}
                      >
                        Plan S/. 70
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAplicarDescuentoDelta(-10)}
                        className="px-2 py-1 rounded-lg text-xs font-mono font-bold bg-zinc-950 text-emerald-400 border border-white/10 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Descontar 10 soles del precio actual"
                      >
                        - S/. 10
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAplicarDescuentoDelta(-5)}
                        className="px-2 py-1 rounded-lg text-xs font-mono font-bold bg-zinc-950 text-emerald-400 border border-white/10 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Descontar 5 soles del precio actual"
                      >
                        - S/. 5
                      </button>
                    </div>
                  </div>

                  {/* Modalidad de Pago: Completo o Adelanto */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormTipoPago('full');
                        setFormAdelanto(formPrecio);
                      }}
                      className={`py-2.5 rounded-xl border text-center text-xs font-bold uppercase cursor-pointer transition-all ${
                        formTipoPago === 'full'
                          ? 'bg-amber-400 text-black border-amber-400 font-black shadow-md'
                          : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Pago Completo (S/. {formPrecio})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormTipoPago('adelanto')}
                      className={`py-2.5 rounded-xl border text-center text-xs font-bold uppercase cursor-pointer transition-all ${
                        formTipoPago === 'adelanto'
                          ? 'bg-amber-400 text-black border-amber-400 font-black shadow-md'
                          : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Adelanto / Saldo Pendiente
                    </button>
                  </div>

                  {formTipoPago === 'adelanto' && (
                    <div className="p-3.5 rounded-xl bg-zinc-900 border border-orange-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-zinc-300 uppercase font-bold">Monto Adelantado Hoy (S/)</label>
                        <span className="text-orange-400 font-black font-mono">
                          Saldo restante: S/. {Math.max(0, formPrecio - formAdelanto)}.00
                        </span>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={formPrecio}
                        value={formAdelanto}
                        onChange={(e) => setFormAdelanto(Number(e.target.value) || 0)}
                        className="w-full bg-zinc-950 border border-white/10 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm font-bold text-white font-mono focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Método de Pago */}
                  <div>
                    <label className="block text-zinc-400 uppercase font-bold mb-1.5">Método de Pago</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['efectivo', 'yape', 'plin', 'tarjeta'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setFormMetodoPago(m as any)}
                          className={`py-2.5 rounded-xl border text-center text-xs font-bold uppercase cursor-pointer transition-all ${
                            formMetodoPago === m
                              ? 'bg-amber-400 text-black border-amber-400 font-black shadow-md'
                              : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Botón Principal de Acción */}
                  <button
                    type="submit"
                    disabled={isSavingSocio}
                    className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-black text-sm uppercase transition-all shadow-xl shadow-amber-400/20 active:scale-[0.99] cursor-pointer mt-2"
                  >
                    {isSavingSocio
                      ? 'Procesando en Base de Datos...'
                      : formIsRenewal
                      ? `Confirmar Renovación (${formPlan} · S/. ${formTipoPago === 'full' ? formPrecio : formAdelanto})`
                      : `Inscribir Socio & Activar Cuenta (S/. ${formTipoPago === 'full' ? formPrecio : formAdelanto})`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 4: VENTA RÁPIDA DE BEBIDAS & SUPLEMENTOS (POS TÁCTIL)
            ========================================================================= */}
        {activeTab === 'pos' && (
          <div className="space-y-4">
            {/* Banner de Notificación de Escáner de Productos (12 o 13 dígitos) */}
            {posScannerNotice && (
              <div
                className={`p-4 rounded-2xl border text-xs font-mono font-bold flex items-center justify-between shadow-xl transition-all animate-scale-up ${
                  posScannerNotice.type === 'success'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-red-500/20 border-red-400 text-red-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {posScannerNotice.type === 'success' ? (
                    <ShoppingCart className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  )}
                  <span>{posScannerNotice.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPosScannerNotice(null)}
                  className="text-zinc-400 hover:text-white px-2 py-1 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Banner de Asignación Rápida de Código de Barras no Vinculado */}
            {unlinkedBarcode && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold shrink-0">
                    <Barcode className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                      Código escaneado no vinculado: <span className="font-mono text-white underline">{unlinkedBarcode}</span>
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Toca un producto para vincular permanentemente este código y agregarlo a la venta:
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {productos.filter((p) => p.activo !== false).slice(0, 6).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={async () => {
                        await vincularCodigoBarrasAProducto(p.id, unlinkedBarcode);
                        agregarAlCarrito(p);
                        playGymAlert('producto_pos');
                        setPosScannerNotice({
                          type: 'success',
                          text: `Código ${unlinkedBarcode} vinculado con éxito a ${p.nombre} y agregado al carrito.`,
                        });
                        setUnlinkedBarcode(null);
                        setTimeout(() => setPosScannerNotice(null), 4500);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-amber-400/40 hover:border-amber-400 hover:bg-amber-400/20 text-xs font-bold text-white transition-all cursor-pointer shadow-sm"
                    >
                      + {p.nombre}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setUnlinkedBarcode(null)}
                    className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Cerrar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Cuadrícula Táctil de Productos (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {/* Buscador y Lector de Códigos de Barras en Mostrador POS */}
              <form onSubmit={handlePosSearchSubmit} className="relative">
                <Search className="w-5 h-5 text-amber-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={posSearchInputRef}
                  type="text"
                  value={posSearchQuery}
                  onChange={(e) => setPosSearchQuery(e.target.value)}
                  placeholder="Escanear código de barras (12/13 dígitos) o buscar producto por nombre..."
                  className="w-full bg-zinc-900 border border-white/10 focus:border-amber-400 rounded-2xl py-3 pl-12 pr-28 text-sm text-white placeholder:text-zinc-500 font-mono shadow-inner focus:outline-none transition-colors"
                />
                {posSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPosSearchQuery('')}
                    className="absolute right-16 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs px-2 py-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                >
                  Enter
                </button>
              </form>

              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white font-display uppercase">
                  Toca un producto para agregar a la cuenta:
                </h3>
                {catalogoAMostrar.length > 0 && (
                  <span className="text-xs font-mono text-zinc-400">
                    {catalogoAMostrar.length} {catalogoAMostrar.length === 1 ? 'producto' : 'productos'} {posSearchQuery ? 'encontrados' : 'en inventario'}
                  </span>
                )}
              </div>

              {catalogoAMostrar.length === 0 ? (
                <div className="p-8 rounded-3xl bg-zinc-900 border border-white/10 text-center space-y-3">
                  <ShoppingCart className="w-12 h-12 text-zinc-600 mx-auto" />
                  <h4 className="text-lg font-black text-white font-display uppercase">
                    {posSearchQuery ? 'Sin Resultados' : 'Inventario Vacío en Supabase'}
                  </h4>
                  <p className="text-xs text-zinc-400 font-mono max-w-md mx-auto">
                    {posSearchQuery ? (
                      <>
                        No se encontró ningún producto que coincida con "<span className="text-amber-400 font-bold">{posSearchQuery}</span>".
                      </>
                    ) : (
                      <>
                        No se encontraron productos activos en la base de datos de la nube.
                        Registra o activa productos desde la tabla <span className="text-amber-400 font-bold">productos</span> en Supabase para que aparezcan automáticamente aquí.
                      </>
                    )}
                  </p>
                  {posSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPosSearchQuery('')}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-bold text-white transition-colors cursor-pointer"
                    >
                      Limpiar Búsqueda
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {catalogoAMostrar.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => agregarAlCarrito(p)}
                      className="p-5 rounded-3xl bg-zinc-900 border border-white/10 hover:border-amber-400 hover:bg-zinc-800 text-left transition-all active:scale-95 cursor-pointer shadow-lg flex flex-col justify-between min-h-[130px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400 font-mono text-[10px] uppercase font-bold tracking-wider">
                          {p.categoria}
                        </span>
                        {p.stock !== undefined && (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${p.stock <= 5 ? 'text-red-400 bg-red-400/10' : 'text-zinc-500'}`}>
                            Stock: {p.stock}
                          </span>
                        )}
                      </div>
                      <div className="mt-4">
                        <div className="font-bold text-white text-sm">{p.nombre}</div>
                        <div className="text-amber-400 font-mono font-black text-lg mt-1">S/. {p.precio.toFixed(2)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Carrito de Cobro (4 cols) */}
            <div className="lg:col-span-4 bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col justify-between min-h-[400px]">
              <div>
                <h3 className="text-base font-black text-white font-display uppercase pb-3 border-b border-white/10">
                  Cobro de mostrador
                </h3>

                {posSuccessMsg && (
                  <div className="my-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-300 text-xs font-mono">
                    {posSuccessMsg}
                  </div>
                )}

                {carrito.length === 0 ? (
                  <p className="text-zinc-500 text-xs font-mono py-12 text-center">
                    Seleccione un producto para cobrar.
                  </p>
                ) : (
                  <div className="divide-y divide-white/5 my-4 max-h-[220px] overflow-y-auto">
                    {carrito.map((item) => (
                      <div key={item.id} className="py-2.5 flex items-center justify-between text-xs font-mono">
                        <div>
                          <div className="font-bold text-white">{item.nombre}</div>
                          <div className="text-zinc-400">S/. {item.precio.toFixed(2)} c/u</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => modificarCantidad(item.id, -1)}
                            className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center hover:bg-zinc-700 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-black text-amber-400 text-sm">{item.cantidad}</span>
                          <button
                            type="button"
                            onClick={() => modificarCantidad(item.id, 1)}
                            className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center hover:bg-zinc-700 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Descuento Proporcionado y Auditado */}
                {carrito.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowDescuentoForm(!showDescuentoForm)}
                      className="flex items-center justify-between w-full text-xs font-mono text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <BadgePercent className="w-3.5 h-3.5" />
                        {descuentoMonto > 0
                          ? `Descuento aplicado: -S/. ${descuentoMonto.toFixed(2)}`
                          : '+ Aplicar Descuento / Cortesía'}
                      </span>
                      <span>{showDescuentoForm ? '▲' : '▼'}</span>
                    </button>

                    {showDescuentoForm && (
                      <div className="mt-2.5 p-3 rounded-2xl bg-zinc-950 border border-white/10 space-y-2.5 animate-in fade-in duration-150">
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">
                            Monto de Descuento (S/.)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={subtotalCarrito}
                            step="0.5"
                            value={descuentoMonto || ''}
                            onChange={(e) => setDescuentoMonto(Math.min(subtotalCarrito, Math.max(0, Number(e.target.value) || 0)))}
                            placeholder="Ej. 2.00"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">
                            Motivo / Autorización (Auditoría)
                          </label>
                          <input
                            type="text"
                            value={descuentoMotivo}
                            onChange={(e) => setDescuentoMotivo(e.target.value)}
                            placeholder="Ej. Promo combo / Cortesía admin"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 font-sans"
                          />
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {['Promo Combo', 'Cortesía Admin', 'Descuento Fidelidad', 'Ajuste'].map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => setDescuentoMotivo(tag)}
                                className="text-[9px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 cursor-pointer"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                {/* Resumen Financiero con desglose */}
                <div className="pt-3 border-t border-white/10 space-y-1 mb-4">
                  {descuentoMonto > 0 && (
                    <>
                      <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                        <span>Subtotal:</span>
                        <span>S/. {subtotalCarrito.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono text-red-400 font-bold">
                        <span>Descuento ({descuentoMotivo || 'Autorizado'}):</span>
                        <span>- S/. {descuentoMonto.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs uppercase font-mono text-zinc-400 font-bold">Total a Cobrar</span>
                    <span className="text-2xl font-black font-display text-amber-400">
                      S/. {totalCarrito.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setPosMetodoPago('efectivo')}
                    className={`py-2 rounded-xl border text-xs font-mono font-bold uppercase cursor-pointer ${
                      posMetodoPago === 'efectivo'
                        ? 'bg-amber-400 text-black border-amber-400'
                        : 'bg-zinc-950 border-white/10 text-zinc-400'
                    }`}
                  >
                    Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosMetodoPago('yape')}
                    className={`py-2 rounded-xl border text-xs font-mono font-bold uppercase cursor-pointer ${
                      posMetodoPago === 'yape'
                        ? 'bg-amber-400 text-black border-amber-400'
                        : 'bg-zinc-950 border-white/10 text-zinc-400'
                    }`}
                  >
                    Yape / Plin
                  </button>
                </div>

                <button
                  type="button"
                  disabled={carrito.length === 0 || isPosProcessing}
                  onClick={procesarVentaPOS}
                  className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black font-black text-base uppercase transition-transform active:scale-95 cursor-pointer shadow-xl"
                >
                  {isPosProcessing ? 'Procesando Cobro...' : `Confirmar Cobro (S/. ${totalCarrito.toFixed(2)})`}
                </button>
              </div>
            </div>
          </div>
          </div>
        )}
      </main>

      {/* Modal para Asignar DNI a Socio Buscado por Nombre */}
      {socioParaAsignarDni && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-zinc-900 border border-amber-400/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-black text-white font-display uppercase">
                  Asignar DNI a Socio
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">{socioParaAsignarDni.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSocioParaAsignarDni(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 font-sans leading-relaxed">
              Al asignar su número de DNI, el socio podrá ingresar de inmediato al portal web de clientes utilizando su DNI como usuario y primera contraseña.
            </p>

            {dniAsignadoError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-mono">
                {dniAsignadoError}
              </div>
            )}

            {dniAsignadoSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                {dniAsignadoSuccess}
              </div>
            )}

            <form onSubmit={handleGuardarNuevoDni} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-zinc-300 mb-1.5 font-bold">
                  Número de DNI (8 dígitos)
                </label>
                <input
                  type="text"
                  maxLength={8}
                  autoFocus
                  value={nuevoDniInput}
                  onChange={(e) => setNuevoDniInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="Ej: 70447554"
                  className="w-full bg-zinc-950 border border-white/20 focus:border-amber-400 rounded-xl px-4 py-3 text-lg font-mono font-bold text-white placeholder-zinc-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSocioParaAsignarDni(null)}
                  className="w-1/2 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono font-bold uppercase transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingDni || nuevoDniInput.length !== 8}
                  className="w-1/2 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black text-xs font-mono font-black uppercase transition-all shadow-md cursor-pointer"
                >
                  {isSavingDni ? 'Guardando...' : 'Guardar DNI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE LIQUIDACIÓN DE DEUDAS / COBRO DE SALDO */}
      {liquidatingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 font-mono text-xs">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] text-orange-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  Módulo de Cobranza & Liquidación
                </span>
                <h3 className="text-xl font-black text-white font-display uppercase tracking-tight mt-0.5">
                  Cobrar Saldo Pendiente
                </h3>
                <p className="text-zinc-400 text-xs font-sans mt-0.5">
                  Atleta: <strong className="text-white">{liquidatingMember.name}</strong> · DNI: {liquidatingMember.dni || 'Sin DNI'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLiquidatingMember(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmarLiquidacionDeuda} className="space-y-4">
              {/* Resumen Deuda Total */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-orange-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase text-zinc-400 font-bold">Deuda Total Registrada</div>
                  <div className="text-2xl font-black text-orange-400 font-display">
                    S/. {liquidatingMember.balanceDue}.00
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase text-zinc-400 font-bold">Plan Actual</div>
                  <div className="text-xs text-white font-bold">{liquidatingMember.plan}</div>
                </div>
              </div>

              {/* Selector de Monto a Cobrar */}
              <div>
                <label className="block text-zinc-300 font-bold uppercase mb-1.5">
                  Monto a Cobrar en Esta Operación
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setMontoCobroDeuda(liquidatingMember.balanceDue)}
                    className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                      montoCobroDeuda === liquidatingMember.balanceDue
                        ? 'bg-amber-400 text-black border-amber-400 font-black'
                        : 'bg-zinc-950 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Liquidar Todo (S/. {liquidatingMember.balanceDue})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMontoCobroDeuda(Math.floor(liquidatingMember.balanceDue / 2) || 10)}
                    className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                      montoCobroDeuda !== liquidatingMember.balanceDue
                        ? 'bg-amber-400 text-black border-amber-400 font-black'
                        : 'bg-zinc-950 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Abono Parcial
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">S/.</span>
                  <input
                    type="number"
                    min={1}
                    max={liquidatingMember.balanceDue}
                    step="any"
                    required
                    value={montoCobroDeuda}
                    onChange={(e) => setMontoCobroDeuda(Math.min(liquidatingMember.balanceDue, Math.max(0, Number(e.target.value))))}
                    className="w-full bg-zinc-950 border border-white/10 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2.5 text-base font-bold text-white focus:outline-none"
                  />
                </div>
                <div className="text-[10px] text-zinc-400 mt-1 flex justify-between">
                  <span>Saldo que quedará pendiente:</span>
                  <strong className="text-white">
                    S/. {Math.max(0, liquidatingMember.balanceDue - montoCobroDeuda).toFixed(2)}
                  </strong>
                </div>
              </div>

              {/* Método de Pago */}
              <div>
                <label className="block text-zinc-300 font-bold uppercase mb-1.5">Método de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMetodoPagoDeuda('efectivo')}
                    className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                      metodoPagoDeuda === 'efectivo'
                        ? 'bg-amber-400 text-black border-amber-400 font-black'
                        : 'bg-zinc-950 border-white/10 text-zinc-400'
                    }`}
                  >
                    Efectivo (Caja)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodoPagoDeuda('yape')}
                    className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                      metodoPagoDeuda === 'yape'
                        ? 'bg-amber-400 text-black border-amber-400 font-black'
                        : 'bg-zinc-950 border-white/10 text-zinc-400'
                    }`}
                  >
                    Yape / Plin
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setLiquidatingMember(null)}
                  className="w-1/3 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLiquidating || montoCobroDeuda <= 0}
                  className="w-2/3 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black uppercase tracking-wide cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  {isLiquidating ? 'Procesando Cobro...' : `Confirmar Cobro (S/. ${montoCobroDeuda.toFixed(2)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NOTIFICACIÓN TOAST DE LIQUIDACIÓN DE DEUDA */}
      {deudaSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-400 text-black font-black text-xs font-mono shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-5 h-5" />
          <span>{deudaSuccessMsg}</span>
        </div>
      )}

      {/* MODAL DE GESTIÓN INTEGRAL DEL SOCIO (1 CLIC DESDE CUALQUIER SECCIÓN) */}
      {socioParaGestionar && (
        <MemberProfileModal
          isOpen={!!socioParaGestionar}
          onClose={() => setSocioParaGestionar(null)}
          member={socioParaGestionar}
          onSave={async (updated) => {
            const cleanDni = updated.dni ? updated.dni.replace(/\D/g, '').slice(0, 8) : '';
            const memberToSave: GymMember = {
              ...updated,
              name: updated.name.trim(),
              dni: cleanDni || updated.dni,
            };

            try {
              const updatedList = await updateMemberProfile(memberToSave.id, memberToSave);
              setMembers(updatedList);
              saveStoredMembers(updatedList);
            } catch {
              const localList = [memberToSave, ...members.filter((m) => m.id !== memberToSave.id)];
              setMembers(localList);
              saveStoredMembers(localList);
            }

            if (lastScannedSocio && lastScannedSocio.id === memberToSave.id) {
              setLastScannedSocio({
                ...lastScannedSocio,
                nombre: memberToSave.name,
                dni: memberToSave.dni || '',
                plan: memberToSave.plan,
                fecha_fin: memberToSave.expiresAt || getLocalPeruDateString(),
              });
            }

            setGestionSuccessMsg(`Ficha de ${memberToSave.name} actualizada correctamente.`);
            setSocioParaGestionar(null);
            setTimeout(() => setGestionSuccessMsg(null), 3500);
          }}
        />
      )}

      {/* NOTIFICACIÓN TOAST FLOTANTE DE GESTIÓN DE SOCIO */}
      {gestionSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-amber-400 text-black font-black text-xs font-mono shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-5 h-5" />
          <span>{gestionSuccessMsg}</span>
        </div>
      )}
    </div>
  );
}
