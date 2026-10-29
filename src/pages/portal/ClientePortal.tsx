import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dumbbell,
  MessageCircle,
  Flame,
  AlertTriangle,
  Check,
  Printer,
  Search,
  Sparkles,
  Download,
  RefreshCw,
  Sun,
  Sunset,
  Moon,
  Clock,
  UserCheck,
  CheckCircle2,
  CreditCard,
} from 'lucide-react';
import PortalHeader from '../../components/portal/PortalHeader';
import ReceiptModal from '../../components/portal/ReceiptModal';
import { useAuth } from '../../context/AuthContext';
import {
  GymMember,
  MemberRoutine,
  getStoredMembers,
  getStoredRoutines,
  getStoredProgress,
  INITIAL_ROUTINES,
} from '../../data/gymStore';
import {
  getMemberRoutine,
  updateMemberShift,
  vincularDniCliente,
} from '../../lib/supabaseDb';
import {
  renderBarcodeToCanvas,
  exportCarnetDigitalPNG,
} from '../../lib/barcode128';

// Entrenadores oficiales del gimnasio (2 mujeres y 2 varones distribuidos en los 3 turnos)
export const OFFICIAL_COACHES = [
  {
    id: 'coach-marcos',
    name: 'Coach Marcos Rivas',
    gender: 'varon' as const,
    shift: 'manana' as const,
    shiftLabel: 'Mañana (6:00 AM - 2:00 PM)',
    specialty: 'Fuerza, Hipertrofia & Musculación',
  },
  {
    id: 'coach-camila',
    name: 'Coach Camila Mendoza',
    gender: 'mujer' as const,
    shift: 'manana' as const,
    shiftLabel: 'Mañana (6:00 AM - 2:00 PM)',
    specialty: 'Acondicionamiento, Glúteos & Cardio',
  },
  {
    id: 'coach-valeria',
    name: 'Coach Valeria Gómez',
    gender: 'mujer' as const,
    shift: 'tarde' as const,
    shiftLabel: 'Tarde (2:00 PM - 6:00 PM)',
    specialty: 'Definición, Tonificación & Funcional',
  },
  {
    id: 'coach-daniel',
    name: 'Coach Daniel Quispe',
    gender: 'varon' as const,
    shift: 'noche' as const,
    shiftLabel: 'Noche (6:00 PM - 10:00 PM)',
    specialty: 'Potencia, Boxeo & Hipertrofia Pesada',
  },
];

interface ClientCache {
  timestamp: number;
  routine: MemberRoutine | null;
}

