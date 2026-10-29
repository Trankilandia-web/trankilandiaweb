import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  User,
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  Search,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Package,
  Plus,
  Edit,
  RefreshCw,
  Sun,
  Sunset,
  Moon,
  Clock,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  Smartphone,
  X,
} from 'lucide-react';
import PortalHeader from '../../components/portal/PortalHeader';
import { UserRole } from '../../types/roles';
import { GymMember, getStoredMembers, saveStoredMembers } from '../../data/gymStore';
import {
  ResumenAdmin,
  obtenerResumenAdmin,
  obtenerProductosInventario,
  crearOActualizarProducto,
  ajustarStockProducto,
  actualizarRolUsuario,
  updateMemberShift,
  updateMemberProfile,
  payMemberBalance,
  ProductoPOS,
} from '../../lib/supabaseDb';
import MemberProfileModal from '../../components/portal/MemberProfileModal';

interface MemberRecord {
  id: string;
  name: string;
  dni: string;
  role: UserRole;
  plan: string;
  shift: 'manana' | 'tarde' | 'noche';
  coachName: string;
  advancePaid: number;
  balanceDue: number;
  paymentMethod?: string;
  status: 'active' | 'expiring' | 'inactive';
  expiresIn: string;
  lastVisit: string;
}

const COACHES_BY_SHIFT_OPTIONS = [
  { name: 'Coach Marcos Rivas', shift: 'manana', label: 'Coach Marcos Rivas (Varón · Mañana)' },
  { name: 'Coach Camila Mendoza', shift: 'manana', label: 'Coach Camila Mendoza (Mujer · Mañana)' },
  { name: 'Coach Valeria Gómez', shift: 'tarde', label: 'Coach Valeria Gómez (Mujer · Tarde)' },
  { name: 'Coach Daniel Quispe', shift: 'noche', label: 'Coach Daniel Quispe (Varón · Noche)' },
];

