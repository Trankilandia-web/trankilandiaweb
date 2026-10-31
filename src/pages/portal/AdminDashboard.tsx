import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  UserPlus,
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
  Tag,
  RotateCcw,
  Check,
  Trash2,
} from 'lucide-react';
import PortalHeader from '../../components/portal/PortalHeader';
import { UserRole } from '../../types/roles';
import {
  GymMember,
  getStoredMembers,
  saveStoredMembers,
  GymPlanTier,
  AddonRates,
  getStoredMembershipPlans,
  saveStoredMembershipPlans,
  getStoredAddonRates,
  saveStoredAddonRates,
  resetMembershipPlansToDefault,
} from '../../data/gymStore';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
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
  fetchSociosParaAdmin,
  validarDocumentoSocio,
  registerGymMember,
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
  documentStatus?: 'sin_documento' | 'pendiente' | 'verificado' | 'rechazado';
  documentUrl?: string | null;
}

const COACHES_BY_SHIFT_OPTIONS = [
  { name: 'Coach Marcos Rivas', shift: 'manana', label: 'Coach Marcos Rivas (Varón · Mañana)' },
  { name: 'Coach Camila Mendoza', shift: 'manana', label: 'Coach Camila Mendoza (Mujer · Mañana)' },
  { name: 'Coach Valeria Gómez', shift: 'tarde', label: 'Coach Valeria Gómez (Mujer · Tarde)' },
  { name: 'Coach Daniel Quispe', shift: 'noche', label: 'Coach Daniel Quispe (Varón · Noche)' },
];

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTab = searchParams.get('tab');
  const validTabs: Array<'kpis' | 'inventario' | 'padron' | 'planes'> = ['kpis', 'inventario', 'padron', 'planes'];

  // Pestañas principales (con soporte para enlace directo /admin?tab=planes)
  const [activeTab, setActiveTab] = useState<'kpis' | 'inventario' | 'padron' | 'planes'>(() => {
    if (queryTab && validTabs.includes(queryTab as any)) {
      return queryTab as any;
    }
    return 'kpis';
  });

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && validTabs.includes(t as any)) {
      setActiveTab(t as any);
    }
  }, [searchParams]);

  const handleSelectTab = (tab: 'kpis' | 'inventario' | 'padron' | 'planes') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Gestión de Planes y Tarifas en Vivo
  const [storedPlans, setStoredPlans] = useState<GymPlanTier[]>(getStoredMembershipPlans);
  const [addonRates, setAddonRates] = useState<AddonRates>(getStoredAddonRates);
  const [editingPlan, setEditingPlan] = useState<GymPlanTier | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [quickPlanPrices, setQuickPlanPrices] = useState<
    Record<string, { monthly: number; quarterly: number; semiannual: number; annual: number }>
  >({});

  useEffect(() => {
    const map: Record<string, { monthly: number; quarterly: number; semiannual: number; annual: number }> = {};
    storedPlans.forEach((p) => {
      map[p.id] = {
        monthly: p.monthlyPrice,
        quarterly: p.quarterlyPrice,
        semiannual: p.semiannualPrice,
        annual: p.annualPrice,
      };
    });
    setQuickPlanPrices(map);
  }, [storedPlans]);

  // Filtro de rango de fecha para arqueo (Hora de Perú) - Por defecto Mes Actual (Octubre)
  const [dateRange, setDateRange] = useState<'mes' | 'hoy' | '7dias' | 'anual' | string>('mes');
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
  const [isNewMemberModal, setIsNewMemberModal] = useState(false);
  const [liquidatingMember, setLiquidatingMember] = useState<GymMember | null>(null);
  const [customAbonoAmount, setCustomAbonoAmount] = useState<number>(0);
  const [liquidateMethod, setLiquidateMethod] = useState<'yape' | 'plin' | 'efectivo' | 'tarjeta'>('yape');

  // Notificación de éxito
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fallbacks calculados en tiempo real según el rango de fecha activo
  const rawStored = useMemo(() => getStoredMembers(), []);
  const membersEnRango = useMemo(() => {
    if (dateRange === 'anual') return members;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const curYearMonth = today.slice(0, 7);

    if (dateRange === 'hoy') {
      return members.filter(m => {
        const raw = rawStored.find(r => r.id === m.id);
        return raw?.registeredAt === today;
      });
    }
    if (dateRange === '7dias') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const sevDaysAgo = d.toISOString().slice(0, 10);
      return members.filter(m => {
        const raw = rawStored.find(r => r.id === m.id);
        const reg = raw?.registeredAt || '';
        return reg >= sevDaysAgo && reg <= today;
      });
    }
    if (dateRange === 'mes') {
      return members.filter(m => {
        const raw = rawStored.find(r => r.id === m.id);
        const reg = raw?.registeredAt || '';
        return reg.startsWith(curYearMonth);
      });
    }
    if (typeof dateRange === 'string' && /^\d{4}-\d{2}$/.test(dateRange)) {
      return members.filter(m => {
        const raw = rawStored.find(r => r.id === m.id);
        const reg = raw?.registeredAt || '';
        return reg.startsWith(dateRange);
      });
    }
    return members;
  }, [members, dateRange, rawStored]);

  const totalCobradoMembers = useMemo(() => membersEnRango.reduce((sum, m) => sum + (m.advancePaid || 0), 0), [membersEnRango]);
  const efectivoMembers = useMemo(() => membersEnRango.filter(m => (m.paymentMethod || 'efectivo').toLowerCase() === 'efectivo').reduce((sum, m) => sum + (m.advancePaid || 0), 0), [membersEnRango]);
  const yapeMembers = useMemo(() => membersEnRango.filter(m => (m.paymentMethod || '').toLowerCase() === 'yape').reduce((sum, m) => sum + (m.advancePaid || 0), 0), [membersEnRango]);
  const plinMembers = useMemo(() => membersEnRango.filter(m => (m.paymentMethod || '').toLowerCase() === 'plin').reduce((sum, m) => sum + (m.advancePaid || 0), 0), [membersEnRango]);
  const tarjetaMembers = useMemo(() => membersEnRango.filter(m => (m.paymentMethod || '').toLowerCase() === 'tarjeta').reduce((sum, m) => sum + (m.advancePaid || 0), 0), [membersEnRango]);
  const totalDeudasMembers = useMemo(() => members.reduce((sum, m) => sum + (m.balanceDue || 0), 0), [members]);

  // 1. CARGA INICIAL DE DATOS EN TIEMPO REAL DESDE SUPABASE
  const cargarSociosEnMemoria = useCallback(async () => {
    // Consulta en vivo a la nube con fallback local
    const rawMembers = await fetchSociosParaAdmin();
    let profilesRoleMap: Record<string, UserRole> = {};

    if (isSupabaseConfigured()) {
      try {
        const { data: profs } = await supabase.from('profiles').select('dni, email, role');
        if (profs) {
          profs.forEach((p: any) => {
            if (p.dni) profilesRoleMap[p.dni] = p.role;
            if (p.email) profilesRoleMap[p.email.toLowerCase()] = p.role;
          });
        }
      } catch {}
    }

    const mapped: MemberRecord[] = rawMembers.map((m) => {
      let r: UserRole = 'cliente';
      if (m.dni && profilesRoleMap[m.dni]) {
        r = profilesRoleMap[m.dni];
      }
      return {
        id: m.id,
        name: m.name,
        dni: m.dni || '',
        role: r,
        plan: m.plan,
        shift: (m.shift as 'manana' | 'tarde' | 'noche') || 'manana',
        coachName: m.coachName || 'Coach Marcos Rivas',
        advancePaid: m.advancePaid || 0,
        balanceDue: m.balanceDue || 0,
        paymentMethod: m.paymentMethod || 'efectivo',
        status: m.membershipStatus,
        expiresIn: m.expiresAt,
        lastVisit: 'Reciente',
        documentStatus: m.documentStatus,
        documentUrl: m.documentUrl,
      };
    });
    setMembers(mapped);
  }, []);

  const cargarInventario = useCallback(async () => {
    try {
      const prods = await obtenerProductosInventario();
      setProductos(prods);
    } catch {}
  }, []);

  // 2. OBTENER RESUMEN AGREGADO DESDE POSTGRESQL (CERO EGRESS MASIVO)
  const cargarResumenKPIs = useCallback(async (range: 'mes' | 'hoy' | '7dias' | 'anual' | string) => {
    setIsLoadingResumen(true);

    const now = new Date();
    const peruFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayStr = peruFormatter.format(now);
    const parts = todayStr.split('-');
    const currentYear = parts[0] || '2026';
    const currentMonth = parts[1] || '10';

    let inicio = `${currentYear}-${currentMonth}-01`;
    let fin = todayStr;

    if (range === 'hoy') {
      inicio = todayStr;
      fin = todayStr;
    } else if (range === '7dias') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      inicio = peruFormatter.format(d);
      fin = todayStr;
    } else if (range === 'mes') {
      inicio = `${currentYear}-${currentMonth}-01`;
      fin = `${currentYear}-${currentMonth}-31`;
    } else if (range === 'anual') {
      inicio = `${currentYear}-01-01`;
      fin = `${currentYear}-12-31`;
    } else if (typeof range === 'string' && /^\d{4}-\d{2}$/.test(range)) {
      inicio = `${range}-01`;
      fin = `${range}-31`;
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

  // 7. INSCRIBIR NUEVO SOCIO DESDE ADMINISTRACIÓN
  const handleOpenNewMember = () => {
    const today = new Date().toISOString().split('T')[0];
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    const expiry = expiryDate.toISOString().split('T')[0];

    const newMember: GymMember = {
      id: `MEM-00${members.length + 1}`,
      name: '',
      dni: '',
      email: '',
      phone: '',
      plan: '1 Mes · Musculación Libre',
      planPrice: 80,
      paymentType: 'full',
      advancePaid: 80,
      balanceDue: 0,
      paymentDueDate: today,
      paymentMethod: 'efectivo',
      receiptNumber: `B001-${String(Math.floor(Math.random() * 900000) + 100000)}`,
      membershipStatus: 'active',
      registeredAt: today,
      expiresAt: expiry,
      coachName: 'Coach Marcos Rivas (Mañana)',
      shift: 'manana',
      observations: 'Inscripción directa por Administración',
      documentStatus: 'verificado',
      documentType: null,
    };
    setIsNewMemberModal(true);
    setProfileModalMember(newMember);
  };

  // 8. GESTIÓN DE PLANES Y TARIFAS EN VIVO POR ADMINISTRACIÓN
  const handleSaveQuickPlanPrices = (planId: string) => {
    const edits = quickPlanPrices[planId];
    if (!edits) return;

    const next = storedPlans.map((p) => {
      if (p.id === planId) {
        return {
          ...p,
          monthlyPrice: Number(edits.monthly) || 0,
          quarterlyPrice: Number(edits.quarterly) || 0,
          semiannualPrice: Number(edits.semiannual) || 0,
          annualPrice: Number(edits.annual) || 0,
        };
      }
      return p;
    });

    setStoredPlans(next);
    saveStoredMembershipPlans(next);
    const targetName = storedPlans.find((p) => p.id === planId)?.name || 'Plan';
    setActionSuccess(`¡Precios de "${targetName}" actualizados en vivo!`);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const handleTogglePlanActive = (planId: string) => {
    const next = storedPlans.map((p) => {
      if (p.id === planId) {
        const nextState = p.isActive === false;
        return { ...p, isActive: nextState };
      }
      return p;
    });
    setStoredPlans(next);
    saveStoredMembershipPlans(next);
    setActionSuccess('Estado del plan actualizado en el portal web y caja.');
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleResetPlans = () => {
    if (
      window.confirm(
        '¿Deseas restablecer los planes a las tarifas oficiales recomendadas (Escolar S/. 50, Universitario S/. 60, General S/. 80, Boxeo S/. 120)?'
      )
    ) {
      const defs = resetMembershipPlansToDefault();
      setStoredPlans(defs);
      setAddonRates(getStoredAddonRates());
      setActionSuccess('¡Tarifas oficiales de Trankilandia Gym restauradas con éxito!');
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handleOpenCreatePlan = () => {
    const newPlan: GymPlanTier = {
      id: `plan-${Date.now()}`,
      name: 'Nuevo Plan de Entrenamiento',
      tagline: 'Descripción atractiva del nuevo plan',
      monthlyPrice: 90,
      quarterlyPrice: 240,
      semiannualPrice: 420,
      annualPrice: 700,
      isPopular: false,
      badge: 'NUEVA TARIFA',
      description: 'Detalles y accesos incluidos en este plan de entrenamiento.',
      highlights: [
        'Acceso completo a sala de pesas y máquinas',
        'Asesoría técnica permanente por instructores de sala',
        'Casilleros seguros y duchas con agua caliente',
      ],
      ctaText: 'ELEGIR PLAN',
      includesFreeEntry: true,
      isActive: true,
      requiresDocument: null,
    };
    setIsCreatingPlan(true);
    setEditingPlan(newPlan);
  };

  const handleOpenEditPlan = (plan: GymPlanTier) => {
    setIsCreatingPlan(false);
    setEditingPlan({ ...plan });
  };

  const handleSaveFullPlanModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    let next: GymPlanTier[];
    if (isCreatingPlan) {
      next = [...storedPlans, editingPlan];
    } else {
      next = storedPlans.map((p) => (p.id === editingPlan.id ? editingPlan : p));
    }

    setStoredPlans(next);
    saveStoredMembershipPlans(next);
    setEditingPlan(null);
    setIsCreatingPlan(false);
    setActionSuccess(`¡Plan "${editingPlan.name}" guardado exitosamente!`);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const handleDeletePlan = (planId: string) => {
    if (['escolar', 'universitario', 'general', 'combo_boxeo'].includes(planId)) {
      alert('Los planes oficiales base del gimnasio no se pueden eliminar. Puedes pausarlos si no deseas ofrecerlos.');
      return;
    }
    if (window.confirm('¿Seguro que deseas eliminar este plan personalizado?')) {
      const next = storedPlans.filter((p) => p.id !== planId);
      setStoredPlans(next);
      saveStoredMembershipPlans(next);
      setActionSuccess('Plan eliminado correctamente.');
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const handleSaveAddonRates = () => {
    saveStoredAddonRates(addonRates);
    setActionSuccess('¡Tarifas especiales y Pase Diario guardados con éxito!');
    setTimeout(() => setActionSuccess(null), 3500);
  };

  // 9. EXPORTACIÓN CONSOLIDADA 100% CLIENT-SIDE (CSV CON BOM UTF-8 PARA EXCEL WINDOWS)
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
    const q = searchTerm.toLowerCase().trim();
    return members.filter((m) => {
      const matchSearch =
        !q ||
        (m.name || '').toLowerCase().includes(q) ||
        (m.dni ? String(m.dni).includes(q) : false) ||
        (m.id || '').toLowerCase().includes(q);

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
              onClick={() => handleSelectTab('kpis')}
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
              onClick={() => handleSelectTab('inventario')}
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
              onClick={() => handleSelectTab('padron')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'padron'
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Padrón de Socios ({members.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab('planes')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'planes'
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Planes & Tarifas ({storedPlans.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleOpenNewMember}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-mono font-bold transition-all shadow-lg shadow-amber-400/20 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Inscribir Socio</span>
            </button>
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
            {/* Selector de Rango de Fecha & Auditoría Anual */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span className="font-bold">Periodo de Arqueo (Hora Perú):</span>
                <span className="text-zinc-400 text-[11px] bg-zinc-950 px-2 py-0.5 rounded-md border border-white/5">
                  {resumen ? `${resumen.periodo.inicio} al ${resumen.periodo.fin}` : 'Cargando...'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'mes', label: 'Mes Actual (Octubre)' },
                  { id: 'hoy', label: 'Hoy' },
                  { id: '7dias', label: 'Últimos 7 Días' },
                  { id: 'anual', label: 'Año 2026 (Anual)' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setDateRange(r.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      dateRange === r.id
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}

                {/* Selector para auditar mes a mes exactamente como en el Excel */}
                <select
                  value={/^\d{4}-\d{2}$/.test(dateRange) ? dateRange : ''}
                  onChange={(e) => {
                    if (e.target.value) setDateRange(e.target.value);
                  }}
                  className="bg-zinc-950 border border-purple-500/30 rounded-xl px-2.5 py-1.5 text-xs font-mono text-purple-300 focus:outline-none cursor-pointer"
                >
                  <option value="">Auditar Mes Específico...</option>
                  <option value="2026-10">Octubre 2026 (S/. 12,949 · 86 atletas)</option>
                  <option value="2026-09">Septiembre 2026 (S/. 11,615 · 91 atletas)</option>
                  <option value="2026-08">Agosto 2026 (S/. 8,615 · 85 atletas)</option>
                  <option value="2026-07">Julio 2026 (S/. 9,610 · 57 atletas)</option>
                  <option value="2026-06">Junio 2026 (S/. 5,740 · 25 atletas)</option>
                  <option value="2026-05">Mayo 2026 (S/. 5,490 · 15 atletas)</option>
                  <option value="2026-04">Abril 2026 (S/. 4,950 · 15 atletas)</option>
                  <option value="2026-03">Marzo 2026 (S/. 3,480 · 11 atletas)</option>
                  <option value="2026-02">Febrero 2026 (S/. 700 · 2 atletas)</option>
                  <option value="2026-01">Enero 2026 (S/. 2,100 · 6 atletas)</option>
                </select>

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
                    {dateRange === 'anual' ? 'Recaudación Anual 2026' : (dateRange === 'mes' ? 'Recaudación Mes Actual' : 'Total Recaudado')}
                  </span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-black font-display text-white">
                  S/. {(resumen ? resumen.recaudacion.total : totalCobradoMembers).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-2 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                  <span>
                    Membresías: S/. {(resumen ? resumen.recaudacion.membresias : totalCobradoMembers).toFixed(0)}
                  </span>
                  <span>POS: S/. {resumen ? resumen.recaudacion.pos.toFixed(0) : '0'}</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono mt-1">
                  {dateRange === 'anual'
                    ? 'Acumulado Ene-Oct 2026 (10 meses del padrón)'
                    : (dateRange === 'mes'
                        ? 'Caja de Octubre 2026 (Mes en curso)'
                        : (dateRange === 'hoy'
                            ? 'Cobros registrados el día de hoy'
                            : 'Filtro seleccionado'))}
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
                <div className="text-[10px] text-zinc-500 font-mono mt-1">
                  Deuda global activa del padrón
                </div>
              </div>

              <div className="bg-zinc-900/70 border border-purple-500/30 rounded-2xl p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-xs font-mono uppercase tracking-wider text-purple-400 font-bold">
                    {dateRange === 'anual' ? 'Padrón Total Atletas' : 'Inscritos en el Periodo'}
                  </span>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-black font-display text-white">
                  {resumen ? resumen.socios.total_socios : membersEnRango.length}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                  {dateRange === 'anual'
                    ? '393 atletas en el padrón anual 2026'
                    : `${resumen ? resumen.socios.total_socios : membersEnRango.length} inscritos en este periodo`}
                </p>
                <div className="text-[10px] text-zinc-500 font-mono mt-1">
                  Sede Central Huamanga · Total: 393
                </div>
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
                <div className="text-[10px] text-zinc-500 font-mono mt-1">
                  Control de aforo en sala
                </div>
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
                  <span className="text-xs font-mono text-zinc-400 uppercase">
                    {dateRange === 'anual' ? 'Caja Anual 2026' : (dateRange === 'mes' ? 'Caja Mes Actual' : 'Periodo')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-emerald-400" />
                      <span>Efectivo:</span>
                    </div>
                    <span className="font-bold text-white text-sm">
                      S/. {(resumen ? resumen.recaudacion.por_metodo.efectivo : efectivoMembers).toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-purple-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-purple-400" />
                      <span>Yape:</span>
                    </div>
                    <span className="font-bold text-purple-300 text-sm">
                      S/. {(resumen ? resumen.recaudacion.por_metodo.yape : yapeMembers).toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-cyan-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-cyan-400" />
                      <span>Plin:</span>
                    </div>
                    <span className="font-bold text-cyan-300 text-sm">
                      S/. {(resumen ? resumen.recaudacion.por_metodo.plin : plinMembers).toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-amber-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-400" />
                      <span>Tarjeta POS:</span>
                    </div>
                    <span className="font-bold text-amber-300 text-sm">
                      S/. {(resumen ? resumen.recaudacion.por_metodo.tarjeta : tarjetaMembers).toFixed(2)}
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

                <button
                  type="button"
                  onClick={handleOpenNewMember}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-mono font-bold transition-all shadow-md shadow-amber-400/20 cursor-pointer ml-auto"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Inscribir Socio</span>
                </button>
              </div>
            </div>

            {/* Contador dinámico y estado del filtro */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs font-mono text-zinc-400 px-1 py-1 gap-2 border-b border-white/5">
              <div className="flex items-center gap-2 flex-wrap">
                <span>
                  Mostrando <strong className="text-white">{filteredMembers.length}</strong> de <strong className="text-zinc-300">{members.length}</strong> socios
                </span>
                {debtFilter === 'con_deuda' && (
                  <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Saldos por cobrar: S/. {filteredMembers.reduce((sum, m) => sum + m.balanceDue, 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                )}
                {shiftFilter !== 'all' && (
                  <span className="text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    Turno {shiftFilter.toUpperCase()} ({filteredMembers.length} alumnos)
                  </span>
                )}
              </div>
              <div className="text-zinc-500 text-[11px]">
                Página {currentPage} de {totalPages} ({pageSize} por página)
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
                    <th className="py-3 px-4">Documento</th>
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

                        <td className="py-3 px-4 font-mono text-xs">
                          {m.plan.toLowerCase().includes('escolar') || m.plan.toLowerCase().includes('universit') ? (
                            m.documentStatus === 'verificado' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                Verificado
                              </span>
                            ) : m.documentStatus === 'pendiente' ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                                  🟡 Pendiente
                                </span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await validarDocumentoSocio(m.id, 'verificado', 'Aprobado en padrón por Admin');
                                    await cargarSociosEnMemoria();
                                    setActionSuccess(`¡Documento de ${m.name} verificado y aprobado!`);
                                    setTimeout(() => setActionSuccess(null), 3500);
                                  }}
                                  className="text-[10px] text-amber-400 hover:text-white underline cursor-pointer"
                                >
                                  Aprobar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={async () => {
                                  await validarDocumentoSocio(m.id, 'verificado', 'Verificado en mostrador por Admin');
                                  await cargarSociosEnMemoria();
                                  setActionSuccess(`¡Documento de ${m.name} marcado como verificado!`);
                                  setTimeout(() => setActionSuccess(null), 3500);
                                }}
                                className="text-[10px] text-zinc-400 hover:text-amber-400 border border-white/10 px-2 py-0.5 rounded-md hover:border-amber-400/40 cursor-pointer"
                              >
                                + Validar
                              </button>
                            )
                          ) : (
                            <span className="text-zinc-600 text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const fullMember = getStoredMembers().find((sm) => sm.id === m.id);
                              if (fullMember) {
                                setProfileModalMember(fullMember);
                              } else {
                                const fallbackMember: GymMember = {
                                  id: m.id,
                                  name: m.name,
                                  dni: m.dni,
                                  plan: m.plan,
                                  planPrice: 80,
                                  paymentType: m.balanceDue === 0 ? 'full' : 'advance',
                                  advancePaid: m.advancePaid,
                                  balanceDue: m.balanceDue,
                                  paymentMethod: (m.paymentMethod as any) || 'efectivo',
                                  receiptNumber: `B001-${m.id}`,
                                  membershipStatus: m.status,
                                  expiresAt: m.expiresIn,
                                  coachName: m.coachName,
                                  registeredAt: new Date().toISOString().split('T')[0],
                                  shift: m.shift,
                                  documentStatus: m.documentStatus,
                                  documentUrl: m.documentUrl,
                                };
                                setProfileModalMember(fallbackMember);
                              }
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

        {/* =========================================================================
            PESTAÑA 4: GESTIÓN DE PLANES & TARIFAS EN VIVO
           ========================================================================= */}
        {activeTab === 'planes' && (
          <div className="space-y-6">
            {/* Banner Superior & Controles */}
            <div className="bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/30 rounded-3xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase font-bold tracking-wider mb-1">
                  <Tag className="w-4 h-4" />
                  <span>Configuración Comercial · Precios en Tiempo Real</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight">
                  Planes de Membresía & Tarifas Oficiales
                </h3>
                <p className="text-zinc-400 text-xs sm:text-sm font-sans mt-1 max-w-2xl">
                  Modifica las tarifas en soles para 1 mes, 3 meses, 6 meses y 1 año. Los cambios se actualizan <strong className="text-white">en vivo</strong> en el portal público, recepción de caja y perfiles de socios.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={handleOpenCreatePlan}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-400/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Crear Nuevo Plan</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetPlans}
                  className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs transition-colors flex items-center gap-1.5 border border-white/10 cursor-pointer"
                  title="Restablecer tarifas recomendadas de Trankilandia Gym"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Restaurar Oficiales</span>
                </button>
              </div>
            </div>

            {/* Grid de Planes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {storedPlans.map((plan) => {
                const edits = quickPlanPrices[plan.id] || {
                  monthly: plan.monthlyPrice,
                  quarterly: plan.quarterlyPrice,
                  semiannual: plan.semiannualPrice,
                  annual: plan.annualPrice,
                };
                const hasEdits =
                  edits.monthly !== plan.monthlyPrice ||
                  edits.quarterly !== plan.quarterlyPrice ||
                  edits.semiannual !== plan.semiannualPrice ||
                  edits.annual !== plan.annualPrice;

                return (
                  <div
                    key={plan.id}
                    className={`bg-zinc-900/80 border rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-all ${
                      plan.isActive === false
                        ? 'border-white/5 opacity-60 bg-zinc-950/60'
                        : plan.isPopular
                        ? 'border-amber-400/50 shadow-amber-400/5'
                        : 'border-white/10'
                    }`}
                  >
                    <div>
                      {/* Cabecera del Plan */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-lg font-black text-white font-display uppercase tracking-tight">
                              {plan.name}
                            </h4>
                            {plan.badge && (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-mono font-bold uppercase">
                                {plan.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-zinc-400 text-xs font-sans mt-0.5">
                            {plan.tagline}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTogglePlanActive(plan.id)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                              plan.isActive !== false
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-zinc-800 text-zinc-400 border border-white/10'
                            }`}
                          >
                            {plan.isActive !== false ? '● Activo' : '○ Pausado'}
                          </button>
                        </div>
                      </div>

                      {/* Requisito de Documento */}
                      <div className="py-2.5">
                        {plan.requiresDocument === 'dni_escolar' && (
                          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono flex items-center gap-2">
                            <span>🎒</span>
                            <span>Requiere DNI escolar (14 a 17 años) acreditado en mostrador o web.</span>
                          </div>
                        )}
                        {plan.requiresDocument === 'carnet_estudiante' && (
                          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-mono flex items-center gap-2">
                            <span>🎓</span>
                            <span>Requiere Carnet de Universidad / Instituto vigente o constancia.</span>
                          </div>
                        )}
                        {!plan.requiresDocument && (
                          <div className="p-2 rounded-xl bg-zinc-950/60 border border-white/5 text-zinc-400 text-xs font-mono flex items-center gap-2">
                            <span>✓</span>
                            <span>Ingreso Libre sin requisito de documento estudiantil.</span>
                          </div>
                        )}
                      </div>

                      {/* Matriz de Precios Editable en Vivo */}
                      <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-4 my-2 space-y-3 font-mono">
                        <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Tarifas por Periodo (Soles):</span>
                          {hasEdits && (
                            <span className="text-amber-400 text-[10px] font-bold animate-pulse">
                              ● Cambios sin guardar
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {/* 1 Mes */}
                          <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/10">
                            <span className="block text-[10px] text-zinc-400 uppercase font-bold">1 Mes</span>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-amber-400 text-xs font-bold">S/.</span>
                              <input
                                type="number"
                                min={0}
                                step="1"
                                value={edits.monthly}
                                onChange={(e) =>
                                  setQuickPlanPrices((prev) => ({
                                    ...prev,
                                    [plan.id]: { ...edits, monthly: Number(e.target.value) || 0 },
                                  }))
                                }
                                className="w-full bg-zinc-950 border border-white/10 rounded px-1.5 py-0.5 text-sm font-bold text-white text-right focus:outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>

                          {/* 3 Meses */}
                          <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/10">
                            <span className="block text-[10px] text-zinc-400 uppercase font-bold">3 Meses</span>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-amber-400 text-xs font-bold">S/.</span>
                              <input
                                type="number"
                                min={0}
                                step="1"
                                value={edits.quarterly}
                                onChange={(e) =>
                                  setQuickPlanPrices((prev) => ({
                                    ...prev,
                                    [plan.id]: { ...edits, quarterly: Number(e.target.value) || 0 },
                                  }))
                                }
                                className="w-full bg-zinc-950 border border-white/10 rounded px-1.5 py-0.5 text-sm font-bold text-white text-right focus:outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>

                          {/* 6 Meses */}
                          <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/10">
                            <span className="block text-[10px] text-zinc-400 uppercase font-bold">6 Meses</span>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-amber-400 text-xs font-bold">S/.</span>
                              <input
                                type="number"
                                min={0}
                                step="1"
                                value={edits.semiannual}
                                onChange={(e) =>
                                  setQuickPlanPrices((prev) => ({
                                    ...prev,
                                    [plan.id]: { ...edits, semiannual: Number(e.target.value) || 0 },
                                  }))
                                }
                                className="w-full bg-zinc-950 border border-white/10 rounded px-1.5 py-0.5 text-sm font-bold text-white text-right focus:outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>

                          {/* 1 Año */}
                          <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/10">
                            <span className="block text-[10px] text-zinc-400 uppercase font-bold">1 Año</span>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-amber-400 text-xs font-bold">S/.</span>
                              <input
                                type="number"
                                min={0}
                                step="1"
                                value={edits.annual}
                                onChange={(e) =>
                                  setQuickPlanPrices((prev) => ({
                                    ...prev,
                                    [plan.id]: { ...edits, annual: Number(e.target.value) || 0 },
                                  }))
                                }
                                className="w-full bg-zinc-950 border border-white/10 rounded px-1.5 py-0.5 text-sm font-bold text-white text-right focus:outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Equivalencia mensual del trimestral */}
                        {edits.quarterly > 0 && (
                          <div className="text-[11px] text-emerald-400 flex items-center justify-between pt-1 border-t border-white/5">
                            <span>Promoción Trimestral equivale a:</span>
                            <strong>S/. {(edits.quarterly / 3).toFixed(1)} / mes</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botones de Acción de Tarjeta */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveQuickPlanPrices(plan.id)}
                          className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            hasEdits
                              ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-400/20'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Guardar Precios</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditPlan(plan)}
                          className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-amber-400" />
                          <span>Editar Todo</span>
                        </button>
                      </div>

                      {!['escolar', 'universitario', 'general', 'combo_boxeo'].includes(plan.id) && (
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(plan.id)}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors cursor-pointer"
                          title="Eliminar plan personalizado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SECCIÓN DE TARIFAS ESPECIALES & PASES RÁPIDOS */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white font-display uppercase tracking-tight">
                      Tarifas Especiales, Pases Diarios & Talleres
                    </h4>
                    <p className="text-xs text-zinc-400 font-sans">
                      Tarifas secundarias utilizadas en recepción rápida y addons adicionales.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAddonRates}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar Tarifas Especiales</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                {/* Pase Diario */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-2">
                  <span className="block text-zinc-400 uppercase font-bold">Pase Diario (Entrenamiento por día)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold text-sm">S/.</span>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={addonRates.paseDiario}
                      onChange={(e) =>
                        setAddonRates((prev) => ({ ...prev, paseDiario: Number(e.target.value) || 0 }))
                      }
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 font-sans">
                    Cobro por sesión individual en el punto de venta de caja.
                  </p>
                </div>

                {/* 2 Meses Musculación */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-2">
                  <span className="block text-zinc-400 uppercase font-bold">2 Meses · Musculación Libre</span>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold text-sm">S/.</span>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={addonRates.mesLibre2M}
                      onChange={(e) =>
                        setAddonRates((prev) => ({ ...prev, mesLibre2M: Number(e.target.value) || 0 }))
                      }
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 font-sans">
                    Opción intermedia en recepción (60 días continuos).
                  </p>
                </div>

                {/* Taller Boxeo */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-2">
                  <span className="block text-zinc-400 uppercase font-bold">Taller Independiente Boxeo (Mes)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 font-bold text-sm">S/.</span>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={addonRates.boxeoAddon}
                      onChange={(e) =>
                        setAddonRates((prev) => ({ ...prev, boxeoAddon: Number(e.target.value) || 0 }))
                      }
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-red-400"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 font-sans">
                    Tarifa de solo boxeo o adición a membresía existente.
                  </p>
                </div>
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
          onClose={() => {
            setProfileModalMember(null);
            setIsNewMemberModal(false);
          }}
          member={profileModalMember}
          onSave={async (updated) => {
            if (isNewMemberModal) {
              await registerGymMember(updated);
              await cargarSociosEnMemoria();
              setActionSuccess(`¡Socio ${updated.name || 'nuevo'} inscrito con éxito en el sistema!`);
            } else {
              const next = await updateMemberProfile(updated.id, updated);
              saveStoredMembers(next);
              await cargarSociosEnMemoria();
              setActionSuccess(`¡Perfil de ${updated.name} actualizado con éxito!`);
            }
            setIsNewMemberModal(false);
            setProfileModalMember(null);
            setTimeout(() => setActionSuccess(null), 4000);
          }}
          onOpenPaymentModal={(m) => {
            setProfileModalMember(null);
            setIsNewMemberModal(false);
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

      {/* MODAL PARA CREAR O EDITAR PLAN COMPLETO */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl bg-zinc-900 border border-amber-400/40 rounded-3xl p-6 shadow-2xl space-y-4 font-mono text-xs max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-display uppercase tracking-tight">
                  {isCreatingPlan ? 'Crear Nuevo Plan de Membresía' : `Editar ${editingPlan.name}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="text-zinc-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFullPlanModal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 uppercase font-bold mb-1">Nombre del Plan</label>
                  <input
                    type="text"
                    required
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white font-sans text-sm"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 uppercase font-bold mb-1">Badge Promocional</label>
                  <input
                    type="text"
                    value={editingPlan.badge || ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, badge: e.target.value })}
                    placeholder="Ej. TARIFA ESCOLAR · S/. 50"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-amber-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 uppercase font-bold mb-1">Subtítulo / Tagline Corto</label>
                <input
                  type="text"
                  required
                  value={editingPlan.tagline}
                  onChange={(e) => setEditingPlan({ ...editingPlan, tagline: e.target.value })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white font-sans text-xs"
                />
              </div>

              {/* Matriz de Precios */}
              <div className="p-3 rounded-2xl bg-zinc-950 border border-white/10 space-y-2">
                <span className="block text-zinc-400 uppercase font-bold text-[11px]">Tarifas Oficiales (Soles):</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1">1 Mes</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={editingPlan.monthlyPrice}
                      onChange={(e) =>
                        setEditingPlan({ ...editingPlan, monthlyPrice: Number(e.target.value) || 0 })
                      }
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1">3 Meses (Trimestral)</label>
                    <input
                      type="number"
                      min={0}
                      value={editingPlan.quarterlyPrice}
                      onChange={(e) =>
                        setEditingPlan({ ...editingPlan, quarterlyPrice: Number(e.target.value) || 0 })
                      }
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1">6 Meses (Semestral)</label>
                    <input
                      type="number"
                      min={0}
                      value={editingPlan.semiannualPrice}
                      onChange={(e) =>
                        setEditingPlan({ ...editingPlan, semiannualPrice: Number(e.target.value) || 0 })
                      }
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1">1 Año (Anual)</label>
                    <input
                      type="number"
                      min={0}
                      value={editingPlan.annualPrice}
                      onChange={(e) =>
                        setEditingPlan({ ...editingPlan, annualPrice: Number(e.target.value) || 0 })
                      }
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-white font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Requisito de Documento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 uppercase font-bold mb-1">Requisito de Documento</label>
                  <select
                    value={editingPlan.requiresDocument || 'none'}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        requiresDocument: e.target.value === 'none' ? null : (e.target.value as any),
                      })
                    }
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-zinc-200 cursor-pointer"
                  >
                    <option value="none">Sin Requisito (Público General)</option>
                    <option value="dni_escolar">DNI Escolar (14 a 17 años)</option>
                    <option value="carnet_estudiante">Carnet Universitario / Instituto</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="is-popular"
                    checked={editingPlan.isPopular}
                    onChange={(e) => setEditingPlan({ ...editingPlan, isPopular: e.target.checked })}
                    className="w-4 h-4 rounded border-amber-400 text-amber-400 focus:ring-amber-400 cursor-pointer"
                  />
                  <label htmlFor="is-popular" className="cursor-pointer text-zinc-200 font-bold">
                    Destacar como "Plan Más Popular"
                  </label>
                </div>
              </div>

              {/* Descripción & Highlights */}
              <div>
                <label className="block text-zinc-400 uppercase font-bold mb-1">Descripción del Plan</label>
                <textarea
                  rows={2}
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white font-sans text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-400 uppercase font-bold mb-1">
                  Beneficios Incluidos (Uno por línea)
                </label>
                <textarea
                  rows={3}
                  value={(editingPlan.highlights || []).join('\n')}
                  onChange={(e) =>
                    setEditingPlan({
                      ...editingPlan,
                      highlights: e.target.value.split('\n').filter((h) => h.trim().length > 0),
                    })
                  }
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white font-sans text-xs"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-400 hover:bg-amber-300 text-black py-3 rounded-xl font-black cursor-pointer shadow-lg shadow-amber-400/20"
                >
                  GUARDAR PLAN EN VIVO
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
