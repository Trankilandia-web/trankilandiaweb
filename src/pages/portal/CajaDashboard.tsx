import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  Printer,
  Smartphone,
  AlertTriangle,
  Search,
  DollarSign,
  Users,
  Clock,
  Sun,
  Sunset,
  Moon,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  Wifi,
  WifiOff,
  Barcode,
  ShieldAlert,
  User,
  UserPlus,
  CalendarClock,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import PortalHeader from '../../components/portal/PortalHeader';
import ReceiptModal from '../../components/portal/ReceiptModal';
import {
  GymMember,
  getStoredMembers,
  saveStoredMembers,
} from '../../data/gymStore';
import {
  SocioRecepcion,
  AsistenciaActiva,
  ProductoPOS,
  ItemVentaPOS,
  ResultadoVentaPOS,
  fetchSociosParaRecepcion,
  cargarAsistenciasActivas90Min,
  registrarAsistencia,
  procesarColaAsistenciasOffline,
  obtenerProductosInventario,
  registrarVentaPOS,
  registerGymMember,
  payMemberBalance,
  updateMemberProfile,
} from '../../lib/supabaseDb';
import MemberProfileModal from '../../components/portal/MemberProfileModal';

const PLANS_CATALOG = [
  { name: '1 Mes · Musculación Libre', price: 80 },
  { name: '2 Meses · Musculación Libre', price: 130 },
  { name: '3 Meses · Musculación Libre', price: 190 },
  { name: '4 Meses · Musculación Libre', price: 200 },
  { name: '6 Meses · Musculación Libre', price: 330 },
  { name: '8 Meses · Musculación Libre', price: 330 },
  { name: '1 Año · Musculación Libre', price: 430 },
  { name: '1 Mes · Combo Musculación + Boxeo', price: 130 },
  { name: 'Pase Diario de Entrenamiento', price: 15 },
];

const COACHES_BY_SHIFT = {
  manana: 'Coach Marcos Rivas (Mañana)',
  tarde: 'Coach Valeria Gómez (Tarde)',
  noche: 'Coach Daniel Quispe (Noche)',
};

// Generador de audio Web Audio API (0 dependencias externas, 0 latencia)
function playTone(type: 'success' | 'warning' | 'error' | 'rebote') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'success') {
      // Beep agudo ascendente (Acceso concedido)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'warning') {
      // Tono de atención dual (Deuda de adelanto)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.23);
    } else if (type === 'rebote') {
      // Tono informativo suave (Anti-rebote de 30 min)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else {
      // Tono grave de error (Vencido o No encontrado)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.32);
    }
  } catch {}
}

export type CajaTab = 'acceso' | 'inscripcion' | 'crm' | 'cobros' | 'pos';

