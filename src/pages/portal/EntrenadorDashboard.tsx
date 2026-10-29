import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Dumbbell,
  Users,
  TrendingUp,
  Award,
  CheckCircle2,
  Plus,
  Trash2,
  Save,
  Flame,
  Search,
  Sparkles,
  ClipboardList,
  Clock,
  Sun,
  Sunset,
  Moon,
  RefreshCw,
  Filter,
} from 'lucide-react';
import PortalHeader from '../../components/portal/PortalHeader';
import {
  GymMember,
  MemberRoutine,
  ProgressRecord,
  getStoredMembers,
  getStoredProgress,
} from '../../data/gymStore';
import {
  getMemberRoutine,
  saveMemberRoutine,
  saveProgressRecord,
} from '../../lib/supabaseDb';

// Staff Oficial de Entrenadores (2 mujeres, 2 varones en los 3 turnos oficiales)
export const OFFICIAL_COACH_LIST = [
  { id: 'all', name: 'Todos los Coaches', shift: 'all' },
  { id: 'marcos', name: 'Coach Marcos Rivas', shift: 'manana', label: 'Coach Marcos Rivas (Varón · Mañana)' },
  { id: 'camila', name: 'Coach Camila Mendoza', shift: 'manana', label: 'Coach Camila Mendoza (Mujer · Mañana)' },
  { id: 'valeria', name: 'Coach Valeria Gómez', shift: 'tarde', label: 'Coach Valeria Gómez (Mujer · Tarde)' },
  { id: 'daniel', name: 'Coach Daniel Quispe', shift: 'noche', label: 'Coach Daniel Quispe (Varón · Noche)' },
];

