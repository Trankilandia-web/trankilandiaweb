import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import Hero from '../components/Hero';
import LiveCapacityBar from '../components/LiveCapacityBar';
import ProgramsSection from '../components/ProgramsSection';
import AboutSection from '../components/AboutSection';
import QuickInfoBar from '../components/QuickInfoBar';

export interface HomePageProps {
  onOpenTourModal?: () => void;
}

interface TeaserTier {
  id: string;
  name: string;
  tagline: string;
  price: string;
  period: string;
  isPopular?: boolean;
  badge?: string;
  points: string[];
}

const TEASER_PLANS: TeaserTier[] = [
  {
    id: 'silver',
    name: 'Plata Esencial',
    tagline: 'Fundamentos y disciplina sin límites',
    price: '$890',
    period: '/ mes',
    points: [
      'Acceso total a peso libre y máquinas Eleiko / Hammer',
      'Lockers diarios y vestidores con regaderas premium',
      'Valoración biomecánica inicial con coach de piso',
    ],
  },
  {
    id: 'gold',
    name: 'Oro Performance',
    tagline: 'El estándar elegido por atletas dedicados',
    price: '$1,450',
    period: '/ mes',
    isPopular: true,
    badge: 'MÁS POPULAR',
    points: [
      'Todo lo incluido en Plata Esencial',
      'Clases grupales ilimitadas (HIIT, Boxeo, Funcional)',
      'Sauna finlandés de cedro + 1 InBody mensual',
    ],
  },
  {
    id: 'black',
    name: 'Black VIP',
    tagline: 'La cúspide del entrenamiento y recuperación',
    price: '$2,200',
    period: '/ mes',
    badge: 'EXPERIENCIA DEFINITIVA',
    points: [
      'Todo lo incluido en Oro Performance',
      'Sesión mensual 1-a-1 Head Coach y plan nutricional',
      'Recovery Lounge prioritario (NormaTec + crioterapia)',
    ],
  },
];

const COACHES = [
  {
    name: 'Mateo Vance',
    role: 'Head Strength & Conditioning',
    cert: 'CSCS · Ex-Atleta Panamericano',
    image: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&w=600&q=80',
    specialty: 'Fuerza Máxima y Biomecánica Articular',
  },
  {
    name: 'Valeria Sotomayor',
    role: 'Lead Functional & Hyrox Coach',
    cert: 'Hyrox Master Trainer · FMS II',
    image: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=600&q=80',
    specialty: 'Resistencia Metabólica y Potencia',
  },
  {
    name: 'Dr. Alejandro Rivas',
    role: 'Director Médico y Recuperación',
    cert: 'Medicina Deportiva · Posgrado Fisiología',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    specialty: 'Crioterapia, InBody y Readaptación',
  },
];

