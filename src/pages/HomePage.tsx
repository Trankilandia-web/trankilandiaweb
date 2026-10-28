import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Zap,
  Ticket,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import Hero from '../components/Hero';
import FeatureBar from '../components/FeatureBar';
import ProgramsSection from '../components/ProgramsSection';
import AboutSection from '../components/AboutSection';
import QuickInfoBar from '../components/QuickInfoBar';
import { MEMBERSHIP_PLANS, BOXING_ADDON } from '../data/gymData';
import type { BillingPeriod } from '../types';

export interface HomePageProps {
  onOpenTourModal?: () => void;
}

export default function HomePage({ onOpenTourModal }: HomePageProps = {}): React.JSX.Element {
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>('mes');

  const getPrice = (plan: typeof MEMBERSHIP_PLANS[0]) => {
    switch (selectedPeriod) {
      case 'mes':
        return { total: plan.monthlyPrice, perMonth: plan.monthlyPrice, label: 'al mes' };
      case 'trimestral':
        return { total: plan.quarterlyPrice, perMonth: Math.round(plan.quarterlyPrice / 3), label: 'total x 3 meses' };
      case 'semestral':
        return { total: plan.semiannualPrice, perMonth: Math.round(plan.semiannualPrice / 6), label: 'total x 6 meses' };
      case 'anual':
        return { total: plan.annualPrice, perMonth: Math.round(plan.annualPrice / 12), label: 'total x 12 meses' };
    }
  };

  return (
    <div className="flex flex-col min-h-screen selection:bg-amber-400 selection:text-black">
      {/* 1. Hero */}
      <Hero onOpenTourModal={onOpenTourModal} />

      {/* 2. Feature Bar: Just below Hero */}
      <section className="bg-zinc-950 py-10 border-b border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FeatureBar />
        </div>
      </section>

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
                    <span>PROGRAMACIÓN SEMANAL &amp; BOXEO</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
                    Consulta la Programación Semanal Completa
                  </h3>
                  <p className="text-zinc-400 text-sm mt-1 max-w-xl font-sans">
                    Turnos matutinos y vespertinos de Boxeo, Musculación asistida y Acondicionamiento funcional.
                  </p>
                </div>
              </div>
              <Link to="/clases">
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-6 py-3.5 rounded-xl text-sm tracking-wide shadow-lg shadow-amber-400/10 hover:shadow-amber-400/20 group shrink-0 cursor-pointer"
                >
                  <span>VER HORARIOS DISPONIBLES</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. Plans Section with 4 Periods (Mes, Trimestral, Semestral, Anual) in SOLES */}
      <section className="bg-zinc-950 py-24 border-t border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500 block mb-3">
                MEMBRESÍAS &amp; PLANES
              </span>
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
                ELIGE TU COMPROMISO.
              </h2>
              <p className="mt-3 text-zinc-400 text-base max-w-xl font-sans">
                Sin plazos forzosos. Todos nuestros planes incluyen <strong>ingreso libre e ilimitado</strong> a sala de musculación y pesas. Elige la duración que prefieras.
              </p>
            </div>

            {/* 4 Periods Selector */}
            <div className="flex flex-col items-start lg:items-end">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2">
                DURACIÓN DEL PLAN:
              </span>
              <div className="p-1.5 bg-zinc-900 border border-white/10 rounded-2xl flex items-center flex-wrap gap-1 shadow-xl relative">
                {(
                  [
                    { id: 'mes', label: '1 Mes' },
                    { id: 'trimestral', label: '3 Meses' },
                    { id: 'semestral', label: '6 Meses' },
                    { id: 'anual', label: '1 Año' },
                  ] as const
                ).map((p) => {
                  const isSelected = selectedPeriod === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPeriod(p.id)}
                      className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer z-10 ${
                        isSelected ? 'text-black' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="home-period-active-tab"
                          transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
                          className="absolute inset-0 bg-amber-400 rounded-xl z-[-1]"
                        />
                      )}
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {MEMBERSHIP_PLANS.map((plan) => {
              const pricing = getPrice(plan);

              return (
                <motion.div
                  key={plan.id}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                  className={`rounded-3xl p-8 flex flex-col justify-between transition-colors relative ${
                    plan.isPopular
                      ? 'bg-zinc-900 border-2 border-amber-400 shadow-2xl shadow-amber-400/10'
                      : 'bg-zinc-900/60 border border-white/10 hover:border-white/20'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 right-6">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-black text-[11px] font-mono font-black uppercase tracking-wider shadow-md">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div>
                    <h3 className="text-2xl font-black uppercase text-white tracking-tight">
                      {plan.name}
                    </h3>
                    <p className="text-zinc-400 text-xs sm:text-sm mt-1 mb-6 font-sans">
                      {plan.tagline}
                    </p>

                    {/* Price in Soles */}
                    <div className="pb-6 border-b border-white/10">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400">S/.</span>
                        <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                          {pricing.total}
                        </span>
                        <span className="text-zinc-400 text-xs font-mono">
                          {pricing.label}
                        </span>
                      </div>
                      {selectedPeriod !== 'mes' && (
                        <p className="mt-1 text-xs font-mono text-zinc-400">
                          Equivale a aprox. <strong className="text-amber-400">S/. {pricing.perMonth} / mes</strong>
                        </p>
                      )}
                      <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[11px] font-mono font-bold">
                        <Check className="w-3.5 h-3.5" />
                        <span>Incluye Ingreso Libre Ilimitado</span>
                      </div>
                    </div>

                    {/* Highlights */}
                    <ul className="mt-6 space-y-3">
                      {plan.highlights.map((pt, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-zinc-300 font-sans">
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
                          plan.isPopular
                            ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-400/10'
                            : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                        }`}
                      >
                        {plan.ctaText}
                      </motion.div>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* High-Converting Courtesy Pass Interceptor */}
          <div className="mt-12 rounded-3xl bg-gradient-to-r from-amber-400/15 via-zinc-900 to-zinc-900 border border-amber-400/35 p-6 sm:p-8 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xl">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-400 text-black flex items-center justify-center shrink-0 shadow-lg shadow-amber-400/20">
                <Ticket className="w-7 h-7" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>¿PRIMERA VEZ EN EL CLUB?</span>
                </div>
                <h4 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
                  Entrena 1 Día Gratis con tu Pase de Cortesía
                </h4>
                <p className="text-zinc-300 text-xs sm:text-sm mt-1 max-w-xl font-sans">
                  Prueba nuestras máquinas, entrena en la sala de peso libre y siente la energía de la familia Trankilandia sin costo ni compromiso.
                </p>
              </div>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenTourModal}
              className="w-full lg:w-auto inline-flex items-center justify-center gap-2.5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-7 py-3.5 rounded-xl text-sm whitespace-nowrap shadow-xl shadow-amber-400/20 cursor-pointer shrink-0"
            >
              <Ticket className="w-4 h-4" />
              <span>SOLICITAR PASE DE CORTESÍA</span>
            </motion.button>
          </div>

          {/* Boxing Additional Activity Callout */}
          <div className="mt-12 rounded-3xl bg-zinc-900/80 border border-amber-400/30 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold mb-0.5">
                  ACTIVIDAD ADICIONAL DISPONIBLE
                </div>
                <h4 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight">
                  {BOXING_ADDON.title} (+S/. {BOXING_ADDON.pricePerMonth} / mes)
                </h4>
                <p className="text-zinc-400 text-xs sm:text-sm mt-0.5 max-w-xl font-sans">
                  Suma técnica de golpeo, sacos y manoplas a cualquier plan de musculación o inscríbete directamente en el paquete Gym + Boxeo.
                </p>
              </div>
            </div>

            <Link to="/clases">
              <motion.div
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 px-5 py-3 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>VER HORARIOS DE BOXEO</span>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </motion.div>
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Facilities Callout */}
      <section className="bg-zinc-900/60 py-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-400 block mb-2">
                NUESTRAS INSTALACIONES
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase text-white tracking-tight">
                Espacios Diseñados para Exigirte y Cuidarte
              </h2>
              <p className="text-zinc-400 text-sm sm:text-base mt-3 max-w-2xl leading-relaxed font-sans">
                Sala de musculación completa, mancuernas en amplio rango de pesos, máquinas de palanca y poleas guiadas, área de boxeo con sacos pesados y vestidores con duchas de agua caliente.
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

      {/* 7. About Section ("Más que un gimnasio, somos familia") */}
      <AboutSection />

      {/* 8. Quick Info Bar */}
      <QuickInfoBar />
    </div>
  );
}
