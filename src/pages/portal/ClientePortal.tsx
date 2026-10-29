import { useState } from 'react';
import {
  Dumbbell,
  CreditCard,
  MessageCircle,
  Flame,
  AlertTriangle,
  Check,
  Printer,
  Search,
  Sparkles,
} from 'lucide-react';
import PortalHeader from '../../components/portal/PortalHeader';
import ReceiptModal from '../../components/portal/ReceiptModal';
import { useAuth } from '../../context/AuthContext';
import {
  getStoredMembers,
  getStoredRoutines,
  getStoredProgress,
  INITIAL_ROUTINES,
} from '../../data/gymStore';

export default function ClientePortal() {
  const { user } = useAuth();
  const members = getStoredMembers();

  // Test simulation: allow picking another member from the 389 socios for testing
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [testSearch, setTestSearch] = useState('');
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Match current member or default to Luis (MEM-001)
  const defaultMember =
    members.find(
      (m) =>
        m.email.toLowerCase() === (user?.email || '').toLowerCase() ||
        m.dni === (user?.user_metadata?.dni || '')
    ) || members[0];

  const currentMember =
    (selectedMemberId ? members.find((m) => m.id === selectedMemberId) : null) || defaultMember;

  const routines = getStoredRoutines();
  const currentRoutine = routines[currentMember.id] || INITIAL_ROUTINES['MEM-001'] || {
    memberId: currentMember.id,
    routineTitle: 'Rutina Base de Fuerza & Musculación',
    objective: 'Acondicionamiento físico general',
    coachName: 'Coach Marcos Rivas',
    updatedAt: 'Hoy',
    coachNotes: 'Mantener buena forma y calentar 10 minutos antes de entrenar.',
    days: [],
  };

  const progressList = getStoredProgress().filter((p) => p.memberId === currentMember.id);
  const latestProgress = progressList[0];

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const memberName =
    user?.user_metadata?.full_name || currentMember.name || 'Luis Gerardo Llocclla';
  const memberEmail = user?.email || currentMember.email;

  const activeDay = currentRoutine.days[selectedDayIndex] || currentRoutine.days[0];

  const toggleExercise = (exerciseId: string) => {
    setCompletedExercises((prev) => ({
      ...prev,
      [exerciseId]: !prev[exerciseId],
    }));
  };

  const filteredTestMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(testSearch.toLowerCase()) ||
      m.dni.includes(testSearch)
  ).slice(0, 8);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans pb-16">
      <PortalHeader
        currentRole="cliente"
        title="Portal del Socio"
        subtitle="Mi Carnet Digital, Estado de Cuenta & Rutina del Coach · Trankilandia Gym"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* SIMULADOR DE PERFIL DE SOCIO PARA PRUEBAS */}
        <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-white block">
                  Simulador de Socio (Modo Pruebas):
                </span>
                <span className="text-[11px] text-zinc-400">
                  Viendo cuenta de: <strong className="text-amber-400">{currentMember.name}</strong> (DNI: {currentMember.dni} · {currentMember.balanceDue > 0 ? `Debe S/. ${currentMember.balanceDue}` : 'Al Día'})
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowMemberPicker(!showMemberPicker)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono border border-white/5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>{showMemberPicker ? 'Ocultar Selector' : 'Probar con otro Socio (389 en BD)'}</span>
            </button>
          </div>

          {showMemberPicker && (
            <div className="mt-4 pt-3 border-t border-white/10 space-y-3">
              <div className="relative max-w-sm">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  placeholder="Buscar socio por nombre o DNI..."
                  className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {filteredTestMembers.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMemberId(m.id);
                      setShowMemberPicker(false);
                    }}
                    className={`p-2 rounded-xl text-left font-mono text-xs border transition-all cursor-pointer ${
                      currentMember.id === m.id
                        ? 'bg-amber-400/15 border-amber-400 text-amber-300 shadow-sm'
                        : 'bg-zinc-950/80 border-white/5 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="font-bold truncate text-[11px]">{m.name}</div>
                    <div className="text-[10px] text-zinc-400 flex items-center justify-between mt-0.5">
                      <span>DNI: {m.dni}</span>
                      <span className={m.balanceDue > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                        {m.balanceDue > 0 ? `Debe S/. ${m.balanceDue}` : 'Al Día'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ALERTA DE COBRANZA EN CASO DE TENER SALDO PENDIENTE */}
        {currentMember.balanceDue > 0 && (
          <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-amber-500 text-black font-black flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black font-display uppercase tracking-tight text-white">
                  Aviso de Cobranza: Inscripción con Adelanto
                </h4>
                <p className="text-xs font-mono text-zinc-300 mt-0.5">
                  Abonaste un adelanto de <span className="font-bold text-emerald-400">S/. {currentMember.advancePaid}.00</span>.
                  Tienes un saldo pendiente de{' '}
                  <span className="font-black text-amber-400 text-sm">S/. {currentMember.balanceDue}.00</span> por cancelar
                  antes del <span className="font-bold text-white">{currentMember.paymentDueDate || 'en recepción'}</span>.
                </p>
              </div>
            </div>

            <a
              href={`https://wa.me/51999999999?text=Hola%20Trankilandia%20Gym,%20soy%20${encodeURIComponent(
                memberName
              )}%20(DNI%20${currentMember.dni}),%20deseo%20completar%20mi%20saldo%20pendiente%20de%20S/.%20${currentMember.balanceDue}.00`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs font-mono uppercase tracking-wider transition-colors shadow-lg cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Coordinar Pago por WhatsApp</span>
            </a>
          </div>
        )}

        {/* 1. GRID PRINCIPAL: CARNET DIGITAL + RUTINA & PROGRESOS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Tarjeta Digital de Socio (5 cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-zinc-900 via-zinc-900 to-black border-2 border-amber-400/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

            {/* Card Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-400 text-black font-black">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-sm tracking-tight text-white font-display">
                    TRANKILANDIA CLUB
                  </div>
                  <div className="text-[10px] text-amber-400 font-mono tracking-widest">
                    CARNET DE SOCIO ACTIVO
                  </div>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 ${
                  currentMember.balanceDue > 0
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    currentMember.balanceDue > 0 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                  }`}
                />
                {currentMember.balanceDue > 0 ? 'ADELANTO PENDIENTE' : 'AL DÍA'}
              </span>
            </div>

            {/* Member Details */}
            <div className="mt-6 flex items-center gap-4">
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt={memberName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400/50 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-amber-400 text-black font-black text-2xl flex items-center justify-center border-2 border-amber-400 shadow-md">
                  {memberName[0].toUpperCase()}
                </div>
              )}

              <div>
                <h2 className="text-lg font-black text-white font-display uppercase tracking-tight">
                  {memberName}
                </h2>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">{memberEmail}</p>
                <div className="text-[11px] font-mono text-amber-400 font-bold mt-1">
                  DNI: {currentMember.dni} · ID: {currentMember.id}
                </div>
              </div>
            </div>

            {/* QR Section for Torniquete Entrance */}
            <div className="mt-6 p-4 rounded-2xl bg-zinc-950 border border-white/10 text-center flex flex-col items-center justify-center">
              <div className="p-3 bg-white rounded-xl shadow-lg inline-block">
                <svg
                  className="w-32 h-32"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="100" height="100" fill="white" />
                  <rect x="10" y="10" width="24" height="24" fill="black" />
                  <rect x="14" y="14" width="16" height="16" fill="white" />
                  <rect x="18" y="18" width="8" height="8" fill="black" />

                  <rect x="66" y="10" width="24" height="24" fill="black" />
                  <rect x="70" y="14" width="16" height="16" fill="white" />
                  <rect x="74" y="18" width="8" height="8" fill="black" />

                  <rect x="10" y="66" width="24" height="24" fill="black" />
                  <rect x="14" y="70" width="16" height="16" fill="white" />
                  <rect x="18" y="74" width="8" height="8" fill="black" />

                  <rect x="42" y="12" width="6" height="6" fill="black" />
                  <rect x="52" y="12" width="6" height="6" fill="black" />
                  <rect x="42" y="24" width="6" height="6" fill="black" />
                  <rect x="12" y="42" width="6" height="6" fill="black" />
                  <rect x="24" y="42" width="6" height="6" fill="black" />
                  <rect x="36" y="36" width="12" height="12" fill="black" />
                  <rect x="54" y="42" width="6" height="6" fill="black" />
                  <rect x="66" y="42" width="12" height="6" fill="black" />
                  <rect x="42" y="54" width="6" height="12" fill="black" />
                  <rect x="54" y="60" width="12" height="6" fill="black" />
                  <rect x="72" y="66" width="6" height="12" fill="black" />
                  <rect x="84" y="72" width="6" height="6" fill="black" />
                  <rect x="60" y="78" width="18" height="6" fill="black" />
                </svg>
              </div>
              <p className="text-[11px] font-mono text-zinc-400 mt-2.5">
                Muestra este código al escáner de torniquete en la sede de Huamanga
              </p>
            </div>

            {/* Plan & Financial Details */}
            <div className="mt-5 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Plan:</span>
                <span className="text-white font-bold">{currentMember.plan}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Costo del Plan:</span>
                <span className="text-white font-bold">S/. {currentMember.planPrice}.00</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Adelanto Pagado:</span>
                <span className="text-emerald-400 font-bold">S/. {currentMember.advancePaid}.00</span>
              </div>
              {currentMember.balanceDue > 0 ? (
                <div className="flex justify-between text-red-400 font-bold bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                  <span>Saldo Deudor:</span>
                  <span>S/. {currentMember.balanceDue}.00 (Límite: {currentMember.paymentDueDate})</span>
                </div>
              ) : (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Estado de Pago:</span>
                  <span>CANCELADO 100%</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-400 pt-1">
                <span>Sede:</span>
                <span className="text-amber-400 font-bold">Huamanga, Ayacucho</span>
              </div>
            </div>
          </div>

          {/* Rutina del Coach & Progresos (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* PRs de Fuerza del Atleta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-3.5 text-center">
                <span className="text-[10px] font-mono uppercase text-zinc-400">Peso Corporal</span>
                <div className="mt-1 text-xl font-black font-display text-white">
                  {latestProgress ? `${latestProgress.weightKg} kg` : '76.5 kg'}
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Evaluado en sala</span>
              </div>

              <div className="bg-zinc-900/60 border border-amber-400/30 rounded-2xl p-3.5 text-center">
                <span className="text-[10px] font-mono uppercase text-amber-400">Press Banca</span>
                <div className="mt-1 text-xl font-black font-display text-amber-400">
                  {latestProgress ? `${latestProgress.benchPressKg} kg` : '95 kg'}
                </div>
                <span className="text-[10px] font-mono text-emerald-400">Marca Personal</span>
              </div>

              <div className="bg-zinc-900/60 border border-amber-400/30 rounded-2xl p-3.5 text-center">
                <span className="text-[10px] font-mono uppercase text-amber-400">Sentadilla</span>
                <div className="mt-1 text-xl font-black font-display text-amber-400">
                  {latestProgress ? `${latestProgress.squatKg} kg` : '120 kg'}
                </div>
                <span className="text-[10px] font-mono text-emerald-400">Marca Personal</span>
              </div>

              <div className="bg-zinc-900/60 border border-amber-400/30 rounded-2xl p-3.5 text-center">
                <span className="text-[10px] font-mono uppercase text-amber-400">Peso Muerto</span>
                <div className="mt-1 text-xl font-black font-display text-amber-400">
                  {latestProgress ? `${latestProgress.deadliftKg} kg` : '140 kg'}
                </div>
                <span className="text-[10px] font-mono text-emerald-400">Marca Personal</span>
              </div>
            </div>

            {/* SECCIÓN PRINCIPAL: RUTINA ASIGNADA POR EL COACH */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-display uppercase tracking-wide">
                      Mi Rutina de Entrenamiento
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">
                      Asignada por: <span className="text-orange-400 font-bold">{currentRoutine.coachName}</span> (Act. {currentRoutine.updatedAt})
                    </p>
                  </div>
                </div>

                <div className="text-xs font-mono px-3 py-1 rounded-lg bg-zinc-950 border border-white/10 text-amber-300">
                  {currentRoutine.objective}
                </div>
              </div>

              {/* Coach Observations Box */}
              {currentRoutine.coachNotes && (
                <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-200 leading-relaxed font-sans flex items-start gap-2.5">
                  <span className="font-bold text-orange-400 font-mono flex-shrink-0">INDICACIONES DEL COACH:</span>
                  <span>{currentRoutine.coachNotes}</span>
                </div>
              )}

              {/* Day Selector Pills */}
              {currentRoutine.days.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {currentRoutine.days.map((d, idx) => (
                    <button
                      key={d.id || idx}
                      type="button"
                      onClick={() => setSelectedDayIndex(idx)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                        selectedDayIndex === idx
                          ? 'bg-amber-400 text-black shadow-md'
                          : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/5'
                      }`}
                    >
                      {d.dayName.split(':')[0]}
                    </button>
                  ))}
                </div>
              )}

              {/* Active Day Exercises Table */}
              {activeDay ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white font-bold">{activeDay.dayName}</span>
                    <span className="text-zinc-400">{activeDay.focus}</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider border-b border-white/10">
                        <tr>
                          <th className="py-2.5 px-3 w-8">Listo</th>
                          <th className="py-2.5 px-3">Ejercicio</th>
                          <th className="py-2.5 px-3">Series</th>
                          <th className="py-2.5 px-3">Repes</th>
                          <th className="py-2.5 px-3">Descanso</th>
                          <th className="py-2.5 px-3">Detalle Técnico</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {activeDay.exercises.map((ex, i) => {
                          const isDone = completedExercises[ex.id || `${selectedDayIndex}-${i}`];
                          return (
                            <tr
                              key={ex.id || i}
                              className={`transition-colors ${
                                isDone ? 'bg-emerald-500/10' : 'hover:bg-white/[0.02]'
                              }`}
                            >
                              <td className="py-2.5 px-3">
                                <button
                                  type="button"
                                  onClick={() => toggleExercise(ex.id || `${selectedDayIndex}-${i}`)}
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                    isDone
                                      ? 'bg-emerald-500 text-black shadow-sm'
                                      : 'bg-zinc-800 text-zinc-500 hover:text-white border border-white/10'
                                  }`}
                                  title={isDone ? 'Completado' : 'Marcar como completado'}
                                >
                                  {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                                </button>
                              </td>
                              <td className="py-2.5 px-3 font-sans font-bold">
                                <span className={isDone ? 'line-through text-zinc-400' : 'text-white'}>
                                  {ex.name}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-amber-400 font-bold">{ex.sets}</td>
                              <td className="py-2.5 px-3 text-zinc-200">{ex.reps}</td>
                              <td className="py-2.5 px-3 text-zinc-400">{ex.rest}</td>
                              <td className="py-2.5 px-3 font-sans text-zinc-300 text-[11px]">
                                {ex.notes || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-zinc-500 font-mono text-xs">
                  Tu coach aún no ha cargado los ejercicios de hoy.
                </div>
              )}
            </div>

            {/* Historial de Comprobantes */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white font-display uppercase tracking-wide">
                    Mis Pagos y Comprobantes
                  </h3>
                </div>
                <span className="text-xs font-mono text-zinc-400">Sede Huamanga</span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="p-4 rounded-xl bg-zinc-950 border border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-white text-sm">{currentMember.plan}</div>
                    <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      Recibo: <strong className="text-zinc-200">{currentMember.receiptNumber}</strong> · Pagado vía {currentMember.paymentMethod.toUpperCase()}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 justify-between sm:justify-end">
                    <div className="text-left sm:text-right">
                      <span className="text-emerald-400 font-mono font-bold text-sm block">
                        S/. {currentMember.advancePaid}.00
                      </span>
                      <div className="text-[10px] font-mono">
                        {currentMember.balanceDue > 0 ? (
                          <span className="text-amber-400 font-bold">ADELANTO ABONADO</span>
                        ) : (
                          <span className="text-emerald-400 font-bold">PAGO COMPLETO</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsReceiptOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono border border-white/10 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ver Recibo B001</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Recibo Oficial Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        member={currentMember}
        paymentAmount={currentMember.advancePaid}
        paymentTypeTitle={currentMember.balanceDue > 0 ? 'Adelanto de Membresía' : 'Membresía Completa'}
        paymentMethod={currentMember.paymentMethod}
      />
    </div>
  );
}