// Plantillas predeterminadas de rutinas
const ROUTINE_TEMPLATES = [
  {
    name: 'Fuerza & Boxeo Pro (Push/Pull/Legs)',
    objective: 'Potencia de golpeo, velocidad e hipertrofia funcional',
    notes: 'Priorizar técnica de respiración al golpear. En sentadilla romper el paralelo.',
    days: [
      {
        id: 'D1',
        dayName: 'Día 1: Empuje & Manoplas',
        focus: 'Pecho, Hombro, Tríceps + Boxeo',
        exercises: [
          { id: '1', name: 'Press Banca Plano con Barra', sets: 4, reps: '8-10', rest: '90s', notes: 'Pesado y controlado' },
          { id: '2', name: 'Press Militar de Pie', sets: 4, reps: '8', rest: '90s', notes: 'Estabilidad de hombro' },
          { id: '3', name: 'Fondos en Paralelas lastrados', sets: 3, reps: '10', rest: '60s', notes: 'Bajar a 90 grados' },
          { id: '4', name: 'Sombra de Boxeo con Mancuernas 1kg', sets: 4, reps: '3 min', rest: '45s', notes: 'Jab, cross y cintura' },
        ],
      },
      {
        id: 'D2',
        dayName: 'Día 2: Tracción & Saco Pesado',
        focus: 'Espalda, Bíceps + Pegada',
        exercises: [
          { id: '5', name: 'Dominadas con Agarre Neutro', sets: 4, reps: '8-10', rest: '90s', notes: 'Rango completo' },
          { id: '6', name: 'Remo con Barra Pendlay', sets: 4, reps: '8', rest: '90s', notes: 'Explosivo' },
          { id: '7', name: 'Curl con Barra Z de Pie', sets: 3, reps: '12', rest: '60s', notes: 'Sin balanceo' },
          { id: '8', name: 'Trabajo de Saco Pesado', sets: 5, reps: '3 min', rest: '60s', notes: 'Hooks y combinaciones' },
        ],
      },
      {
        id: 'D3',
        dayName: 'Día 3: Pierna & Core de Acero',
        focus: 'Tren inferior y resistencia de impacto',
        exercises: [
          { id: '9', name: 'Sentadilla Libre con Barra', sets: 4, reps: '8', rest: '120s', notes: 'Pesado' },
          { id: '10', name: 'Prensa 45 Grados', sets: 4, reps: '12', rest: '90s', notes: 'Pies al centro' },
          { id: '11', name: 'Elevaciones de Piernas Colgado', sets: 4, reps: '15', rest: '45s', notes: 'Tensión abdominal' },
        ],
      },
    ],
  },
  {
    name: 'Hipertrofia Clásica de Musculación',
    objective: 'Máxima ganancia de masa muscular y definición',
    notes: 'Buscar la sobrecarga progresiva cada semana. Registrar pesos.',
    days: [
      {
        id: 'D1',
        dayName: 'Día 1: Pectoral & Bíceps',
        focus: 'Hipertrofia del torso frontal',
        exercises: [
          { id: '12', name: 'Press Inclinado con Mancuernas', sets: 4, reps: '10-12', rest: '75s', notes: 'Apertura profunda' },
          { id: '13', name: 'Aperturas en Polea (Cruces)', sets: 3, reps: '15', rest: '60s', notes: 'Pausa de 1s en contracción' },
          { id: '14', name: 'Curl Martillo con Mancuernas', sets: 4, reps: '12', rest: '60s', notes: 'Para braquial y antebrazo' },
        ],
      },
      {
        id: 'D2',
        dayName: 'Día 2: Espalda & Tríceps',
        focus: 'V-Taper y brazos densos',
        exercises: [
          { id: '15', name: 'Jalón al Pecho en Polea', sets: 4, reps: '10-12', rest: '75s', notes: 'Retraer escápulas' },
          { id: '16', name: 'Remo en Polea Baja (Gironda)', sets: 4, reps: '10', rest: '60s', notes: 'Hacia el ombligo' },
          { id: '17', name: 'Extensiones de Tríceps en Polea', sets: 4, reps: '12-15', rest: '60s', notes: 'Codos inmóviles' },
        ],
      },
      {
        id: 'D3',
        dayName: 'Día 3: Piernas Completas',
        focus: 'Cuádriceps, Isquios & Gemelos',
        exercises: [
          { id: '18', name: 'Sentadilla Hack o Barra', sets: 4, reps: '10', rest: '90s', notes: 'Pies firmes' },
          { id: '19', name: 'Curl Femoral Tumbado', sets: 4, reps: '12', rest: '60s', notes: 'Control excéntrico' },
          { id: '20', name: 'Elevación de Talones de Pie', sets: 4, reps: '15', rest: '45s', notes: 'Estiramiento abajo' },
        ],
      },
    ],
  },
  {
    name: 'Glúteos, Pierna & Tonificación (Camila/Valeria)',
    objective: 'Desarrollo de tren inferior, cintura fina y resistencia',
    notes: 'Priorizar conexión mente-músculo y pausas isométricas de 1 segundo.',
    days: [
      {
        id: 'D1',
        dayName: 'Día 1: Enfoque Glúteos & Isquios',
        focus: 'Hip Thrust, Peso Muerto Rumano & Abductores',
        exercises: [
          { id: '21', name: 'Hip Thrust con Barra Pesado', sets: 4, reps: '10-12', rest: '90s', notes: 'Pausa arriba' },
          { id: '22', name: 'Peso Muerto Rumano con Mancuernas', sets: 4, reps: '12', rest: '75s', notes: 'Espalda recta' },
          { id: '23', name: 'Patada de Glúteo en Polea', sets: 3, reps: '15', rest: '45s', notes: 'Apretar glúteo' },
        ],
      },
      {
        id: 'D2',
        dayName: 'Día 2: Tren Superior & Core',
        focus: 'Hombros estéticos, Espalda y Abdomen',
        exercises: [
          { id: '24', name: 'Elevaciones Laterales con Mancuernas', sets: 4, reps: '15', rest: '45s', notes: 'Control' },
          { id: '25', name: 'Remo Unilateral con Mancuerna', sets: 4, reps: '12', rest: '60s', notes: 'Tronco estable' },
          { id: '26', name: 'Plancha Abdominal con Toques', sets: 4, reps: '45s', rest: '30s', notes: 'Cadera firme' },
        ],
      },
    ],
  },
];

