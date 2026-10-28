import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  ShieldCheck,
  Search,
  UserPlus,
  FileSpreadsheet,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import PortalHeader from '../../components/portal/PortalHeader';
import { UserRole } from '../../types/roles';

interface MemberRecord {
  id: string;
  name: string;
  dni: string;
  role: UserRole;
  plan: string;
  status: 'active' | 'expiring' | 'inactive';
  expiresIn: string;
  lastVisit: string;
}

const INITIAL_MEMBERS: MemberRecord[] = [
  {
    id: 'MEM-001',
    name: 'Luis Gerardo Llocclla',
    dni: '73921845',
    role: 'admin',
    plan: 'Pase Anual + Boxeo Pro',
    status: 'active',
    expiresIn: '315 días',
    lastVisit: 'Hoy, 06:15 PM',
  },
  {
    id: 'MEM-002',
    name: 'Carlos Mendoza Ramos',
    dni: '48201934',
    role: 'entrenador',
    plan: 'Staff Deportivo · Boxeo',
    status: 'active',
    expiresIn: 'Indefinido',
    lastVisit: 'Hoy, 04:00 PM',
  },
  {
    id: 'MEM-003',
    name: 'Valeria Quispe Huamán',
    dni: '74129088',
    role: 'caja',
    plan: 'Staff Recepción & Ventas',
    status: 'active',
    expiresIn: 'Indefinido',
    lastVisit: 'Hoy, 02:30 PM',
  },
  {
    id: 'MEM-004',
    name: 'Javier Rojas Palomino',
    dni: '72983411',
    role: 'cliente',
    plan: '3 Meses · Musculación Libre',
    status: 'active',
    expiresIn: '48 días',
    lastVisit: 'Hoy, 05:40 PM',
  },
  {
    id: 'MEM-005',
    name: 'Maricielo Sulca Cárdenas',
    dni: '76541230',
    role: 'cliente',
    plan: '1 Mes · Combo Boxeo + Pesas',
    status: 'expiring',
    expiresIn: '3 días',
    lastVisit: 'Ayer, 07:10 PM',
  },
  {
    id: 'MEM-006',
    name: 'Renato Flores Bendezú',
    dni: '70192834',
    role: 'cliente',
    plan: '6 Meses · Musculación Libre',
    status: 'active',
    expiresIn: '112 días',
    lastVisit: 'Hoy, 06:30 PM',
  },
];

export default function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [members, setMembers] = useState<MemberRecord[]>(INITIAL_MEMBERS);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.dni.includes(searchTerm) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleUpdateRole = (id: string, newRole: UserRole) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, role: newRole } : m))
    );
    setActionSuccess(`Rol de usuario actualizado a "${newRole.toUpperCase()}" con éxito.`);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      <PortalHeader
        currentRole="admin"
        title="Panel de Administración"
        subtitle="Gerencia General · Trankilandia Gym Ayacucho"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-purple-500/40 transition-colors">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-mono uppercase tracking-wider">Socios Activos</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black font-display text-white">524</span>
              <span className="text-xs font-mono text-emerald-400 font-bold">+12% este mes</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">480 Musculación · 144 Boxeo</p>
          </div>

          <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-mono uppercase tracking-wider">Ingresos de Hoy</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black font-display text-white">S/. 1,850</span>
              <span className="text-xs font-mono text-zinc-400">14 pagos</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Efectivo: S/. 620 · Yape/Plin: S/. 1,230</p>
          </div>

          <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-amber-500/40 transition-colors">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-mono uppercase tracking-wider">Facturación Mensual</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black font-display text-white">S/. 28,400</span>
              <span className="text-xs font-mono text-emerald-400 font-bold">88.7%</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Meta mensual S/. 32,000 en Huamanga</p>
          </div>

          <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-cyan-500/40 transition-colors">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-mono uppercase tracking-wider">Aforo Sala Huamanga</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black font-display text-white">42 / 65</span>
              <span className="text-xs font-mono text-amber-400 font-bold">64% aforo</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">28 Sala Pesas · 14 Escuela Boxeo</p>
          </div>
        </div>

        {/* Quick Management Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-display uppercase tracking-wide">
                Control de Permisos y Personal
              </h2>
              <p className="text-xs text-zinc-400">
                Asigna o modifica roles entre Administrador, Caja, Entrenador y Cliente en tiempo real.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActionSuccess('Descargando reporte financiero consolidado de Huamanga...');
                setTimeout(() => setActionSuccess(null), 3000);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono border border-white/10 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Reporte</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActionSuccess('Formulario de alta de nuevo colaborador habilitado.');
                setTimeout(() => setActionSuccess(null), 3000);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-mono shadow-lg shadow-purple-600/20 transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrar Personal</span>
            </button>
          </div>
        </div>

        {/* Member and Staff Table */}
        <div className="bg-zinc-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          {/* Table Filters Header */}
          <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, DNI o código..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <Filter className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              {(['all', 'admin', 'caja', 'entrenador', 'cliente'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer ${
                    roleFilter === r
                      ? 'bg-purple-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {r === 'all' ? 'TODOS' : r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 text-zinc-400 font-mono uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Usuario / Socio</th>
                  <th className="py-3 px-4">DNI</th>
                  <th className="py-3 px-4">Rol Asignado</th>
                  <th className="py-3 px-4">Plan / Cargo</th>
                  <th className="py-3 px-4">Vencimiento</th>
                  <th className="py-3 px-4">Última Entrada</th>
                  <th className="py-3 px-4 text-right">Cambiar Rol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{member.name}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">{member.id}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-300">{member.dni}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase ${
                          member.role === 'admin'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : member.role === 'caja'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : member.role === 'entrenador'
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                        }`}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-300">{member.plan}</td>
                    <td className="py-3.5 px-4 font-mono">
                      <span
                        className={
                          member.status === 'expiring'
                            ? 'text-amber-400 font-bold'
                            : member.status === 'inactive'
                            ? 'text-red-400'
                            : 'text-zinc-300'
                        }
                      >
                        {member.expiresIn}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-400 text-[11px] font-mono">
                      {member.lastVisit}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <select
                        aria-label={`Cambiar rol de ${member.name}`}
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.id, e.target.value as UserRole)}
                        className="bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-zinc-300 font-mono focus:outline-none focus:border-purple-500 cursor-pointer"
                      >
                        <option value="admin">Admin</option>
                        <option value="caja">Caja</option>
                        <option value="entrenador">Entrenador</option>
                        <option value="cliente">Cliente</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
