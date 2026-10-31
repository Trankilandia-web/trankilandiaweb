import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  Minus,
  ChevronDown,
  Sparkles,
  Ticket,
  ArrowRight,
  Zap,
  ShieldCheck,
  Settings,
  Edit3,
  Plus,
  Trash2,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PLAN_COMPARISON_CATEGORIES,
  MEMBERSHIP_FAQS,
  BOXING_ADDON,
} from '../data/gymData';
import {
  getStoredMembershipPlans,
  saveStoredMembershipPlans,
  resetMembershipPlansToDefault,
  GymPlanTier,
} from '../data/gymStore';
import type { PlanTier, ComparisonCategory, ComparisonFeature, BillingPeriod } from '../types';

export interface PlansPageProps {
  onSelectPlan?: (planId: string) => void;
  onOpenTourModal?: () => void;
}

export default function PlansPage({
  onSelectPlan,
  onOpenTourModal,
}: PlansPageProps = {}): React.JSX.Element {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('mes');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [plans, setPlans] = useState<GymPlanTier[]>(getStoredMembershipPlans);

  // Estados de Gestión de Tarifas & Beneficios en Vivo por el Administrador
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<GymPlanTier | null>(null);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);
  const [newHighlightText, setNewHighlightText] = useState('');

  useEffect(() => {
    const handleUpdate = () => setPlans(getStoredMembershipPlans());
    window.addEventListener('gym-plans-updated', handleUpdate);
    return () => window.removeEventListener('gym-plans-updated', handleUpdate);
  }, []);

  const handleOpenEditModal = (targetPlan?: GymPlanTier) => {
    const p = targetPlan || plans[0];
    if (p) {
      setEditingPlan({
        ...p,
        highlights: [...(p.highlights || [])],
      });
      setIsEditingModalOpen(true);
      setNewHighlightText('');
    }
  };

  const handleSelectPlanTab = (planId: string) => {
    const found = plans.find((p) => p.id === planId);
    if (found) {
      setEditingPlan({
        ...found,
        highlights: [...(found.highlights || [])],
      });
      setNewHighlightText('');
    }
  };

  const handleSavePlanEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    const nextPlans = plans.map((p) => (p.id === editingPlan.id ? editingPlan : p));
    setPlans(nextPlans);
    saveStoredMembershipPlans(nextPlans);
    setIsEditingModalOpen(false);
    setSuccessNotification(
      `¡Tarifas y beneficios de "${editingPlan.name}" actualizados en vivo! Los cambios ya son visibles en la web.`
    );
    setTimeout(() => setSuccessNotification(null), 4000);
  };

  const handleResetPlans = () => {
    if (
      window.confirm(
        '¿Deseas restablecer los planes a las tarifas oficiales base (Escolar S/. 50, Universitario S/. 60, General S/. 80, Gym + Boxeo S/. 120)?'
      )
    ) {
      const defs = resetMembershipPlansToDefault();
      setPlans(defs);
      setSuccessNotification('¡Tarifas oficiales de Trankilandia Gym restauradas con éxito!');
      setTimeout(() => setSuccessNotification(null), 4000);
    }
  };

  const handleAddHighlight = () => {
    if (!newHighlightText.trim() || !editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      highlights: [...(editingPlan.highlights || []), newHighlightText.trim()],
    });
    setNewHighlightText('');
  };

  const handleRemoveHighlight = (index: number) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      highlights: editingPlan.highlights.filter((_, i) => i !== index),
    });
  };

  const handleUpdateHighlight = (index: number, val: string) => {
    if (!editingPlan) return;
    const updated = [...editingPlan.highlights];
    updated[index] = val;
    setEditingPlan({
      ...editingPlan,
      highlights: updated,
    });
  };

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

  const getPlanPricing = (plan: PlanTier) => {
    switch (billingPeriod) {
      case 'mes':
        return {
          total: plan.monthlyPrice,
          perMonth: plan.monthlyPrice,
          savings: 0,
          label: 'por 1 mes',
        };
      case 'trimestral':
        return {
          total: plan.quarterlyPrice,
          perMonth: Math.round(plan.quarterlyPrice / 3),
          savings: plan.monthlyPrice * 3 - plan.quarterlyPrice,
          label: 'total x 3 meses',
        };
      case 'semestral':
        return {
          total: plan.semiannualPrice,
          perMonth: Math.round(plan.semiannualPrice / 6),
          savings: plan.monthlyPrice * 6 - plan.semiannualPrice,
          label: 'total x 6 meses',
        };
      case 'anual':
        return {
          total: plan.annualPrice,
          perMonth: Math.round(plan.annualPrice / 12),
          savings: plan.monthlyPrice * 12 - plan.annualPrice,
          label: 'total x 1 año',
        };
    }
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
        {/* 1. CABECERA EDITORIAL DE PLANES CON SELECTOR DE 4 PERIODOS */}
        {/* ========================================================= */}
        <div className="pb-12 mb-16 border-b border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-7">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500 block mb-3">
                MEMBRESÍAS &amp; PLANES
              </span>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-white leading-[0.95]">
                ELIGE TU COMPROMISO.
              </h1>
              <p className="mt-4 text-zinc-400 text-base sm:text-lg leading-relaxed max-w-xl font-sans">
                Sin plazos forzosos. Todos nuestros planes incluyen <strong>ingreso libre e ilimitado</strong> a sala de musculación y pesas. Selecciona la duración que mejor se adapte a tu ritmo.
              </p>
            </div>

            {/* Selector de los 4 Periodos */}
            <div className="lg:col-span-5 flex flex-col items-start lg:items-end justify-end">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2">
                DURACIÓN DEL PLAN:
              </span>
              <div className="p-1.5 bg-zinc-900 border border-white/10 rounded-2xl flex items-center flex-wrap gap-1 shadow-xl relative">
                {(
                  [
                    { id: 'mes', label: '1 Mes', badge: undefined },
                    { id: 'trimestral', label: '3 Meses', badge: 'Ahorro' },
                    { id: 'semestral', label: '6 Meses', badge: '-18%' },
                    { id: 'anual', label: '1 Año', badge: '-28%' },
                  ] as const
                ).map((item) => {
                  const isSelected = billingPeriod === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setBillingPeriod(item.id)}
                      className={`relative px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer z-10 flex items-center gap-1.5 ${
                        isSelected ? 'text-black' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="plans-period-tab"
                          transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
                          className="absolute inset-0 bg-amber-400 rounded-xl z-[-1]"
                        />
                      )}
                      <span>{item.label}</span>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-extrabold uppercase ${
                            isSelected
                              ? 'bg-black text-amber-400'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BANNER INFORMATIVO DE VALIDACIÓN DE DOCUMENTOS (ESCOLAR / UNIVERSITARIO) */}
        {/* ========================================================= */}
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-400/10 via-zinc-900 to-amber-400/5 border border-amber-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black shrink-0 mt-0.5">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                  Tarifas con Descuento Estudiantil
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold">
                  Validación Online &amp; en Mostrador
                </span>
              </div>
              <p className="text-zinc-300 text-xs sm:text-sm mt-1 font-sans">
                <strong>Plan Escolar (S/. 50/mes):</strong> Presenta DNI (14 a 17 años). · <strong>Plan Universitario (S/. 60/mes · 3M x S/. 150):</strong> Carnet de universidad o instituto. Puedes subir la foto de tu documento al crear tu cuenta o validarlo físicamente en recepción.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BARRA DE GESTIÓN DE TARIFAS & BENEFICIOS (MODO ADMINISTRADOR) */}
        {/* ========================================================= */}
        <div className="mb-10 p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border-2 border-amber-400/40 shadow-2xl relative overflow-hidden backdrop-blur-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black shrink-0 mt-0.5 shadow-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-black uppercase tracking-wider text-amber-400">
                    Panel de Gestión de Planes &amp; Tarifas (Administración)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                    Sincronización en Vivo
                  </span>
                </div>
                <p className="text-zinc-300 text-xs sm:text-sm mt-1 font-sans">
                  Modifica precios (1M, 3M, 6M, 1A), nombres, etiquetas o beneficios. Cualquier cambio se refleja de inmediato en esta página pública, en la portada y en caja.
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenEditModal()}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs font-mono uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Gestionar Precios &amp; Beneficios</span>
              </button>

              <Link
                to="/admin?tab=planes"
                className="px-4 py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 hover:text-white font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Panel Gerencial (/admin)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={handleResetPlans}
                className="px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Restaurar a tarifas oficiales (Escolar 50, Universitario 60, General 80, Boxeo 120)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Oficiales</span>
              </button>
            </div>
          </div>

          {/* Toast de confirmación en vivo */}
          {successNotification && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3.5 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successNotification}</span>
            </motion.div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 2. TARJETAS DE PLANES CON PRECIOS EN SOLES */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch mb-20">
          {plans.filter((p) => p.isActive !== false).map((plan) => {
            const pricing = getPlanPricing(plan);

            return (
              <motion.div
                key={plan.id}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className={`relative flex flex-col rounded-3xl p-8 transition-colors ${
                  plan.isPopular
                    ? 'bg-zinc-900 border-2 border-amber-400 shadow-2xl shadow-amber-400/10 lg:-translate-y-3 z-20'
                    : 'bg-zinc-900/70 border border-white/10 hover:border-white/20 hover:bg-zinc-900/90 z-10'
                }`}
              >
                {/* Badge Superior */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-amber-400 text-black text-xs font-mono font-black uppercase tracking-wider shadow-lg shadow-amber-400/30 whitespace-nowrap">
                      <Sparkles className="w-3.5 h-3.5" />
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Título, Botón de Edición Rápida & Tagline */}
                <div className="flex items-start justify-between gap-2 mt-1">
                  <h3 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight flex-1">
                    {plan.name}
                  </h3>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditModal(plan);
                    }}
                    className="p-1.5 rounded-xl bg-zinc-800 hover:bg-amber-400 text-zinc-400 hover:text-black border border-white/5 hover:border-amber-400/50 transition-all cursor-pointer shrink-0"
                    title={`Editar tarifas y beneficios de ${plan.name}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-zinc-400 text-sm mt-1 min-h-[38px] font-sans">
                  {plan.tagline}
                </p>

                {/* Bloque de Precios en Soles */}
                <div className="my-6 pt-2 pb-6 border-y border-white/10">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-mono font-bold text-amber-400">S/.</span>
                    <motion.span
                      key={pricing.total}
                      initial={{ opacity: 0.6, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-4xl sm:text-5xl font-black text-white tracking-tight"
                    >
                      {pricing.total}
                    </motion.span>
                    <span className="text-zinc-400 text-xs font-mono">
                      {pricing.label}
                    </span>
                  </div>

                  {billingPeriod !== 'mes' ? (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-amber-400 font-mono font-bold">
                          Equivale a aprox. S/. {pricing.perMonth} / mes
                        </span>
                        {pricing.savings > 0 && (
                          <span className="text-emerald-400 font-mono text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded">
                            Ahorras S/. {pricing.savings}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 font-mono">
                        Pago único por los {billingPeriod === 'trimestral' ? '3 meses' : billingPeriod === 'semestral' ? '6 meses' : '12 meses'} completos
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] text-zinc-400 font-mono">
                      Pago mensual regular • Sin contrato forzoso
                    </p>
                  )}

                  {/* Free entry callout tag */}
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                    <Check className="w-3.5 h-3.5" />
                    <span>Ingreso Libre e Ilimitado</span>
                  </div>
                </div>

                {/* Descripción General */}
                <p className="text-zinc-300 text-sm leading-relaxed mb-6 font-sans">
                  {plan.description}
                </p>

                {/* Lista de Beneficios con Check Ámbar */}
                <div className="flex-1 mb-8">
                  <p className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 mb-4">
                    BENEFICIOS INCLUIDOS:
                  </p>
                  <ul className="space-y-3">
                    {plan.highlights.map((highlight: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-zinc-300 font-sans">
                        <div className="w-5 h-5 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shrink-0 mt-0.5 text-amber-400">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span className="leading-snug">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Botón CTA del Plan */}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full py-4 px-6 rounded-xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer group ${
                    plan.isPopular
                      ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-400/20'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 hover:border-amber-400/30'
                  }`}
                >
                  <span>{plan.ctaText}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </motion.div>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* 3. BLOQUE DESTACADO: ACTIVIDAD ADICIONAL DE BOXEO */}
        {/* ========================================================= */}
        <div className="mb-28 rounded-3xl bg-zinc-900/90 border border-amber-400/30 p-8 sm:p-10 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-400 font-bold mb-3">
                <Zap className="w-4 h-4" />
                <span>ESCUELA DE BOXEO</span>
              </div>
              <h3 className="text-3xl sm:text-4xl font-black uppercase text-white tracking-tight">
                {BOXING_ADDON.title}
              </h3>
              <p className="mt-3 text-zinc-300 text-sm sm:text-base leading-relaxed font-sans max-w-2xl">
                {BOXING_ADDON.subtitle}. Aprende la técnica de combate, golpeo en sacos, trabajo con manoplas y agilidad cardiovascular con instructores dedicados.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BOXING_ADDON.details.map((detail, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-300">
                    <div className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col items-start lg:items-end justify-center bg-zinc-950/80 border border-white/10 p-6 rounded-2xl">
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                COSTO ADICIONAL
              </span>
              <div className="flex items-baseline gap-1.5 my-2">
                <span className="text-xs font-mono text-amber-400 font-bold">S/.</span>
                <span className="text-4xl font-black text-white">{BOXING_ADDON.pricePerMonth}</span>
                <span className="text-xs text-zinc-400 font-mono">/ mes</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans mb-4 text-left lg:text-right">
                O puedes elegir el combo directo <strong>Plan Gym + Boxeo (S/. 130/mes)</strong> que ya lo incluye todo.
              </p>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelectPlan('combo_boxeo')}
                className="w-full bg-amber-400 hover:bg-amber-300 text-black font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer text-center"
              >
                CONTRATAR COMBO GYM + BOXEO
              </motion.button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. MATRIZ COMPARATIVA COMPLETA */}
        {/* ========================================================= */}
        <section id="comparativa" className="mb-28">
          <div className="max-w-3xl mb-12">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500 block mb-2">
              DESGLOSE COMPLETO DE SERVICIOS
            </span>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
              COMPARATIVA DETALLADA DE PLANES
            </h2>
            <p className="mt-3 text-zinc-400 text-sm sm:text-base font-sans">
              Revisa lo que incluye cada opción y elige la que mejor se adapte a tus metas y estilo de entrenamiento.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[720px]">
                <thead>
                  <tr className="border-b border-white/10 bg-zinc-950/90">
                    <th className="w-5/12 px-6 py-5 text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                      CARACTERÍSTICAS & SERVICIOS
                    </th>
                    <th className="w-7/36 px-4 py-5 text-center">
                      <div className="text-sm font-extrabold text-white uppercase">Plan Estudiante</div>
                      <div className="text-xs font-mono text-zinc-400 mt-0.5">
                        S/. {billingPeriod === 'mes' ? '70' : billingPeriod === 'trimestral' ? '180' : billingPeriod === 'semestral' ? '310' : '400'}
                      </div>
                    </th>
                    <th className="w-8/36 px-4 py-5 text-center bg-amber-400/10 border-x border-amber-400/25 relative">
                      <span className="inline-block px-2 py-0.5 rounded bg-amber-400 text-black text-[10px] font-mono font-black uppercase mb-1">
                        MÁS ELEGIDO
                      </span>
                      <div className="text-sm font-extrabold text-amber-300 uppercase">Plan General</div>
                      <div className="text-xs font-mono text-amber-400 font-bold mt-0.5">
                        S/. {billingPeriod === 'mes' ? '80' : billingPeriod === 'trimestral' ? '190' : billingPeriod === 'semestral' ? '330' : '430'}
                      </div>
                    </th>
                    <th className="w-7/36 px-4 py-5 text-center">
                      <div className="text-sm font-extrabold text-white uppercase">Gym + Boxeo</div>
                      <div className="text-xs font-mono text-zinc-400 mt-0.5">
                        S/. {billingPeriod === 'mes' ? '130' : billingPeriod === 'trimestral' ? '320' : billingPeriod === 'semestral' ? '580' : '950'}
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {PLAN_COMPARISON_CATEGORIES.map((categoryGroup: ComparisonCategory, catIdx: number) => (
                    <React.Fragment key={catIdx}>
                      <tr className="bg-zinc-950/90 border-y border-white/10">
                        <td
                          colSpan={4}
                          className="px-6 py-3.5 text-xs font-mono font-black text-amber-400 uppercase tracking-widest"
                        >
                          {categoryGroup.category}
                        </td>
                      </tr>

                      {categoryGroup.features.map((feature: ComparisonFeature, featureIdx: number) => (
                        <tr
                          key={featureIdx}
                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-6 py-4 text-sm font-medium text-zinc-200">
                            {feature.name}
                          </td>

                          {/* Estudiante */}
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

                          {/* General */}
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

                          {/* Gym + Boxeo */}
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

            <div className="p-6 bg-zinc-950/80 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs font-mono text-zinc-400 text-center sm:text-left">
                ¿Tienes dudas sobre convenios universitarios o grupos familiares?
              </p>
              <a
                href="https://wa.me/51999787489"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-mono font-bold text-amber-400 hover:text-amber-300 uppercase tracking-wider transition-colors cursor-pointer"
              >
                <span>CONSULTAR POR WHATSAPP (+51 999 787 489)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 5. PREGUNTAS FRECUENTES EN ACORDEÓN */}
        {/* ========================================================= */}
        <section id="faqs" className="mb-28 max-w-4xl mx-auto">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500 block mb-2">
              RESPUESTAS DIRECTAS
            </span>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
              PREGUNTAS FRECUENTES SOBRE PLANES
            </h2>
            <p className="mt-3 text-zinc-400 text-sm sm:text-base font-sans">
              Respuestas claras sobre membresías, ingreso libre, horarios y clases de boxeo.
            </p>
          </div>

          <div className="space-y-3">
            {MEMBERSHIP_FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;

              return (
                <div
                  key={index}
                  className={`rounded-2xl border transition-colors overflow-hidden ${
                    isOpen
                      ? 'bg-zinc-900 border-amber-400/40 shadow-lg'
                      : 'bg-zinc-900/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                    aria-expanded={isOpen}
                  >
                    <span className="font-bold text-base sm:text-lg text-white">
                      {faq.question}
                    </span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-amber-400 shrink-0"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                      >
                        <div className="px-5 sm:px-6 pb-6 text-zinc-300 text-sm leading-relaxed border-t border-white/5 pt-4 font-sans">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================= */}
        {/* 6. BANNER FINAL DE PASE DE CORTESÍA */}
        {/* ========================================================= */}
        <div className="rounded-3xl bg-zinc-900 border border-white/10 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-amber-400 block mb-2">
              EXPERIENCIA SIN COSTO
            </span>
            <h3 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
              ¿Quieres Conocer el Gimnasio Antes de Decidir?
            </h3>
            <p className="text-zinc-400 text-sm mt-2 max-w-xl font-sans">
              Solicita tu pase de cortesía sin costo. Conoce nuestra sala de pesas, entrena por 1 día y siente el ambiente de la familia Trankilandia.
            </p>
          </div>
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenCourtesyPass}
            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-8 py-4 rounded-xl text-sm whitespace-nowrap shadow-xl shadow-amber-400/20 transition-all cursor-pointer shrink-0"
          >
            <Ticket className="w-5 h-5" />
            <span>SOLICITAR PASE DE CORTESÍA</span>
          </motion.button>
        </div>
      </div>

      {/* =========================================================================
          MODAL DE GESTIÓN DE PLANES & BENEFICIOS EN VIVO (MODO ADMINISTRADOR)
         ========================================================================= */}
      <AnimatePresence>
        {isEditingModalOpen && editingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-2xl bg-zinc-900 border-2 border-amber-400/50 rounded-3xl p-6 sm:p-8 shadow-2xl text-left my-8 overflow-hidden font-sans"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-white uppercase font-display">
                      Gestión de Tarifas &amp; Beneficios
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono">
                      Edición en vivo · Los cambios se actualizan al instante en la web pública y caja
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingModalOpen(false)}
                  className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selector de Plan (Tabs) */}
              <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
                {plans.map((p) => {
                  const isCurrent = p.id === editingPlan.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPlanTab(p.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {p.name.split(' (')[0].split(' / ')[0]} · S/. {p.monthlyPrice}
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleSavePlanEdits} className="mt-4 space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                {/* 1. Tarifas en Soles para los 4 Períodos */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-3">
                  <span className="text-xs font-mono uppercase font-black text-amber-400 tracking-wider block">
                    1. TARIFAS EN SOLES (S/.) SEGÚN DURACIÓN
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                        1 Mes (S/.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={editingPlan.monthlyPrice}
                        onChange={(e) =>
                          setEditingPlan({ ...editingPlan, monthlyPrice: Number(e.target.value) || 0 })
                        }
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-black text-sm focus:border-amber-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                        3 Meses (S/.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={editingPlan.quarterlyPrice}
                        onChange={(e) =>
                          setEditingPlan({ ...editingPlan, quarterlyPrice: Number(e.target.value) || 0 })
                        }
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-black text-sm focus:border-amber-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                        6 Meses (S/.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={editingPlan.semiannualPrice}
                        onChange={(e) =>
                          setEditingPlan({ ...editingPlan, semiannualPrice: Number(e.target.value) || 0 })
                        }
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-black text-sm focus:border-amber-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                        1 Año (S/.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={editingPlan.annualPrice}
                        onChange={(e) =>
                          setEditingPlan({ ...editingPlan, annualPrice: Number(e.target.value) || 0 })
                        }
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-black text-sm focus:border-amber-400 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Información Comercial */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                      Nombre Oficial del Plan
                    </label>
                    <input
                      type="text"
                      required
                      value={editingPlan.name}
                      onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white font-sans text-xs focus:border-amber-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                      Etiqueta / Badge Promocional
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. MÁS POPULAR, PROMO"
                      value={editingPlan.badge || ''}
                      onChange={(e) => setEditingPlan({ ...editingPlan, badge: e.target.value })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white font-sans text-xs focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                    Subtítulo / Tagline
                  </label>
                  <input
                    type="text"
                    value={editingPlan.tagline}
                    onChange={(e) => setEditingPlan({ ...editingPlan, tagline: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white font-sans text-xs focus:border-amber-400 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                      Requisito de Documento
                    </label>
                    <select
                      value={editingPlan.requiresDocument || ''}
                      onChange={(e) =>
                        setEditingPlan({
                          ...editingPlan,
                          requiresDocument: (e.target.value || null) as any,
                        })
                      }
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white font-sans text-xs focus:border-amber-400 outline-none"
                    >
                      <option value="">Sin requisito de documento</option>
                      <option value="dni_escolar">DNI Escolar (14 a 17 años)</option>
                      <option value="carnet_estudiante">Carnet Universitario / Instituto</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="plan-is-popular"
                      checked={editingPlan.isPopular}
                      onChange={(e) => setEditingPlan({ ...editingPlan, isPopular: e.target.checked })}
                      className="w-4 h-4 rounded border-amber-400 text-amber-400 focus:ring-amber-400 cursor-pointer"
                    />
                    <label htmlFor="plan-is-popular" className="text-xs font-mono text-zinc-300 font-bold cursor-pointer">
                      Destacar como "Plan Más Popular"
                    </label>
                  </div>
                </div>

                {/* 3. Beneficios Incluidos (Bullets) */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase font-black text-amber-400 tracking-wider">
                      3. BENEFICIOS INCLUIDOS (HIGHLIGHTS)
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {editingPlan.highlights.length} beneficios
                    </span>
                  </div>

                  <div className="space-y-2">
                    {editingPlan.highlights.map((highlight, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={highlight}
                          onChange={(e) => handleUpdateHighlight(idx, e.target.value)}
                          className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-sans focus:border-amber-400 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveHighlight(idx)}
                          className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                          title="Eliminar beneficio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Input para agregar nuevo beneficio */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <input
                      type="text"
                      placeholder="Escribe un nuevo beneficio y presiona Añadir..."
                      value={newHighlightText}
                      onChange={(e) => setNewHighlightText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddHighlight();
                        }
                      }}
                      className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-sans focus:border-amber-400 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddHighlight}
                      className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir</span>
                    </button>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditingModalOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs font-bold transition-colors cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-400/20 cursor-pointer text-center"
                  >
                    Guardar Cambios en Vivo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