export default function EntrenadorDashboard() {
  const [members] = useState<GymMember[]>(getStoredMembers());

  // Filtros de Turno y Coach
  const [filterShift, setFilterShift] = useState<'all' | 'manana' | 'tarde' | 'noche'>('all');
  const [filterCoach, setFilterCoach] = useState<string>('all');
  const [searchMember, setSearchMember] = useState('');
  const [activeTab, setActiveTab] = useState<'routine' | 'progress'>('routine');
  const [successAlert, setSuccessAlert] = useState<string | null>(null);

  // Socio seleccionado
  const [selectedMember, setSelectedMember] = useState<GymMember>(members[0]);

  // Caché de Rutinas bajo demanda (Lazy Fetching)
  const [loadedRoutines, setLoadedRoutines] = useState<Record<string, MemberRoutine>>({});
  const [isLoadingRoutine, setIsLoadingRoutine] = useState(false);

  // Estado editable de la rutina activa
  const [editableRoutine, setEditableRoutine] = useState<MemberRoutine>({
    memberId: members[0]?.id || 'MEM-001',
    routineTitle: 'Rutina Base de Entrenamiento',
    objective: 'Acondicionamiento físico',
    coachName: 'Coach Marcos Rivas',
    updatedAt: 'Hoy',
    coachNotes: '',
    days: ROUTINE_TEMPLATES[0].days,
  });

  // Progresos y Modal de Evaluación
  const [progressList, setProgressList] = useState<ProgressRecord[]>(getStoredProgress());
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [newWeight, setNewWeight] = useState<string>('75.0');
  const [newBench, setNewBench] = useState<string>('90.0');
  const [newSquat, setNewSquat] = useState<string>('115.0');
  const [newDeadlift, setNewDeadlift] = useState<string>('135.0');
  const [newPullups, setNewPullups] = useState<string>('12');
  const [newProgressNotes, setNewProgressNotes] = useState<string>('Excelente ejecución técnica.');

  // 1. CARGA BAJO DEMANDA (LAZY FETCH) DE LA RUTINA DEL ATLETA SELECCIONADO
  // Cero consumo de egress innecesario: NO descarga las 450 rutinas de golpe
  const fetchRoutineForMember = useCallback(
    async (member: GymMember) => {
      // Si ya está en la memoria del entrenador, no volver a solicitar
      if (loadedRoutines[member.id]) {
        setEditableRoutine(loadedRoutines[member.id]);
        return;
      }

      setIsLoadingRoutine(true);
      try {
        const fetched = await getMemberRoutine(member.id);
        const routineToUse =
          fetched || {
            memberId: member.id,
            routineTitle: `Rutina Personalizada · ${member.name.split(' ')[0]}`,
            objective: 'Hipertrofia & Fuerza Funcional',
            coachName: member.coachName || 'Coach Marcos Rivas',
            updatedAt: 'Pendiente de Asignación',
            coachNotes: 'Mantener control en fase excéntrica y calentar 10 minutos.',
            days: ROUTINE_TEMPLATES[0].days,
          };

        setLoadedRoutines((prev) => ({ ...prev, [member.id]: routineToUse }));
        setEditableRoutine(routineToUse);
      } catch {
        // Fallback local
        const defaultRoutine = {
          memberId: member.id,
          routineTitle: `Rutina Personalizada · ${member.name.split(' ')[0]}`,
          objective: 'Acondicionamiento',
          coachName: member.coachName || 'Coach Marcos Rivas',
          updatedAt: 'Hoy',
          coachNotes: 'Completar las series indicadas.',
          days: ROUTINE_TEMPLATES[0].days,
        };
        setEditableRoutine(defaultRoutine);
      }
      setIsLoadingRoutine(false);
    },
    [loadedRoutines]
  );

  // Al cambiar de socio seleccionado, cargar su rutina bajo demanda
  useEffect(() => {
    if (selectedMember) {
      fetchRoutineForMember(selectedMember);
    }
  }, [selectedMember, fetchRoutineForMember]);

  // 2. FILTRADO DE ATLETAS POR TURNO OFICIAL Y ENTRENADOR
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Filtro de Turno
      const memberShift = m.shift || 'manana';
      const matchShift = filterShift === 'all' || memberShift === filterShift;

      // Filtro de Coach
      const matchCoach = filterCoach === 'all' || (m.coachName && m.coachName.includes(filterCoach));

      // Búsqueda por texto
      const query = searchMember.toLowerCase();
      const matchSearch =
        m.name.toLowerCase().includes(query) || m.dni.includes(query) || m.id.toLowerCase().includes(query);

      return matchShift && matchCoach && matchSearch;
    });
  }, [members, filterShift, filterCoach, searchMember]);

  // 3. GUARDAR RUTINA
  const handleSaveRoutine = async () => {
    const updated: MemberRoutine = {
      ...editableRoutine,
      memberId: selectedMember.id,
      coachName: selectedMember.coachName || editableRoutine.coachName,
      updatedAt: new Date().toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    };

    setLoadedRoutines((prev) => ({ ...prev, [selectedMember.id]: updated }));
    setEditableRoutine(updated);

    // Guardar en Supabase / Local
    await saveMemberRoutine(updated);

    setSuccessAlert(`Rutina guardada y asignada con éxito a ${selectedMember.name}.`);
    setTimeout(() => setSuccessAlert(null), 4000);
  };

  // 4. APLICAR PLANTILLA PREDETERMINADA
  const handleApplyTemplate = (tmpl: (typeof ROUTINE_TEMPLATES)[0]) => {
    setEditableRoutine((prev) => ({
      ...prev,
      routineTitle: tmpl.name,
      objective: tmpl.objective,
      coachNotes: tmpl.notes,
      days: tmpl.days,
    }));
    setSuccessAlert(`Plantilla "${tmpl.name}" cargada. Haz clic en "Guardar y Asignar" para confirmar.`);
    setTimeout(() => setSuccessAlert(null), 3500);
  };

  // 5. AGREGAR / ELIMINAR EJERCICIOS
  const handleAddExercise = (dayIndex: number) => {
    const newEx = {
      id: Date.now().toString(),
      name: 'Nuevo Ejercicio',
      sets: 4,
      reps: '10-12',
      rest: '60s',
      notes: 'Control excéntrico',
    };

    setEditableRoutine((prev) => {
      const newDays = [...prev.days];
      newDays[dayIndex].exercises.push(newEx);
      return { ...prev, days: newDays };
    });
  };

  const handleRemoveExercise = (dayIndex: number, exIndex: number) => {
    setEditableRoutine((prev) => {
      const newDays = [...prev.days];
      newDays[dayIndex].exercises.splice(exIndex, 1);
      return { ...prev, days: newDays };
    });
  };

  // 6. GUARDAR NUEVA EVALUACIÓN DE PROGRESO
  const handleSaveProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: ProgressRecord = {
      id: `PRG-${Date.now()}`,
      memberId: selectedMember.id,
      date: new Date().toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      weightKg: Number(newWeight) || 75,
      benchPressKg: Number(newBench) || 90,
      squatKg: Number(newSquat) || 115,
      deadliftKg: Number(newDeadlift) || 135,
      pullupsRep: Number(newPullups) || 10,
      notes: newProgressNotes.trim(),
    };

    const updated = [newRecord, ...progressList];
    setProgressList(updated);
    await saveProgressRecord(newRecord);

    setShowProgressModal(false);
    setSuccessAlert(`Nueva evaluación física registrada para ${selectedMember.name}.`);
    setTimeout(() => setSuccessAlert(null), 4000);
  };

  // Progresos del socio seleccionado
  const memberProgress = progressList.filter((p) => p.memberId === selectedMember.id);
  const latestProgress = memberProgress[0];

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans pb-16 selection:bg-orange-500 selection:text-black">
      <PortalHeader
        currentRole="entrenador"
        title="Panel del Entrenador (Coach)"
        subtitle="Gestión de Rutinas por Turno · Carga Bajo Demanda · Evaluación de Marcas"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {successAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/40 text-orange-300 text-sm flex items-center gap-3 font-mono shadow-lg"
          >
            <CheckCircle2 className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <span>{successAlert}</span>
          </motion.div>
        )}

        {/* 1. BARRA DE FILTROS POR TURNO OFICIAL Y ENTRENADOR */}
        <section className="bg-zinc-900/80 border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <h2 className="text-base font-bold text-white font-display uppercase tracking-wide flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-400" />
                <span>Atletas por Turno & Entrenador</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Filtra alumnos de tu turno para armar su plan de entrenamiento sin saturar la red
              </p>
            </div>

            {/* Buscador de Alumno */}
            <div className="relative w-full lg:w-72">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                placeholder="Buscar por nombre, DNI o ID..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Filtros de Turno y Coach */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Botones de Turnos Oficiales */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5 text-orange-400" /> Turno:
              </span>
              {[
                { id: 'all', label: 'Todos', icon: Clock },
                { id: 'manana', label: 'Mañana (6am-2pm)', icon: Sun },
                { id: 'tarde', label: 'Tarde (2pm-6pm)', icon: Sunset },
                { id: 'noche', label: 'Noche (6pm-10pm)', icon: Moon },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = filterShift === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFilterShift(t.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-orange-500 text-black shadow-md'
                        : 'bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Selector de Coach */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-zinc-400 whitespace-nowrap">Coach:</span>
              <select
                value={filterCoach}
                onChange={(e) => setFilterCoach(e.target.value)}
                className="bg-zinc-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                {OFFICIAL_COACH_LIST.map((c) => (
                  <option key={c.id} value={c.id === 'all' ? 'all' : c.name}>
                    {c.label || c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Carrusel de Chips de Alumnos Filtrados */}
          <div className="pt-2">
            <div className="text-[11px] font-mono text-zinc-400 mb-2">
              Alumnos encontrados: <strong className="text-white">{filteredMembers.length}</strong> (Haz clic para cargar su rutina bajo demanda):
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {filteredMembers.length === 0 ? (
                <div className="py-4 text-xs font-mono text-zinc-500">
                  No hay atletas registrados en este turno o filtro.
                </div>
              ) : (
                filteredMembers.map((m) => {
                  const isSelected = m.id === selectedMember.id;
                  const shift = m.shift || 'manana';
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMember(m)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                        isSelected
                          ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                          : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-white/5'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                          isSelected ? 'bg-black text-white' : 'bg-orange-500/20 text-orange-400'
                        }`}
                      >
                        {m.name[0]}
                      </div>
                      <span>{m.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${
                          isSelected
                            ? 'bg-black/20 text-black font-black'
                            : 'bg-zinc-900 text-zinc-400'
                        }`}
                      >
                        {shift}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* 2. HEADER DEL ALUMNO SELECCIONADO + TABS */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-black border border-orange-500/30 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center font-black text-xl font-display">
              {selectedMember.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white font-display uppercase tracking-tight">
                  {selectedMember.name}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                  DNI: {selectedMember.dni}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-zinc-800 text-zinc-300">
                  Turno: {selectedMember.shift || 'manana'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Plan: <span className="text-zinc-200 font-bold">{selectedMember.plan}</span> · Coach:{' '}
                <span className="text-orange-400 font-bold">{selectedMember.coachName || 'Coach Marcos Rivas'}</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-zinc-950 p-1.5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('routine')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTab === 'routine'
                  ? 'bg-orange-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>GESTIONAR RUTINA</span>
              {isLoadingRoutine && <RefreshCw className="w-3 h-3 animate-spin ml-1 text-black" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('progress')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTab === 'progress'
                  ? 'bg-orange-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>EVOLUCIÓN & MARCAS ({memberProgress.length})</span>
            </button>
          </div>
        </div>

        {/* 3. VISTA 1: GESTIÓN DE RUTINA */}
        {activeTab === 'routine' && (
          <div className="space-y-6">
            {/* Selector de Plantillas Predeterminadas */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span className="font-bold">Plantillas Rápidas del Staff:</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {ROUTINE_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.name}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono border border-white/10 hover:border-orange-500/40 transition-colors cursor-pointer"
                  >
                    {tmpl.name.split('(')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Cabecera de la Rutina y Guardado */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-zinc-400 text-xs font-mono font-bold mb-1 uppercase">
                      Título de la Rutina
                    </label>
                    <input
                      type="text"
                      value={editableRoutine.routineTitle}
                      onChange={(e) =>
                        setEditableRoutine({ ...editableRoutine, routineTitle: e.target.value })
                      }
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-orange-500 font-display"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-xs font-mono font-bold mb-1 uppercase">
                      Objetivo del Atleta
                    </label>
                    <input
                      type="text"
                      value={editableRoutine.objective}
                      onChange={(e) =>
                        setEditableRoutine({ ...editableRoutine, objective: e.target.value })
                      }
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                </div>

                <div className="sm:self-end">
                  <button
                    type="button"
                    onClick={handleSaveRoutine}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-black text-xs font-display uppercase tracking-wider transition-all shadow-lg shadow-orange-500/20 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>GUARDAR Y ASIGNAR AL ATLETA</span>
                  </button>
                </div>
              </div>

              {/* Indicaciones del Coach */}
              <div>
                <label className="block text-orange-400 text-xs font-mono font-bold mb-1.5 uppercase flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Indicaciones Técnicas para {selectedMember.name.split(' ')[0]}:</span>
                </label>
                <textarea
                  rows={2}
                  value={editableRoutine.coachNotes}
                  onChange={(e) =>
                    setEditableRoutine({ ...editableRoutine, coachNotes: e.target.value })
                  }
                  placeholder="Ej: Calentar manguito rotador 10 min, en sentadilla no rebotar abajo..."
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-orange-500 font-sans"
                />
              </div>
            </div>

            {/* Días y Constructor de Ejercicios */}
            <div className="space-y-4">
              {editableRoutine.days.map((day, dayIndex) => (
                <div
                  key={day.id || dayIndex}
                  className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/30">
                        <Dumbbell className="w-4 h-4" />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={day.dayName}
                          onChange={(e) => {
                            const newDays = [...editableRoutine.days];
                            newDays[dayIndex].dayName = e.target.value;
                            setEditableRoutine({ ...editableRoutine, days: newDays });
                          }}
                          className="bg-transparent font-bold text-white text-sm focus:outline-none border-b border-transparent focus:border-orange-500"
                        />
                        <input
                          type="text"
                          value={day.focus}
                          onChange={(e) => {
                            const newDays = [...editableRoutine.days];
                            newDays[dayIndex].focus = e.target.value;
                            setEditableRoutine({ ...editableRoutine, days: newDays });
                          }}
                          className="block text-[11px] text-zinc-400 font-mono bg-transparent focus:outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddExercise(dayIndex)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-orange-400 text-xs font-mono font-bold transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Ejercicio</span>
                    </button>
                  </div>

                  {/* Tabla de Ejercicios */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-950/80 text-zinc-400 font-mono uppercase tracking-wider border-b border-white/10">
                        <tr>
                          <th className="py-2.5 px-3">Ejercicio</th>
                          <th className="py-2.5 px-3 w-20">Series</th>
                          <th className="py-2.5 px-3 w-28">Repes</th>
                          <th className="py-2.5 px-3 w-24">Descanso</th>
                          <th className="py-2.5 px-3">Observación Técnica</th>
                          <th className="py-2.5 px-3 text-right w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {day.exercises.map((ex, exIndex) => (
                          <tr key={ex.id || exIndex} className="hover:bg-white/[0.02]">
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={ex.name}
                                onChange={(e) => {
                                  const newDays = [...editableRoutine.days];
                                  newDays[dayIndex].exercises[exIndex].name = e.target.value;
                                  setEditableRoutine({ ...editableRoutine, days: newDays });
                                }}
                                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1 text-white font-sans text-xs focus:outline-none focus:border-orange-500"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={ex.sets}
                                onChange={(e) => {
                                  const newDays = [...editableRoutine.days];
                                  newDays[dayIndex].exercises[exIndex].sets = Number(e.target.value);
                                  setEditableRoutine({ ...editableRoutine, days: newDays });
                                }}
                                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2 py-1 text-center text-white focus:outline-none focus:border-orange-500"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={ex.reps}
                                onChange={(e) => {
                                  const newDays = [...editableRoutine.days];
                                  newDays[dayIndex].exercises[exIndex].reps = e.target.value;
                                  setEditableRoutine({ ...editableRoutine, days: newDays });
                                }}
                                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2 py-1 text-center text-white focus:outline-none focus:border-orange-500"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={ex.rest}
                                onChange={(e) => {
                                  const newDays = [...editableRoutine.days];
                                  newDays[dayIndex].exercises[exIndex].rest = e.target.value;
                                  setEditableRoutine({ ...editableRoutine, days: newDays });
                                }}
                                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2 py-1 text-center text-zinc-300 focus:outline-none focus:border-orange-500"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={ex.notes || ''}
                                onChange={(e) => {
                                  const newDays = [...editableRoutine.days];
                                  newDays[dayIndex].exercises[exIndex].notes = e.target.value;
                                  setEditableRoutine({ ...editableRoutine, days: newDays });
                                }}
                                placeholder="Nota técnica..."
                                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1 text-zinc-400 font-sans text-xs focus:outline-none focus:border-orange-500"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveExercise(dayIndex, exIndex)}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Eliminar ejercicio"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. VISTA 2: GESTIÓN DE PROGRESOS */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            {/* PRs Highlights Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-mono uppercase text-zinc-400">Peso Corporal</span>
                <div className="mt-1 text-2xl font-black font-display text-white">
                  {latestProgress ? `${latestProgress.weightKg} kg` : '75.0 kg'}
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Evaluación sala</span>
              </div>

              <div className="bg-zinc-900/70 border border-amber-500/30 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-mono uppercase text-amber-400">Press de Banca</span>
                <div className="mt-1 text-2xl font-black font-display text-amber-400">
                  {latestProgress ? `${latestProgress.benchPressKg} kg` : '90 kg'}
                </div>
                <span className="text-[10px] font-mono text-emerald-400">Marca Personal</span>
              </div>

              <div className="bg-zinc-900/70 border border-amber-500/30 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-mono uppercase text-amber-400">Sentadilla</span>
                <div className="mt-1 text-2xl font-black font-display text-amber-400">
                  {latestProgress ? `${latestProgress.squatKg} kg` : '115 kg'}
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Profunda</span>
              </div>

              <div className="bg-zinc-900/70 border border-amber-500/30 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-mono uppercase text-amber-400">Peso Muerto</span>
                <div className="mt-1 text-2xl font-black font-display text-amber-400">
                  {latestProgress ? `${latestProgress.deadliftKg} kg` : '135 kg'}
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Convencional</span>
              </div>

              <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-4 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] font-mono uppercase text-zinc-400">Dominadas</span>
                <div className="mt-1 text-2xl font-black font-display text-emerald-400">
                  {latestProgress ? `${latestProgress.pullupsRep} reps` : '12 reps'}
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Estrictas</span>
              </div>
            </div>

            {/* Acciones y Botón de Nueva Evaluación */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/60 border border-white/10">
              <div>
                <h4 className="text-sm font-bold text-white font-display uppercase tracking-wide">
                  Historial de Evaluaciones Físicas
                </h4>
                <p className="text-xs text-zinc-400">
                  Registro de marcas de {selectedMember.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowProgressModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-black text-xs font-mono uppercase transition-colors shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>NUEVA EVALUACIÓN FÍSICA</span>
              </button>
            </div>

            {/* Tabla de Evaluaciones */}
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Peso (kg)</th>
                      <th className="py-3 px-4">Press Banca</th>
                      <th className="py-3 px-4">Sentadilla</th>
                      <th className="py-3 px-4">Peso Muerto</th>
                      <th className="py-3 px-4">Dominadas</th>
                      <th className="py-3 px-4">Notas & Observaciones del Coach</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {memberProgress.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-500">
                          Este socio aún no tiene evaluaciones registradas. Haz clic en "Nueva Evaluación Física".
                        </td>
                      </tr>
                    ) : (
                      memberProgress.map((p) => (
                        <tr key={p.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-4 text-white font-bold">{p.date}</td>
                          <td className="py-3 px-4 text-zinc-300">{p.weightKg} kg</td>
                          <td className="py-3 px-4 text-amber-400 font-bold">{p.benchPressKg} kg</td>
                          <td className="py-3 px-4 text-amber-400 font-bold">{p.squatKg} kg</td>
                          <td className="py-3 px-4 text-amber-400 font-bold">{p.deadliftKg} kg</td>
                          <td className="py-3 px-4 text-emerald-400 font-bold">{p.pullupsRep} reps</td>
                          <td className="py-3 px-4 text-zinc-400 font-sans text-xs">{p.notes}</td>
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

      {/* MODAL PARA REGISTRAR NUEVA EVALUACIÓN DE PROGRESO */}
      {showProgressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-zinc-900 border border-orange-500/40 rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="p-2.5 rounded-xl bg-orange-500 text-black font-black">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-black text-white font-display uppercase tracking-tight">
                  Nueva Evaluación de Fuerza y Peso
                </h4>
                <p className="text-xs text-zinc-400 font-mono">
                  Atleta: {selectedMember.name} (DNI: {selectedMember.dni})
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProgress} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-bold mb-1 uppercase">
                    Peso Corporal (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-bold mb-1 uppercase">
                    Dominadas (Reps)
                  </label>
                  <input
                    type="number"
                    required
                    value={newPullups}
                    onChange={(e) => setNewPullups(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 font-bold mb-1 uppercase">
                    Press Banca (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newBench}
                    onChange={(e) => setNewBench(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-bold mb-1 uppercase">
                    Sentadilla (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newSquat}
                    onChange={(e) => setNewSquat(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-bold mb-1 uppercase">
                    Peso Muerto (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newDeadlift}
                    onChange={(e) => setNewDeadlift(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-bold mb-1 uppercase">
                  Observaciones Técnicas del Coach
                </label>
                <textarea
                  rows={2}
                  value={newProgressNotes}
                  onChange={(e) => setNewProgressNotes(e.target.value)}
                  placeholder="Ej: Buena profundidad en sentadilla, subió 5kg en press banca..."
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-orange-500 font-sans"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowProgressModal(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-400 text-black py-3 rounded-xl font-black cursor-pointer transition-colors shadow-lg shadow-orange-500/20"
                >
                  GUARDAR EVALUACIÓN
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
