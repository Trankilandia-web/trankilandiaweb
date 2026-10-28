import { useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Flame,
  Check,
  Calendar,
} from 'lucide-react';
import PortalHeader from '../../components/portal/PortalHeader';

interface ClassSession {
  id: string;
  name: string;
  discipline: 'boxeo' | 'musculacion' | 'funcional';
  time: string;
  coach: string;
  enrolled: number;
  capacity: number;
  status: 'completed' | 'in_progress' | 'upcoming';
}

interface AthleteAttendance {
  id: string;
  name: string;
  dni: string;
  discipline: string;
  weight: string;
  benchPressPR: string;
  deadliftPR: string;
  squatPR: string;
  attended: boolean;
}

const TODAY_CLASSES: ClassSession[] = [
  {
    id: 'CLS-101',
    name: 'Musculación: Fuerza & Hipertrofia (Pierna/Core)',
    discipline: 'musculacion',
    time: '06:00 AM - 07:30 AM',
    coach: 'Coach Carlos Mendoza',
    enrolled: 18,
    capacity: 25,
    status: 'completed',
  },
  {
    id: 'CLS-102',
    name: 'Boxeo: Fundamentos & Guardia',
    discipline: 'boxeo',
    time: '08:30 AM - 10:00 AM',
    coach: 'Coach Marcos Rivas',
    enrolled: 14,
    capacity: 18,
    status: 'completed',
  },
  {
    id: 'CLS-103',
    name: 'Boxeo Intensivo: Sparring & Manoplas',
    discipline: 'boxeo',
    time: '05:00 PM - 06:30 PM',
    coach: 'Coach Marcos Rivas',
    enrolled: 16,
    capacity: 18,
    status: 'in_progress',
  },
  {
    id: 'CLS-104',
    name: 'Acondicionamiento Funcional & Resistencia',
    discipline: 'funcional',
    time: '07:00 PM - 08:30 PM',
    coach: 'Coach Carlos Mendoza',
    enrolled: 21,
    capacity: 25,
    status: 'upcoming',
  },
];

const ATHLETES: AthleteAttendance[] = [
  {
    id: 'ATH-01',
    name: 'Luis Gerardo Llocclla',
    dni: '73921845',
    discipline: 'Boxeo + Musculación',
    weight: '76.5 kg',
    benchPressPR: '95 kg',
    deadliftPR: '140 kg',
    squatPR: '120 kg',
    attended: true,
  },
  {
    id: 'ATH-02',
    name: 'Javier Rojas Palomino',
    dni: '72983411',
    discipline: 'Musculación Pesada',
    weight: '82.0 kg',
    benchPressPR: '110 kg',
    deadliftPR: '165 kg',
    squatPR: '135 kg',
    attended: true,
  },
  {
    id: 'ATH-03',
    name: 'Maricielo Sulca Cárdenas',
    dni: '76541230',
    discipline: 'Boxeo Femenino',
    weight: '58.2 kg',
    benchPressPR: '45 kg',
    deadliftPR: '75 kg',
    squatPR: '65 kg',
    attended: false,
  },
  {
    id: 'ATH-04',
    name: 'Renato Flores Bendezú',
    dni: '70192834',
    discipline: 'Hipertrofia & Fuerza',
    weight: '71.0 kg',
    benchPressPR: '85 kg',
    deadliftPR: '125 kg',
    squatPR: '105 kg',
    attended: false,
  },
];

