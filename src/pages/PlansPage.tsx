import React, { useState } from 'react';
import {
  Check,
  Minus,
  ChevronDown,
  Sparkles,
  Ticket,
  ArrowRight,
} from 'lucide-react';
import {
  MEMBERSHIP_PLANS,
  PLAN_COMPARISON_CATEGORIES,
  MEMBERSHIP_FAQS,
} from '../data/gymData';
import type { PlanTier, ComparisonCategory, ComparisonFeature } from '../types';

export interface PlansPageProps {
  onSelectPlan?: (planId: string) => void;
  onOpenTourModal?: () => void;
}

export default function PlansPage({
  onSelectPlan,
  onOpenTourModal,
}: PlansPageProps = {}): React.JSX.Element {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleSelectPlan = (planId: string) => {
    if (onSelectPlan) {
      onSelectPlan(planId);
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

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-display pt-28 pb-24 relative overflow-hidden selection:bg-amber-400 selection:text-black">
      {/* Luces ambientales cinemáticas */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-amber-400/10 blur-[150px] rounded-full pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-[800px] right-0 w-[500px] h-[500px] bg-amber-400/5 blur-[160px] rounded-full pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* ========================================================= */}
        {/* 1. CABECERA EDITORIAL DE PLANES CON TOGGLE INTEGRADO */}
        {/* ========================================================= */}
        <div className="pb-12 mb-16 border-b border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-7">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500 block mb-3">
                MEMBRESÍAS & CUOTAS 2026
              </span>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-white leading-[0.95]">
                INVERSIÓN EN RENDIMIENTO.
              </h1>
              <p className="mt-4 text-zinc-400 text-base sm:text-lg leading-relaxed max-w-xl font-sans">
                Sin plazos forzosos en modalidad mensual. Acceso ilimitado a maquinaria oficial Hammer Strength y plataformas olímpicas Eleiko. Cancela o congela cuando lo necesites.
              </p>
            </div>

            {/* Toggle de Facturación integrado */}
            <div className="lg:col-span-5 flex flex-col items-start lg:items-end justify-end">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2">
                MODALIDAD DE PAGO
              </span>
              <div className="p-1.5 bg-zinc-900 border border-white/10 rounded-2xl flex items-center shadow-xl">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    billingCycle === 'monthly'
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Mensual
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    billingCycle === 'annual'
                      ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>Anual</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold ${
                      billingCycle === 'annual'
                        ? 'bg-black text-amber-400'
                        : 'bg-amber-400/20 text-amber-400'
                    }`}
                  >
                    -20% OFF
                  </span>
                </button>
              </div>
              <span className="text-[11px] font-mono text-zinc-500 mt-2">
                *Modalidad anual incluye matrícula $0 y evaluación InBody
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. TARJETAS DE PLANES (SILVER, GOLD, BLACK) */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-28">
          {MEMBERSHIP_PLANS.map((plan: PlanTier) => {
            const isGold = plan.id === 'gold';
            const isBlack = plan.id === 'black';
            const price =
              billingCycle === 'annual'
                ? plan.annualPricePerMonth
                : plan.monthlyPrice;
            const savingsYearly = (plan.monthlyPrice - plan.annualPricePerMonth) * 12;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl p-8 transition-all duration-300 ${
                  isGold
                    ? 'bg-zinc-900/95 border-2 border-amber-400 shadow-2xl shadow-amber-400/10 lg:-translate-y-3 z-20'
                    : 'bg-zinc-900/70 border border-white/10 hover:border-white/20 hover:bg-zinc-900/90 z-10'
                }`}
              >
                {/* Badge Superior */}
                {isGold && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-amber-400 text-black text-xs font-mono font-black uppercase tracking-wider shadow-lg shadow-amber-400/30">
                      <Sparkles className="w-3.5 h-3.5" />
                      MÁS POPULAR
                    </span>
                  </div>
                )}

                {isBlack && plan.badge && (
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-amber-400 text-[11px] font-mono font-bold tracking-wider uppercase">
                      <Sparkles className="w-3 h-3" />
                      {plan.badge}
                    </span>
                  </div>
                )}

                {!isGold && !isBlack && (
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[11px] font-mono font-bold tracking-wider uppercase">
                      BASE ATLETA
                    </span>
                  </div>
                )}

                {/* Título & Tagline */}
                <h3 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
                  {plan.name}
                </h3>
                <p className="text-zinc-400 text-sm mt-1 min-h-[38px] font-sans">
                  {plan.tagline}
                </p>

                {/* Bloque de Precios Reactivo */}
                <div className="my-6 pt-2 pb-6 border-y border-white/10">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                      ${price.toLocaleString('es-MX')}
                    </span>
                    <span className="text-zinc-400 text-sm font-semibold">/ mes</span>
                  </div>

                  {billingCycle === 'annual' ? (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="line-through text-zinc-500 font-mono">
                          ${plan.monthlyPrice.toLocaleString('es-MX')}/mes regular
                        </span>
                        <span className="text-amber-400 font-mono font-bold">
                          Ahorras ${savingsYearly.toLocaleString('es-MX')}/año
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 font-mono">
                        Cobro anual de ${(plan.annualPricePerMonth * 12).toLocaleString('es-MX')} MXN • Matrícula $0
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] text-zinc-400 font-mono">
                      Sin plazo forzoso • Facturación mensual automática
                    </p>
                  )}
                </div>

                {/* Descripción General */}
                <p className="text-zinc-300 text-sm leading-relaxed mb-6 font-sans">
                  {plan.description}
                </p>

                {/* Lista de Beneficios con Check Ámbar */}
                <div className="flex-1 mb-8">
                  <p className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-4">
                    BENEFICIOS DESTACADOS:
                  </p>
                  <ul className="space-y-3.5">
                    {plan.highlights.map((highlight: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-zinc-300 font-sans">
                        <div className="w-5 h-5 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <span className="leading-snug">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Botón CTA del Plan */}
                <button
                  type="button"
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full py-4 px-6 rounded-xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer group ${
                    isGold
                      ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-400/20'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 hover:border-amber-400/30'
                  }`}
                >
                  <span>{plan.ctaText}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* 4. MATRIZ COMPARATIVA COMPLETA */}
        {/* ========================================================= */}
        <section id="comparativa" className="mb-28">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-amber-400 text-xs font-mono font-semibold uppercase tracking-widest">
                TABLA COMPARATIVA DETALLADA
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
              TODAS LAS CARACTERÍSTICAS <span className="text-amber-400">FRENTE A FRENTE</span>
            </h2>
            <p className="mt-3 text-zinc-400 text-sm sm:text-base font-sans">
              Compara en profundidad el alcance de cada membresía y elige con total certeza técnica.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[720px]">
                {/* Cabecera de la Tabla */}
                <thead>
                  <tr className="border-b border-white/10 bg-zinc-950/90">
                    <th className="w-5/12 px-6 py-5 text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      CARACTERÍSTICAS & PRIVILEGIOS
                    </th>
                    <th className="w-7/36 px-4 py-5 text-center">
                      <div className="text-sm font-extrabold text-white uppercase">Plata Esencial</div>
                      <div className="text-xs font-mono text-zinc-400 mt-0.5">
                        ${billingCycle === 'annual' ? '710' : '890'}/mes
                      </div>
                    </th>
                    <th className="w-8/36 px-4 py-5 text-center bg-amber-400/10 border-x border-amber-400/25 relative">
                      <span className="inline-block px-2 py-0.5 rounded bg-amber-400 text-black text-[10px] font-mono font-black uppercase mb-1">
                        RECOMENDADO
                      </span>
                      <div className="text-sm font-extrabold text-amber-300 uppercase">Oro Performance</div>
                      <div className="text-xs font-mono text-amber-400 font-bold mt-0.5">
                        ${billingCycle === 'annual' ? '1,160' : '1,450'}/mes
                      </div>
                    </th>
                    <th className="w-7/36 px-4 py-5 text-center">
                      <div className="text-sm font-extrabold text-white uppercase">Black VIP</div>
                      <div className="text-xs font-mono text-zinc-400 mt-0.5">
                        ${billingCycle === 'annual' ? '1,760' : '2,200'}/mes
                      </div>
                    </th>
                  </tr>
                </thead>

                {/* Categorías y Filas de Comparación */}
                <tbody>
                  {PLAN_COMPARISON_CATEGORIES.map((categoryGroup: ComparisonCategory, catIdx: number) => (
                    <React.Fragment key={catIdx}>
                      {/* Cabecera de Categoría */}
                      <tr className="bg-zinc-950/90 border-y border-white/10">
                        <td
                          colSpan={4}
                          className="px-6 py-3.5 text-xs font-mono font-black text-amber-400 uppercase tracking-widest"
                        >
                          {categoryGroup.category}
                        </td>
                      </tr>

                      {/* Items de la Categoría */}
                      {categoryGroup.features.map((feature: ComparisonFeature, featureIdx: number) => (
                        <tr
                          key={featureIdx}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                        >
                          {/* Nombre de Característica */}
                          <td className="px-6 py-4 text-sm font-medium text-zinc-200">
                            {feature.name}
                          </td>

                          {/* Plata */}
                          <td className="px-4 py-4 text-center">
                            {typeof feature.silver === 'boolean' ? (
                              feature.silver ? (
                                <Check className="w-5 h-5 text-amber-400 mx-auto" />
                              ) : (
                                <Minus className="w-5 h-5 text-zinc-600 mx-auto" />
                              )
                            ) : (
                              <span className="text-xs font-semibold text-zinc-300">
                                {feature.silver}
                              </span>
                            )}
                          </td>

                          {/* Oro (Destacado) */}
                          <td className="px-4 py-4 text-center bg-amber-400/[0.04] border-x border-amber-400/20">
                            {typeof feature.gold === 'boolean' ? (
                              feature.gold ? (
                                <Check className="w-5 h-5 text-amber-400 mx-auto" />
                              ) : (
                                <Minus className="w-5 h-5 text-zinc-600 mx-auto" />
                              )
                            ) : (
                              <span className="text-xs font-bold text-amber-300">
                                {feature.gold}
                              </span>
                            )}
                          </td>

                          {/* Black VIP */}
                          <td className="px-4 py-4 text-center">
                            {typeof feature.black === 'boolean' ? (
                              feature.black ? (
                                <Check className="w-5 h-5 text-amber-400 mx-auto" />
                              ) : (
                                <Minus className="w-5 h-5 text-zinc-600 mx-auto" />
                              )
                            ) : (
                              <span className="text-xs font-semibold text-zinc-300">
                                {feature.black}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pie de tabla con llamada a acción */}
            <div className="p-6 bg-zinc-950/80 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs font-mono text-zinc-400 text-center sm:text-left">
                ¿Necesitas un paquete corporativo para tu equipo de trabajo?
              </p>
              <button
                type="button"
                onClick={handleOpenCourtesyPass}
                className="inline-flex items-center gap-2 text-xs font-mono font-bold text-amber-400 hover:text-amber-300 uppercase tracking-wider transition-colors cursor-pointer"
              >
                <span>CONSULTAR PLANES CORPORATIVOS & CONVENIOS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 5. PREGUNTAS FRECUENTES (FAQ) EN ACORDEÓN */}
        {/* ========================================================= */}
        <section id="faqs" className="mb-28 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-amber-400 text-xs font-mono font-semibold uppercase tracking-widest">
                RESOLVEMOS TUS DUDAS
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
              PREGUNTAS FRECUENTES <span className="text-amber-400">SOBRE MEMBRESÍAS</span>
            </h2>
            <p className="mt-3 text-zinc-400 text-sm sm:text-base font-sans">
              Transparencia absoluta. Todo lo que necesitas saber antes de dar el primer paso.
            </p>
          </div>

          <div className="space-y-4">
            {MEMBERSHIP_FAQS.map((faq, index: number) => {
              const isOpen = openFaqIndex === index;

              return (
                <div
                  key={index}
                  className={`rounded-2xl transition-all duration-200 overflow-hidden border ${
                    isOpen
                      ? 'border-amber-400/40 bg-zinc-900/90 shadow-lg shadow-amber-400/5'
                      : 'border-white/10 bg-zinc-900/50 hover:border-white/20'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={isOpen}
                    className="w-full p-6 text-left flex items-start sm:items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="space-y-1.5">
                      <span className="inline-block text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20 text-amber-400">
                        {faq.category}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        {faq.question}
                      </h3>
                    </div>
                    <div
                      className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center shrink-0 transition-transform duration-300 ${
                        isOpen
                          ? 'rotate-180 bg-amber-400/15 border-amber-400/40 text-amber-400'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-1 text-zinc-300 text-sm sm:text-base leading-relaxed border-t border-white/5 font-sans">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================= */}
        {/* 6. BANNER CTA INFERIOR */}
        {/* ========================================================= */}
        <section className="relative">
          <div className="relative rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 border border-amber-400/30 p-8 sm:p-12 lg:p-16 overflow-hidden shadow-2xl">
            {/* Resplandor ambiental de fondo */}
            <div
              className="absolute -right-20 -bottom-20 w-96 h-96 bg-amber-400/10 blur-[120px] rounded-full pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
              <div className="max-w-2xl text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 mb-4">
                  <Ticket className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400 text-xs font-mono font-semibold uppercase tracking-wider">
                    PASE DE CORTESÍA VIP
                  </span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
                  ¿AÚN CON DUDAS?{' '}
                  <span className="text-amber-400">
                    PRUEBA LAS INSTALACIONES SIN COSTO ANTES DE DECIDIR.
                  </span>
                </h2>

                <p className="mt-4 text-zinc-300 text-sm sm:text-base leading-relaxed font-sans">
                  Ven a entrenar un día completo. Prueba las máquinas Eleiko IPF, conoce a nuestros
                  coaches certificados y experimenta la atmósfera de Trankilandia sin compromiso de
                  permanencia.
                </p>

                {/* Micro-beneficios del pase */}
                <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-mono text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-amber-400" />
                    Acceso 100% Gratuito
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-amber-400" />
                    Sin Tarjeta de Crédito
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-amber-400" />
                    Cupos Diarios Controlados
                  </span>
                </div>
              </div>

              {/* Botón CTA */}
              <div className="shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleOpenCourtesyPass}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-amber-400 hover:bg-amber-300 text-black font-black uppercase px-8 py-5 rounded-2xl text-sm sm:text-base tracking-wider active:scale-[0.98] transition-all shadow-xl shadow-amber-400/20 hover:shadow-amber-400/30 cursor-pointer group"
                >
                  <span>AGENDAR PASE DE CORTESÍA →</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
