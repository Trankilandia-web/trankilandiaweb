import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  QrCode,
  CalendarClock,
  UserPlus,
  ShoppingCart,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  MessageCircle,
  CreditCard,
  Plus,
  Minus,
  Sun,
  Sunset,
  Moon,
} from 'lucide-react';
import PortalHeader from '../../components/portal/PortalHeader';
import {
  fetchSociosParaRecepcion,
  cargarAsistenciasActivas90Min,
  registrarAsistencia,
  registerGymMember,
  obtenerProductosInventario,
  registrarVentaPOS,
  SocioRecepcion,
  AsistenciaActiva,
} from '../../lib/supabaseDb';
import { GymMember, getStoredMembers, saveStoredMembers } from '../../data/gymStore';
import { extraerDniPeru } from '../../lib/dniParser';
import { getActiveStaffSession } from '../../lib/staffStore';

export default function HubReceptionSimple() {
  const [activeTab, setActiveTab] = useState<'acceso' | 'crm' | 'inscripcion' | 'pos'>('acceso');

  // Estado general de datos
  const [members, setMembers] = useState<GymMember[]>([]);
  const [asistencias, setAsistencias] = useState<AsistenciaActiva[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseConnected, setSupabaseConnected] = useState(true);

  // Escáner & Acceso
  const [scanInput, setScanInput] = useState('');
  const [lastScannedSocio, setLastScannedSocio] = useState<SocioRecepcion | null>(null);
  const [lastScanStatus, setLastScanStatus] = useState<'activo' | 'por_vencer' | 'vencido' | 'deuda' | 'no_inscrito' | null>(null);
  const [lastScanMessage, setLastScanMessage] = useState<string>('');
  const scanInputRef = useRef<HTMLInputElement>(null);

  // CRM & Vencimientos
  const [crmFilter, setCrmFilter] = useState<'todos' | 'vencidos' | 'por_vencer' | 'deudas'>('todos');
  const [crmSearch, setCrmSearch] = useState('');

  // Nueva Inscripción / Renovación
  const [formDni, setFormDni] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formPlan, setFormPlan] = useState('1 Mes · Musculación Libre');
  const [formPrecio, setFormPrecio] = useState(80);
  const [formTurno, setFormTurno] = useState<'manana' | 'tarde' | 'noche'>('manana');
  const [formMetodoPago, setFormMetodoPago] = useState<'efectivo' | 'yape' | 'plin' | 'tarjeta'>('efectivo');
  const [formTipoPago, setFormTipoPago] = useState<'full' | 'adelanto'>('full');
  const [formAdelanto, setFormAdelanto] = useState(80);
  const [formIsRenewal, setFormIsRenewal] = useState(false);
  const [formSuccessMsg, setFormSuccessMsg] = useState<string | null>(null);
  const [formCreatedMember, setFormCreatedMember] = useState<GymMember | null>(null);

  // Catálogo POS
  const [productos, setProductos] = useState<any[]>([]);
  const [carrito, setCarrito] = useState<{ id: string; nombre: string; precio: number; cantidad: number }[]>([]);
  const [posMetodoPago, setPosMetodoPago] = useState<'efectivo' | 'yape'>('efectivo');
  const [posSuccessMsg, setPosSuccessMsg] = useState<string | null>(null);

  // 1. CARGA INICIAL DE DATOS DESDE SUPABASE
  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const [sociosSupabase, asistenciasSupabase, prodsSupabase] = await Promise.all([
        fetchSociosParaRecepcion(),
        cargarAsistenciasActivas90Min(),
        obtenerProductosInventario(),
      ]);

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
          registeredAt: new Date().toISOString().slice(0, 10),
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
  }, []);

  // Mantener el foco automático en el buscador de escaneo
  useEffect(() => {
    if (activeTab === 'acceso' && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [activeTab]);

  // Reproducir beeps de audio
  const playTone = (tipo: 'ok' | 'alerta' | 'error') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (tipo === 'ok') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (tipo === 'alerta') {
        osc.frequency.setValueAtTime(587, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(330, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {}
  };

  // 2. PROCESAMIENTO RÁPIDO DE ACCESO POR DNI O CÓDIGO DE BARRAS
  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = scanInput.trim();
    if (!query) return;

    const parsedDni = extraerDniPeru(query) || query.replace(/\D/g, '').slice(0, 8);
    const cleanDni = parsedDni || query;

    // Buscar socio por DNI o Nombre
    const socio = members.find(
      (m) =>
        (m.dni && m.dni.trim() === cleanDni) ||
        (m.dni && m.dni.trim() === query) ||
        m.name.toLowerCase().includes(query.toLowerCase())
    );

    setScanInput('');

    if (!socio) {
      playTone('error');
      setLastScanStatus('no_inscrito');
      setLastScannedSocio(null);
      setLastScanMessage(`DNI o atleta "${query}" no registrado en el padrón.`);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const exp = socio.expiresAt || today;
    const diffDays = Math.ceil((new Date(exp).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
    const hasDebt = socio.balanceDue > 0;

    const socioRecepcion: SocioRecepcion = {
      id: socio.id,
      dni: socio.dni || '',
      nombre: socio.name,
      plan: socio.plan,
      precio_plan: socio.planPrice,
      tipo_pago: socio.paymentType,
      adelanto_pagado: socio.advancePaid,
      saldo_pendiente: socio.balanceDue,
      fecha_limite_pago: socio.paymentDueDate || null,
      fecha_fin: socio.expiresAt,
      turno: socio.shift || 'manana',
      coach_asignado: socio.coachName || 'Coach Marcos Rivas',
      dias_restantes: diffDays,
      estado_calculado: diffDays < 0 ? 'vencido' : diffDays <= 7 ? 'por_vencer' : 'activo',
      tiene_deuda_activa: hasDebt,
      numero_boleta: socio.receiptNumber,
    };

    setLastScannedSocio(socioRecepcion);

    if (diffDays < 0) {
      playTone('error');
      setLastScanStatus('vencido');
      setLastScanMessage(`Membresía vencida hace ${Math.abs(diffDays)} días (${socio.expiresAt}).`);
    } else if (hasDebt) {
      playTone('alerta');
      setLastScanStatus('deuda');
      setLastScanMessage(`Membresía activa pero DEBE S/. ${socio.balanceDue}.00.`);
    } else if (diffDays <= 7) {
      playTone('alerta');
      setLastScanStatus('por_vencer');
      setLastScanMessage(`Membresía por vencer en ${diffDays} días (${socio.expiresAt}).`);
      // Registrar ingreso
      registrarIngreso(socio);
    } else {
      playTone('ok');
      setLastScanStatus('activo');
      setLastScanMessage(`¡Pase Libre! Membresía vigente con ${diffDays} días restantes.`);
      // Registrar ingreso
      registrarIngreso(socio);
    }
  };

  const registrarIngreso = async (socio: GymMember) => {
    try {
      const res = await registrarAsistencia({
        socio_id: socio.id,
        dni: socio.dni || '',
        nombre: socio.name,
        turno: socio.shift || 'manana',
      });
      const newId = res?.data?.id || `ast-${Date.now()}`;
      setAsistencias((prev) => [
        {
          id: newId,
          socio_id: socio.id,
          dni: socio.dni || '',
          nombre: socio.name,
          turno: socio.shift || 'manana',
          fecha_ingreso: new Date().toISOString(),
        },
        ...prev.filter((a) => a.id !== newId),
      ]);
    } catch {
      // Local fallback
      setAsistencias((prev) => [
        {
          id: `local-${Date.now()}`,
          socio_id: socio.id,
          dni: socio.dni || '',
          nombre: socio.name,
          turno: socio.shift || 'manana',
          fecha_ingreso: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
  };

  // 3. ENVÍO DE MENSAJE DE WHATSAPP CON 1 CLIC
  const enviarWhatsApp = (socio: GymMember) => {
    const phone = (socio.phone || '').replace(/\D/g, '');
    if (!phone || phone.length < 9) {
      alert(`El socio ${socio.name} no cuenta con un celular de 9 dígitos válido.`);
      return;
    }
    const cleanPhone = phone.length === 9 ? `51${phone}` : phone;
    const today = new Date().toISOString().slice(0, 10);
    const exp = socio.expiresAt || today;
    const diffDays = Math.ceil((new Date(exp).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));

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

  // 4. AUTORELLENADO DE FORMULARIO SI EL DNI EXISTE (MODO RENOVACIÓN)
  const handleDniChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 8);
    setFormDni(clean);

    if (clean.length === 8) {
      const existing = members.find((m) => m.dni && m.dni.trim() === clean);
      if (existing) {
        setFormNombre(existing.name);
        setFormTelefono(existing.phone || '');
        setFormPlan(existing.plan || '1 Mes · Musculación Libre');
        setFormPrecio(existing.planPrice || 80);
        setFormTurno((existing.shift as any) || 'manana');
        setFormIsRenewal(true);
        return;
      }
    }
    setFormIsRenewal(false);
  };

  const handlePlanSelect = (nombrePlan: string, precio: number) => {
    setFormPlan(nombrePlan);
    setFormPrecio(precio);
    if (formTipoPago === 'full') {
      setFormAdelanto(precio);
    }
  };

  // 5. REGISTRAR O RENOVAR SOCIO
  const handleGuardarSocio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDni || formDni.length !== 8 || !formNombre.trim()) {
      alert('Ingresa un DNI de 8 dígitos y el nombre completo.');
      return;
    }

    const paid = formTipoPago === 'full' ? formPrecio : Math.min(formAdelanto, formPrecio);
    const balance = Math.max(0, formPrecio - paid);

    const todayDate = new Date();
    todayDate.setDate(todayDate.getDate() + 30);
    const newExpiresAt = todayDate.toISOString().slice(0, 10);

    const existing = members.find((m) => m.dni && m.dni.trim() === formDni);
    const memberId = existing ? existing.id : `MEM-${String(members.length + 510).padStart(3, '0')}`;

    const memberToSave: GymMember = {
      id: memberId,
      dni: formDni,
      name: formNombre.trim(),
      phone: formTelefono.trim(),
      email: `${formDni}@cliente.trankilandia.pe`,
      plan: formPlan,
      planPrice: formPrecio,
      paymentType: formTipoPago === 'full' ? 'full' : 'advance',
      advancePaid: paid,
      balanceDue: balance,
      paymentMethod: formMetodoPago,
      receiptNumber: `B001-000${members.length + 515}`,
      membershipStatus: 'active',
      expiresAt: newExpiresAt,
      coachName: formTurno === 'manana' ? 'Coach Marcos Rivas' : 'Coach Oficial',
      shift: formTurno,
      registeredAt: new Date().toISOString().slice(0, 10),
    };

    // 1. Guardar en Supabase
    try {
      await registerGymMember(memberToSave);
      setSupabaseConnected(true);
    } catch {}

    // 2. Guardar en memoria local
    const updated = [memberToSave, ...members.filter((m) => m.id !== memberId)];
    setMembers(updated);
    saveStoredMembers(updated);

    setFormCreatedMember(memberToSave);
    setFormSuccessMsg(
      formIsRenewal
        ? `¡Membresía de ${memberToSave.name} renovada con éxito por 30 días!`
        : `¡Socio ${memberToSave.name} registrado con éxito en el sistema!`
    );

    // Resetear formulario
    setFormDni('');
    setFormNombre('');
    setFormTelefono('');
    setFormIsRenewal(false);
  };

  // 6. VENTA POS RÁPIDA
  const agregarAlCarrito = (prod: any) => {
    setCarrito((prev) => {
      const exists = prev.find((i) => i.id === prod.id);
      if (exists) {
        return prev.map((i) => (i.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [...prev, { id: prod.id, nombre: prod.nombre, precio: Number(prod.precio_venta || prod.precio), cantidad: 1 }];
    });
  };

  const modificarCantidad = (id: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, cantidad: Math.max(0, i.cantidad + delta) } : i))
        .filter((i) => i.cantidad > 0)
    );
  };

  const totalCarrito = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  const procesarVentaPOS = async () => {
    if (carrito.length === 0) return;
    const operator = getActiveStaffSession()?.nombre || 'Recepción';

    try {
      await registrarVentaPOS(
        carrito.map((c) => ({
          producto_id: c.id,
          nombre: c.nombre,
          cantidad: c.cantidad,
          precio_unitario: c.precio,
        })),
        posMetodoPago,
        `Cliente Mostrador (${operator})`
      );
      setPosSuccessMsg(`¡Cobro de S/. ${totalCarrito.toFixed(2)} registrado con éxito!`);
      setCarrito([]);
      setTimeout(() => setPosSuccessMsg(null), 4000);
    } catch {
      setPosSuccessMsg(`Venta registrada localmente.`);
      setCarrito([]);
      setTimeout(() => setPosSuccessMsg(null), 3000);
    }
  };

  // Filtro de CRM
  const crmSociosFiltrados = useMemo(() => {
    const query = crmSearch.trim().toLowerCase();
    const today = new Date().toISOString().slice(0, 10);

    return members.filter((m) => {
      const matchSearch =
        !query ||
        m.name.toLowerCase().includes(query) ||
        (m.dni && m.dni.includes(query)) ||
        (m.phone && m.phone.includes(query));

      if (!matchSearch) return false;

      const exp = m.expiresAt || today;
      const diffDays = Math.ceil((new Date(exp).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));

      if (crmFilter === 'vencidos') return diffDays < 0;
      if (crmFilter === 'por_vencer') return diffDays >= 0 && diffDays <= 7;
      if (crmFilter === 'deudas') return m.balanceDue > 0;
      return true;
    });
  }, [members, crmFilter, crmSearch]);

  const crmCounts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let vencidos = 0;
    let porVencer = 0;
    let deudas = 0;

    members.forEach((m) => {
      const exp = m.expiresAt || today;
      const diffDays = Math.ceil((new Date(exp).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) vencidos++;
      else if (diffDays <= 7) porVencer++;
      if (m.balanceDue > 0) deudas++;
    });

    return { total: members.length, vencidos, porVencer, deudas };
  }, [members]);

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

  const catalogoAMostrar =
    productos.length > 0
      ? productos.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          precio: Number(p.precio_venta || p.precio),
          categoria: p.categoria || 'Producto',
        }))
      : [
          { id: 'prod-agua', nombre: 'Agua Mineral San Mateo', precio: 2.5, categoria: 'Bebida' },
          { id: 'prod-gatorade', nombre: 'Gatorade / Powerade', precio: 4.0, categoria: 'Rehidratante' },
          { id: 'prod-proteina', nombre: 'Batido de Proteína Whey', precio: 8.0, categoria: 'Suplemento' },
          { id: 'prod-barra', nombre: 'Barra Proteica', precio: 3.5, categoria: 'Snack' },
          { id: 'prod-creatina', nombre: 'Scoop de Creatina', precio: 5.0, categoria: 'Suplemento' },
          { id: 'prod-preentreno', nombre: 'Pre-Entreno C4 Scoop', precio: 6.0, categoria: 'Suplemento' },
        ];

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

          <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span
              className={`w-2.5 h-2.5 rounded-full ${supabaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}
            />
            <span>{supabaseConnected ? 'Supabase en Vivo' : 'Modo Local-First'}</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-300 font-bold">{members.length} Socios</span>
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
            <form onSubmit={handleScanSubmit} className="relative">
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
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones Rápidas con Botones Grandes */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {(lastScanStatus === 'vencido' || lastScanStatus === 'por_vencer') && lastScannedSocio && (
                      <button
                        type="button"
                        onClick={() => {
                          handleDniChange(lastScannedSocio.dni);
                          setActiveTab('inscripcion');
                        }}
                        className="px-6 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-sm uppercase shadow-xl cursor-pointer"
                      >
                        Renovar Membresía
                      </button>
                    )}
                    {lastScanStatus === 'no_inscrito' && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('inscripcion')}
                        className="px-6 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-sm uppercase shadow-xl cursor-pointer"
                      >
                        Registrar Nuevo Socio
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* LISTA DE ATLETAS EN SALA (ÚLTIMOS 90 MINUTOS) */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-black text-white uppercase font-display">
                    Atletas en Sala Ahora (Últimos 90 minutos)
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold">
                  {asistencias.length} personas entrenando
                </span>
              </div>

              {asistencias.length === 0 ? (
                <p className="text-zinc-500 text-xs font-mono py-6 text-center">
                  No hay ingresos registrados en los últimos 90 minutos.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {asistencias.map((a) => (
                    <div
                      key={a.id}
                      className="p-3.5 rounded-2xl bg-zinc-950 border border-white/10 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-white text-sm truncate max-w-[180px]">{a.nombre}</div>
                        <div className="text-[11px] font-mono text-zinc-400">DNI: {a.dni}</div>
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
                        const today = new Date().toISOString().slice(0, 10);
                        const exp = socio.expiresAt || today;
                        const diffDays = Math.ceil(
                          (new Date(exp).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
                        );

                        return (
                          <tr key={socio.id} className="hover:bg-zinc-800/40 transition-colors">
                            <td className="py-4 px-6">
                              <div className="font-bold text-white text-sm font-sans">{socio.name}</div>
                              <div className="text-[11px] text-zinc-400">
                                DNI: {socio.dni || 'Sin DNI'} · Tel: {socio.phone || 'Sin número'}
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
                              <button
                                type="button"
                                onClick={() => enviarWhatsApp(socio)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-transform active:scale-95 cursor-pointer shadow-md"
                              >
                                <MessageCircle className="w-4 h-4" />
                                <span>WhatsApp</span>
                              </button>
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
            PESTAÑA 3: NUEVA INSCRIPCIÓN O RENOVACIÓN
            ========================================================================= */}
        {activeTab === 'inscripcion' && (
          <div className="max-w-2xl mx-auto bg-zinc-900 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div>
              <span className="text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                {formIsRenewal ? 'Modo Renovación Automática' : 'Registro de Nuevo Socio'}
              </span>
              <h2 className="text-2xl font-black text-white font-display uppercase tracking-tight mt-1">
                {formIsRenewal ? 'Renovar Membresía del Atleta' : 'Nueva Inscripción en el Gimnasio'}
              </h2>
            </div>

            {formSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500 text-emerald-300 font-mono text-xs flex items-center justify-between">
                <span>{formSuccessMsg}</span>
                {formCreatedMember && formCreatedMember.phone && (
                  <button
                    type="button"
                    onClick={() => enviarWhatsApp(formCreatedMember)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-400 text-black font-black text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Enviar Carnet</span>
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleGuardarSocio} className="space-y-4 font-mono text-xs">
              {/* DNI */}
              <div>
                <label className="block text-zinc-400 uppercase font-bold mb-1">DNI del Socio (8 dígitos)</label>
                <input
                  type="text"
                  maxLength={8}
                  required
                  value={formDni}
                  onChange={(e) => handleDniChange(e.target.value)}
                  placeholder="Ej. 70447554"
                  className="w-full bg-zinc-950 border border-white/10 focus:border-amber-400 rounded-xl px-4 py-3 text-lg font-bold text-white font-mono focus:outline-none"
                />
              </div>

              {/* Nombre Completo */}
              <div>
                <label className="block text-zinc-400 uppercase font-bold mb-1">Nombre Completo</label>
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
                <label className="block text-zinc-400 uppercase font-bold mb-1">Celular (Para WhatsApp)</label>
                <input
                  type="tel"
                  maxLength={9}
                  value={formTelefono}
                  onChange={(e) => setFormTelefono(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="Ej. 958183360"
                  className="w-full bg-zinc-950 border border-white/10 focus:border-amber-400 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none"
                />
              </div>

              {/* Selección de Plan Rápido */}
              <div>
                <label className="block text-zinc-400 uppercase font-bold mb-1.5">Seleccionar Plan</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: '1 Mes · Musculación Libre', price: 80 },
                    { name: '1 Mes Universitario', price: 60 },
                    { name: '1 Mes Escolar', price: 50 },
                    { name: '1 Mes Boxeo & Musculación', price: 120 },
                    { name: 'Pase Diario', price: 10 },
                  ].map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handlePlanSelect(p.name, p.price)}
                      className={`p-3 rounded-xl border text-left font-bold transition-all cursor-pointer ${
                        formPlan === p.name
                          ? 'bg-amber-400 text-black border-amber-400'
                          : 'bg-zinc-950 border-white/10 text-zinc-300 hover:border-amber-400/40'
                      }`}
                    >
                      <div className="text-xs truncate">{p.name}</div>
                      <div className="text-sm font-black mt-0.5">S/. {p.price}.00</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Turno */}
              <div>
                <label className="block text-zinc-400 uppercase font-bold mb-1.5">Turno Asignado</label>
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
                      className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer ${
                        formTurno === t.id
                          ? 'bg-amber-400 text-black border-amber-400'
                          : 'bg-zinc-950 border-white/10 text-zinc-400'
                      }`}
                    >
                      <t.icon className="w-3.5 h-3.5" />
                      <span>{t.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo de Pago: Completo o Adelanto */}
              <div>
                <label className="block text-zinc-400 uppercase font-bold mb-1.5">Modalidad de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormTipoPago('full');
                      setFormAdelanto(formPrecio);
                    }}
                    className={`py-2 rounded-xl border text-center text-xs font-bold uppercase cursor-pointer ${
                      formTipoPago === 'full'
                        ? 'bg-amber-400 text-black border-amber-400'
                        : 'bg-zinc-950 border-white/10 text-zinc-400'
                    }`}
                  >
                    Pago Completo (S/. {formPrecio})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTipoPago('adelanto')}
                    className={`py-2 rounded-xl border text-center text-xs font-bold uppercase cursor-pointer ${
                      formTipoPago === 'adelanto'
                        ? 'bg-amber-400 text-black border-amber-400'
                        : 'bg-zinc-950 border-white/10 text-zinc-400'
                    }`}
                  >
                    Adelanto / Saldo Pendiente
                  </button>
                </div>
              </div>

              {formTipoPago === 'adelanto' && (
                <div>
                  <label className="block text-zinc-400 uppercase font-bold mb-1">Monto Adelantado Hoy (S/)</label>
                  <input
                    type="number"
                    min={1}
                    max={formPrecio}
                    value={formAdelanto}
                    onChange={(e) => setFormAdelanto(Number(e.target.value) || 0)}
                    className="w-full bg-zinc-950 border border-white/10 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm font-bold text-white font-mono focus:outline-none"
                  />
                  <div className="text-[11px] text-orange-400 mt-1 font-mono">
                    Saldo restante: S/. {Math.max(0, formPrecio - formAdelanto)}.00
                  </div>
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
                      className={`py-2 rounded-xl border text-center text-xs font-bold uppercase cursor-pointer ${
                        formMetodoPago === m
                          ? 'bg-amber-400 text-black border-amber-400'
                          : 'bg-zinc-950 border-white/10 text-zinc-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-base transition-transform active:scale-95 cursor-pointer shadow-xl uppercase mt-4"
              >
                Registrar Inscripción (S/. {formPrecio}.00)
              </button>
            </form>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 4: VENTA RÁPIDA DE BEBIDAS & SUPLEMENTOS (POS TÁCTIL)
            ========================================================================= */}
        {activeTab === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Cuadrícula Táctil de Productos (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <h3 className="text-base font-black text-white font-display uppercase">
                Toca un producto para agregar a la cuenta:
              </h3>

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
                    </div>
                    <div className="mt-4">
                      <div className="font-bold text-white text-sm">{p.nombre}</div>
                      <div className="text-amber-400 font-mono font-black text-lg mt-1">S/. {p.precio.toFixed(2)}</div>
                    </div>
                  </button>
                ))}
              </div>
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
              </div>

              <div>
                <div className="pt-3 border-t border-white/10 flex items-center justify-between mb-4">
                  <span className="text-xs uppercase font-mono text-zinc-400 font-bold">Total a Cobrar</span>
                  <span className="text-2xl font-black font-display text-amber-400">
                    S/. {totalCarrito.toFixed(2)}
                  </span>
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
                  disabled={carrito.length === 0}
                  onClick={procesarVentaPOS}
                  className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black font-black text-base uppercase transition-transform active:scale-95 cursor-pointer shadow-xl"
                >
                  Confirmar Cobro
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