export default function EntrenadorDashboard() {
  const [athletes, setAthletes] = useState<AthleteAttendance[]>(ATHLETES);
  const [wodNote, setWodNote] = useState(
    'RUTINA DE FUERZA DE HOY (HUAMANGA): Press Militar 4x8 pesado + Fondos en paralelas lastrados 3x10 + 5 rounds de golpeo al costal (1 min descanso activo).'
  );
  const [savedWodAlert, setSavedWodAlert] = useState(false);

  const toggleAttendance = (id: string) => {
    setAthletes((prev) =>
      prev.map((a) => (a.id === id ? { ...a, attended: !a.attended } : a))
    );
  };

  const handleSaveWod = () => {
    setSavedWodAlert(true);
    setTimeout(() => setSavedWodAlert(false), 3000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      <PortalHeader
        currentRole="entrenador"
        title="Panel del Entrenador"
        subtitle="Staff Deportivo & Control de Atletas · Trankilandia Gym Ayacucho"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {savedWodAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-300 text-sm flex items-center gap-3 font-mono"
          >
            <CheckCircle2 className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <span>Rutina del día actualizada en la pizarra digital del gimnasio.</span>
          </motion.div>
        )}

        {/* Coach Overview KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-5">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Clases del Día</span>
            <div className="mt-2 text-3xl font-black font-display text-white">4 Sesiones</div>
            <p className="text-[11px] text-orange-400 font-mono mt-1">2 Boxeo · 2 Musculación</p>
          </div>

          <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-5">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Atletas Asistidos Hoy</span>
            <div className="mt-2 text-3xl font-black font-display text-emerald-400">
              {athletes.filter((a) => a.attended).length} / {athletes.length}
            </div>
            <p className="text-[11px] text-zinc-500 font-mono mt-1">En sala de Huamanga</p>
          </div>

          <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-5">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Clase en Curso</span>
            <div className="mt-2 text-lg font-bold text-amber-400 truncate">
              Boxeo Intensivo
            </div>
            <p className="text-[11px] text-zinc-400 font-mono mt-1">16 de 18 cupos ocupados</p>
          </div>

          <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-5">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Próxima Sesión</span>
            <div className="mt-2 text-lg font-bold text-zinc-200">
              07:00 PM Funcional
            </div>
            <p className="text-[11px] text-zinc-500 font-mono mt-1">21 atletas confirmados</p>
          </div>
        </div>

        {/* Classes of Today */}
        <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white font-display uppercase tracking-wide">
                  Programación de Clases de Hoy
                </h2>
                <p className="text-xs text-zinc-400">Horarios en sede Huamanga, Ayacucho</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TODAY_CLASSES.map((cls) => (
              <div
                key={cls.id}
                className={`p-4 rounded-xl border transition-colors ${
                  cls.status === 'in_progress'
                    ? 'bg-orange-500/10 border-orange-500/50 shadow-md shadow-orange-500/10'
                    : 'bg-zinc-950/80 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400">{cls.time}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      cls.status === 'in_progress'
                        ? 'bg-orange-500 text-black'
                        : cls.status === 'completed'
                        ? 'bg-zinc-800 text-zinc-400'
                        : 'bg-zinc-800 text-amber-400'
                    }`}
                  >
                    {cls.status === 'in_progress'
                      ? 'EN VIVO'
                      : cls.status === 'completed'
                      ? 'FINALIZADA'
                      : 'PRÓXIMA'}
                  </span>
                </div>

                <div className="mt-3 font-bold text-white text-sm leading-snug">
                  {cls.name}
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400 font-mono">
                  <span>{cls.coach.split(' ')[1]}</span>
                  <span className="font-bold text-zinc-200">
                    {cls.enrolled}/{cls.capacity} atletas
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Attendance and Athletes Records */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Attendance Check-in Table (8 cols) */}
          <div className="lg:col-span-8 bg-zinc-900/60 border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h2 className="text-base font-bold text-white font-display uppercase tracking-wide">
                  Asistencia y Ficha Técnica de Atletas
                </h2>
                <p className="text-xs text-zinc-400">Marcas Personales (PRs) y pase de lista</p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 font-mono uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3 px-3">Atleta</th>
                    <th className="py-3 px-3">Disciplina</th>
                    <th className="py-3 px-3">Peso</th>
                    <th className="py-3 px-3">Press Banca</th>
                    <th className="py-3 px-3">Sentadilla</th>
                    <th className="py-3 px-3">Peso Muerto</th>
                    <th className="py-3 px-3 text-right">Asistencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {athletes.map((a) => (
                    <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{a.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">DNI: {a.dni}</div>
                      </td>
                      <td className="py-3 px-3 text-zinc-300 font-mono text-[11px]">{a.discipline}</td>
                      <td className="py-3 px-3 font-mono text-zinc-400">{a.weight}</td>
                      <td className="py-3 px-3 font-mono text-amber-400 font-bold">{a.benchPressPR}</td>
                      <td className="py-3 px-3 font-mono text-amber-400 font-bold">{a.squatPR}</td>
                      <td className="py-3 px-3 font-mono text-amber-400 font-bold">{a.deadliftPR}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleAttendance(a.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                            a.attended
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white border border-white/5'
                          }`}
                        >
                          {a.attended ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Presente</span>
                            </>
                          ) : (
                            <span>Ausente</span>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily Gym Board Note (4 cols) */}
          <div className="lg:col-span-4 bg-zinc-900/60 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
                <Flame className="w-5 h-5 text-orange-400" />
                <div>
                  <h3 className="text-base font-bold text-white font-display uppercase tracking-wide">
                    Pizarra del Día (WOD)
                  </h3>
                  <p className="text-xs text-zinc-400">Visible para los socios en la app</p>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-zinc-400 text-xs font-mono font-bold mb-2 uppercase">
                  Rutina / Indicaciones del Coach
                </label>
                <textarea
                  rows={6}
                  value={wodNote}
                  onChange={(e) => setWodNote(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-orange-500 font-sans leading-relaxed"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveWod}
              className="w-full mt-4 bg-orange-500 hover:bg-orange-400 text-black font-extrabold py-3 rounded-xl text-xs font-mono shadow-lg shadow-orange-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>PUBLICAR RUTINA EN PIZARRA</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