export default function CajaDashboard() {
  // Pestaña activa ordenada por prioridad
  const [activeTab, setActiveTab] = useState<CajaTab>('acceso');

  // Estado general de socios
  const [members, setMembers] = useState<GymMember[]>(getStoredMembers());
  const [sociosMap, setSociosMap] = useState<Map<string, SocioRecepcion>>(new Map());
  const [asistenciasActivas, setAsistenciasActivas] = useState<AsistenciaActiva[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlinePendingCount, setOfflinePendingCount] = useState<number>(0);
  const [isLoadingSocios, setIsLoadingSocios] = useState<boolean>(true);

  // Escáner manual e interactivo
  const [scannedDniInput, setScannedDniInput] = useState('');
  const [lastScanResult, setLastScanResult] = useState<{
    status: 'al_dia' | 'con_deuda' | 'vencido' | 'rebote' | 'no_encontrado' | null;
    socio: SocioRecepcion | null;
    dni: string;
    message: string;
    timestamp: number;
    reboteMinutos?: number;
  }>({
    status: null,
    socio: null,
    dni: '',
    message: '',
    timestamp: 0,
  });

  // CRM State
  const [crmSearch, setCrmSearch] = useState('');
  const [crmFilter, setCrmFilter] = useState<'todos' | 'por_vencer' | 'vencidos' | 'vigentes' | 'con_deuda'>('todos');
  const [crmShiftFilter, setCrmShiftFilter] = useState<'todos' | 'manana' | 'tarde' | 'noche'>('todos');
  const [crmPage, setCrmPage] = useState(1);
  const crmPageSize = 25;

  // Cobros & Deudas State
  const [cobrosSearch, setCobrosSearch] = useState('');

  // Contador de refresco local de 60 segundos (Cero polling Supabase)
  const [, setTimerTick] = useState(0);

  // Formulario de Nueva Inscripción
  const [selectedPlan, setSelectedPlan] = useState(PLANS_CATALOG[1]);
  const [clientName, setClientName] = useState('');
  const [clientDni, setClientDni] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientShift, setClientShift] = useState<'manana' | 'tarde' | 'noche'>('manana');
  const [isAdvancePayment, setIsAdvancePayment] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState<number>(50);
  const [dueDateDays, setDueDateDays] = useState<number>(10);
  const [paymentMethod, setPaymentMethod] = useState<'yape' | 'plin' | 'efectivo' | 'tarjeta'>('yape');

  // Modales
  const [liquidatingMember, setLiquidatingMember] = useState<GymMember | null>(null);
  const [customAbonoAmount, setCustomAbonoAmount] = useState<number>(0);
  const [profileModalMember, setProfileModalMember] = useState<GymMember | null>(null);
  const [liquidateMethod, setLiquidateMethod] = useState<'yape' | 'plin' | 'efectivo' | 'tarjeta'>('yape');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal de Boleta Membresía
  const [receiptModal, setReceiptModal] = useState<{
    isOpen: boolean;
    member: GymMember | null;
    amount: number;
    type: string;
    method: string;
  }>({
    isOpen: false,
    member: null,
    amount: 0,
    type: '',
    method: '',
  });

  // Terminal POS State
  const [productos, setProductos] = useState<ProductoPOS[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('Todos');
  const [filtroProducto, setFiltroProducto] = useState<string>('');
  const [carrito, setCarrito] = useState<{ producto: ProductoPOS; cantidad: number }[]>([]);
  const [metodoPagoPOS, setMetodoPagoPOS] = useState<'yape' | 'plin' | 'efectivo' | 'tarjeta'>('yape');
  const [clienteNombrePOS, setClienteNombrePOS] = useState<string>('Cliente Mostrador');
  const [clienteDniPOS, setClienteDniPOS] = useState<string>('');
  const [ticketModal, setTicketModal] = useState<ResultadoVentaPOS | null>(null);
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  // Buffer del Lector de Código de Barras 1D
  const scannerBufferRef = useRef<{
    chars: string[];
    timestamps: number[];
    startValue: string;
  }>({
    chars: [],
    timestamps: [],
    startValue: '',
  });

  // 1. CARGA INICIAL: ÍNDICE EN MEMORIA, ASISTENCIAS Y PRODUCTOS
  const sincronizarDatosIniciales = useCallback(async () => {
    setIsLoadingSocios(true);
    try {
      // Cargar socios ligeros
      const socios = await fetchSociosParaRecepcion();
      const newMap = new Map<string, SocioRecepcion>();
      socios.forEach((s) => newMap.set(s.dni, s));
      setSociosMap(newMap);

      // Cargar asistencias de los últimos 90 min
      const asistencias = await cargarAsistenciasActivas90Min();
      setAsistenciasActivas(asistencias);

      // Cargar productos del inventario
      const prods = await obtenerProductosInventario();
      setProductos(prods);

      // Revisar si hay cola offline
      const rawQueue = localStorage.getItem('trankilandia_asistencias_offline');
      if (rawQueue) {
        const queue = JSON.parse(rawQueue);
        setOfflinePendingCount(queue.length);
      }
    } catch {}
    setIsLoadingSocios(false);
  }, []);

  useEffect(() => {
    sincronizarDatosIniciales();
  }, [sincronizarDatosIniciales]);

  // Manejo de conexión online / offline
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const synced = await procesarColaAsistenciasOffline();
      if (synced > 0) {
        setOfflinePendingCount(0);
        setSuccessMessage(`Conexión restablecida. Sincronizadas ${synced} asistencias pendientes.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Intervalo local de 60s para refrescar aforo y limpiar asistencias expiradas
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // 2. CÁLCULO LOCAL DE AFORO EN VIVO (ÚLTIMOS 90 MINUTOS)
  const aforoEnVivo = useMemo(() => {
    const now = Date.now();
    const activas90 = asistenciasActivas.filter(
      (a) => now - new Date(a.fecha_ingreso).getTime() < 90 * 60 * 1000
    );

    const dnisUnicos = new Set(activas90.map((a) => a.dni));
    const manana = activas90.filter((a) => a.turno === 'manana').length;
    const tarde = activas90.filter((a) => a.turno === 'tarde').length;
    const noche = activas90.filter((a) => a.turno === 'noche').length;

    return {
      total: dnisUnicos.size,
      activas: activas90,
      manana,
      tarde,
      noche,
      capacidadMax: 80,
      porcentaje: Math.min(100, Math.round((dnisUnicos.size / 80) * 100)),
    };
  }, [asistenciasActivas]);

  // 3. PROCESAMIENTO RÁPIDO DE INGRESO CON SEMÁFORO Y ANTI-REBOTE (30 MIN)
  const procesarIngresoPorDni = useCallback(
    async (dniInput: string) => {
      const targetDni = dniInput.trim();
      if (!targetDni) return;

      const now = Date.now();

      // A) Comprobar Anti-Rebote en memoria (últimos 30 minutos)
      const ingresoReciente = asistenciasActivas.find(
        (a) => a.dni === targetDni && now - new Date(a.fecha_ingreso).getTime() < 30 * 60 * 1000
      );

      if (ingresoReciente) {
        const diffMin = Math.max(
          1,
          Math.round((now - new Date(ingresoReciente.fecha_ingreso).getTime()) / 60000)
        );
        playTone('rebote');
        setLastScanResult({
          status: 'rebote',
          socio: sociosMap.get(targetDni) || null,
          dni: targetDni,
          message: `YA REGISTRÓ INGRESO HACE ${diffMin} MIN (ANTI-REBOTE ACTIVO)`,
          timestamp: now,
          reboteMinutos: diffMin,
        });
        return;
      }

      // B) Buscar socio en el índice en memoria (< 2ms)
      const socio = sociosMap.get(targetDni);

      if (!socio) {
        playTone('error');
        setLastScanResult({
          status: 'no_encontrado',
          socio: null,
          dni: targetDni,
          message: `DNI ${targetDni} NO REGISTRADO`,
          timestamp: now,
        });
        return;
      }

      // Rellenar automáticamente datos en POS por comodidad
      setClienteNombrePOS(socio.nombre);
      setClienteDniPOS(socio.dni);

      // C) Membresía Vencida o Sin Membresía Activa
      if (
        socio.estado_calculado === 'vencido' ||
        socio.plan === 'Sin Membresía Activa' ||
        socio.precio_plan === 0
      ) {
        playTone('error');
        const isSinPlan = socio.plan === 'Sin Membresía Activa' || socio.precio_plan === 0;
        setLastScanResult({
          status: 'vencido',
          socio,
          dni: targetDni,
          message: isSinPlan
            ? `ACCESO DENEGADO · SOCIO SIN MEMBRESÍA ACTIVA`
            : `MEMBRESÍA VENCIDA HACE ${Math.abs(socio.dias_restantes)} DÍAS`,
          timestamp: now,
        });
        return;
      }

      // D) Membresía Activa con Adelanto / Deuda Pendiente
      if (socio.saldo_pendiente > 0) {
        playTone('warning');
        const nuevaAsistencia: AsistenciaActiva = {
          id: `local-${now}`,
          socio_id: socio.id,
          dni: socio.dni,
          nombre: socio.nombre,
          turno: socio.turno,
          fecha_ingreso: new Date().toISOString(),
        };

        // Agregar localmente para aforo inmediato
        setAsistenciasActivas((prev) => [nuevaAsistencia, ...prev]);

        // Registrar asíncrono en Supabase
        registrarAsistencia({
          socio_id: socio.id,
          dni: socio.dni,
          nombre: socio.nombre,
          turno: socio.turno,
        }).then((res) => {
          if (res.offlineQueued) {
            setOfflinePendingCount((c) => c + 1);
          }
        });

        setLastScanResult({
          status: 'con_deuda',
          socio,
          dni: targetDni,
          message: `INGRESO CON ADELANTO · DEUDA PENDIENTE: S/. ${socio.saldo_pendiente.toFixed(2)}`,
          timestamp: now,
        });
        return;
      }

      // E) Membresía 100% Activa y al Día
      playTone('success');
      const nuevaAsistencia: AsistenciaActiva = {
        id: `local-${now}`,
        socio_id: socio.id,
        dni: socio.dni,
        nombre: socio.nombre,
        turno: socio.turno,
        fecha_ingreso: new Date().toISOString(),
      };

      setAsistenciasActivas((prev) => [nuevaAsistencia, ...prev]);

      registrarAsistencia({
        socio_id: socio.id,
        dni: socio.dni,
        nombre: socio.nombre,
        turno: socio.turno,
      }).then((res) => {
        if (res.offlineQueued) {
          setOfflinePendingCount((c) => c + 1);
        }
      });

      setLastScanResult({
        status: 'al_dia',
        socio,
        dni: targetDni,
        message: `ACCESO AUTORIZADO · PLAN ${socio.plan.toUpperCase()}`,
        timestamp: now,
      });
    },
    [asistenciasActivas, sociosMap]
  );

  // 4. LISTENER GLOBAL DE TECLADO PARA LECTOR 1D (ANTI-COLISIÓN POR VELOCIDAD < 35MS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const buf = scannerBufferRef.current;

      if (e.key === 'Enter') {
        if (buf.chars.length >= 8) {
          // Medir el delta promedio
          const totalDuration = now - buf.timestamps[0];
          const avgDelta = totalDuration / (buf.chars.length - 1);

          if (avgDelta < 40) {
            // Es una ráfaga del lector de códigos de barras 1D
            e.preventDefault();
            e.stopPropagation();

            const scannedBarcode = buf.chars.join('');

            // Si el foco estaba en un input, revertir para no ensuciarlo
            const activeEl = document.activeElement;
            if (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) {
              activeEl.value = buf.startValue;
            }

            // Procesar el DNI o código escaneado
            procesarIngresoPorDni(scannedBarcode);

            // Limpiar buffer
            buf.chars = [];
            buf.timestamps = [];
            buf.startValue = '';
            return;
          }
        }
        // No fue ráfaga de escáner; resetear buffer
        buf.chars = [];
        buf.timestamps = [];
        buf.startValue = '';
        return;
      }

      // Capturar caracteres imprimibles (alfanuméricos)
      if (e.key.length === 1) {
        if (buf.chars.length > 0) {
          const delta = now - buf.timestamps[buf.timestamps.length - 1];
          if (delta > 55) {
            // Demasiado lento: fue pulsación humana manual
            const activeEl = document.activeElement;
            buf.chars = [e.key];
            buf.timestamps = [now];
            buf.startValue =
              activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement
                ? activeEl.value
                : '';
            return;
          }
        } else {
          // Primer caracter de una posible ráfaga
          const activeEl = document.activeElement;
          buf.startValue =
            activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement
              ? activeEl.value
              : '';
        }

        buf.chars.push(e.key);
        buf.timestamps.push(now);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [procesarIngresoPorDni]);

  // 5. REGISTRAR NUEVA INSCRIPCIÓN / RENOVACIÓN CON TURNO
  const handleProcessRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientDni.trim()) {
      alert('Por favor ingresa el nombre y DNI del socio.');
      return;
    }

    const price = selectedPlan.price;
    const paid = isAdvancePayment ? Math.min(advanceAmount, price) : price;
    const balance = isAdvancePayment ? Math.max(0, price - paid) : 0;

    let durationDays = 30;
    if (selectedPlan.name.includes('2 Mes')) durationDays = 60;
    else if (selectedPlan.name.includes('3 Mes')) durationDays = 90;
    else if (selectedPlan.name.includes('4 Mes')) durationDays = 120;
    else if (selectedPlan.name.includes('6 Mes')) durationDays = 180;
    else if (selectedPlan.name.includes('8 Mes')) durationDays = 240;
    else if (selectedPlan.name.includes('1 Año')) durationDays = 365;
    else if (selectedPlan.name.includes('Diario')) durationDays = 1;

    const expDate = new Date();
    expDate.setDate(expDate.getDate() + durationDays);
    const expDateISO = expDate.toISOString().slice(0, 10);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDateDays);
    const dueDateFormatted = dueDate.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const nextNumber = members.length + 510;
    const newMember: GymMember = {
      id: `MEM-00${members.length + 1}`,
      name: clientName.trim(),
      dni: clientDni.trim(),
      email: clientEmail.trim() || `${clientDni.trim()}@cliente.trankilandia.pe`,
      phone: clientEmail.includes('@') ? '' : clientEmail.trim(),
      plan: selectedPlan.name,
      planPrice: price,
      paymentType: isAdvancePayment ? 'advance' : 'full',
      advancePaid: paid,
      balanceDue: balance,
      paymentDueDate: isAdvancePayment ? dueDateFormatted : undefined,
      paymentMethod,
      receiptNumber: `B001-000${nextNumber}`,
      membershipStatus: 'active',
      expiresAt: expDateISO,
      coachName: COACHES_BY_SHIFT[clientShift],
      shift: clientShift,
      registeredAt: new Date().toISOString().slice(0, 10),
    };

    const updated = [newMember, ...members];
    setMembers(updated);
    saveStoredMembers(updated);

    // Actualizar índice en memoria de recepción
    const nuevoSocioRecepcion: SocioRecepcion = {
      id: newMember.id,
      dni: newMember.dni || '',
      nombre: newMember.name,
      plan: newMember.plan,
      precio_plan: newMember.planPrice,
      tipo_pago: newMember.paymentType,
      adelanto_pagado: newMember.advancePaid,
      saldo_pendiente: newMember.balanceDue,
      fecha_limite_pago: newMember.paymentDueDate || null,
      fecha_fin: expDateISO,
      turno: clientShift,
      coach_asignado: newMember.coachName || COACHES_BY_SHIFT[clientShift],
      dias_restantes: durationDays,
      estado_calculado: 'activo',
      tiene_deuda_activa: balance > 0,
      numero_boleta: newMember.receiptNumber,
    };

    setSociosMap((prev) => {
      const next = new Map(prev);
      next.set(nuevoSocioRecepcion.dni, nuevoSocioRecepcion);
      return next;
    });

    // Guardar en Supabase asíncrono
    await registerGymMember(newMember);

    // Abrir comprobante
    setReceiptModal({
      isOpen: true,
      member: newMember,
      amount: paid,
      type: isAdvancePayment ? 'Adelanto de Membresía' : 'Membresía Completa',
      method: paymentMethod,
    });

    setSuccessMessage(
      isAdvancePayment
        ? `Inscripción registrada con éxito. Cobrado adelanto de S/. ${paid}.00 a ${newMember.name}. Saldo pendiente: S/. ${balance}.00.`
        : `Membresía cancelada al 100% (S/. ${price}.00) para ${newMember.name}. Turno: ${clientShift.toUpperCase()}.`
    );

    // Resetear formulario
    setClientName('');
    setClientDni('');
    setClientEmail('');
    setIsAdvancePayment(false);
  };

  // Helper para recordatorio de vencimiento por WhatsApp
  const handleSendWhatsAppReminder = (member: GymMember) => {
    const phone = (member.phone || '').replace(/\D/g, '');
    if (!phone || phone.length < 7) {
      alert(`El socio ${member.name} no cuenta con un número de celular válido registrado.`);
      return;
    }
    const cleanPhone = phone.length === 9 ? `51${phone}` : phone;
    const nowLima = new Date().toISOString().slice(0, 10);
    const exp = member.expiresAt || '';
    const diffDays = Math.ceil((new Date(exp).getTime() - new Date(nowLima).getTime()) / (1000 * 60 * 60 * 24));

    let estadoMsg = `tu membresía de ${member.plan} vencerá el ${member.expiresAt} (en ${diffDays} días)`;
    if (diffDays < 0) {
      estadoMsg = `tu membresía de ${member.plan} culminó el ${member.expiresAt} (hace ${Math.abs(diffDays)} días)`;
    } else if (diffDays === 0) {
      estadoMsg = `tu membresía de ${member.plan} vence HOY ${member.expiresAt}`;
    }

    const msg = `¡Hola ${member.name}! 👋 Te saludamos de Trankilandia Gym 💪🏋️\n\nTe recordamos que ${estadoMsg}.\n\nPara que continúes entrenando sin interrupciones con tu coach ${member.coachName || 'oficial'}, acércate a recepción o responde este mensaje para renovar tu suscripción.\n\n¡Te esperamos en el gym! 🔥`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Helper para recordatorio de deuda por WhatsApp
  const handleSendWhatsAppDebtReminder = (member: GymMember) => {
    const phone = (member.phone || '').replace(/\D/g, '');
    if (!phone || phone.length < 7) {
      alert(`El socio ${member.name} no cuenta con un número de celular válido registrado.`);
      return;
    }
    const cleanPhone = phone.length === 9 ? `51${phone}` : phone;
    const msg = `¡Hola ${member.name}! 👋 Te saludamos de Trankilandia Gym 💪\n\nTe recordamos que mantienes un saldo pendiente de S/. ${member.balanceDue}.00 de tu membresía ${member.plan} (Adelantaste: S/. ${member.advancePaid}.00).\n\nPlazo límite acordado: ${member.paymentDueDate || 'Esta semana'}.\n\nPuedes cancelar tu saldo por Yape, Plin o en la recepción del gimnasio. ¡Gracias por entrenar con nosotros! 🔥`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Helper para iniciar renovación
  const handleStartRenewal = (member: GymMember) => {
    setClientDni(member.dni || '');
    setClientName(member.name);
    if (member.phone) setClientEmail(member.phone);
    if (member.shift) setClientShift(member.shift);
    const matchedPlan = PLANS_CATALOG.find((p) => p.name.toLowerCase().includes((member.plan || '').toLowerCase())) || PLANS_CATALOG[1];
    setSelectedPlan(matchedPlan);
    setActiveTab('inscripcion');
  };

  // 6. COBRAR SALDO PENDIENTE (LIQUIDACIÓN O ABONO PARCIAL)
  const handleConfirmLiquidate = async () => {
    if (!liquidatingMember) return;

    const amountToCharge =
      customAbonoAmount > 0
        ? Math.min(liquidatingMember.balanceDue, customAbonoAmount)
        : liquidatingMember.balanceDue;

    await payMemberBalance(liquidatingMember.id, liquidateMethod, amountToCharge);

    const newBalance = Math.max(0, liquidatingMember.balanceDue - amountToCharge);
    const newAdvance = liquidatingMember.advancePaid + amountToCharge;
    const isFull = newBalance === 0;

    const updated = members.map((m) => {
      if (m.id === liquidatingMember.id) {
        return {
          ...m,
          paymentType: isFull ? ('full' as const) : ('advance' as const),
          advancePaid: newAdvance,
          balanceDue: newBalance,
          paymentDueDate: isFull ? undefined : m.paymentDueDate,
          receiptNumber: `B001-000${members.length + 512} (${isFull ? 'Liquidación Total' : 'Abono Parcial'})`,
        };
      }
      return m;
    });

    setMembers(updated);
    saveStoredMembers(updated);

    // Actualizar socio en el mapa local
    const socioEnMapa = sociosMap.get(liquidatingMember.dni || '');
    if (socioEnMapa) {
      const socioActualizado: SocioRecepcion = {
        ...socioEnMapa,
        tipo_pago: isFull ? 'full' : 'advance',
        adelanto_pagado: newAdvance,
        saldo_pendiente: newBalance,
        fecha_limite_pago: isFull ? null : socioEnMapa.fecha_limite_pago,
        tiene_deuda_activa: !isFull,
      };
      setSociosMap((prev) => {
        const next = new Map(prev);
        next.set(socioActualizado.dni, socioActualizado);
        return next;
      });

      // Refrescar resultado del semáforo si coincide
      if (lastScanResult.dni === liquidatingMember.dni) {
        setLastScanResult({
          status: isFull ? 'al_dia' : 'con_deuda',
          socio: socioActualizado,
          dni: socioActualizado.dni,
          message: isFull
            ? `SALDO CANCELADO · MEMBRESÍA AL DÍA 100%`
            : `ABONO REGISTRADO · SALDO RESTANTE: S/. ${newBalance.toFixed(2)}`,
          timestamp: Date.now(),
        });
      }
    }

    const updatedMember = updated.find((m) => m.id === liquidatingMember.id);
    if (updatedMember) {
      setReceiptModal({
        isOpen: true,
        member: updatedMember,
        amount: amountToCharge,
        type: isFull ? 'Cancelación Total de Saldo' : 'Abono Parcial de Membresía',
        method: liquidateMethod,
      });
    }

    setSuccessMessage(
      `¡Abono de S/. ${amountToCharge.toFixed(2)} registrado con éxito a ${liquidatingMember.name}! Saldo restante: S/. ${newBalance.toFixed(2)}`
    );
    setLiquidatingMember(null);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // 7. FUNCIONES DEL TERMINAL PUNTO DE VENTA (POS)
  const agregarAlCarrito = (producto: ProductoPOS) => {
    if (producto.stock_actual <= 0) {
      alert(`El producto ${producto.nombre} está agotado.`);
      return;
    }

    setCarrito((prev) => {
      const existe = prev.find((item) => item.producto.id === producto.id);
      if (existe) {
        if (existe.cantidad >= producto.stock_actual) {
          alert(`No hay más stock disponible de ${producto.nombre} (Stock: ${producto.stock_actual}).`);
          return prev;
        }
        return prev.map((item) =>
          item.producto.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  };

  const modificarCantidadCarrito = (productoId: string, delta: number) => {
    setCarrito((prev) => {
      return prev
        .map((item) => {
          if (item.producto.id === productoId) {
            const nuevaCantidad = item.cantidad + delta;
            if (nuevaCantidad > item.producto.stock_actual) {
              alert(`Stock máximo disponible alcanzado (${item.producto.stock_actual}).`);
              return item;
            }
            return { ...item, cantidad: nuevaCantidad };
          }
          return item;
        })
        .filter((item) => item.cantidad > 0);
    });
  };

  const eliminarDelCarrito = (productoId: string) => {
    setCarrito((prev) => prev.filter((item) => item.producto.id !== productoId));
  };

  const totalCarrito = useMemo(() => {
    return carrito.reduce((sum, item) => sum + item.producto.precio_venta * item.cantidad, 0);
  }, [carrito]);

  const procesarVentaPOS = async () => {
    if (carrito.length === 0) {
      alert('Agrega al menos un producto al carrito para vender.');
      return;
    }

    setIsProcessingSale(true);
    try {
      const itemsPayload: ItemVentaPOS[] = carrito.map((c) => ({
        producto_id: c.producto.id,
        cantidad: c.cantidad,
      }));

      const res = await registrarVentaPOS(
        itemsPayload,
        metodoPagoPOS,
        clienteNombrePOS,
        clienteDniPOS
      );

      // Descontar inventario local
      setProductos((prev) =>
        prev.map((p) => {
          const enCarrito = carrito.find((c) => c.producto.id === p.id);
          if (enCarrito) {
            return { ...p, stock_actual: Math.max(0, p.stock_actual - enCarrito.cantidad) };
          }
          return p;
        })
      );

      playTone('success');
      setTicketModal(res);
      setCarrito([]);
      setClienteNombrePOS('Cliente Mostrador');
      setClienteDniPOS('');
    } catch (err: any) {
      playTone('error');
      alert(`Error al registrar venta: ${err.message || 'Compruebe conexión o stock.'}`);
    }
    setIsProcessingSale(false);
  };

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideCat = categoriaSeleccionada === 'Todos' || p.categoria === categoriaSeleccionada;
      const coincideFiltro =
        p.nombre.toLowerCase().includes(filtroProducto.toLowerCase()) ||
        (p.codigo_barras && p.codigo_barras.includes(filtroProducto)) ||
        p.id.toLowerCase().includes(filtroProducto.toLowerCase());
      return coincideCat && coincideFiltro;
    });
  }, [productos, categoriaSeleccionada, filtroProducto]);

  // Socios con deuda
  const membersWithDebt = useMemo(() => members.filter((m) => m.balanceDue > 0), [members]);
  const totalDebts = useMemo(() => membersWithDebt.reduce((sum, m) => sum + m.balanceDue, 0), [membersWithDebt]);

  // Métricas consolidadas del CRM de Vencimientos
  const crmStats = useMemo(() => {
    let porVencer = 0;
    let vencidos = 0;
    let vigentes = 0;
    let conDeuda = 0;

    const nowLima = new Date().toISOString().slice(0, 10);

    members.forEach((m) => {
      const exp = m.expiresAt || '';
      const diffDays = Math.ceil((new Date(exp).getTime() - new Date(nowLima).getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) vencidos++;
      else if (diffDays <= 7) porVencer++;
      else vigentes++;

      if (m.balanceDue > 0) conDeuda++;
    });

    return {
      total: members.length,
      porVencer,
      vencidos,
      vigentes,
      conDeuda,
    };
  }, [members]);

  // Socios filtrados en el CRM
  const filteredCrmMembers = useMemo(() => {
    const query = crmSearch.toLowerCase().trim();
    const nowLima = new Date().toISOString().slice(0, 10);

    return members.filter((m) => {
      const matchesSearch =
        !query ||
        m.name.toLowerCase().includes(query) ||
        (m.dni && m.dni.includes(query)) ||
        (m.phone && m.phone.includes(query)) ||
        m.plan.toLowerCase().includes(query) ||
        (m.coachName && m.coachName.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      if (crmShiftFilter !== 'todos' && m.shift !== crmShiftFilter) {
        return false;
      }

      const exp = m.expiresAt || '';
      const diffDays = Math.ceil((new Date(exp).getTime() - new Date(nowLima).getTime()) / (1000 * 60 * 60 * 24));

      if (crmFilter === 'por_vencer') return diffDays >= 0 && diffDays <= 7;
      if (crmFilter === 'vencidos') return diffDays < 0;
      if (crmFilter === 'vigentes') return diffDays > 7;
      if (crmFilter === 'con_deuda') return m.balanceDue > 0;

      return true;
    });
  }, [members, crmSearch, crmFilter, crmShiftFilter]);

  const paginatedCrmMembers = useMemo(() => {
    const start = (crmPage - 1) * crmPageSize;
    return filteredCrmMembers.slice(start, start + crmPageSize);
  }, [filteredCrmMembers, crmPage]);

  const totalCrmPages = Math.max(1, Math.ceil(filteredCrmMembers.length / crmPageSize));

  useEffect(() => {
    setCrmPage(1);
  }, [crmSearch, crmFilter, crmShiftFilter]);

  // Socios con deuda filtrados para Cobros
  const filteredDebtors = useMemo(() => {
    const query = cobrosSearch.toLowerCase().trim();
    return membersWithDebt.filter((m) => {
      if (!query) return true;
      return (
        m.name.toLowerCase().includes(query) ||
        (m.dni && m.dni.includes(query)) ||
        (m.phone && m.phone.includes(query)) ||
        m.plan.toLowerCase().includes(query)
      );
    });
  }, [membersWithDebt, cobrosSearch]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans pb-16 selection:bg-amber-400 selection:text-black">
      <PortalHeader
        currentRole="caja"
        title="Recepción, Acceso 1D & POS"
        subtitle="Control de Acceso Local-First · Aforo en Tiempo Real (90m) · Venta de Bebidas & Suplementos"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* BARRA SUPERIOR DE ESTADO Y PESTAÑAS (ORDENADA POR PRIORIDAD OFICIAL) */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-zinc-900/80 border border-white/10 rounded-3xl p-4 sm:p-5 backdrop-blur-md">
          {/* Navegación por Pestañas */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            {/* 1. Prioridad: Control Acceso 1D */}
            <button
              type="button"
              onClick={() => setActiveTab('acceso')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'acceso'
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
              }`}
            >
              <Barcode className="w-4 h-4" />
              <span>Control Acceso 1D</span>
              {isLoadingSocios && <RefreshCw className="w-3 h-3 animate-spin text-zinc-400" />}
            </button>

            {/* 2. Prioridad: Nueva Inscripción (Segundo en prioridad) */}
            <button
              type="button"
              onClick={() => setActiveTab('inscripcion')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'inscripcion'
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Nueva Inscripción</span>
            </button>

            {/* 3. CRM Vencimientos */}
            <button
              type="button"
              onClick={() => setActiveTab('crm')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'crm'
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
              }`}
            >
              <CalendarClock className="w-4 h-4" />
              <span>CRM Vencimientos</span>
              {crmStats.porVencer > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black">
                  {crmStats.porVencer} por vencer
                </span>
              )}
            </button>

            {/* 4. Cobros & Deudas */}
            <button
              type="button"
              onClick={() => setActiveTab('cobros')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'cobros'
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Cobros & Deudas</span>
              {membersWithDebt.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-black">
                  {membersWithDebt.length} deudas
                </span>
              )}
            </button>

            {/* 5. Punto de Venta (POS) */}
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'pos'
                  ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-400/20'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Punto de Venta (POS)</span>
              {carrito.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-black text-emerald-400 text-[10px] font-black flex items-center justify-center">
                  {carrito.reduce((s, i) => s + i.cantidad, 0)}
                </span>
              )}
            </button>
          </div>

          {/* Medidor de Aforo en Sala & Conexión */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Indicador de Aforo */}
            <div className="flex items-center gap-3 bg-zinc-950/80 border border-white/10 px-4 py-2 rounded-2xl">
              <Users className="w-4 h-4 text-amber-400" />
              <div className="text-xs font-mono">
                <span className="text-zinc-400">Aforo Sala: </span>
                <span className="text-white font-bold text-sm">{aforoEnVivo.total}</span>
                <span className="text-zinc-500"> / {aforoEnVivo.capacidadMax}</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 border-l border-white/10 pl-3">
                <span title="Mañana (6:00 AM - 2:00 PM)" className="flex items-center gap-0.5">
                  <Sun className="w-3 h-3 text-amber-400" /> {aforoEnVivo.manana}
                </span>
                <span title="Tarde (2:00 PM - 6:00 PM)" className="flex items-center gap-0.5">
                  <Sunset className="w-3 h-3 text-orange-400" /> {aforoEnVivo.tarde}
                </span>
                <span title="Noche (6:00 PM - 10:00 PM)" className="flex items-center gap-0.5">
                  <Moon className="w-3 h-3 text-blue-400" /> {aforoEnVivo.noche}
                </span>
              </div>
            </div>

            {/* Estado de Red / Cola Offline */}
            <div className="flex items-center gap-2">
              {isOnline ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                  <Wifi className="w-3.5 h-3.5" />
                  <span>En Línea</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-red-400 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-xl animate-pulse">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Modo Offline Local</span>
                </span>
              )}

              {offlinePendingCount > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    const synced = await procesarColaAsistenciasOffline();
                    if (synced > 0) {
                      setOfflinePendingCount(0);
                      alert(`Sincronizadas ${synced} asistencias pendientes con Supabase.`);
                    }
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-amber-400 text-black px-2.5 py-1.5 rounded-xl cursor-pointer hover:bg-amber-300"
                >
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>{offlinePendingCount} en cola</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* MENSAJES DE ALERTA O ÉXITO */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3 font-mono shadow-lg"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        )}

        {/* =========================================================================
            PESTAÑA 1: CONTROL DE ACCESO 1D & SEMÁFORO EN TIEMPO REAL
           ========================================================================= */}
        {activeTab === 'acceso' && (
          <div className="space-y-6">
            {/* HERO DEL ESCÁNER & SEMÁFORO VISUAL */}
            <section className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-black border-2 border-amber-400/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-white/10">
                <div className="flex items-center gap-3.5">
                  <div className="p-3.5 rounded-2xl bg-amber-400 text-black font-black shadow-lg shadow-amber-400/20">
                    <Barcode className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black uppercase text-white font-display tracking-tight flex items-center gap-2">
                      <span>Lector de Código de Barras 1D</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    </h2>
                    <p className="text-xs text-zinc-400 font-sans mt-0.5">
                      Pasa el lector por la tarjeta física/digital o tipea el DNI. Detección automática en &lt; 5ms con protección anti-rebote.
                    </p>
                  </div>
                </div>

                {/* Estado del Sensor */}
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-950/90 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-bold uppercase tracking-wider">Lector 1D Listo</span>
                </div>
              </div>

              {/* Input Manual de DNI */}
              <div className="mt-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (scannedDniInput.trim()) {
                      procesarIngresoPorDni(scannedDniInput.trim());
                      setScannedDniInput('');
                    }
                  }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={12}
                      value={scannedDniInput}
                      onChange={(e) => setScannedDniInput(e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="Dispara con el lector 1D o escribe el DNI manual..."
                      className="w-full pl-12 pr-4 py-3.5 bg-zinc-950 border border-white/20 rounded-2xl text-base font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors shadow-inner"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-amber-400 hover:bg-amber-300 text-black font-black px-6 py-3.5 rounded-2xl text-sm font-display uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20"
                  >
                    <Search className="w-4 h-4" />
                    <span>REGISTRAR INGRESO</span>
                  </button>
                </form>
              </div>

              {/* SEMÁFORO VISUAL INTERACTIVO */}
              <AnimatePresence mode="wait">
                {lastScanResult.status && (
                  <motion.div
                    key={lastScanResult.dni + lastScanResult.timestamp}
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -10 }}
                    className="mt-6"
                  >
                    {/* CASO 1: ANTI-REBOTE (INGRESÓ HACE MENOS DE 30 MIN) */}
                    {lastScanResult.status === 'rebote' && (
                      <div className="p-6 rounded-2xl bg-blue-500/10 border-2 border-blue-500/40 relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="p-3.5 rounded-2xl bg-blue-500 text-white flex-shrink-0 shadow-lg">
                              <Clock className="w-7 h-7" />
                            </div>
                            <div>
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                <span>ℹ️ ANTI-REBOTE ACTIVO (30 MIN)</span>
                              </div>
                              <h3 className="text-xl font-black text-white font-display uppercase tracking-tight mt-1.5">
                                {lastScanResult.socio ? lastScanResult.socio.nombre : `DNI ${lastScanResult.dni}`}
                              </h3>
                              <p className="text-xs text-blue-200 font-mono mt-0.5">
                                Este socio ya registró su ingreso hace{' '}
                                <span className="font-bold text-white">{lastScanResult.reboteMinutos} minutos</span>. No se duplicó la asistencia en Supabase.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CASO 2: SOCIO 100% AL DÍA (ACCESO PERMITIDO) */}
                    {lastScanResult.status === 'al_dia' && lastScanResult.socio && (
                      <div className="p-6 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="p-3.5 rounded-2xl bg-emerald-500 text-black flex-shrink-0 shadow-lg">
                              <CheckCircle2 className="w-7 h-7" />
                            </div>
                            <div>
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <span>🟢 ACCESO CONCEDIDO · MEMBRESÍA AL DÍA</span>
                              </div>
                              <h3 className="text-2xl font-black text-white font-display uppercase tracking-tight mt-1.5">
                                {lastScanResult.socio.nombre}
                              </h3>
                              <p className="text-xs text-zinc-300 font-mono mt-0.5">
                                DNI: <span className="font-bold text-white">{lastScanResult.socio.dni}</span> · Plan:{' '}
                                <span className="text-emerald-400 font-bold">{lastScanResult.socio.plan}</span> · Turno:{' '}
                                <span className="text-white font-bold uppercase">{lastScanResult.socio.turno}</span>
                              </p>
                              <div className="mt-3 flex items-center gap-3 text-[11px] font-mono text-zinc-400">
                                <span>Entrenador: <strong className="text-white">{lastScanResult.socio.coach_asignado}</strong></span>
                                <span>•</span>
                                <span>Vence en: <strong className="text-emerald-400">{lastScanResult.socio.dias_restantes} días</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const found = members.find((m) => m.dni === lastScanResult.socio?.dni);
                                if (found) {
                                  setReceiptModal({
                                    isOpen: true,
                                    member: found,
                                    amount: found.advancePaid,
                                    type: 'Membresía Completa',
                                    method: found.paymentMethod,
                                  });
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5 text-amber-400" />
                              <span>Boleta {lastScanResult.socio.numero_boleta}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const found = members.find((m) => m.dni === lastScanResult.socio?.dni);
                                if (found) setProfileModalMember(found);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
                            >
                              <User className="w-3.5 h-3.5 text-amber-400" />
                              <span>Gestionar Perfil</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CASO 3: SOCIO CON SALDO PENDIENTE (ADELANTO) */}
                    {lastScanResult.status === 'con_deuda' && lastScanResult.socio && (
                      <div className="p-6 rounded-2xl bg-amber-500/10 border-2 border-amber-500/50 relative overflow-hidden">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                          <div className="flex items-start gap-4">
                            <div className="p-3.5 rounded-2xl bg-amber-500 text-black flex-shrink-0 shadow-lg">
                              <AlertTriangle className="w-7 h-7" />
                            </div>
                            <div>
                              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                                🟡 INGRESO CON ADELANTO · SALDO DEUDOR
                              </div>
                              <h3 className="text-2xl font-black text-white font-display uppercase tracking-tight mt-2">
                                {lastScanResult.socio.nombre}
                              </h3>
                              <p className="text-xs text-zinc-300 font-mono mt-0.5">
                                DNI: <span className="font-bold text-white">{lastScanResult.socio.dni}</span> · Plan:{' '}
                                <span className="text-amber-300 font-bold">{lastScanResult.socio.plan}</span>
                              </p>

                              <div className="mt-4 flex flex-wrap gap-3 text-xs font-mono">
                                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-white/10">
                                  <span className="text-zinc-400 block text-[10px] uppercase">Costo Total:</span>
                                  <span className="text-white font-bold text-sm">S/. {lastScanResult.socio.precio_plan.toFixed(2)}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-emerald-500/30">
                                  <span className="text-emerald-400 block text-[10px] uppercase">Abonado:</span>
                                  <span className="text-emerald-400 font-bold text-sm">S/. {lastScanResult.socio.adelanto_pagado.toFixed(2)}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-red-500/40">
                                  <span className="text-red-400 block text-[10px] uppercase font-black">SALDO DEUDOR:</span>
                                  <span className="text-red-400 font-black text-base">S/. {lastScanResult.socio.saldo_pendiente.toFixed(2)}</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-white/10">
                                  <span className="text-zinc-400 block text-[10px] uppercase">Plazo Límite:</span>
                                  <span className="text-amber-400 font-bold text-sm">{lastScanResult.socio.fecha_limite_pago || 'En el transcurso'}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex-shrink-0 flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const found = members.find((m) => m.dni === lastScanResult.socio?.dni);
                                if (found) {
                                  setLiquidatingMember(found);
                                  setCustomAbonoAmount(found.balanceDue);
                                }
                              }}
                              className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm font-display uppercase tracking-wider transition-all shadow-xl shadow-emerald-500/20 cursor-pointer"
                            >
                              <DollarSign className="w-5 h-5" />
                              <span>COBRAR / ABONAR SALDO</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const found = members.find((m) => m.dni === lastScanResult.socio?.dni);
                                if (found) setProfileModalMember(found);
                              }}
                              className="w-full lg:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-mono border border-white/5 transition-colors cursor-pointer"
                            >
                              <User className="w-3.5 h-3.5 text-amber-400" />
                              <span>Gestionar Perfil</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CASO 4: SOCIO CON MEMBRESÍA VENCIDA O SIN MEMBRESÍA ACTIVA */}
                    {lastScanResult.status === 'vencido' && lastScanResult.socio && (
                      <div className="p-6 rounded-2xl bg-red-500/10 border-2 border-red-500/50 relative overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="p-3.5 rounded-2xl bg-red-500 text-white flex-shrink-0 shadow-lg">
                              <ShieldAlert className="w-7 h-7" />
                            </div>
                            <div>
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-black uppercase bg-red-500/20 text-red-300 border border-red-500/30">
                                <span>
                                  {lastScanResult.socio.plan === 'Sin Membresía Activa' || lastScanResult.socio.precio_plan === 0
                                    ? '🔴 ACCESO DENEGADO · SIN MEMBRESÍA'
                                    : '🔴 MEMBRESÍA VENCIDA'}
                                </span>
                              </div>
                              <h3 className="text-2xl font-black text-white font-display uppercase tracking-tight mt-1.5">
                                {lastScanResult.socio.nombre}
                              </h3>
                              <p className="text-xs text-red-200 font-mono mt-0.5">
                                {lastScanResult.socio.plan === 'Sin Membresía Activa' || lastScanResult.socio.precio_plan === 0
                                  ? 'Socio registrado con carnet pero sin plan activo. Requiere inscripción para ingresar.'
                                  : `Su plan venció hace ${Math.abs(lastScanResult.socio.dias_restantes)} días. Requiere renovación para ingresar a entrenar.`}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const found = members.find((m) => m.dni === lastScanResult.socio?.dni);
                                if (found) setProfileModalMember(found);
                              }}
                              className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs font-display uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-400/20"
                            >
                              ⚡ Inscribir / Renovar Membresía
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CASO 5: NO ENCONTRADO */}
                    {lastScanResult.status === 'no_encontrado' && (
                      <div className="p-6 rounded-2xl bg-zinc-900 border border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <p className="text-sm font-mono text-zinc-300">
                            No se encontró ningún socio registrado con el DNI <span className="font-bold text-amber-400">{lastScanResult.dni}</span>.
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">
                            Puedes inscribirlo en la pestaña de Inscripción dejando un adelanto o pago completo.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('inscripcion');
                            setClientDni(lastScanResult.dni);
                          }}
                          className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs font-display uppercase tracking-wider cursor-pointer"
                        >
                          INSCRIBIR SOCIO
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* HISTORIAL RECIENTE DE ASISTENCIAS EN SALA (ÚLTIMOS 90 MIN) */}
            <section className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-base font-bold text-white font-display uppercase tracking-wide">
                      Atletas en Sala (Últimos 90 minutos)
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono">
                      Aforo real en tiempo real: {aforoEnVivo.total} personas entrenando
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  {aforoEnVivo.porcentaje}% Ocupación
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-1">
                {aforoEnVivo.activas.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-zinc-500 font-mono text-xs">
                    No hay ingresos registrados en los últimos 90 minutos.
                  </div>
                ) : (
                  aforoEnVivo.activas.map((ast) => {
                    const minutesAgo = Math.round(
                      (Date.now() - new Date(ast.fecha_ingreso).getTime()) / 60000
                    );
                    return (
                      <div
                        key={ast.id}
                        className="p-3 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-between gap-3 text-xs font-mono"
                      >
                        <div className="truncate">
                          <div className="font-bold text-white truncate">{ast.nombre}</div>
                          <div className="text-[11px] text-zinc-400">
                            DNI: {ast.dni} · <span className="uppercase text-amber-400">{ast.turno}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-[10px] text-zinc-400 block">Hace</span>
                          <span className="text-emerald-400 font-bold">{minutesAgo} min</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 2: TERMINAL PUNTO DE VENTA (POS) & INVENTARIO INTEGRADO
           ========================================================================= */}
        {activeTab === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* CATÁLOGO DE PRODUCTOS (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {/* Barra de Filtros y Búsqueda */}
              <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={filtroProducto}
                    onChange={(e) => setFiltroProducto(e.target.value)}
                    placeholder="Buscar producto por nombre, SKU o código de barras..."
                    className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                {/* Filtro por Categoría */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {['Todos', 'Bebidas', 'Energizantes', 'Proteinas', 'Suplementos', 'Snacks'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoriaSeleccionada(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                        categoriaSeleccionada === cat
                          ? 'bg-emerald-400 text-black'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid de Productos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {productosFiltrados.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-zinc-500 font-mono text-xs">
                    No se encontraron productos que coincidan con la búsqueda.
                  </div>
                ) : (
                  productosFiltrados.map((prod) => {
                    const isLowStock = prod.stock_actual <= prod.stock_minimo && prod.stock_actual > 0;
                    const isOutOfStock = prod.stock_actual <= 0;

                    return (
                      <div
                        key={prod.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                          isOutOfStock
                            ? 'bg-zinc-900/40 border-red-500/20 opacity-60'
                            : 'bg-zinc-900/80 border-white/10 hover:border-emerald-400/50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                            <span className="text-zinc-500">{prod.id}</span>
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold ${
                                isOutOfStock
                                  ? 'bg-red-500/20 text-red-400'
                                  : isLowStock
                                  ? 'bg-amber-400/20 text-amber-400'
                                  : 'bg-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              Stock: {prod.stock_actual}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-white font-sans line-clamp-2">
                            {prod.nombre}
                          </h4>
                          <span className="text-[11px] font-mono text-zinc-400 mt-1 block">
                            {prod.categoria}
                          </span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                          <span className="text-lg font-black font-display text-emerald-400">
                            S/. {prod.precio_venta.toFixed(2)}
                          </span>

                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => agregarAlCarrito(prod)}
                            className={`p-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isOutOfStock
                                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                                : 'bg-emerald-400 hover:bg-emerald-300 text-black shadow-md'
                            }`}
                          >
                            <Plus className="w-4 h-4" />
                            <span>AGREGAR</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* CARRITO Y COBRO EN CAJA (4 cols) */}
            <div className="lg:col-span-4 bg-zinc-900/90 border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-base font-bold text-white font-display uppercase tracking-wide">
                      Carrito de Venta
                    </h3>
                  </div>
                  {carrito.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCarrito([])}
                      className="text-[11px] font-mono text-red-400 hover:underline cursor-pointer"
                    >
                      Vaciar
                    </button>
                  )}
                </div>

                {/* Lista de Items en Carrito */}
                <div className="mt-3 space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {carrito.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 font-mono text-xs">
                      El carrito está vacío. Haz clic en "Agregar" en cualquier producto.
                    </div>
                  ) : (
                    carrito.map((item) => (
                      <div
                        key={item.producto.id}
                        className="p-3 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-between gap-2 text-xs font-mono"
                      >
                        <div className="truncate flex-1">
                          <div className="font-bold text-white truncate">{item.producto.nombre}</div>
                          <div className="text-[11px] text-emerald-400">
                            S/. {item.producto.precio_venta.toFixed(2)} c/u
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => modificarCantidadCarrito(item.producto.id, -1)}
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-bold text-white">{item.cantidad}</span>
                          <button
                            type="button"
                            onClick={() => modificarCantidadCarrito(item.producto.id, 1)}
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminarDelCarrito(item.producto.id)}
                            className="p-1 ml-1 text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Datos del Cliente y Método de Pago */}
              <div className="pt-3 border-t border-white/10 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase font-bold mb-1">
                      Cliente
                    </label>
                    <input
                      type="text"
                      value={clienteNombrePOS}
                      onChange={(e) => setClienteNombrePOS(e.target.value)}
                      placeholder="Cliente Mostrador"
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase font-bold mb-1">
                      DNI (Opcional)
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={clienteDniPOS}
                      onChange={(e) => setClienteDniPOS(e.target.value.replace(/\D/g, ''))}
                      placeholder="DNI"
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                {/* Métodos de Pago POS */}
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase font-bold mb-1.5 font-mono">
                    Método de Pago
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    {[
                      { id: 'yape', label: 'Yape', icon: Smartphone },
                      { id: 'plin', label: 'Plin', icon: QrCode },
                      { id: 'efectivo', label: 'Efectivo', icon: Banknote },
                      { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
                    ].map((m) => {
                      const Icon = m.icon;
                      const isSelected = metodoPagoPOS === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMetodoPagoPOS(m.id as any)}
                          className={`flex items-center gap-1.5 p-2 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-400/20 border-emerald-400 text-emerald-400'
                              : 'bg-zinc-950 border-white/10 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Total y Botón de Venta */}
                <div className="p-3 rounded-2xl bg-zinc-950 border border-emerald-500/30 flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-zinc-400">Total a Pagar:</span>
                  <span className="text-2xl font-black font-display text-emerald-400">
                    S/. {totalCarrito.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={carrito.length === 0 || isProcessingSale}
                  onClick={procesarVentaPOS}
                  className={`w-full py-3.5 rounded-xl font-black text-xs font-display uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl ${
                    carrito.length === 0 || isProcessingSale
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-emerald-400 hover:bg-emerald-300 text-black shadow-emerald-400/20'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isProcessingSale ? 'PROCESANDO...' : `COBRAR VENTA (S/. ${totalCarrito.toFixed(2)})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 2: NUEVA INSCRIPCIÓN O RENOVACIÓN (SEGUNDA EN PRIORIDAD)
           ========================================================================= */}
        {activeTab === 'inscripcion' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Formulario de Registro (7 cols) */}
            <div className="lg:col-span-7 bg-zinc-900/60 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="p-3 rounded-2xl bg-amber-400 text-black font-black shadow-lg shadow-amber-400/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white font-display uppercase tracking-wide">
                    Nueva Inscripción o Renovación
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Registro oficial de membresía con turno oficial asignado, coach y adelantos
                  </p>
                </div>
              </div>

              <form onSubmit={handleProcessRegistration} className="mt-6 space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-zinc-400 font-bold mb-1.5 uppercase">
                    Plan o Membresía Oficial
                  </label>
                  <select
                    value={selectedPlan.name}
                    onChange={(e) => {
                      const plan = PLANS_CATALOG.find((p) => p.name === e.target.value);
                      if (plan) setSelectedPlan(plan);
                    }}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-3 text-zinc-200 focus:outline-none focus:border-amber-400 cursor-pointer font-bold text-sm"
                  >
                    {PLANS_CATALOG.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} — S/. {p.price}.00
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selector de Turno */}
                <div>
                  <label className="block text-zinc-400 font-bold mb-1.5 uppercase">
                    Turno de Entrenamiento & Coach Asignado
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'manana', label: 'Mañana (6am-2pm)', icon: Sun },
                      { id: 'tarde', label: 'Tarde (2pm-6pm)', icon: Sunset },
                      { id: 'noche', label: 'Noche (6pm-10pm)', icon: Moon },
                    ].map((t) => {
                      const Icon = t.icon;
                      const isSelected = clientShift === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setClientShift(t.id as any)}
                          className={`p-3 rounded-xl border text-[11px] font-bold text-center flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-amber-400/20 border-amber-400 text-amber-400 shadow-md'
                              : 'bg-zinc-950 border-white/10 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1.5 flex items-center gap-1.5">
                    <span>Coach oficial asignado:</span>
                    <strong className="text-amber-400">{COACHES_BY_SHIFT[clientShift]}</strong>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 font-bold mb-1.5 uppercase">
                      Número de DNI (8 Dígitos)
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      required
                      value={clientDni}
                      onChange={(e) => setClientDni(e.target.value.replace(/\D/g, ''))}
                      placeholder="87654321"
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:outline-none focus:border-amber-400 font-mono tracking-widest text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-bold mb-1.5 uppercase">
                      Precio Oficial del Plan
                    </label>
                    <div className="w-full bg-zinc-950 border border-white/10 text-amber-400 font-bold text-base rounded-xl px-3.5 py-2 flex items-center justify-between">
                      <span className="text-zinc-500 text-xs">PEN</span>
                      <span>S/. {selectedPlan.price}.00</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 font-bold mb-1.5 uppercase">
                      Nombre Completo del Atleta
                    </label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ej: Daniel Quispe Huamán"
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:outline-none focus:border-amber-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-bold mb-1.5 uppercase">
                      Celular / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="Ej: 966123456"
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:outline-none focus:border-amber-400 text-sm"
                    />
                  </div>
                </div>

                {/* Opción de Adelanto vs Pago Completo */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-amber-400/20 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-zinc-200 font-bold text-xs uppercase">Modalidad de Pago</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAdvancePayment(false)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          !isAdvancePayment
                            ? 'bg-emerald-500 text-black font-black'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        PAGO COMPLETO
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAdvancePayment(true)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isAdvancePayment
                            ? 'bg-amber-400 text-black font-black'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        DEJAR ADELANTO
                      </button>
                    </div>
                  </div>

                  {isAdvancePayment && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-3 border-t border-white/10 space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-amber-400 font-bold mb-1">
                            Adelanto que paga hoy (S/.)
                          </label>
                          <input
                            type="number"
                            min={10}
                            max={selectedPlan.price - 5}
                            value={advanceAmount}
                            onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                            className="w-full bg-zinc-900 border border-amber-400/50 rounded-xl px-3 py-2 text-amber-400 font-black text-sm focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-red-400 font-bold mb-1">
                            Saldo que queda a deber
                          </label>
                          <div className="w-full bg-zinc-900 border border-red-500/30 rounded-xl px-3 py-2 text-red-400 font-black text-sm">
                            S/. {Math.max(0, selectedPlan.price - advanceAmount)}.00
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-zinc-400 font-bold mb-1">
                          Plazo acordado para completar saldo:
                        </label>
                        <select
                          value={dueDateDays}
                          onChange={(e) => setDueDateDays(Number(e.target.value))}
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-zinc-200"
                        >
                          <option value={7}>7 Días (1 Semana)</option>
                          <option value={10}>10 Días</option>
                          <option value={15}>15 Días (Medio mes)</option>
                          <option value={20}>20 Días</option>
                        </select>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Selector de Método de Pago */}
                <div>
                  <label className="block text-zinc-400 font-bold mb-2 uppercase">
                    Método de Cobro
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'yape', label: 'YAPE (QR)', icon: Smartphone },
                      { id: 'plin', label: 'PLIN', icon: QrCode },
                      { id: 'efectivo', label: 'EFECTIVO', icon: Banknote },
                      { id: 'tarjeta', label: 'TARJETA POS', icon: CreditCard },
                    ].map((m) => {
                      const Icon = m.icon;
                      const isSelected = paymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id as any)}
                          className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-400/15 border-amber-400 text-amber-400'
                              : 'bg-zinc-950 border-white/10 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 bg-amber-400 hover:bg-amber-300 text-black font-black py-4 rounded-xl text-xs font-display uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    {isAdvancePayment
                      ? `REGISTRAR INSCRIPCIÓN CON ADELANTO (S/. ${advanceAmount}.00)`
                      : `REGISTRAR INSCRIPCIÓN COMPLETA (S/. ${selectedPlan.price}.00)`}
                  </span>
                </button>
              </form>
            </div>

            {/* Ficha Resumen & Preview de Comprobante (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-gradient-to-br from-zinc-900 to-black border border-amber-400/30 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                    Pre-Visualización de Ficha
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-black uppercase">
                    Acreditación Oficial
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Atleta:</span>
                    <span className="text-white font-display text-base font-black">
                      {clientName.trim() || 'Nombre del Atleta'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase">DNI:</span>
                      <span className="text-zinc-200 font-bold">{clientDni.trim() || '87654321'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase">Turno:</span>
                      <span className="text-amber-400 font-bold uppercase">{clientShift}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Membresía Seleccionada:</span>
                    <span className="text-emerald-400 font-bold">{selectedPlan.name}</span>
                  </div>

                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Coach Oficial:</span>
                    <span className="text-zinc-300">{COACHES_BY_SHIFT[clientShift]}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/10 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Costo Membresía:</span>
                      <span className="text-white font-bold">S/. {selectedPlan.price}.00</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-400">
                      <span>Monto a Cobrar Hoy:</span>
                      <span className="font-bold text-sm">
                        S/. {isAdvancePayment ? Math.min(advanceAmount, selectedPlan.price) : selectedPlan.price}.00
                      </span>
                    </div>
                    {isAdvancePayment && (
                      <div className="flex justify-between items-center text-red-400 border-t border-white/10 pt-1.5">
                        <span className="font-bold">Saldo Deudor:</span>
                        <span className="font-black text-sm">
                          S/. {Math.max(0, selectedPlan.price - advanceAmount)}.00
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 text-[10px] font-mono text-zinc-500 space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Emite comprobante y carnet digital con código 1D</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Acceso al sistema de aforo y semáforo biométrico</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 3: CRM DE CLIENTES & VENCIMIENTOS
           ========================================================================= */}
        {activeTab === 'crm' && (
          <div className="space-y-6">
            {/* Cabecera & Stat Cards del CRM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-900/70 border border-white/10">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-mono uppercase font-bold text-zinc-300">Padrón de Clientes</span>
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
                <div className="mt-2 text-3xl font-black font-display text-white">{crmStats.total}</div>
                <span className="text-[11px] font-mono text-zinc-500">Total de socios registrados</span>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/70 border border-amber-500/30">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-mono uppercase font-bold text-amber-400">Por Vencer (1-7 Días)</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="mt-2 text-3xl font-black font-display text-amber-400">{crmStats.porVencer}</div>
                <span className="text-[11px] font-mono text-amber-400/80">Listos para gestión de renovación</span>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/70 border border-red-500/30">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-mono uppercase font-bold text-red-400">Membresías Vencidas</span>
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                </div>
                <div className="mt-2 text-3xl font-black font-display text-red-400">{crmStats.vencidos}</div>
                <span className="text-[11px] font-mono text-red-400/80">Requieren renovación para ingresar</span>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/70 border border-emerald-500/30">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-mono uppercase font-bold text-emerald-400">Membresías Vigentes</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-2 text-3xl font-black font-display text-emerald-400">{crmStats.vigentes}</div>
                <span className="text-[11px] font-mono text-emerald-400/80">&gt; 7 días restantes</span>
              </div>
            </div>

            {/* Barra de Filtros & Búsqueda */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={crmSearch}
                  onChange={(e) => setCrmSearch(e.target.value)}
                  placeholder="Buscar por DNI, Nombre, Coach, Plan..."
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                {[
                  { id: 'todos', label: `Todos (${crmStats.total})` },
                  { id: 'por_vencer', label: `⚠️ Por Vencer (${crmStats.porVencer})` },
                  { id: 'vencidos', label: `🔴 Vencidos (${crmStats.vencidos})` },
                  { id: 'vigentes', label: `🟢 Vigentes (${crmStats.vigentes})` },
                  { id: 'con_deuda', label: `🟡 Con Deuda (${crmStats.conDeuda})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCrmFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                      crmFilter === f.id
                        ? 'bg-amber-400 text-black shadow-md'
                        : 'bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}

                <select
                  value={crmShiftFilter}
                  onChange={(e) => setCrmShiftFilter(e.target.value as any)}
                  className="bg-zinc-950 border border-white/10 text-zinc-300 text-xs rounded-xl px-2.5 py-1.5 font-mono cursor-pointer"
                >
                  <option value="todos">Todos los Turnos</option>
                  <option value="manana">Mañana</option>
                  <option value="tarde">Tarde</option>
                  <option value="noche">Noche</option>
                </select>
              </div>
            </div>

            {/* Tabla del CRM de Vencimientos */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-950/80 border-b border-white/10 text-zinc-400 uppercase text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4 font-bold">Atleta / Socio</th>
                      <th className="py-3.5 px-4 font-bold">Plan & Turno</th>
                      <th className="py-3.5 px-4 font-bold">Coach Oficial</th>
                      <th className="py-3.5 px-4 font-bold">Vencimiento</th>
                      <th className="py-3.5 px-4 font-bold">Días Restantes</th>
                      <th className="py-3.5 px-4 font-bold">Saldo</th>
                      <th className="py-3.5 px-4 font-bold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {paginatedCrmMembers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                          No se encontraron socios que coincidan con los filtros del CRM.
                        </td>
                      </tr>
                    ) : (
                      paginatedCrmMembers.map((m) => {
                        const nowLima = new Date().toISOString().slice(0, 10);
                        const exp = m.expiresAt || '';
                        const diffDays = Math.ceil((new Date(exp).getTime() - new Date(nowLima).getTime()) / (1000 * 60 * 60 * 24));
                        const hasDebt = m.balanceDue > 0;

                        return (
                          <tr key={m.id} className="hover:bg-zinc-800/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white font-sans text-sm">{m.name}</div>
                              <div className="text-[11px] text-zinc-400 mt-0.5">
                                DNI: <span className="font-mono text-zinc-300">{m.dni || 'Sin DNI'}</span>
                                {m.phone && (
                                  <span className="ml-2 text-zinc-500">· Tel: {m.phone}</span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="text-zinc-200 font-semibold">{m.plan}</span>
                              <div className="text-[10px] text-zinc-400 uppercase flex items-center gap-1 mt-0.5">
                                {m.shift === 'manana' && <Sun className="w-3 h-3 text-amber-400" />}
                                {m.shift === 'tarde' && <Sunset className="w-3 h-3 text-orange-400" />}
                                {m.shift === 'noche' && <Moon className="w-3 h-3 text-blue-400" />}
                                <span>Turno {m.shift || 'Mañana'}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-zinc-300">
                              {m.coachName || 'Coach Marcos Rivas'}
                            </td>

                            <td className="py-3.5 px-4 font-mono text-zinc-300">
                              {m.expiresAt || '2026-11-30'}
                            </td>

                            <td className="py-3.5 px-4">
                              {diffDays < 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-500/20 text-red-300 border border-red-500/40">
                                  <span>Vencido hace {Math.abs(diffDays)}d</span>
                                </span>
                              ) : diffDays === 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
                                  <span>Vence HOY</span>
                                </span>
                              ) : diffDays <= 7 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  <span>Vence en {diffDays} días</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <span>{diffDays} días restantes</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              {hasDebt ? (
                                <span className="text-red-400 font-bold">
                                  Debe S/. {m.balanceDue}.00
                                </span>
                              ) : (
                                <span className="text-emerald-400 font-bold">Al día</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartRenewal(m)}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-[11px] font-black transition-colors cursor-pointer"
                                  title="Renovar membresía"
                                >
                                  Renovar
                                </button>

                                {m.phone && (
                                  <button
                                    type="button"
                                    onClick={() => handleSendWhatsAppReminder(m)}
                                    className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                                    title="Enviar recordatorio WhatsApp"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {hasDebt && (
                                  <button
                                    type="button"
                                    onClick={() => setLiquidatingMember(m)}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-black transition-colors cursor-pointer shadow-md"
                                    title="Cobrar saldo pendiente"
                                  >
                                    Cobrar S/. {m.balanceDue}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setProfileModalMember(m)}
                                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                                  title="Gestionar perfil"
                                >
                                  <User className="w-3.5 h-3.5" />
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

              {/* Paginación */}
              {totalCrmPages > 1 && (
                <div className="p-4 bg-zinc-950/80 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400">
                    Mostrando página <strong className="text-white">{crmPage}</strong> de{' '}
                    <strong className="text-white">{totalCrmPages}</strong> ({filteredCrmMembers.length} socios filtrados)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={crmPage <= 1}
                      onClick={() => setCrmPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Anterior</span>
                    </button>
                    <button
                      type="button"
                      disabled={crmPage >= totalCrmPages}
                      onClick={() => setCrmPage((p) => Math.min(totalCrmPages, p + 1))}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                    >
                      <span>Siguiente</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 4: COBROS & GESTIÓN DE DEUDAS
           ========================================================================= */}
        {activeTab === 'cobros' && (
          <div className="space-y-6">
            {/* Header con resumen de deudas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-900/80 border border-amber-500/40 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono uppercase font-bold text-amber-400">
                    Total Saldos por Cobrar
                  </span>
                  <div className="mt-1 text-3xl font-black font-display text-amber-400">
                    S/. {totalDebts.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">Cuentas por cobrar en membresías</span>
                </div>
                <div className="p-3 rounded-2xl bg-amber-400/10 text-amber-400">
                  <Receipt className="w-7 h-7" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/80 border border-red-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono uppercase font-bold text-red-400">
                    Socios con Deuda Activa
                  </span>
                  <div className="mt-1 text-3xl font-black font-display text-red-400">
                    {membersWithDebt.length}
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">Atletas con adelanto pendiente</span>
                </div>
                <div className="p-3 rounded-2xl bg-red-500/10 text-red-400">
                  <AlertTriangle className="w-7 h-7" />
                </div>
              </div>
            </div>

            {/* Buscador de Deudores */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cobrosSearch}
                  onChange={(e) => setCobrosSearch(e.target.value)}
                  placeholder="Buscar deudor por DNI, Nombre o Plan..."
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
            </div>

            {/* Lista / Tabla de Deudores */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-950/80 border-b border-white/10 text-zinc-400 uppercase text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4 font-bold">Atleta / Socio</th>
                      <th className="py-3.5 px-4 font-bold">Plan Contratado</th>
                      <th className="py-3.5 px-4 font-bold">Costo Plan</th>
                      <th className="py-3.5 px-4 font-bold">Abonado</th>
                      <th className="py-3.5 px-4 font-bold">Saldo Deudor</th>
                      <th className="py-3.5 px-4 font-bold">Plazo Límite</th>
                      <th className="py-3.5 px-4 font-bold text-right">Acción de Cobro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {filteredDebtors.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                          No hay socios con saldo pendiente que coincidan con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredDebtors.map((m) => (
                        <tr key={m.id} className="hover:bg-zinc-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white font-sans text-sm">{m.name}</div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">
                              DNI: <span className="font-mono text-zinc-300">{m.dni || 'Sin DNI'}</span>
                              {m.phone && <span className="ml-2 text-zinc-500">· Tel: {m.phone}</span>}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-zinc-200 font-semibold">{m.plan}</span>
                            <div className="text-[10px] text-zinc-400 uppercase mt-0.5">
                              Turno {m.shift || 'Mañana'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-zinc-200">
                            S/. {m.planPrice}.00
                          </td>

                          <td className="py-3.5 px-4 text-emerald-400 font-bold">
                            S/. {m.advancePaid}.00
                          </td>

                          <td className="py-3.5 px-4 font-black text-red-400 text-sm">
                            S/. {m.balanceDue}.00
                          </td>

                          <td className="py-3.5 px-4 text-amber-400 font-mono">
                            {m.paymentDueDate || 'Pendiente'}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {m.phone && (
                                <button
                                  type="button"
                                  onClick={() => handleSendWhatsAppDebtReminder(m)}
                                  className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                                  title="Enviar recordatorio de cobro por WhatsApp"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('acceso');
                                  if (m.dni) procesarIngresoPorDni(m.dni);
                                }}
                                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition-colors cursor-pointer"
                              >
                                Escanear 1D
                              </button>

                              <button
                                type="button"
                                onClick={() => setLiquidatingMember(m)}
                                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs font-display uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Cobrar S/. {m.balanceDue}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL PARA COBRAR SALDO PENDIENTE (LIQUIDACIÓN O ABONO PARCIAL) */}
      {liquidatingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-zinc-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4 font-mono text-xs"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="p-2.5 rounded-xl bg-emerald-500 text-black font-black">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-black text-white font-display uppercase tracking-tight">
                  Cobro / Abono de Membresía
                </h4>
                <p className="text-zinc-400">Permite abono parcial o liquidación total</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-400">Socio:</span>
                <span className="text-white font-bold">{liquidatingMember.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">DNI:</span>
                <span className="text-zinc-200">{liquidatingMember.dni || 'Sin DNI'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Plan:</span>
                <span className="text-zinc-200">{liquidatingMember.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Costo Total Plan:</span>
                <span className="text-zinc-200 font-bold">S/. {liquidatingMember.planPrice}.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Adelanto ya abonado:</span>
                <span className="text-emerald-400 font-bold">S/. {liquidatingMember.advancePaid}.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Saldo Deudor Actual:</span>
                <span className="text-amber-400 font-bold">S/. {liquidatingMember.balanceDue}.00</span>
              </div>
            </div>

            {/* INPUT EDITABLE DE ABONO PARCIAL O TOTAL */}
            <div className="space-y-2">
              <label className="block text-zinc-300 font-bold uppercase">
                Monto a Cobrar / Abonar (S/.):
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 font-black text-lg">
                  S/.
                </span>
                <input
                  type="number"
                  min={1}
                  max={liquidatingMember.balanceDue}
                  value={customAbonoAmount || ''}
                  onChange={(e) =>
                    setCustomAbonoAmount(
                      Math.max(0, Math.min(liquidatingMember.balanceDue, Number(e.target.value)))
                    )
                  }
                  className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-emerald-500/50 rounded-xl text-emerald-300 font-black text-xl focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Botones de sugerencia rápida */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {[20, 50, 100]
                  .filter((amt) => amt < liquidatingMember.balanceDue)
                  .map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCustomAbonoAmount(amt)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-bold border border-white/5 cursor-pointer"
                    >
                      + S/. {amt}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => setCustomAbonoAmount(liquidatingMember.balanceDue)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold border border-emerald-500/40 cursor-pointer ml-auto"
                >
                  Total (S/. {liquidatingMember.balanceDue})
                </button>
              </div>

              {/* Resumen del impacto del cobro */}
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/5 text-[11px]">
                {customAbonoAmount >= liquidatingMember.balanceDue ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span>✅</span> El socio quedará 100% AL DÍA (Saldo restante: S/. 0.00)
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1.5">
                    <span>⚠️</span> Quedará un saldo pendiente de:{' '}
                    <strong className="text-white">
                      S/. {(liquidatingMember.balanceDue - (customAbonoAmount || 0)).toFixed(2)}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            {/* METODO DE COBRO */}
            <div>
              <label className="block text-zinc-400 font-bold mb-2 uppercase">
                Método de Cobro
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'yape', label: 'Yape' },
                  { id: 'plin', label: 'Plin' },
                  { id: 'efectivo', label: 'Efectivo' },
                  { id: 'tarjeta', label: 'Tarjeta' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setLiquidateMethod(m.id as any)}
                    className={`py-2 px-3 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                      liquidateMethod === m.id
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                        : 'bg-zinc-950 border-white/10 text-zinc-400'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setLiquidatingMember(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl font-bold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!customAbonoAmount || customAbonoAmount <= 0}
                onClick={handleConfirmLiquidate}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-black cursor-pointer transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-40"
              >
                CONFIRMAR COBRO
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL DE GESTIÓN INTEGRAL DE PERFIL DE SOCIO */}
      {profileModalMember && (
        <MemberProfileModal
          isOpen={!!profileModalMember}
          onClose={() => setProfileModalMember(null)}
          member={profileModalMember}
          onSave={async (updated) => {
            const next = await updateMemberProfile(updated.id, updated);
            setMembers(next);
            // Actualizar mapa en memoria de recepción
            const exist = sociosMap.get(updated.dni || '');
            if (exist) {
              const actual: SocioRecepcion = {
                ...exist,
                nombre: updated.name,
                dni: updated.dni || exist.dni,
                precio_plan: updated.planPrice,
                adelanto_pagado: updated.advancePaid,
                saldo_pendiente: updated.balanceDue,
                tiene_deuda_activa: updated.balanceDue > 0,
                turno: updated.shift || 'manana',
                coach_asignado: updated.coachName || 'Coach Marcos Rivas',
              };
              setSociosMap((prev) => {
                const m = new Map(prev);
                m.set(actual.dni, actual);
                return m;
              });
            }
            setProfileModalMember(null);
            setSuccessMessage(`¡Perfil de ${updated.name} actualizado con éxito!`);
            setTimeout(() => setSuccessMessage(null), 4000);
          }}
          onOpenPaymentModal={(m) => {
            setProfileModalMember(null);
            setLiquidatingMember(m);
            setCustomAbonoAmount(m.balanceDue);
          }}
        />
      )}

      {/* MODAL DE COMPROBANTE TICKET DIGITAL POS */}
      {ticketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-white text-zinc-900 rounded-3xl p-6 shadow-2xl font-mono text-xs space-y-4 print:p-0"
          >
            <div className="text-center border-b border-dashed border-zinc-300 pb-3">
              <h3 className="font-black text-base uppercase tracking-tight">TRANKILANDIA GYM</h3>
              <p className="text-[10px] text-zinc-500">Más que un gimnasio · Más cerca de ti</p>
              <p className="text-[10px] text-zinc-500">José Olaya Nº 640 · Huamanga, Ayacucho</p>
              <p className="text-[10px] text-zinc-500">RUC: 20608945123 · Tel: 999-787-489</p>
              <div className="mt-2 text-xs font-bold text-zinc-800">
                TICKET DE VENTA: {ticketModal.numero_ticket}
              </div>
              <div className="text-[10px] text-zinc-500">
                Fecha: {new Date().toLocaleDateString('es-PE')} {ticketModal.fecha || ''}
              </div>
            </div>

            <div className="space-y-1.5 py-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-zinc-500">Cliente:</span>
                <span className="font-bold">{ticketModal.cliente_nombre || 'Cliente Mostrador'}</span>
              </div>
              {ticketModal.cliente_dni && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">DNI:</span>
                  <span className="font-bold">{ticketModal.cliente_dni}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500">Pago:</span>
                <span className="font-bold uppercase">{ticketModal.metodo_pago}</span>
              </div>
            </div>

            <div className="border-t border-b border-dashed border-zinc-300 py-3 flex justify-between items-center text-sm">
              <span className="font-black">TOTAL COBRADO:</span>
              <span className="font-black text-lg">S/. {ticketModal.total.toFixed(2)}</span>
            </div>

            <div className="text-center text-[10px] text-zinc-500">
              ¡Gracias por tu compra! Consuma productos originales para un mejor rendimiento.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>
              <button
                type="button"
                onClick={() => setTicketModal(null)}
                className="flex-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 py-2.5 rounded-xl font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL DE COMPROBANTE OFICIAL DE MEMBRESÍA */}
      <ReceiptModal
        isOpen={receiptModal.isOpen}
        onClose={() => setReceiptModal({ ...receiptModal, isOpen: false })}
        member={receiptModal.member}
        paymentAmount={receiptModal.amount}
        paymentTypeTitle={receiptModal.type}
        paymentMethod={receiptModal.method}
      />
    </div>
  );
}
