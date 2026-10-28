import React, { useState } from 'react';
import {
  Clock,
  User,
  Users,
  Calendar,
  Sparkles,
  Flame,
  Dumbbell,
  Activity,
  Zap,
  ArrowRight,
  ShieldCheck,
  Ticket,
  CalendarX,
  CheckCircle2,
} from 'lucide-react';
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
        {/* 1. CABECERA DE PÁGINA */}
        {/* ========================================================= */}
        <header className="text-center max-w-4xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/25 mb-5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400 text-xs font-mono font-semibold uppercase tracking-widest">
              CALENDARIO & DISCIPLINAS
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-[1.08] mb-5">
            HORARIOS DE CLASES.{' '}
            <span className="text-amber-400">ENTRENA A TU RITMO.</span>
          </h1>

          <p className="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Entrenamiento grupal de alta exigencia técnica guiado por coaches de élite.
            Cupos controlados por sesión para corrección postural personalizada, máxima
            intensidad y seguridad biomecánica.
          </p>

          {/* Píldoras de resumen */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/90 border border-white/10 text-xs sm:text-sm font-medium text-zinc-300 shadow-sm backdrop-blur-sm">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-semibold text-white">20+ Clases Semanales</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/90 border border-white/10 text-xs sm:text-sm font-medium text-zinc-300 shadow-sm backdrop-blur-sm">
              <Users className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-semibold text-white">Grupos Reducidos</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/90 border border-white/10 text-xs sm:text-sm font-medium text-zinc-300 shadow-sm backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-semibold text-white">Coaches de Élite</span>
            </div>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 2. BARRA SELECTORA DE DÍAS DE LA SEMANA */}
        {/* ========================================================= */}
        <nav
          aria-label="Selector de días de la semana"
          className="mb-8"
        >
          <div className="flex items-center justify-start md:justify-center gap-2 sm:gap-3 overflow-x-auto pb-3 pt-1 px-1 scrollbar-none">
            {SCHEDULE_DAYS.map((day) => {
              const isSelected = selectedDay === day;
              const countForDay = SCHEDULE_CLASSES.filter(
                (c) => c.day === day
              ).length;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`px-4 sm:px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 shrink-0 flex items-center gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#FACC15] text-black font-extrabold shadow-lg shadow-amber-400/25 ring-2 ring-amber-400/60 scale-[1.02]'
                      : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10'
                  }`}
                  aria-pressed={isSelected}
                >
                  <span>{day}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md font-mono ${
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
        {/* 3. FILTRO POR CATEGORÍA DE ENTRENAMIENTO */}
        {/* ========================================================= */}
        <section
          aria-label="Filtro por categoría"
          className="mb-10 text-center"
        >
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
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50 shadow-sm'
                      : 'bg-transparent text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                  aria-pressed={isSelected}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      isSelected
                        ? 'bg-amber-400/30 text-amber-200 font-extrabold'
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
        {/* 4. CUADRÍCULA DE CLASES FILTRADAS */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map((cls) => {
                const catDetails = getCategoryDetails(cls.category);
                const intensityDetails = getIntensityBadge(cls.intensity);
                const CatIcon = catDetails.icon;

                return (
                  <article
                    key={cls.id}
                    className="group rounded-2xl bg-zinc-900/80 border border-white/10 p-6 flex flex-col justify-between backdrop-blur-sm hover:border-amber-400/40 hover:bg-zinc-900 transition-all duration-300 shadow-xl hover:-translate-y-1"
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
                      {/* Spots remaining */}
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

                      {/* Booking Action Button */}
                      <button
                        type="button"
                        onClick={() => handleBook(cls.id)}
                        className="w-full py-3 px-4 rounded-xl font-extrabold uppercase tracking-wider text-xs transition-all duration-200 bg-zinc-800 hover:bg-amber-400 text-white hover:text-black border border-white/10 hover:border-amber-400/50 flex items-center justify-center gap-2 group/btn cursor-pointer shadow-md hover:shadow-amber-400/20 active:scale-[0.98]"
                      >
                        <span>RESERVAR CLASE DE PRUEBA</span>
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-200" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
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
              <button
                type="button"
                onClick={() => setSelectedCategory('Todas')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-400/10 active:scale-[0.98]"
              >
                <span>VER TODAS LAS CLASES DEL {selectedDay.toUpperCase()}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* 5. BANNER INFERIOR DE CONVERSIÓN */}
        {/* ========================================================= */}
        <section
          aria-label="Pase de cortesía"
          className="mt-20"
        >
          <div className="relative rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-amber-400/30 p-8 sm:p-12 overflow-hidden backdrop-blur-md shadow-2xl">
            {/* Ambient light for card */}
            <div
              className="absolute -top-24 -right-24 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-24 -left-24 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="max-w-2xl text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/25 mb-4">
                  <Ticket className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400 text-xs font-mono font-semibold uppercase tracking-wider">
                    PASE DE INVITADO EXCLUSIVO
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase text-white tracking-tight leading-tight">
                  ¿PRIMERA VEZ EN TRANKILANDIA GYM?{' '}
                  <span className="text-amber-400">
                    ASISTE A UNA CLASE COMO INVITADO CON TU PASE DE UN DÍA.
                  </span>
                </h2>

                <p className="text-zinc-400 text-sm sm:text-base mt-3 leading-relaxed">
                  Conoce las instalaciones de nivel olímpico, siente la energía de la
                  comunidad y entrena codo a codo con nuestros coaches de élite antes de
                  elegir tu membresía. Sin compromisos ni cargos ocultos.
                </p>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 mt-6 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Acceso completo a la clase y vestidores</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Valoración técnica previa con coach</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>100% Libre de permanencia</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 w-full sm:w-auto text-center">
                <button
                  type="button"
                  onClick={handleOpenCourtesyPass}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-8 py-4 rounded-xl text-sm sm:text-base tracking-wide transition-all duration-200 shadow-xl shadow-amber-400/20 hover:shadow-amber-400/30 active:scale-[0.98] cursor-pointer"
                >
                  <span>AGENDAR TOUR & CLASE DE CORTESÍA →</span>
                </button>
                <span className="block text-zinc-500 font-mono text-[11px] mt-2.5">
                  Confirmación instantánea vía WhatsApp / Email
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