export default function ClientePortal() {
  const { user, isAdmin } = useAuth();
  const [members, setMembers] = useState<GymMember[]>(getStoredMembers());

  // Selector de socio para pruebas / demostración
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [testSearch, setTestSearch] = useState('');
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  // Estados de rutina y entrenamiento
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Estados de turno y entrenador
  const [selectedShift, setSelectedShift] = useState<'manana' | 'tarde' | 'noche'>('manana');
  const [selectedCoachName, setSelectedCoachName] = useState<string>('Coach Marcos Rivas');
  const [isSavingShift, setIsSavingShift] = useState(false);
  const [shiftSuccessMsg, setShiftSuccessMsg] = useState<string | null>(null);

  // Rutina cargada con caché de 10 min
  const [memberRoutine, setMemberRoutine] = useState<MemberRoutine | null>(null);
  const [isLoadingRoutine, setIsLoadingRoutine] = useState(false);
  const [lastCacheSync, setLastCacheSync] = useState<string>('');

  // Canvas ref para el código de barras 1D
  const barcodeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Estados para vinculación manual de DNI por parte del cliente
  const [inputDni, setInputDni] = useState('');
  const [isLinkingDni, setIsLinkingDni] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Socio activo determinado por correo personal o DNI vinculado
  const userEmail = (user?.email || '').toLowerCase().trim();
  const userDni = (user?.user_metadata?.dni || '').trim();

  const linkedMember = members.find(
    (m) =>
      (m.email && userEmail && m.email.toLowerCase().trim() === userEmail) ||
      (userDni && m.dni && m.dni.trim() === userDni)
  ) || null;

  const currentMember =
    (selectedMemberId ? members.find((m) => m.id === selectedMemberId) : null) ||
    linkedMember ||
    (isAdmin ? members[0] || null : null);

  const handleVincularDni = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLinkingDni(true);
    setLinkError(null);

    const res = await vincularDniCliente(user.id, user.email || '', inputDni);
    setIsLinkingDni(false);

    if (res.success && res.member) {
      const updated = members.some((m) => m.id === res.member!.id)
        ? members.map((m) => (m.id === res.member!.id ? res.member! : m))
        : [res.member!, ...members];
      setMembers(updated);
      setSelectedMemberId(res.member.id);
    } else {
      setLinkError(res.message);
    }
  };

  // Sincronizar estados locales de turno y coach con el socio seleccionado
  useEffect(() => {
    if (currentMember) {
      setSelectedShift(currentMember.shift || 'manana');
      setSelectedCoachName(currentMember.coachName || 'Coach Marcos Rivas');
    }
  }, [currentMember]);

  // CARGAR RUTINA CON CACHÉ DE CLIENTE (TTL: 10 MINUTOS EN SESSIONSTORAGE)
  const loadRoutineWithCache = useCallback(
    async (forceRefresh: boolean = false) => {
      if (!currentMember) return;
      const cacheKey = `trankilandia_routine_${currentMember.id}`;

      // 1. Revisar caché local si no se fuerza la recarga
      if (!forceRefresh) {
        try {
          const raw = sessionStorage.getItem(cacheKey);
          if (raw) {
            const parsed: ClientCache = JSON.parse(raw);
            const isFresh = Date.now() - parsed.timestamp < 10 * 60 * 1000; // 10 min TTL
            if (isFresh && parsed.routine) {
              setMemberRoutine(parsed.routine);
              setLastCacheSync(
                new Date(parsed.timestamp).toLocaleTimeString('es-PE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              );
              return;
            }
          }
        } catch {}
      }

      // 2. Fetch fresco desde Supabase
      setIsLoadingRoutine(true);
      try {
        const freshRoutine = await getMemberRoutine(currentMember.id);
        const fallback =
          freshRoutine ||
          getStoredRoutines()[currentMember.id] ||
          INITIAL_ROUTINES['MEM-001'] || {
            memberId: currentMember.id,
            routineTitle: 'Rutina Base de Fuerza & Musculación',
            objective: 'Acondicionamiento físico general',
            coachName: currentMember.coachName || 'Coach Marcos Rivas',
            updatedAt: 'Hoy',
            coachNotes: 'Mantener buena forma y calentar 10 minutos antes de entrenar.',
            days: [],
          };

        setMemberRoutine(fallback);

        // Guardar en sessionStorage
        const cacheData: ClientCache = {
          timestamp: Date.now(),
          routine: fallback,
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
        setLastCacheSync(
          new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
        );
      } catch {
        // En caso de falla, fallback local
        const local = getStoredRoutines()[currentMember.id] || INITIAL_ROUTINES['MEM-001'];
        setMemberRoutine(local);
      }
      setIsLoadingRoutine(false);
    },
    [currentMember]
  );

  useEffect(() => {
    loadRoutineWithCache(false);
  }, [loadRoutineWithCache]);

  // RENDERIZAR CÓDIGO DE BARRAS 1D (CODE 128) CON QUIET ZONE >= 16PX Y FONDO BLANCO PURO
  useEffect(() => {
    if (barcodeCanvasRef.current && currentMember?.dni) {
      renderBarcodeToCanvas(barcodeCanvasRef.current, currentMember.dni, {
        moduleWidth: 2,
        height: 60,
        quietZone: 20,
        includeText: true,
        scale: 1.5,
      });
    }
  }, [currentMember?.dni]);

  // DESCARGA DEL CARNET DIGITAL EN ALTA RESOLUCIÓN (SCALE 2.5)
  const handleDownloadCarnetPNG = () => {
    if (!currentMember || !currentMember.dni) return;
    exportCarnetDigitalPNG(
      {
        nombre: currentMember.name,
        dni: currentMember.dni,
        memberId: currentMember.id,
        plan: currentMember.plan,
        turno: currentMember.shift || 'manana',
        coach: currentMember.coachName || 'Coach Marcos Rivas',
        estado: currentMember.balanceDue > 0 ? 'Con Adelanto' : 'Al Día',
        tieneDeuda: currentMember.balanceDue > 0,
        saldoDeuda: currentMember.balanceDue,
        vencimiento: currentMember.expiresAt || '30 Nov 2026',
      },
      2.5
    );
  };

  // ACTUALIZAR TURNO Y ENTRENADOR
  const handleSaveShift = async () => {
    if (!currentMember) return;
    setIsSavingShift(true);
    try {
      await updateMemberShift(currentMember.id, selectedShift, selectedCoachName);

      // Actualizar estado en memoria
      const updated = members.map((m) =>
        m.id === currentMember.id
          ? { ...m, shift: selectedShift, coachName: selectedCoachName }
          : m
      );
      setMembers(updated);

      setShiftSuccessMsg(
        `¡Turno actualizado a ${selectedShift.toUpperCase()} con ${selectedCoachName}!`
      );
      setTimeout(() => setShiftSuccessMsg(null), 4000);
    } catch {
      alert('Error al guardar el nuevo turno. Comprueba tu conexión.');
    }
    setIsSavingShift(false);
  };

  const progressList = currentMember
    ? getStoredProgress().filter((p) => p.memberId === currentMember.id)
    : [];
  const latestProgress = progressList[0];

  const activeRoutine = memberRoutine || INITIAL_ROUTINES['MEM-001'];
  const activeDay = activeRoutine?.days?.[selectedDayIndex] || activeRoutine?.days?.[0];

  const toggleExercise = (exerciseId: string) => {
    setCompletedExercises((prev) => ({
      ...prev,
      [exerciseId]: !prev[exerciseId],
    }));
  };

  const filteredTestMembers = members
    .filter(
      (m) =>
        m.name.toLowerCase().includes(testSearch.toLowerCase()) ||
        (m.dni && m.dni.includes(testSearch))
    )
    .slice(0, 8);

  const coachesForSelectedShift = OFFICIAL_COACHES.filter(
    (c) => c.shift === selectedShift
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans pb-16 selection:bg-amber-400 selection:text-black">
      <PortalHeader
        currentRole="cliente"
        title="Portal del Socio"
        subtitle="Carnet 1D Descargable · Selección de Turno · Rutina Personalizada del Coach"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* SIMULADOR DE PERFIL DE SOCIO PARA SUPER ADMIN */}
        {isAdmin && (
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold text-white block">
                    Simulador de Socio (Super Admin / Control Maestro):
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {currentMember ? (
                      <>
                        Socio en pantalla: <strong className="text-amber-400">{currentMember.name}</strong> (DNI: {currentMember.dni || 'Sin DNI'} · Turno:{' '}
                        <span className="uppercase text-white font-bold">{currentMember.shift || 'manana'}</span> ·{' '}
                        {currentMember.balanceDue > 0 ? (
                          <span className="text-red-400 font-bold">Debe S/. {currentMember.balanceDue}</span>
                        ) : (
                          <span className="text-emerald-400 font-bold">Al Día</span>
                        )}
                        )
                      </>
                    ) : (
                      <span>
                        Usuario conectado: <strong className="text-white">{user?.email || 'Sin sesión'}</strong> · <span className="text-amber-400 font-bold">Completa tu DNI para vincular tu carnet</span>
                      </span>
                    )}
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
                        currentMember?.id === m.id
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
        )}

        {!currentMember ? (
          /* FORMULARIO DE VINCULACIÓN DE DNI PARA CORREOS PERSONALES */
          <div className="max-w-xl mx-auto py-10">
            <div className="bg-zinc-900 border border-amber-400/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
              <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 mb-5">
                <CreditCard className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-mono uppercase tracking-tight">
                Genera tu Tarjeta de Ingreso
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 font-mono leading-relaxed">
                Has iniciado sesión con tu correo personal <strong className="text-amber-400">{user?.email || 'de usuario'}</strong>. Para vincular tu ficha de socio de Trankilandia Gym y generar tu carnet oficial con código de barras 1D, completa tu número de DNI:
              </p>

              <form onSubmit={handleVincularDni} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-zinc-400 mb-2 font-bold">
                    Número de DNI del Socio (8 dígitos)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    value={inputDni}
                    onChange={(e) => setInputDni(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej: 73921845"
                    className="w-full bg-zinc-950 border border-white/10 focus:border-amber-400 rounded-2xl px-5 py-3.5 text-xl font-mono text-white tracking-widest outline-none transition-colors"
                    required
                  />
                </div>

                {linkError && (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono space-y-2">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>DNI no encontrado en el padrón</span>
                    </p>
                    <p>{linkError}</p>
                    <a
                      href={`https://wa.me/51999787489?text=Hola%20Trankilandia%20Gym,%20me%20registré%20con%20el%20correo%20${encodeURIComponent(user?.email || '')}%20y%20mi%20DNI%20es%20${inputDni},%20por%20favor%20ayúdenme%20a%20vincular%20mi%20membresía.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-bold underline pt-1"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Contactar a Recepción por WhatsApp (+51 999 787 489)</span>
                    </a>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLinkingDni || inputDni.length < 8}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black font-mono uppercase tracking-wider text-xs sm:text-sm transition-all shadow-lg hover:shadow-amber-400/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLinkingDni ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verificando en Padrón Oficial...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Generar mi Tarjeta de Ingreso</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <>
            {/* ALERTA DE COBRANZA EN CASO DE SALDO PENDIENTE */}
            {currentMember.balanceDue > 0 && (
          <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-amber-500 text-black font-black flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black font-display uppercase tracking-tight text-white">
                  Aviso de Recepción: Inscripción con Adelanto
                </h4>
                <p className="text-xs font-mono text-zinc-300 mt-0.5">
                  Abonaste un adelanto de <span className="font-bold text-emerald-400">S/. {currentMember.advancePaid}.00</span>.
                  Tienes un saldo pendiente de{' '}
                  <span className="font-black text-amber-400 text-sm">S/. {currentMember.balanceDue}.00</span> por liquidar
                  en recepción antes del <span className="font-bold text-white">{currentMember.paymentDueDate || 'próximo ingreso'}</span>.
                </p>
              </div>
            </div>

            <a
              href={`https://wa.me/51999787489?text=Hola%20Trankilandia%20Gym,%20soy%20${encodeURIComponent(
                currentMember.name
              )}%20(DNI%20${currentMember.dni}),%20deseo%20completar%20mi%20saldo%20pendiente%20de%20S/.%20${currentMember.balanceDue}.00`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs font-mono uppercase tracking-wider transition-colors shadow-lg cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Coordinar con Caja (WhatsApp)</span>
            </a>
          </div>
        )}

        {/* GRID PRINCIPAL: CARNET 1D DESCARGABLE + SELECCIÓN DE TURNO + RUTINAS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* COLUMNA IZQUIERDA: CARNET DIGITAL CON CÓDIGO DE BARRAS 1D (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Tarjeta Visual de Socio */}
            <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-black border-2 border-amber-400/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

              {/* Card Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-400 text-black font-black">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-sm tracking-tight text-white font-display">
                      TRANKILANDIA GYM
                    </div>
                    <div className="text-[10px] text-amber-400 font-mono tracking-widest">
                      CARNET OFICIAL DE SOCIO
                    </div>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 ${
                    currentMember.balanceDue > 0
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      currentMember.balanceDue > 0 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                    }`}
                  />
                  {currentMember.balanceDue > 0 ? 'ADELANTO PENDIENTE' : 'SOCIO AL DÍA'}
                </span>
              </div>

              {/* Member Details */}
              <div className="mt-5 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-400 text-black font-black text-2xl flex items-center justify-center border-2 border-amber-400 shadow-md">
                  {currentMember.name[0].toUpperCase()}
                </div>

                <div className="truncate">
                  <h2 className="text-lg font-black text-white font-display uppercase tracking-tight truncate">
                    {currentMember.name}
                  </h2>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate">{currentMember.email}</p>
                  <div className="text-[11px] font-mono text-amber-400 font-bold mt-1">
                    DNI: {currentMember.dni} · ID: {currentMember.id}
                  </div>
                </div>
              </div>

              {/* CONTENEDOR FÍSICO DEL CÓDIGO DE BARRAS 1D CODE 128 */}
              {/* Cumple especificación: Fondo blanco puro (#FFFFFF), barras negras (#000000), Quiet Zone >= 16px */}
              <div className="mt-5 p-4 rounded-2xl bg-white shadow-xl text-center flex flex-col items-center justify-center">
                <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                  ESCANEAR EN EL ACCESO AL GIMNASIO
                </div>

                <canvas
                  ref={barcodeCanvasRef}
                  className="max-w-full h-auto rounded"
                  style={{ imageRendering: 'pixelated' }}
                />

                <span className="text-[10px] font-mono text-zinc-500 mt-1">
                  Pasa este código de barras frente a la pistola 1D al ingresar
                </span>
              </div>

              {/* Datos del Plan & Turno */}
              <div className="mt-5 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Plan:</span>
                  <span className="text-white font-bold">{currentMember.plan}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Turno:</span>
                  <span className="text-amber-400 font-bold uppercase">
                    {currentMember.shift === 'manana'
                      ? 'Mañana (6am - 2pm)'
                      : currentMember.shift === 'tarde'
                      ? 'Tarde (2pm - 6pm)'
                      : 'Noche (6pm - 10pm)'}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Entrenador:</span>
                  <span className="text-white font-bold">{currentMember.coachName || 'Coach Marcos Rivas'}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Vencimiento:</span>
                  <span className="text-emerald-400 font-bold">{currentMember.expiresAt || '30 Nov 2026'}</span>
                </div>
                {currentMember.balanceDue > 0 && (
                  <div className="flex justify-between text-red-400 font-bold bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                    <span>Saldo Deudor:</span>
                    <span>S/. {currentMember.balanceDue}.00</span>
                  </div>
                )}
              </div>

              {/* Botones de Acción: Descargar PNG Offline & Boleta */}
              <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadCarnetPNG}
                  className="flex-1 bg-amber-400 hover:bg-amber-300 text-black font-black py-3 px-4 rounded-xl text-xs font-display uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-400/20"
                >
                  <Download className="w-4 h-4" />
                  <span>DESCARGAR PNG OFFLINE</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsReceiptOpen(true)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-3 px-3 rounded-xl text-xs font-mono font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Ver Boleta de Pago"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>Boleta</span>
                </button>
              </div>
            </div>

            {/* CARD: SELECTOR DE TURNO & ENTRENADOR ENCARGADO */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white font-display uppercase tracking-wide">
                    Mi Turno & Entrenador
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">Atención 6am - 10pm</span>
              </div>

              {shiftSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{shiftSuccessMsg}</span>
                </div>
              )}

              {/* Selector de los 3 Turnos Oficiales */}
              <div className="space-y-2">
                <label className="block text-[11px] font-mono uppercase text-zinc-400 font-bold">
                  Selecciona tu Turno de Entrenamiento:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'manana', label: 'Mañana', time: '6am - 2pm', icon: Sun },
                    { id: 'tarde', label: 'Tarde', time: '2pm - 6pm', icon: Sunset },
                    { id: 'noche', label: 'Noche', time: '6pm - 10pm', icon: Moon },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = selectedShift === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setSelectedShift(t.id as any);
                          // Autoasignar el primer coach de ese turno
                          const coachOfShift = OFFICIAL_COACHES.find((c) => c.shift === t.id);
                          if (coachOfShift) setSelectedCoachName(coachOfShift.name);
                        }}
                        className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-400/20 border-amber-400 text-amber-400 shadow-md'
                            : 'bg-zinc-950 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs font-bold font-mono">{t.label}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{t.time}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de Entrenador Asignado */}
              <div className="space-y-2">
                <label className="block text-[11px] font-mono uppercase text-zinc-400 font-bold">
                  Entrenador Encargado de tu Asesoría:
                </label>
                <div className="space-y-2">
                  {coachesForSelectedShift.map((coach) => {
                    const isSelected = selectedCoachName === coach.name;
                    return (
                      <button
                        key={coach.id}
                        type="button"
                        onClick={() => setSelectedCoachName(coach.name)}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500 text-white'
                            : 'bg-zinc-950 border-white/10 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold font-sans flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{coach.name}</span>
                            <span className="text-[10px] font-mono text-zinc-400">
                              ({coach.gender === 'mujer' ? 'Coach Femenina' : 'Coach Masculino'})
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                            {coach.specialty}
                          </div>
                        </div>

                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                disabled={isSavingShift}
                onClick={handleSaveShift}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-mono text-xs font-bold border border-amber-400/30 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSavingShift ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardar Turno & Entrenador</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* COLUMNA DERECHA: RUTINA DEL COACH & SEGUIMIENTO (7 cols) */}
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

            {/* SECCIÓN PRINCIPAL: RUTINA ASIGNADA POR EL COACH (CON CACHÉ 10 MIN) */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-display uppercase tracking-wide">
                      Mi Plan de Entrenamiento
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">
                      Coach:{' '}
                      <span className="text-orange-400 font-bold">
                        {activeRoutine?.coachName || currentMember.coachName || 'Coach Marcos Rivas'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Botón de Sincronización Manual de Rutina (Bypass de Caché) */}
                <div className="flex items-center gap-2">
                  {lastCacheSync && (
                    <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
                      Caché: {lastCacheSync}
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={isLoadingRoutine}
                    onClick={() => loadRoutineWithCache(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono border border-white/10 transition-colors cursor-pointer"
                    title="Actualizar rutina desde el servidor si tu coach te la acaba de cambiar"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRoutine ? 'animate-spin text-amber-400' : ''}`} />
                    <span>Actualizar</span>
                  </button>
                </div>
              </div>

              {/* Indicaciones del Coach */}
              {activeRoutine?.coachNotes && (
                <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-200 leading-relaxed font-sans flex items-start gap-2.5">
                  <span className="font-bold text-orange-400 font-mono flex-shrink-0">INDICACIONES:</span>
                  <span>{activeRoutine.coachNotes}</span>
                </div>
              )}

              {/* Selector de Días de Entrenamiento */}
              {activeRoutine?.days && activeRoutine.days.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {activeRoutine.days.map((d, idx) => (
                    <button
                      key={d.id || idx}
                      type="button"
                      onClick={() => setSelectedDayIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                        selectedDayIndex === idx
                          ? 'bg-amber-400 text-black shadow-md'
                          : 'bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {d.dayName}
                    </button>
                  ))}
                </div>
              )}

              {/* Lista de Ejercicios del Día Activo */}
              {activeDay && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pb-1">
                    <span>
                      Enfoque: <strong className="text-white">{activeDay.focus}</strong>
                    </span>
                    <span>
                      {
                        activeDay.exercises.filter((ex) => completedExercises[ex.id]).length
                      }{' '}
                      / {activeDay.exercises.length} Completados
                    </span>
                  </div>

                  <div className="space-y-2">
                    {activeDay.exercises.map((ex) => {
                      const isDone = completedExercises[ex.id];
                      return (
                        <div
                          key={ex.id}
                          className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs font-mono ${
                            isDone
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : 'bg-zinc-950 border-white/10 text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <button
                              type="button"
                              onClick={() => toggleExercise(ex.id)}
                              className={`w-6 h-6 rounded-lg border flex items-center justify-center cursor-pointer transition-colors ${
                                isDone
                                  ? 'bg-emerald-500 border-emerald-500 text-black'
                                  : 'border-white/20 hover:border-amber-400 text-transparent'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>

                            <div>
                              <div
                                className={`font-bold font-sans text-sm ${
                                  isDone ? 'line-through text-zinc-400' : 'text-white'
                                }`}
                              >
                                {ex.name}
                              </div>
                              <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                <span className="text-amber-400 font-bold">{ex.sets} Series</span>
                                <span>•</span>
                                <span>{ex.reps} Reps</span>
                                <span>•</span>
                                <span className="text-zinc-500">Descanso: {ex.rest}</span>
                                {ex.notes && (
                                  <>
                                    <span>•</span>
                                    <span className="text-zinc-400 italic">"{ex.notes}"</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </>
        )}
      </main>

      {/* MODAL DE BOLETA / COMPROBANTE OFICIAL */}
      {currentMember && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          member={currentMember}
          paymentAmount={currentMember.advancePaid}
          paymentTypeTitle={currentMember.paymentType === 'advance' ? 'Adelanto de Membresía' : 'Membresía Completa'}
          paymentMethod={currentMember.paymentMethod}
        />
      )}
    </div>
  );
}
