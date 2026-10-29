import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import PortalHeader from '../../components/portal/PortalHeader';
import {
  GymMember,
  MemberRoutine,
  ProgressRecord,
  getStoredMembers,
  getStoredRoutines,
  getStoredProgress,
} from '../../data/gymStore';
import { saveMemberRoutine, saveProgressRecord } from '../../lib/supabaseDb';

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
    ],
  },
];

export default function EntrenadorDashboard() {
  const members = getStoredMembers();
  const [selectedMember, setSelectedMember] = useState<GymMember>(members[0]);
  const [routines, setRoutines] = useState<Record<string, MemberRoutine>>(getStoredRoutines());
  const [progressList, setProgressList] = useState<ProgressRecord[]>(getStoredProgress());
  const [searchMember, setSearchMember] = useState('');
  const [activeTab, setActiveTab] = useState<'routine' | 'progress'>('routine');
  const [successAlert, setSuccessAlert] = useState<string | null>(null);

  // Active Routine State
  const currentRoutine = routines[selectedMember.id] || {
    memberId: selectedMember.id,
    routineTitle: 'Rutina Personalizada · Musculación & Boxeo',
    objective: 'Fuerza, hipertrofia y resistencia',
    coachName: 'Coach Marcos Rivas',
    updatedAt: 'Hoy',
    coachNotes: 'Mantener buena forma en cada repetición y calentar 10 min antes.',
    days: ROUTINE_TEMPLATES[0].days,
  };

  const [editableRoutine, setEditableRoutine] = useState<MemberRoutine>(currentRoutine);

  // New Progress Record State
  const [newWeight, setNewWeight] = useState<string>('77.0');
  const [newBench, setNewBench] = useState<string>('97.5');
  const [newSquat, setNewSquat] = useState<string>('122.5');
  const [newDeadlift, setNewDeadlift] = useState<string>('145.0');
  const [newPullups, setNewPullups] = useState<string>('15');
  const [newProgressNotes, setNewProgressNotes] = useState<string>('Superó su marca personal en press de banca.');
  const [showProgressModal, setShowProgressModal] = useState(false);

  useEffect(() => {
    const existing = routines[selectedMember.id];
    if (existing) {
      setEditableRoutine(existing);
    } else {
      setEditableRoutine({
        memberId: selectedMember.id,
        routineTitle: `Rutina Personalizada para ${selectedMember.name.split(' ')[0]}`,
        objective: 'Acondicionamiento físico e hipertrofia',
        coachName: 'Coach Marcos Rivas',
        updatedAt: 'Hoy',
        coachNotes: 'Cumplir con los descansos indicados y calentar adecuadamente.',
        days: ROUTINE_TEMPLATES[0].days,
      });
    }
  }, [selectedMember, routines]);

  // Save Routine
  const handleSaveRoutine = () => {
    const updated: MemberRoutine = {
      ...editableRoutine,
      memberId: selectedMember.id,
      updatedAt: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }),
    };

    const newRoutines = { ...routines, [selectedMember.id]: updated };
    setRoutines(newRoutines);
    saveMemberRoutine(updated);

    setSuccessAlert(`Rutina asignada y guardada con éxito para ${selectedMember.name}. El socio ya puede verla en su portal.`);
    setTimeout(() => setSuccessAlert(null), 4000);
  };

  // Apply Predefined Template
  const handleApplyTemplate = (tmpl: typeof ROUTINE_TEMPLATES[0]) => {
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

  // Add Exercise to a Day
  const handleAddExercise = (dayIndex: number) => {
    const newEx = {
      id: Date.now().toString(),
      name: 'Nuevo Ejercicio',
      sets: 3,
      reps: '10-12',
      rest: '60s',
      notes: 'Ejecución controlada',
    };

    setEditableRoutine((prev) => {
      const newDays = [...prev.days];
      newDays[dayIndex].exercises.push(newEx);
      return { ...prev, days: newDays };
    });
  };

  // Remove Exercise
  const handleRemoveExercise = (dayIndex: number, exIndex: number) => {
    setEditableRoutine((prev) => {
      const newDays = [...prev.days];
      newDays[dayIndex].exercises.splice(exIndex, 1);
      return { ...prev, days: newDays };
    });
  };

  // Save New Progress Record
  const handleSaveProgress = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: ProgressRecord = {
      id: `PRG-${Date.now()}`,
      memberId: selectedMember.id,
      date: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }),
      weightKg: Number(newWeight) || 75,
      benchPressKg: Number(newBench) || 90,
      squatKg: Number(newSquat) || 115,
      deadliftKg: Number(newDeadlift) || 135,
      pullupsRep: Number(newPullups) || 10,
      notes: newProgressNotes.trim(),
    };

    const updated = [newRecord, ...progressList];
    setProgressList(updated);
    saveProgressRecord(newRecord);

    setShowProgressModal(false);
    setSuccessAlert(`Nueva evaluación registrada para ${selectedMember.name}. ¡Progresos actualizados!`);
    setTimeout(() => setSuccessAlert(null), 4000);
  };

  // Filtered member progress
  const memberProgress = progressList.filter((p) => p.memberId === selectedMember.id);
  const latestProgress = memberProgress[0];

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchMember.toLowerCase()) ||
      m.dni.includes(searchMember)
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans pb-16">
      <PortalHeader
        currentRole="entrenador"
        title="Panel del Entrenador (Coach)"
        subtitle="Gestión de Rutinas Personalizadas y Evolución de Progresos · Trankilandia Gym"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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

        {/* 1. SELECCIÓN DE ATLETA / CLIENTE */}
        <section className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <h2 className="text-base font-bold text-white font-display uppercase tracking-wide flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-400" />
                <span>Atleta a Gestionar</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Selecciona a un alumno para armar su rutina o registrar sus marcas de fuerza
              </p>
            </div>

            {/* Quick search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                placeholder="Buscar por nombre o DNI..."
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Member chips selector */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
            {filteredMembers.map((m) => {
              const isSelected = m.id === selectedMember.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMember(m)}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
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
                  <span className={`text-[10px] ${isSelected ? 'text-black/70' : 'text-zinc-500'}`}>
                    ({m.dni})
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. HEADER DEL ALUMNO SELECCIONADO + TABS (RUTINA VS PROGRESOS) */}
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
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Plan: <span className="text-zinc-200 font-bold">{selectedMember.plan}</span> · Coach a cargo:{' '}
                <span className="text-orange-400 font-bold">{selectedMember.coachName}</span>
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
              <span>EVOLUCIÓN & MARCAS</span>
            </button>
          </div>
        </div>

        {/* 3. VISTA 1: GESTIÓN DE RUTINAS DEL CLIENTE */}
        {activeTab === 'routine' && (
          <div className="space-y-6">
            {/* Quick Templates Selector */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span className="font-bold">Plantillas Rápidas del Coach:</span>
                <span className="text-zinc-500 hidden sm:inline">Carga una estructura probada en 1 clic:</span>
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

            {/* General Routine Details */}
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
                    <span>GUARDAR Y ASIGNAR RUTINA</span>
                  </button>
                </div>
              </div>

              {/* Coach Technical Notes */}
              <div>
                <label className="block text-orange-400 text-xs font-mono font-bold mb-1.5 uppercase flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Indicaciones Técnicas del Coach para {selectedMember.name.split(' ')[0]}:</span>
                </label>
                <textarea
                  rows={2}
                  value={editableRoutine.coachNotes}
                  onChange={(e) =>
                    setEditableRoutine({ ...editableRoutine, coachNotes: e.target.value })
                  }
                  placeholder="Ej: Cuidar bloqueo de rodillas en sentadilla, 4 rounds de sparring al 70%..."
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-orange-500 font-sans"
                />
              </div>
            </div>

            {/* Routine Days & Exercise Builder */}
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

                  {/* Exercises Table */}
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
                                placeholder="Nota opcional..."
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

        {/* 4. VISTA 2: GESTIÓN DE PROGRESOS Y MARCAS DEL CLIENTE */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            {/* PRs Highlights Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-mono uppercase text-zinc-400">Peso Corporal</span>
                <div className="mt-1 text-2xl font-black font-display text-white">
                  {latestProgress ? `${latestProgress.weightKg} kg` : '75.0 kg'}
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Última medición</span>
              </div>

              <div className="bg-zinc-900/70 border border-amber-500/30 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-mono uppercase text-amber-400">Press de Banca</span>
                <div className="mt-1 text-2xl font-black font-display text-amber-400">
                  {latestProgress ? `${latestProgress.benchPressKg} kg` : '90 kg'}
                </div>
                <span className="text-[10px] font-mono text-emerald-400">+5 kg reciente</span>
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
                <span className="text-[10px] font-mono text-zinc-500">Rango estricto</span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/60 border border-white/10">
              <div>
                <h4 className="text-sm font-bold text-white font-display uppercase tracking-wide">
                  Historial de Evaluaciones Físicas
                </h4>
                <p className="text-xs text-zinc-400">
                  Seguimiento de peso corporal y cargas de fuerza de {selectedMember.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowProgressModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-black text-xs font-mono uppercase transition-colors shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>NUEVA EVALUACIÓN</span>
              </button>
            </div>

            {/* Progress Records Timeline / Table */}
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
                    {memberProgress.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 text-white font-bold">{p.date}</td>
                        <td className="py-3 px-4 text-zinc-300">{p.weightKg} kg</td>
                        <td className="py-3 px-4 text-amber-400 font-bold">{p.benchPressKg} kg</td>
                        <td className="py-3 px-4 text-amber-400 font-bold">{p.squatKg} kg</td>
                        <td className="py-3 px-4 text-amber-400 font-bold">{p.deadliftKg} kg</td>
                        <td className="py-3 px-4 text-emerald-400 font-bold">{p.pullupsRep} reps</td>
                        <td className="py-3 px-4 text-zinc-400 font-sans text-xs">{p.notes}</td>
                      </tr>
                    ))}
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
                    Dominadas (Reps Max)
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
                  <label className="block text-amber-400 font-bold mb-1 uppercase">
                    Press Banca (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newBench}
                    onChange={(e) => setNewBench(e.target.value)}
                    className="w-full bg-zinc-950 border border-amber-400/30 rounded-xl px-3 py-2 text-amber-400 font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-amber-400 font-bold mb-1 uppercase">
                    Sentadilla (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newSquat}
                    onChange={(e) => setNewSquat(e.target.value)}
                    className="w-full bg-zinc-950 border border-amber-400/30 rounded-xl px-3 py-2 text-amber-400 font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-amber-400 font-bold mb-1 uppercase">
                    Peso Muerto (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newDeadlift}
                    onChange={(e) => setNewDeadlift(e.target.value)}
                    className="w-full bg-zinc-950 border border-amber-400/30 rounded-xl px-3 py-2 text-amber-400 font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-bold mb-1 uppercase">
                  Observaciones Técnicas del Coach
                </label>
                <textarea
                  rows={3}
                  value={newProgressNotes}
                  onChange={(e) => setNewProgressNotes(e.target.value)}
                  placeholder="Comentario sobre avances de técnica, potencia de golpeo o mejoras..."
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-orange-500 font-sans"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowProgressModal(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-400 text-black py-3 rounded-xl text-xs font-mono font-black cursor-pointer transition-colors shadow-lg shadow-orange-500/20"
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
