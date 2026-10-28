import React, { useState } from 'react';
import {
  Clock,
  User,
  Sparkles,
  Flame,
  Dumbbell,
  Activity,
  Zap,
  ArrowRight,
  Ticket,
  CalendarX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SCHEDULE_DAYS, SCHEDULE_CLASSES } from '../data/gymData';
import type { ScheduleClass } from '../types';

export interface SchedulePageProps {
  onBookClass?: (classId: string) => void;
  onOpenTourModal?: () => void;
}

const CATEGORIES = [
  'Todas',
  'Fuerza',
  'HIIT',
  'Funcional',
  'Boxeo',
  'Movilidad',
] as const;

type CategoryFilter = (typeof CATEGORIES)[number];

export default function SchedulePage({
  onBookClass,
  onOpenTourModal,
}: SchedulePageProps = {}): React.JSX.Element {
  const [selectedDay, setSelectedDay] = useState<ScheduleClass['day']>('Lunes');
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>('Todas');

  const handleBook = (classId: string) => {
    if (onBookClass) {
      onBookClass(classId);
    }
    if (onOpenTourModal) {
      onOpenTourModal();
    }
  };

  const handleOpenCourtesyPass = () => {
    if (onOpenTourModal) {
      onOpenTourModal();
    }
  };

  // Filter classes by day and category
  const filteredClasses = SCHEDULE_CLASSES.filter((item) => {
    const matchesDay = item.day === selectedDay;
    const matchesCat =
      selectedCategory === 'Todas' || item.category === selectedCategory;
    return matchesDay && matchesCat;
  });

  // Helper for category badge styling and icon
  const getCategoryDetails = (cat: ScheduleClass['category']) => {
    switch (cat) {
      case 'Fuerza':
        return {
          icon: Dumbbell,
          badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700',
        };
      case 'HIIT':
        return {
          icon: Flame,
          badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
        };
      case 'Funcional':
        return {
          icon: Activity,
          badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
        };
      case 'Boxeo':
        return {
          icon: Zap,
          badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
        };
      case 'Movilidad':
        return {
          icon: Sparkles,
          badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        };
    }
  };

  // Helper for intensity badge styling
  const getIntensityBadge = (intensity: ScheduleClass['intensity']) => {
    switch (intensity) {
      case 'Media':
        return {
          label: 'Media',
          className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
        };
      case 'Alta':
        return {
          label: 'Alta',
          className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        };
      case 'Extrema':
        return {
          label: 'Extrema',
          className: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        };
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-display pt-28 pb-24 relative overflow-hidden selection:bg-amber-400 selection:text-black">
      {/* Ambient background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-amber-400/10 blur-[150px] rounded-full pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-[700px] right-0 w-[500px] h-[500px] bg-amber-400/5 blur-[160px] rounded-full pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* ========================================================= */}
        {/* 1. CABECERA EDITORIAL DE HORARIOS */}
        {/* ========================================================= */}
        <header className="pb-8 mb-10 border-b border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500 block mb-3">
                CLASES &amp; BOXEO · HUAMANGA, AYACUCHO
              </span>
              <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tighter text-white leading-none">
                HORARIOS DE CLASES.
              </h1>
              <p className="mt-3 text-zinc-400 text-sm sm:text-base leading-relaxed max-w-xl font-sans">
                Clases dirigidas de Boxeo (actividad adicional), acondicionamiento funcional y asesoría continua en sala de musculación con ingreso libre.
              </p>
            </div>

            {/* Métricas clave compactas e integradas */}
            <div className="flex items-center gap-6 sm:gap-8 bg-zinc-900/60 border border-white/5 px-6 py-3.5 rounded-2xl shrink-0 self-start lg:self-end">
              <div>
                <span className="text-xl sm:text-2xl font-black text-white block font-mono">22</span>
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Sesiones / Sem</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <span className="text-xl sm:text-2xl font-black text-white block font-mono">14</span>
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Cupo Máximo</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <span className="text-xl sm:text-2xl font-black text-amber-400 block font-mono">100%</span>
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Supervisadas</span>
              </div>
            </div>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 2. BARRA SELECTORA DE DÍAS CON SLIDING INDICATOR */}
        {/* ========================================================= */}
        <nav aria-label="Selector de días de la semana" className="mb-8">
          <div className="flex items-center justify-start md:justify-center gap-2 sm:gap-3 overflow-x-auto pb-3 pt-1 px-1 scrollbar-none">
            {SCHEDULE_DAYS.map((day) => {
              const isSelected = selectedDay === day;
              const countForDay = SCHEDULE_CLASSES.filter((c) => c.day === day).length;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`relative px-4 sm:px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-colors shrink-0 flex items-center gap-2.5 cursor-pointer ${
                    isSelected ? 'text-black' : 'text-zinc-300 hover:text-white bg-zinc-900/90 border border-white/10'
                  }`}
                  aria-pressed={isSelected}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="active-day-pill"
                      transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
                      className="absolute inset-0 bg-amber-400 rounded-xl z-0 shadow-lg shadow-amber-400/20"
                    />
                  )}
                  <span className="relative z-10">{day}</span>
                  <span
                    className={`relative z-10 text-xs px-2 py-0.5 rounded-md font-mono ${
                      isSelected
                        ? 'bg-black/20 text-black font-extrabold'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {countForDay}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* ========================================================= */}
        {/* 3. FILTRO POR CATEGORÍA CON SLIDING INDICATOR */}
        {/* ========================================================= */}
        <section aria-label="Filtro por categoría" className="mb-10 text-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 p-1.5 rounded-2xl bg-zinc-900/70 border border-white/10 backdrop-blur-sm max-w-full">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              const countInDay = SCHEDULE_CLASSES.filter((c) => {
                if (c.day !== selectedDay) return false;
                return cat === 'Todas' ? true : c.category === cat;
              }).length;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`relative px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isSelected ? 'text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                  aria-pressed={isSelected}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="active-cat-pill"
                      transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
                      className="absolute inset-0 bg-amber-400 rounded-xl z-0"
                    />
                  )}
                  <span className="relative z-10">{cat}</span>
                  <span
                    className={`relative z-10 text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      isSelected
                        ? 'bg-black/25 text-black font-extrabold'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {countInDay}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. CUADRÍCULA DE CLASES FILTRADAS CON POPLAYOUT ANIMATION */}
        {/* ========================================================= */}
        <section aria-label={`Clases de ${selectedDay}`}>
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-white">
                {selectedCategory === 'Todas'
                  ? `Sesiones de ${selectedDay}`
                  : `Sesiones de ${selectedCategory} — ${selectedDay}`}
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-400">
              {filteredClasses.length}{' '}
              {filteredClasses.length === 1 ? 'clase disponible' : 'clases disponibles'}
            </span>
          </div>

          {filteredClasses.length > 0 ? (
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredClasses.map((cls) => {
                  const catDetails = getCategoryDetails(cls.category);
                  const intensityDetails = getIntensityBadge(cls.intensity);
                  const CatIcon = catDetails.icon;

                  return (
                    <motion.article
                      key={cls.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                      whileHover={{ y: -4 }}
                      className="group rounded-2xl bg-zinc-900/80 border border-white/10 p-6 flex flex-col justify-between backdrop-blur-sm hover:border-amber-400/40 hover:bg-zinc-900 transition-colors shadow-xl"
                    >
                      <div>
                        {/* Top Bar: Time and Badges */}
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <div className="inline-flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-lg">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{cls.time}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Category Badge */}
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${catDetails.badgeClass}`}
                            >
                              <CatIcon className="w-3 h-3 shrink-0" />
                              <span>{cls.category}</span>
                            </span>

                            {/* Intensity Badge */}
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${intensityDetails.className}`}
                              title={`Nivel de intensidad: ${cls.intensity}`}
                            >
                              {intensityDetails.label}
                            </span>
                          </div>
                        </div>

                        {/* Class Title */}
                        <h3 className="text-xl font-black uppercase text-white group-hover:text-amber-300 transition-colors tracking-tight mb-4 min-h-[3.5rem] flex items-center">
                          {cls.title}
                        </h3>

                        {/* Coach info */}
                        <div className="flex items-center gap-3 py-3 border-y border-white/5 mb-4">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-300 shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="overflow-hidden">
                            <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider block">
                              Head Coach
                            </span>
                            <span className="font-semibold text-sm text-zinc-200 truncate block">
                              {cls.coach}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {/* Spots remaining with Smart Fit / Barry's urgency */}
                        <div className="flex items-center justify-between text-xs font-mono pt-1 mb-4">
                          <span className="text-zinc-500">Cupos restantes:</span>
                          <span
                            className={`font-semibold flex items-center gap-1.5 ${
                              cls.spotsLeft <= 2
                                ? 'text-rose-400 font-bold'
                                : 'text-zinc-300'
                            }`}
                          >
                            {cls.spotsLeft <= 2 && (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                              </span>
                            )}
                            {cls.spotsLeft <= 2
                              ? `¡Solo ${cls.spotsLeft} cupos!`
                              : `${cls.spotsLeft} cupos`}
                          </span>
                        </div>

                        {/* Booking Action Button with responsive active scale */}
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleBook(cls.id)}
                          className="w-full py-3 px-4 rounded-xl font-extrabold uppercase tracking-wider text-xs bg-zinc-800 hover:bg-amber-400 text-white hover:text-black border border-white/10 hover:border-amber-400/50 flex items-center justify-center gap-2 group/btn cursor-pointer shadow-md hover:shadow-amber-400/20 transition-colors"
                        >
                          <span>RESERVAR CLASE DE PRUEBA</span>
                          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-200" />
                        </motion.button>
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          ) : (
            /* Empty State */
            <div className="py-16 px-6 rounded-2xl bg-zinc-900/40 border border-white/10 text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 mx-auto mb-4">
                <CalendarX className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wide mb-2">
                Sin clases de {selectedCategory} el {selectedDay}
              </h3>
              <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                No hay sesiones programadas para esta disciplina en el día seleccionado.
                Explora el calendario completo para encontrar los horarios disponibles.
              </p>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedCategory('Todas')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-400/10"
              >
                <span>VER TODAS LAS CLASES DEL {selectedDay.toUpperCase()}</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* 5. BANNER INFERIOR DE CONVERSIÓN */}
        {/* ========================================================= */}
        <section aria-label="Pase de cortesía" className="mt-20">
          <div className="relative rounded-3xl bg-zinc-900 border border-white/10 p-8 sm:p-12 overflow-hidden shadow-2xl">
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="max-w-2xl text-center lg:text-left">
                <span className="text-xs font-mono uppercase tracking-[0.25em] text-amber-400 block mb-2">
                  ACCESO INVITADO EXCLUSIVO
                </span>
                <h3 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
                  Prueba una Clase Dirigida sin Costo
                </h3>
                <p className="text-zinc-400 text-sm mt-2 font-sans">
                  Elige la disciplina que más te rete, entrena con nuestros coaches y experimenta la diferencia técnica de Trankilandia Gym.
                </p>
              </div>

              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleOpenCourtesyPass}
                className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-8 py-4 rounded-xl text-sm whitespace-nowrap shadow-xl shadow-amber-400/20 cursor-pointer shrink-0"
              >
                <Ticket className="w-5 h-5" />
                <span>SOLICITAR PASE VIP GRATIS</span>
              </motion.button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
