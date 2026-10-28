import type React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Calendar, Check, Sparkles } from 'lucide-react';
import Hero from '../components/Hero';
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

export default function HomePage({ onOpenTourModal }: HomePageProps = {}): React.JSX.Element {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Hero */}
      <Hero onOpenTourModal={onOpenTourModal} />

      {/* 2. Programs Section with Callout to Schedules */}
      <section className="relative">
        <ProgramsSection />
        <div className="bg-zinc-950 pb-20 -mt-8 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-zinc-900/70 border border-white/10 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-sm hover:border-amber-400/30 transition-colors">
              <div className="flex items-center gap-4 text-center md:text-left">
                <div className="hidden sm:flex w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/25 items-center justify-center text-amber-400 shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 text-amber-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>MÁS DE 20 CLASES SEMANALES DIRIGIDAS</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
                    Consulta los Horarios Completos de Entrenamiento
                  </h3>
                  <p className="text-zinc-400 text-sm mt-1 max-w-xl">
                    HIIT metabólico, Fuerza y Musculación, Boxeo de combate y Movilidad guiados por coaches certificados.
                  </p>
                </div>
              </div>
              <Link
                to="/clases"
                className="inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-6 py-3.5 rounded-xl text-sm tracking-wide active:scale-[0.98] transition-all whitespace-nowrap shadow-lg shadow-amber-400/10 hover:shadow-amber-400/20 group shrink-0"
              >
                <span>VER TODOS LOS HORARIOS</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. About Section with Callout to Facilities */}
      <section className="relative">
        <AboutSection />
        <div className="bg-zinc-900/40 pb-20 -mt-8 relative z-10 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-zinc-950/80 border border-white/10 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-sm hover:border-amber-400/30 transition-colors">
              <div className="flex items-center gap-4 text-center md:text-left">
                <div className="hidden sm:flex w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/25 items-center justify-center text-amber-400 shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 text-amber-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>INFRAESTRUCTURA DE CLASE MUNDIAL</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
                    1,500 m² de Tecnología Biomecánica y Confort
                  </h3>
                  <p className="text-zinc-400 text-sm mt-1 max-w-xl">
                    Racks olímpicos Eleiko, pista cardiovascular Matrix, arena de boxeo reglamentaria y Recovery Lounge con sauna finlandés.
                  </p>
                </div>
              </div>
              <Link
                to="/instalaciones"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/15 hover:border-white/30 backdrop-blur-md font-semibold px-6 py-3.5 rounded-xl text-sm tracking-wide active:scale-[0.98] transition-all whitespace-nowrap group shrink-0"
              >
                <span>CONOCER TODAS LAS INSTALACIONES</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Membership Teaser Section */}
      <section className="bg-zinc-950 py-20 border-t border-white/5 relative overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-amber-400/5 blur-[140px] rounded-full pointer-events-none"
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-400 text-xs font-mono font-semibold uppercase tracking-widest">
                MEMBRESÍAS TRANKILANDIA
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase">
              ENCUENTRA EL PLAN IDEAL <span className="text-amber-400">PARA TUS METAS</span>
            </h2>
            <p className="mt-4 text-zinc-400 text-base sm:text-lg leading-relaxed">
              Elige el nivel de acompañamiento e infraestructura que mejor se adapte a tu disciplina. Sin contratos forzosos.
            </p>
          </div>

          {/* 3 Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-4">
            {TEASER_PLANS.map((plan) => {
              const isHighlighted = plan.isPopular;

              return (
                <div
                  key={plan.id}
                  className={`flex flex-col justify-between rounded-2xl transition-all duration-300 ${
                    isHighlighted
                      ? 'relative bg-zinc-900 border-2 border-amber-400 p-8 shadow-2xl shadow-amber-400/10 lg:-translate-y-2'
                      : 'bg-zinc-900/60 border border-white/10 p-8 hover:border-white/20'
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-extrabold uppercase tracking-wider mb-6 self-start ${
                        isHighlighted
                          ? 'bg-amber-400 text-black shadow-md'
                          : 'bg-white/10 text-amber-300 border border-white/10'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{plan.badge}</span>
                    </div>
                  )}

                  {!plan.badge && (
                    <div className="h-7 mb-6" aria-hidden="true" />
                  )}

                  {/* Plan Info */}
                  <div>
                    <h3 className="text-2xl font-black uppercase text-white tracking-tight">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1 min-h-[40px]">
                      {plan.tagline}
                    </p>

                    {/* Price */}
                    <div className="mt-6 mb-6 pb-6 border-b border-white/10 flex items-baseline gap-1.5">
                      <span className="font-mono text-4xl sm:text-5xl font-black text-white tracking-tight">
                        {plan.price}
                      </span>
                      <span className="text-zinc-400 text-sm font-medium">
                        {plan.period}
                      </span>
                    </div>

                    {/* 3 Key Points */}
                    <ul className="space-y-3.5 mb-8">
                      {plan.points.map((point, index) => (
                        <li key={index} className="flex items-start gap-3 text-sm text-zinc-300">
                          <div className="w-5 h-5 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0 mt-0.5 text-amber-400">
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </div>
                          <span className="leading-snug">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Link to plan details */}
                  <Link
                    to="/planes"
                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-center transition-all duration-200 block ${
                      isHighlighted
                        ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-400/20'
                        : 'bg-white/10 hover:bg-white/15 text-white border border-white/10 hover:border-white/20'
                    }`}
                  >
                    MÁS DETALLES DE {plan.name}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Central CTA Button to /planes */}
          <div className="mt-14 text-center">
            <Link
              to="/planes"
              className="bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-8 py-4 rounded-xl text-sm sm:text-base tracking-wide inline-flex items-center gap-2 active:scale-[0.98] transition-all shadow-xl shadow-amber-400/20 hover:shadow-amber-400/30 group"
            >
              <span>VER TODOS LOS PLANES &amp; COMPARATIVA COMPLETA →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Quick Info Bar */}
      <QuickInfoBar />
    </div>
  );
}
