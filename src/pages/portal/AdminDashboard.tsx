import { useState, useMemo } from 'react';
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
  AlertTriangle,
} from 'lucide-react';
import PortalHeader from '../../components/portal/PortalHeader';
import { UserRole } from '../../types/roles';
import { getStoredMembers } from '../../data/gymStore';

interface MemberRecord {
  id: string;
  name: string;
  dni: string;
  role: UserRole;
  plan: string;
  status: 'active' | 'expiring' | 'inactive';
  expiresIn: string;
  lastVisit: string;
  balanceDue: number;
}

export default function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const rawMembers = useMemo(() => getStoredMembers(), []);

  const [members, setMembers] = useState<MemberRecord[]>(() => {
    return rawMembers.map((m, idx) => ({
      id: m.id,
      name: m.name,
      dni: m.dni,
      role: m.id === 'MEM-001' ? 'admin' : idx === 1 ? 'entrenador' : idx === 2 ? 'caja' : 'cliente',
      plan: m.balanceDue > 0 ? `${m.plan} (Debe S/. ${m.balanceDue})` : m.plan,
      status: m.membershipStatus,
      expiresIn: m.expiresAt,
      lastVisit: idx < 6 ? 'Hoy en sala' : 'Esta semana',
      balanceDue: m.balanceDue,
    }));
  });

  const totalMembers = rawMembers.length;
  const totalDebts = rawMembers.reduce((sum, m) => sum + m.balanceDue, 0);
  const totalRevenue = rawMembers.reduce((sum, m) => sum + m.advancePaid, 0);

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.dni.includes(searchTerm) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.ceil(filteredMembers.length / pageSize) || 1;
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleUpdateRole = (id: string, newRole: UserRole) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, role: newRole } : m))
    );
    setActionSuccess(`Rol de usuario actualizado a "${newRole.toUpperCase()}" con éxito.`);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Nombre', 'DNI', 'Rol', 'Plan', 'Monto Cobrado (S/.)', 'Saldo Pendiente (S/.)', 'Estado', 'Vence'];
    const rows = rawMembers.map((m) => [
      m.id,
      `"${m.name.replace(/"/g, '""')}"`,
      m.dni,
      m.id === 'MEM-001' ? 'admin' : 'cliente',
      `"${m.plan}"`,
      m.advancePaid,
      m.balanceDue,
      m.membershipStatus,
      m.expiresAt,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `trankilandia_padron_socios_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setActionSuccess('Padrón consolidado de 389 socios exportado exitosamente a CSV.');
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
              <span className="text-xs font-mono uppercase tracking-wider">Padrón de Socios</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black font-display text-white">{totalMembers}</span>
              <span className="text-xs font-mono text-emerald-400 font-bold">Activos</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Sede Central Huamanga, Ayacucho</p>
          </div>

          <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-mono uppercase tracking-wider">Recaudación Cobrada</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black font-display text-white">
                S/. {totalRevenue.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Efectivo + Pagos con QR (Yape / Plin)</p>
          </div>

          <div className="bg-zinc-900/70 border border-amber-500/30 rounded-2xl p-5 relative overflow-hidden group hover:border-amber-500/50 transition-colors">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Saldos por Cobrar</span>
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black font-display text-amber-400">
                S/. {totalDebts.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 font-mono">
              Adelantos pendientes de completar en Caja
            </p>
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
              <span className="text-xs font-mono text-emerald-400 font-bold">64% ocupación</span>
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
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono border border-white/10 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Reporte (CSV)</span>
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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
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
                  onClick={() => {
                    setRoleFilter(r);
                    setCurrentPage(1);
                  }}
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
                {paginatedMembers.map((member) => (
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

          {/* Pagination Controls */}
          <div className="p-4 bg-zinc-950/80 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-mono">
            <span className="text-zinc-400">
              Mostrando {Math.min((currentPage - 1) * pageSize + 1, filteredMembers.length)} a{' '}
              {Math.min(currentPage * pageSize, filteredMembers.length)} de {filteredMembers.length} socios registrados
            </span>

            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Anterior
              </button>
              <span className="px-3 py-1.5 text-zinc-400">
                Pág. {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