export default function HomePage({ onOpenTourModal }: HomePageProps = {}): React.JSX.Element {
  // Smart Fit / Equinox style Plan Recommendation Quiz
  const [selectedGoal, setSelectedGoal] = useState<'fuerza' | 'perdida' | 'elite'>('fuerza');
  const [selectedFreq, setSelectedFreq] = useState<'3dias' | '5dias'>('5dias');

  // Match recommendation
  const recommendedPlanId =
    selectedGoal === 'elite' || selectedFreq === '5dias'
      ? selectedGoal === 'elite'
        ? 'black'
        : 'gold'
      : 'silver';

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Hero */}
      <Hero onOpenTourModal={onOpenTourModal} />

      {/* 2. Smart Fit Live Capacity & Status Bar */}
      <LiveCapacityBar onOpenTourModal={onOpenTourModal} />

      {/* 3. Programs Section with Callout to Schedules */}
      <section className="relative">
        <ProgramsSection />
        <div className="bg-zinc-950 pb-20 -mt-8 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl bg-zinc-900/70 border border-white/10 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-sm hover:border-amber-400/30 transition-colors"
            >
              <div className="flex items-center gap-4 text-center md:text-left">
                <div className="hidden sm:flex w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/25 items-center justify-center text-amber-400 shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 text-amber-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>MÁS DE 22 SESIONES SEMANALES DIRIGIDAS</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
                    Consulta los Horarios Completos de Entrenamiento
                  </h3>
                  <p className="text-zinc-400 text-sm mt-1 max-w-xl">
                    HIIT metabólico, Fuerza y Musculación, Boxeo de combate y Movilidad guiados por coaches certificados.
                  </p>
                </div>
              </div>
              <Link to="/clases">
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-6 py-3.5 rounded-xl text-sm tracking-wide shadow-lg shadow-amber-400/10 hover:shadow-amber-400/20 group shrink-0 cursor-pointer"
                >
                  <span>VER TODOS LOS HORARIOS</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 4. Smart Fit / Equinox Interactive Plan Matcher */}
      <section className="bg-zinc-950 py-16 border-t border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/10 rounded-3xl p-6 sm:p-10">
            <div className="max-w-2xl">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-amber-400 block mb-2">
                RECOMENDADOR DE PLAN INTELIGENTE
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
                ¿Qué Membresía se Ajusta a tus Metas?
              </h2>
              <p className="text-zinc-400 text-sm mt-1">
                Selecciona tu objetivo y frecuencia para recibir una sugerencia personalizada sin compromiso.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {/* Step 1: Objetivo */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-3">
                  1. Tu Objetivo Primario:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'fuerza', label: 'Fuerza', desc: 'Hipertrofia' },
                    { id: 'perdida', label: 'Acondic.', desc: 'HIIT & Clases' },
                    { id: 'elite', label: 'Atleta Élite', desc: 'Coach & Spa' },
                  ].map((item) => (
                    <motion.button
                      key={item.id}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedGoal(item.id as typeof selectedGoal)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedGoal === item.id
                          ? 'bg-amber-400 text-black border-amber-400 font-bold'
                          : 'bg-zinc-900/60 text-zinc-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="text-xs sm:text-sm font-bold">{item.label}</div>
                      <div
                        className={`text-[10px] sm:text-xs mt-0.5 ${
                          selectedGoal === item.id ? 'text-zinc-900' : 'text-zinc-500'
                        }`}
                      >
                        {item.desc}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Step 2: Frecuencia */}
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-3">
                  2. Frecuencia Semanal:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: '3dias', label: '2 a 3 días / sem', desc: 'Mantenimiento y disciplina' },
                    { id: '5dias', label: '4 a 6 días / sem', desc: 'Máximo rendimiento' },
                  ].map((item) => (
                    <motion.button
                      key={item.id}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedFreq(item.id as typeof selectedFreq)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedFreq === item.id
                          ? 'bg-amber-400 text-black border-amber-400 font-bold'
                          : 'bg-zinc-900/60 text-zinc-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="text-xs sm:text-sm font-bold">{item.label}</div>
                      <div
                        className={`text-[10px] sm:text-xs mt-0.5 ${
                          selectedFreq === item.id ? 'text-zinc-900' : 'text-zinc-500'
                        }`}
                      >
                        {item.desc}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendation Result Banner */}
            <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Plan Recomendado para tu perfil:</div>
                  <div className="text-base font-black text-white">
                    {recommendedPlanId === 'black'
                      ? 'Black VIP ($2,200/mes) · Recuperación completa y asesoría 1-a-1'
                      : recommendedPlanId === 'gold'
                      ? 'Oro Performance ($1,450/mes) · Clases ilimitadas + Sauna + InBody'
                      : 'Plata Esencial ($890/mes) · Peso libre y biomecánica pura'}
                  </div>
                </div>
              </div>

              <Link to="/planes">
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/20 text-white border border-white/20 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>Comparar todos los planes</span>
                  <ChevronRight className="w-4 h-4 text-amber-400" />
                </motion.div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Membership Teaser Cards */}
      <section className="bg-zinc-950 py-24 border-t border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500 block mb-3">
                MEMBRESÍAS & CUOTAS 2026
              </span>
              <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white">
                ELIGE TU NIVEL DE RENDIMIENTO.
              </h2>
              <p className="mt-3 text-zinc-400 text-base max-w-xl font-sans">
                Sin plazos forzosos en modalidad mensual. Acceso ilimitado a maquinaria oficial y comodidades de élite.
              </p>
            </div>
            <Link
              to="/planes"
              className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-bold text-sm tracking-wide group"
            >
              <span>VER TABLA COMPARATIVA COMPLETA</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {TEASER_PLANS.map((plan) => {
              const isRecommended = plan.id === recommendedPlanId;

              return (
                <motion.div
                  key={plan.id}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                  className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 relative ${
                    isRecommended
                      ? 'bg-zinc-900 border-2 border-amber-400 shadow-2xl shadow-amber-400/10'
                      : plan.isPopular
                      ? 'bg-zinc-900/90 border border-amber-400/30'
                      : 'bg-zinc-900/50 border border-white/10 hover:border-white/20'
                  }`}
                >
                  {isRecommended ? (
                    <div className="absolute -top-3.5 right-6 bg-amber-400 text-black text-[11px] font-mono font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md">
                      RECOMENDADO PARA TI
                    </div>
                  ) : plan.badge ? (
                    <div className="absolute -top-3.5 right-6 bg-zinc-800 text-zinc-300 border border-white/10 text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      {plan.badge}
                    </div>
                  ) : null}

                  <div>
                    <h3 className="text-2xl font-black uppercase text-white tracking-tight">
                      {plan.name}
                    </h3>
                    <p className="text-zinc-400 text-xs sm:text-sm mt-1 mb-6">
                      {plan.tagline}
                    </p>

                    <div className="flex items-baseline gap-2 pb-6 border-b border-white/10">
                      <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                        {plan.price}
                      </span>
                      <span className="text-zinc-400 text-sm font-mono font-medium">
                        {plan.period}
                      </span>
                    </div>

                    <ul className="mt-6 space-y-3.5">
                      {plan.points.map((pt, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                          <div className="w-5 h-5 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shrink-0 mt-0.5 text-amber-400">
                            <Check className="w-3.5 h-3.5" strokeWidth={3} />
                          </div>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/10">
                    <Link to="/planes">
                      <motion.div
                        whileTap={{ scale: 0.97 }}
                        className={`w-full py-3.5 px-4 rounded-xl text-sm font-extrabold text-center transition-all cursor-pointer ${
                          isRecommended || plan.isPopular
                            ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-400/10'
                            : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                        }`}
                      >
                        SELECCIONAR PLAN
                      </motion.div>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Coaches & Credibility Section */}
      <section className="bg-zinc-950 py-24 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-16">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500 block mb-3">
              CUERPO TÉCNICO & BIOMECÁNICA
            </span>
            <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white">
              ENTRENA BAJO LA GUÍA DE ESPECIALISTAS.
            </h2>
            <p className="mt-3 text-zinc-400 text-base font-sans">
              Cada sesión está supervisada por preparadores físicos con certificación internacional y experiencia en alto rendimiento deportivo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {COACHES.map((coach, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="rounded-3xl bg-zinc-900/60 border border-white/10 overflow-hidden group hover:border-amber-400/30 transition-colors"
              >
                <div className="h-64 overflow-hidden relative">
                  <img
                    src={coach.image}
                    alt={coach.name}
                    className="w-full h-full object-cover object-top filter grayscale contrast-125 group-hover:scale-105 group-hover:grayscale-0 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="text-[10px] font-mono uppercase tracking-wider bg-black/70 backdrop-blur-md px-2.5 py-1 rounded text-amber-400 border border-amber-400/30 inline-block mb-1">
                      {coach.cert}
                    </span>
                    <h3 className="text-xl font-black uppercase text-white tracking-tight">
                      {coach.name}
                    </h3>
                  </div>
                </div>

                <div className="p-6">
                  <div className="text-xs font-semibold text-zinc-300 mb-2">
                    {coach.role}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    Especialidad: <span className="text-zinc-200 font-medium">{coach.specialty}</span>
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Facilities Callout */}
      <section className="bg-zinc-900/60 py-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-400 block mb-2">
                1,500 M² DE INGENIERÍA DEPORTIVA
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase text-white tracking-tight">
                Espacios Diseñados para Exigirte al Máximo
              </h2>
              <p className="text-zinc-400 text-sm sm:text-base mt-3 max-w-2xl leading-relaxed">
                Plataformas olímpicas de roble Eleiko, maquinaria de palancas divergentes Hammer Strength, sauna finlandés de cedro y zona de recuperación criogénica.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-end">
              <Link to="/instalaciones">
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  className="w-full inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-6 py-4 rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-amber-400/10"
                >
                  <Building2 className="w-5 h-5" />
                  <span>CONOCE NUESTRAS ZONAS</span>
                </motion.div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. About Section */}
      <AboutSection />

      {/* 9. Quick Info Bar */}
      <QuickInfoBar />
    </div>
  );
}