export default function AdminDashboard() {
  // Pestañas principales
  const [activeTab, setActiveTab] = useState<'kpis' | 'inventario' | 'padron'>('kpis');

  // Filtro de rango de fecha para arqueo (Hora de Perú)
  const [dateRange, setDateRange] = useState<'todo' | 'mes' | '7dias' | 'hoy'>('todo');
  const [resumen, setResumen] = useState<ResumenAdmin | null>(null);
  const [isLoadingResumen, setIsLoadingResumen] = useState(true);

  // Inventario & Productos
  const [productos, setProductos] = useState<ProductoPOS[]>([]);
  const [categoriaInventario, setCategoriaInventario] = useState<string>('Todos');
  const [searchInventario, setSearchInventario] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<ProductoPOS | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);

  // Padrón de Socios y Colaboradores
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [shiftFilter, setShiftFilter] = useState<'all' | 'manana' | 'tarde' | 'noche'>('all');
  const [debtFilter, setDebtFilter] = useState<'all' | 'con_deuda' | 'al_dia'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Modales de Gestión de Perfil y Cobros
  const [profileModalMember, setProfileModalMember] = useState<GymMember | null>(null);
  const [liquidatingMember, setLiquidatingMember] = useState<GymMember | null>(null);
  const [customAbonoAmount, setCustomAbonoAmount] = useState<number>(0);
  const [liquidateMethod, setLiquidateMethod] = useState<'yape' | 'plin' | 'efectivo' | 'tarjeta'>('yape');

  // Notificación de éxito
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fallbacks calculados en tiempo real de los datos reales cargados
  const totalCobradoMembers = useMemo(() => members.reduce((sum, m) => sum + (m.advancePaid || 0), 0), [members]);
  const totalDeudasMembers = useMemo(() => members.reduce((sum, m) => sum + (m.balanceDue || 0), 0), [members]);
  const efectivoMembers = useMemo(() => members.filter(m => (m.paymentMethod || 'efectivo').toLowerCase() === 'efectivo').reduce((sum, m) => sum + (m.advancePaid || 0), 0), [members]);
  const yapeMembers = useMemo(() => members.filter(m => (m.paymentMethod || '').toLowerCase() === 'yape').reduce((sum, m) => sum + (m.advancePaid || 0), 0), [members]);
  const plinMembers = useMemo(() => members.filter(m => (m.paymentMethod || '').toLowerCase() === 'plin').reduce((sum, m) => sum + (m.advancePaid || 0), 0), [members]);
  const tarjetaMembers = useMemo(() => members.filter(m => (m.paymentMethod || '').toLowerCase() === 'tarjeta').reduce((sum, m) => sum + (m.advancePaid || 0), 0), [members]);

  // 1. CARGA INICIAL DE DATOS LIGEROS
  const cargarSociosEnMemoria = useCallback(() => {
    const rawMembers = getStoredMembers();
    const mapped: MemberRecord[] = rawMembers.map((m) => ({
      id: m.id,
      name: m.name,
      dni: m.dni || '',
      role: 'cliente',
      plan: m.plan,
      shift: (m.shift as 'manana' | 'tarde' | 'noche') || 'manana',
      coachName: m.coachName || 'Coach Marcos Rivas',
      advancePaid: m.advancePaid || 0,
      balanceDue: m.balanceDue || 0,
      paymentMethod: m.paymentMethod || 'efectivo',
      status: m.membershipStatus,
      expiresIn: m.expiresAt,
      lastVisit: 'Reciente',
    }));
    setMembers(mapped);
  }, []);

  const cargarInventario = useCallback(async () => {
    try {
      const prods = await obtenerProductosInventario();
      setProductos(prods);
    } catch {}
  }, []);

  // 2. OBTENER RESUMEN AGREGADO DESDE POSTGRESQL (CERO EGRESS MASIVO)
  const cargarResumenKPIs = useCallback(async (range: 'todo' | 'mes' | '7dias' | 'hoy') => {
    setIsLoadingResumen(true);

    const now = new Date();
    const peruFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayStr = peruFormatter.format(now);

    let inicio = '2020-01-01';
    const fin = todayStr;

    if (range === 'hoy') {
      inicio = todayStr;
    } else if (range === '7dias') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      inicio = peruFormatter.format(d);
    } else if (range === 'mes') {
      const parts = todayStr.split('-');
      inicio = `${parts[0]}-${parts[1]}-01`;
    } else if (range === 'todo') {
      inicio = '2020-01-01';
    }

    try {
      const data = await obtenerResumenAdmin(inicio, fin);
      setResumen(data);
    } catch {}
    setIsLoadingResumen(false);
  }, []);

  useEffect(() => {
    cargarSociosEnMemoria();
    cargarInventario();
  }, [cargarSociosEnMemoria, cargarInventario]);

  useEffect(() => {
    cargarResumenKPIs(dateRange);
  }, [dateRange, cargarResumenKPIs]);

  // 3. CAMBIO DE ROL DE USUARIO
  const handleUpdateRole = async (id: string, dni: string, newRole: UserRole) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, role: newRole } : m))
    );
    await actualizarRolUsuario(dni, newRole);

    setActionSuccess(`Rol de usuario actualizado a "${newRole.toUpperCase()}".`);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  // 4. REASIGNACIÓN DE TURNO Y COACH
  const handleUpdateMemberShiftAndCoach = async (
    memberId: string,
    newShift: 'manana' | 'tarde' | 'noche',
    newCoach: string
  ) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId ? { ...m, shift: newShift, coachName: newCoach } : m
      )
    );

    // Actualizar en storage / Supabase
    await updateMemberShift(memberId, newShift, newCoach);

    setActionSuccess(`Socio reasignado a Turno ${newShift.toUpperCase()} (${newCoach}).`);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  // 5. AJUSTE RÁPIDO DE STOCK
  const handleQuickStockAdjust = async (productoId: string, delta: number) => {
    const prod = productos.find((p) => p.id === productoId);
    if (!prod) return;
    const nuevoStock = Math.max(0, prod.stock_actual + delta);

    setProductos((prev) =>
      prev.map((p) => (p.id === productoId ? { ...p, stock_actual: nuevoStock } : p))
    );
    await ajustarStockProducto(productoId, nuevoStock);
  };

  // 6. GUARDAR O EDITAR PRODUCTO EN INVENTARIO
  const handleSaveProductModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    await crearOActualizarProducto(editingProduct);
    await cargarInventario();
    setShowProductModal(false);
    setEditingProduct(null);

    setActionSuccess(`Producto "${editingProduct.nombre}" guardado con éxito.`);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  // 7. EXPORTACIÓN CONSOLIDADA 100% CLIENT-SIDE (CSV CON BOM UTF-8 PARA EXCEL WINDOWS)
  const handleExportConsolidadoCSV = () => {
    const BOM = '\uFEFF';
    const headers = [
      'ID',
      'Nombre Completo',
      'DNI',
      'Rol del Sistema',
      'Plan Contratado',
      'Turno Oficial',
      'Coach Encargado',
      'Monto Abonado (S/.)',
      'Saldo Pendiente (S/.)',
      'Estado Membresia',
      'Fecha Vencimiento',
    ];

    const rows = members.map((m) => [
      m.id,
      `"${m.name.replace(/"/g, '""')}"`,
      m.dni,
      m.role,
      `"${m.plan}"`,
      m.shift === 'manana'
        ? 'Mañana (6am-2pm)'
        : m.shift === 'tarde'
        ? 'Tarde (2pm-6pm)'
        : 'Noche (6pm-10pm)',
      `"${m.coachName}"`,
      m.advancePaid.toFixed(2),
      m.balanceDue.toFixed(2),
      m.status,
      m.expiresIn,
    ]);

    const csv = BOM + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trankilandia_cierre_padron_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setActionSuccess('Padrón gerencial exportado en CSV (compatible con tildes y caracteres de Excel).');
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // 8. FILTRADO Y PAGINACIÓN ESTRICTA DEL PADRÓN
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.dni.includes(searchTerm) ||
        m.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchRole = roleFilter === 'all' || m.role === roleFilter;
      const matchShift = shiftFilter === 'all' || m.shift === shiftFilter;
      const matchDebt =
        debtFilter === 'all' ||
        (debtFilter === 'con_deuda' ? m.balanceDue > 0 : m.balanceDue === 0);

      return matchSearch && matchRole && matchShift && matchDebt;
    });
  }, [members, searchTerm, roleFilter, shiftFilter, debtFilter]);

  const totalPages = Math.ceil(filteredMembers.length / pageSize) || 1;
  const paginatedMembers = useMemo(() => {
    const from = (currentPage - 1) * pageSize;
    return filteredMembers.slice(from, from + pageSize);
  }, [filteredMembers, currentPage, pageSize]);

  // Productos con stock crítico
  const productosCriticos = useMemo(() => {
    return productos.filter((p) => p.stock_actual <= p.stock_minimo);
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const matchCat = categoriaInventario === 'Todos' || p.categoria === categoriaInventario;
      const matchSearch =
        p.nombre.toLowerCase().includes(searchInventario.toLowerCase()) ||
        p.id.toLowerCase().includes(searchInventario.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [productos, categoriaInventario, searchInventario]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans pb-16 selection:bg-purple-500 selection:text-white">
      <PortalHeader
        currentRole="admin"
        title="Panel Gerencial & Auditoría"
        subtitle="Arqueo Consolidado · Control de Turnos · Inventario POS · Cero Egress Masivo"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* BARRA SUPERIOR DE PESTAÑAS Y NAVEGACIÓN */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-900/80 border border-white/10 rounded-3xl p-4 sm:p-5 backdrop-blur-md">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('kpis')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'kpis'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Arqueo & Métricas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('inventario')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'inventario'
                  ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-400/20'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Inventario POS</span>
              {productosCriticos.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                  {productosCriticos.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('padron')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'padron'
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Padrón de Socios ({members.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleExportConsolidadoCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono border border-white/10 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Reporte (CSV)</span>
            </button>
          </div>
        </div>

        {/* ALERTA DE ÉXITO */}
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm flex items-center gap-3 font-mono"
          >
            <CheckCircle2 className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </motion.div>
        )}

        {/* =========================================================================
            PESTAÑA 1: ARQUEO DE CAJA CONSOLIDADO & MÉTRICAS ENGINE-SIDE
           ========================================================================= */}
        {activeTab === 'kpis' && (
          <div className="space-y-6">
            {/* Selector de Rango de Fecha */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span className="font-bold">Periodo de Arqueo (Hora Perú):</span>
                <span className="text-zinc-500 text-[11px]">
                  {resumen ? `${resumen.periodo.inicio} al ${resumen.periodo.fin}` : 'Cargando...'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'todo', label: 'Histórico Total' },
                  { id: 'mes', label: 'Mes Actual' },
                  { id: '7dias', label: 'Últimos 7 Días' },
                  { id: 'hoy', label: 'Hoy' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setDateRange(r.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      dateRange === r.id
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => cargarResumenKPIs(dateRange)}
                  className="p-1.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 cursor-pointer ml-1"
                  title="Recalcular métricas"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingResumen ? 'animate-spin text-purple-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* KPI Cards Consolidadas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-900/70 border border-emerald-500/30 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
                    Total Recaudado
                  </span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-black font-display text-white">
                  S/. {resumen && resumen.recaudacion.total > 0
                    ? resumen.recaudacion.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })
                    : (dateRange === 'todo'
                        ? totalCobradoMembers.toLocaleString('es-PE', { minimumFractionDigits: 2 })
                        : '0.00')}
                </div>
                <div className="mt-2 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                  <span>
                    Membresías: S/. {resumen && resumen.recaudacion.total > 0
                      ? resumen.recaudacion.membresias.toFixed(0)
                      : (dateRange === 'todo' ? totalCobradoMembers.toFixed(0) : '0')}
                  </span>
                  <span>POS: S/. {resumen ? resumen.recaudacion.pos.toFixed(0) : '0'}</span>
                </div>
              </div>

              <div className="bg-zinc-900/70 border border-amber-500/30 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Saldos por Cobrar</span>
                  </span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-black font-display text-amber-400">
                  S/. {resumen ? resumen.socios.total_deudas_pendientes.toLocaleString('es-PE', { minimumFractionDigits: 2 }) : totalDeudasMembers.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                  {resumen ? resumen.socios.socios_con_deuda : members.filter(m => m.balanceDue > 0).length} socios con adelanto pendiente
                </p>
              </div>

              <div className="bg-zinc-900/70 border border-purple-500/30 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold">
                    Padrón de Atletas
                  </span>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-black font-display text-white">
                  {resumen ? resumen.socios.total_socios : members.length}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                  Sede Central Huamanga, Ayacucho
                </p>
              </div>

              <div className="bg-zinc-900/70 border border-cyan-500/30 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    Asistencias Registradas
                  </span>
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Activity className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-black font-display text-white">
                  {resumen ? resumen.asistencias.total_asistencias : 0}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                  Ingresos validados con lector 1D
                </p>
              </div>
            </div>

            {/* Arqueo por Método de Pago & Distribución de Turnos */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Desglose por Método de Pago (6 cols) */}
              <div className="lg:col-span-6 bg-zinc-900/60 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white font-display uppercase tracking-wide flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>Recaudación por Método de Cobro</span>
                  </h3>
                  <span className="text-xs font-mono text-zinc-400 uppercase">Caja Consolidada</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-emerald-400" />
                      <span>Efectivo:</span>
                    </div>
                    <span className="font-bold text-white text-sm">
                      S/. {resumen && resumen.recaudacion.total > 0
                        ? resumen.recaudacion.por_metodo.efectivo.toFixed(2)
                        : (dateRange === 'todo' ? efectivoMembers.toFixed(2) : '0.00')}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-purple-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-purple-400" />
                      <span>Yape:</span>
                    </div>
                    <span className="font-bold text-purple-300 text-sm">
                      S/. {resumen && resumen.recaudacion.total > 0
                        ? resumen.recaudacion.por_metodo.yape.toFixed(2)
                        : (dateRange === 'todo' ? yapeMembers.toFixed(2) : '0.00')}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-cyan-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-cyan-400" />
                      <span>Plin:</span>
                    </div>
                    <span className="font-bold text-cyan-300 text-sm">
                      S/. {resumen && resumen.recaudacion.total > 0
                        ? resumen.recaudacion.por_metodo.plin.toFixed(2)
                        : (dateRange === 'todo' ? plinMembers.toFixed(2) : '0.00')}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-amber-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-400" />
                      <span>Tarjeta POS:</span>
                    </div>
                    <span className="font-bold text-amber-300 text-sm">
                      S/. {resumen && resumen.recaudacion.total > 0
                        ? resumen.recaudacion.por_metodo.tarjeta.toFixed(2)
                        : (dateRange === 'todo' ? tarjetaMembers.toFixed(2) : '0.00')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Distribución por Turnos Oficiales (6 cols) */}
              <div className="lg:col-span-6 bg-zinc-900/60 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white font-display uppercase tracking-wide flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Distribución por Turnos Oficiales</span>
                  </h3>
                  <span className="text-xs font-mono text-zinc-400">Atención 6am - 10pm</span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-amber-400/30 text-center">
                    <Sun className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                    <span className="text-[10px] uppercase text-zinc-400 block font-bold">Mañana</span>
                    <span className="text-[10px] text-zinc-500 block">6:00 AM - 2:00 PM</span>
                    <span className="text-xl font-black text-white mt-1 block">
                      {resumen ? resumen.socios.por_turno.manana : 0}
                    </span>
                    <span className="text-[10px] text-zinc-400">alumnos</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-orange-500/30 text-center">
                    <Sunset className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                    <span className="text-[10px] uppercase text-zinc-400 block font-bold">Tarde</span>
                    <span className="text-[10px] text-zinc-500 block">2:00 PM - 6:00 PM</span>
                    <span className="text-xl font-black text-white mt-1 block">
                      {resumen ? resumen.socios.por_turno.tarde : 0}
                    </span>
                    <span className="text-[10px] text-zinc-400">alumnos</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-blue-500/30 text-center">
                    <Moon className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                    <span className="text-[10px] uppercase text-zinc-400 block font-bold">Noche</span>
                    <span className="text-[10px] text-zinc-500 block">6:00 PM - 10:00 PM</span>
                    <span className="text-xl font-black text-white mt-1 block">
                      {resumen ? resumen.socios.por_turno.noche : 0}
                    </span>
                    <span className="text-[10px] text-zinc-400">alumnos</span>
                  </div>
                </div>

                {/* Carga por Entrenador */}
                <div className="pt-2">
                  <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold block mb-2">
                    Carga de Alumnos por Entrenador (Staff de 4 Coaches):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded-lg bg-zinc-950 border border-white/5">
                      <span className="text-zinc-400 block">Marcos (Mañ):</span>
                      <strong className="text-white text-xs">{resumen ? resumen.socios.por_coach.marcos : 0}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-950 border border-white/5">
                      <span className="text-zinc-400 block">Camila (Mañ):</span>
                      <strong className="text-white text-xs">{resumen ? resumen.socios.por_coach.camila : 0}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-950 border border-white/5">
                      <span className="text-zinc-400 block">Valeria (Tar):</span>
                      <strong className="text-white text-xs">{resumen ? resumen.socios.por_coach.valeria : 0}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-950 border border-white/5">
                      <span className="text-zinc-400 block">Daniel (Noc):</span>
                      <strong className="text-white text-xs">{resumen ? resumen.socios.por_coach.daniel : 0}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 2: GESTIÓN DE INVENTARIO POS & ALERTAS DE STOCK CRÍTICO
           ========================================================================= */}
        {activeTab === 'inventario' && (
          <div className="space-y-6">
            {/* KPI Cards de Inventario */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-5">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Valoración al Costo
                </span>
                <div className="mt-2 text-2xl font-black font-display text-white">
                  S/. {resumen ? resumen.inventario.valor_costo.toLocaleString('es-PE', { minimumFractionDigits: 2 }) : '0.00'}
                </div>
                <p className="text-[11px] text-zinc-500 font-mono mt-1">Capital invertido en stock</p>
              </div>

              <div className="bg-zinc-900/70 border border-emerald-500/30 rounded-2xl p-5">
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                  Valor Potencial de Venta
                </span>
                <div className="mt-2 text-2xl font-black font-display text-emerald-400">
                  S/. {resumen ? resumen.inventario.valor_venta.toLocaleString('es-PE', { minimumFractionDigits: 2 }) : '0.00'}
                </div>
                <p className="text-[11px] text-emerald-300 font-mono mt-1">
                  Ganancia proyectada: S/. {resumen ? resumen.inventario.ganancia_estimada.toFixed(2) : '0'}
                </p>
              </div>

              <div className="bg-zinc-900/70 border border-red-500/30 rounded-2xl p-5">
                <span className="text-xs font-mono uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Productos en Stock Crítico</span>
                </span>
                <div className="mt-2 text-2xl font-black font-display text-red-400">
                  {productosCriticos.length} productos
                </div>
                <p className="text-[11px] text-zinc-400 font-mono mt-1">Requieren reposición inmediata</p>
              </div>
            </div>

            {/* Alerta de Productos Críticos */}
            {productosCriticos.length > 0 && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500 text-white rounded-xl">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-red-300 block">Stock Crítico Detectado:</span>
                    <span className="text-zinc-300">
                      {productosCriticos.map((p) => `${p.nombre} (${p.stock_actual} un.)`).join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Controles de Inventario: Filtro y Nuevo Producto */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchInventario}
                    onChange={(e) => setSearchInventario(e.target.value)}
                    placeholder="Buscar producto por SKU o nombre..."
                    className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <select
                  value={categoriaInventario}
                  onChange={(e) => setCategoriaInventario(e.target.value)}
                  className="bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 cursor-pointer"
                >
                  {['Todos', 'Bebidas', 'Energizantes', 'Proteinas', 'Suplementos', 'Snacks', 'Accesorios'].map(
                    (cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    )
                  )}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingProduct({
                    id: `PROD-${Date.now().toString().slice(-4)}`,
                    nombre: '',
                    categoria: 'Bebidas',
                    precio_compra: 0,
                    precio_venta: 0,
                    stock_actual: 10,
                    stock_minimo: 5,
                    activo: true,
                  });
                  setShowProductModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs font-mono uppercase tracking-wider cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>NUEVO PRODUCTO</span>
              </button>
            </div>

            {/* Tabla de Inventario */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">SKU / ID</th>
                      <th className="py-3 px-4">Producto</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4">P. Compra</th>
                      <th className="py-3 px-4">P. Venta</th>
                      <th className="py-3 px-4">Margen</th>
                      <th className="py-3 px-4">Stock Actual</th>
                      <th className="py-3 px-4 text-right">Ajuste Rápido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {productosFiltrados.map((prod) => {
                      const isLow = prod.stock_actual <= prod.stock_minimo;
                      const margen = prod.precio_venta - (prod.precio_compra || 0);

                      return (
                        <tr key={prod.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-4 text-zinc-400 font-bold">{prod.id}</td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-white font-sans">{prod.nombre}</span>
                            {prod.codigo_barras && (
                              <span className="text-[10px] text-zinc-500 block">Cod: {prod.codigo_barras}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-zinc-300">{prod.categoria}</td>
                          <td className="py-3 px-4 text-zinc-400">S/. {(prod.precio_compra || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-emerald-400 font-bold">
                            S/. {prod.precio_venta.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-emerald-300 font-bold">
                            +S/. {margen.toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                isLow
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              {prod.stock_actual} un. (Mín: {prod.stock_minimo})
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleQuickStockAdjust(prod.id, -1)}
                                className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center cursor-pointer"
                                title="Restar 1 de stock"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickStockAdjust(prod.id, 1)}
                                className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center cursor-pointer"
                                title="Sumar 1 de stock"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProduct(prod);
                                  setShowProductModal(true);
                                }}
                                className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-400 cursor-pointer ml-1"
                                title="Editar producto"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 3: PADRÓN GENERAL & GESTIÓN DE ROLES / TURNOS
           ========================================================================= */}
        {activeTab === 'padron' && (
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
            {/* Filtros de Padrón */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-4 border-b border-white/10">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar socio por nombre, DNI o ID..."
                  className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              {/* Filtros por Rol, Turno y Deuda */}
              <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                {/* Filtro Rol */}
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-zinc-200 cursor-pointer"
                >
                  <option value="all">Rol: Todos</option>
                  <option value="admin">Admin</option>
                  <option value="caja">Caja</option>
                  <option value="entrenador">Entrenador</option>
                  <option value="cliente">Cliente</option>
                </select>

                {/* Filtro Turno */}
                <select
                  value={shiftFilter}
                  onChange={(e) => {
                    setShiftFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-zinc-200 cursor-pointer"
                >
                  <option value="all">Turno: Todos</option>
                  <option value="manana">Mañana (6am-2pm)</option>
                  <option value="tarde">Tarde (2pm-6pm)</option>
                  <option value="noche">Noche (6pm-10pm)</option>
                </select>

                {/* Filtro Deuda */}
                <select
                  value={debtFilter}
                  onChange={(e) => {
                    setDebtFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-zinc-200 cursor-pointer"
                >
                  <option value="all">Deuda: Todas</option>
                  <option value="con_deuda">Con Saldo Deudor</option>
                  <option value="al_dia">100% Al Día</option>
                </select>
              </div>
            </div>

            {/* Tabla Paginada de Socios */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 font-mono uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Socio / Usuario</th>
                    <th className="py-3 px-4">DNI</th>
                    <th className="py-3 px-4">Rol</th>
                    <th className="py-3 px-4">Turno Oficial</th>
                    <th className="py-3 px-4">Coach Asignado</th>
                    <th className="py-3 px-4">Plan & Saldo</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {paginatedMembers.map((m) => {
                    const hasDebt = m.balanceDue > 0;

                    return (
                      <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{m.name}</div>
                          <div className="text-[11px] text-zinc-500 font-mono">{m.id}</div>
                        </td>

                        <td className="py-3 px-4 font-mono text-zinc-300">{m.dni || 'Sin DNI'}</td>

                        <td className="py-3 px-4">
                          <select
                            value={m.role}
                            onChange={(e) => handleUpdateRole(m.id, m.dni, e.target.value as UserRole)}
                            className="bg-zinc-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono text-zinc-200 cursor-pointer focus:outline-none focus:border-purple-500"
                          >
                            <option value="admin">admin</option>
                            <option value="caja">caja</option>
                            <option value="entrenador">entrenador</option>
                            <option value="cliente">cliente</option>
                          </select>
                        </td>

                        <td className="py-3 px-4">
                          <select
                            value={m.shift}
                            onChange={(e) => {
                              const newShift = e.target.value as 'manana' | 'tarde' | 'noche';
                              const defaultCoach =
                                COACHES_BY_SHIFT_OPTIONS.find((c) => c.shift === newShift)?.name ||
                                m.coachName;
                              handleUpdateMemberShiftAndCoach(m.id, newShift, defaultCoach);
                            }}
                            className="bg-zinc-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono text-amber-400 font-bold cursor-pointer focus:outline-none"
                          >
                            <option value="manana">Mañana (6am-2pm)</option>
                            <option value="tarde">Tarde (2pm-6pm)</option>
                            <option value="noche">Noche (6pm-10pm)</option>
                          </select>
                        </td>

                        <td className="py-3 px-4">
                          <select
                            value={m.coachName}
                            onChange={(e) =>
                              handleUpdateMemberShiftAndCoach(m.id, m.shift, e.target.value)
                            }
                            className="bg-zinc-950 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono text-zinc-300 cursor-pointer focus:outline-none"
                          >
                            {COACHES_BY_SHIFT_OPTIONS.map((c) => (
                              <option key={c.name} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3 px-4 font-mono text-xs">
                          <div className="text-white">{m.plan}</div>
                          {hasDebt ? (
                            <span className="text-red-400 font-bold text-[11px]">
                              Debe: S/. {m.balanceDue.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-emerald-400 text-[11px]">100% Al Día</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const fullMember = getStoredMembers().find((sm) => sm.id === m.id);
                              if (fullMember) setProfileModalMember(fullMember);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-mono border border-white/10 transition-colors cursor-pointer"
                          >
                            <User className="w-3.5 h-3.5 text-amber-400" />
                            <span>Gestionar</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Controles de Paginación */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-mono">
              <span className="text-zinc-400">
                Mostrando {Math.min((currentPage - 1) * pageSize + 1, filteredMembers.length)} a{' '}
                {Math.min(currentPage * pageSize, filteredMembers.length)} de {filteredMembers.length} socios filtrados
              </span>

              <div className="flex items-center gap-1.5 self-center sm:self-auto">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>
                <span className="px-3 py-1.5 text-zinc-400">
                  Pág. {currentPage} de {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL PARA CREAR O EDITAR PRODUCTO */}
      {showProductModal && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-zinc-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4 font-mono text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white font-display uppercase tracking-tight">
                  Gestionar Producto POS
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProductModal} className="space-y-3">
              <div>
                <label className="block text-zinc-400 uppercase font-bold mb-1">SKU / ID</label>
                <input
                  type="text"
                  required
                  value={editingProduct.id}
                  onChange={(e) => setEditingProduct({ ...editingProduct, id: e.target.value })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-400 uppercase font-bold mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  value={editingProduct.nombre}
                  onChange={(e) => setEditingProduct({ ...editingProduct, nombre: e.target.value })}
                  placeholder="Ej: Sporade 500ml"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 uppercase font-bold mb-1">Categoría</label>
                  <select
                    value={editingProduct.categoria}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, categoria: e.target.value as any })
                    }
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-2 text-zinc-200"
                  >
                    {['Bebidas', 'Energizantes', 'Proteinas', 'Suplementos', 'Snacks', 'Accesorios'].map(
                      (cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 uppercase font-bold mb-1">Código de Barras</label>
                  <input
                    type="text"
                    value={editingProduct.codigo_barras || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, codigo_barras: e.target.value })
                    }
                    placeholder="Opcional"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 uppercase font-bold mb-1">P. Compra (S/.)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editingProduct.precio_compra || 0}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, precio_compra: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 uppercase font-bold mb-1">P. Venta (S/.)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    required
                    value={editingProduct.precio_venta}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, precio_venta: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-950 border border-emerald-500/40 rounded-xl px-3 py-2 text-emerald-400 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 uppercase font-bold mb-1">Stock Actual</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduct.stock_actual}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, stock_actual: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 uppercase font-bold mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingProduct.stock_minimo}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, stock_minimo: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-400 hover:bg-emerald-300 text-black py-3 rounded-xl font-black cursor-pointer shadow-lg shadow-emerald-400/20"
                >
                  GUARDAR PRODUCTO
                </button>
              </div>
            </form>
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
            saveStoredMembers(next);
            cargarSociosEnMemoria();
            setProfileModalMember(null);
            setActionSuccess(`¡Perfil de ${updated.name} actualizado con éxito!`);
            setTimeout(() => setActionSuccess(null), 4000);
          }}
          onOpenPaymentModal={(m) => {
            setProfileModalMember(null);
            setLiquidatingMember(m);
            setCustomAbonoAmount(m.balanceDue);
          }}
        />
      )}

      {/* MODAL DE ABONO / COBRO PARCIAL EN ADMINISTRACIÓN */}
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
                <span className="text-zinc-400">Costo Total:</span>
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

              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-white/5 text-[11px]">
                {customAbonoAmount >= liquidatingMember.balanceDue ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span>✅</span> El socio quedará 100% AL DÍA (Saldo restante: S/. 0.00)
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1.5">
                    <span>⚠️</span> Quedará un saldo de:{' '}
                    <strong className="text-white">
                      S/. {(liquidatingMember.balanceDue - (customAbonoAmount || 0)).toFixed(2)}
                    </strong>
                  </span>
                )}
              </div>
            </div>

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
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!customAbonoAmount || customAbonoAmount <= 0}
                onClick={async () => {
                  const amountToCharge =
                    customAbonoAmount > 0
                      ? Math.min(liquidatingMember.balanceDue, customAbonoAmount)
                      : liquidatingMember.balanceDue;

                  const next = await payMemberBalance(
                    liquidatingMember.id,
                    liquidateMethod,
                    amountToCharge
                  );
                  saveStoredMembers(next);
                  cargarSociosEnMemoria();
                  setActionSuccess(
                    `¡Abono de S/. ${amountToCharge.toFixed(2)} registrado con éxito a ${liquidatingMember.name}!`
                  );
                  setLiquidatingMember(null);
                  setTimeout(() => setActionSuccess(null), 4000);
                }}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl font-black cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-40"
              >
                CONFIRMAR COBRO
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
