import { useState, useEffect } from 'react';
import {
  Scale,
  Calendar,
  Flame,
  Heart,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Droplets,
  Utensils,
  Zap,
  Trophy,
  Dumbbell,
  Camera,
  User,
  TrendingUp,
  Award,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { EvaluacionCorporal } from '../../types/evaluacion';
import {
  obtenerHistorialEvaluaciones,
} from '../../lib/evaluacionesService';
import {
  calcularDeltasMensuales,
  determinarDiagnostico,
  obtenerEstandarFitdays,
  calcularProgresoAcumulado,
  generarSintesisSaludCotidiana,
  calcularMedallasSocio,
} from '../../lib/bioimpedanceEngine';
import EvolucionTrendChart from './EvolucionTrendChart';
import MedallasLogro from './MedallasLogro';
import SimuladorMetas from './SimuladorMetas';
import SiluetaAnatomica from './SiluetaAnatomica';
import StoryCardModal from './StoryCardModal';

export interface EvolucionCorporalViewProps {
  socioDni: string;
  socioNombre?: string;
}

export default function EvolucionCorporalView({ socioDni, socioNombre }: EvolucionCorporalViewProps) {
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionCorporal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvalIndex, setSelectedEvalIndex] = useState(0);
  const [tabActiva, setTabActiva] = useState<'silueta' | 'graficos' | 'salud'>('silueta');
  const [showDetallesTecnicos, setShowDetallesTecnicos] = useState(false);
  const [showGuiaInterpretacion, setShowGuiaInterpretacion] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    obtenerHistorialEvaluaciones(socioDni).then((hist) => {
      if (isMounted) {
        setEvaluaciones(hist);
        setIsLoading(false);
      }
    });

    const handleUpdate = () => {
      obtenerHistorialEvaluaciones(socioDni).then((hist) => {
        if (isMounted) setEvaluaciones(hist);
      });
    };

    window.addEventListener('evaluaciones-actualizadas', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('evaluaciones-actualizadas', handleUpdate);
    };
  }, [socioDni]);

  if (isLoading) {
    return (
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center space-y-3 font-mono">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-zinc-400">Cargando tu evolución corporal...</p>
      </div>
    );
  }

  // =========================================================================
  // ESTADO VACÍO: EL SOCIO AÚN NO TIENE MEDICIONES
  // =========================================================================
  if (evaluaciones.length === 0) {
    return (
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 sm:p-10 text-center space-y-6 shadow-xl">
        <div className="w-20 h-20 rounded-3xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-400/5">
          <Scale className="w-10 h-10" />
        </div>

        <div className="max-w-md mx-auto space-y-2">
          <span className="text-xs font-mono font-bold uppercase text-amber-400 tracking-wider">
            EVALUACIÓN DE BIOIMPEDANCIA (8 ELECTRODOS)
          </span>
          <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white font-display">
            Sin Evaluaciones Registradas
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed">
            Acércate a recepción o con tu coach para tu primera medición con la balanza inteligente EUROMAR® G78. Tu membresía incluye una evaluación mensual gratuita para medir tu grasa, masa muscular y grasa visceral.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left pt-2 font-mono text-xs">
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/5 space-y-1">
            <span className="text-emerald-400 font-bold block">✓ Masa Muscular</span>
            <span className="text-[11px] text-zinc-500">Kilos reales y porcentaje por extremidad.</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/5 space-y-1">
            <span className="text-amber-400 font-bold block">✓ Grasa Visceral</span>
            <span className="text-[11px] text-zinc-500">Salud metabólica y cardiovascular.</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/5 space-y-1">
            <span className="text-blue-400 font-bold block">✓ Mapa 5 Zonas</span>
            <span className="text-[11px] text-zinc-500">Brazos, piernas y tronco por separado.</span>
          </div>
        </div>

        <div className="pt-2">
          <a
            href="https://wa.me/51999787489?text=Hola%20Trankilandia%20Gym,%20quisiera%20coordinar%20mi%20evaluación%20de%20bioimpedancia%20con%20la%20balanza."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-amber-400/20 font-mono tracking-wider cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Coordinar Evaluación en Recepción</span>
          </a>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VISTA PRINCIPAL CON EVALUACIÓN
  // =========================================================================
  const currentEval = evaluaciones[selectedEvalIndex] || evaluaciones[0];
  const previousEval = evaluaciones[selectedEvalIndex + 1] || null;
  const initialEval = evaluaciones[evaluaciones.length - 1] || currentEval;
  const deltas = calcularDeltasMensuales(currentEval, previousEval);
  const acumulado = calcularProgresoAcumulado(initialEval, currentEval);
  const diagnostico = determinarDiagnostico(deltas, currentEval);
  const sintesis = generarSintesisSaludCotidiana(currentEval, initialEval);
  const medallas = calcularMedallasSocio(evaluaciones);

  const fechaFormateada = new Date(currentEval.fecha).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const segmental = currentEval.segmental_data;

  return (
    <div className="space-y-4 font-sans">
      {/* 1. HERO HEADER UNIFICADO: Fit Score, Veredicto & Métricas Clave */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/10 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        {/* Fila Superior: Título + Fit Score + Botón Story Card */}
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">
              <Scale className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Bioimpedancia 8 Electrodos</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black uppercase text-white font-display tracking-tight truncate">
              Mi Evolución Corporal
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-zinc-500 shrink-0" />
              <span>{fechaFormateada}</span>
              {currentEval.evaluador_nombre && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-500 truncate">Coach: {currentEval.evaluador_nombre}</span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Botón Story Card (Discreto, elegante, mobile-friendly) */}
            <button
              type="button"
              onClick={() => setShowStoryModal(true)}
              className="px-3 py-2 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-400 hover:text-amber-300 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold active:scale-95 shadow-sm"
              title="Generar Story Card para Instagram / WhatsApp"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="text-[11px]">Story Card</span>
            </button>

            {/* Fit Score Badge Compacto */}
            <div className="px-3 py-1.5 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-black font-mono shadow-md shadow-amber-400/20 text-center min-w-[76px]">
              <span className="text-[9px] font-black uppercase tracking-wider block leading-none">FIT SCORE</span>
              <span className="text-xl font-black leading-tight block">{currentEval.puntuacion_corporal}</span>
              <span className="text-[8px] font-bold block opacity-80 leading-none">/ 100 PTS</span>
            </div>
          </div>
        </div>

        {/* Veredicto Motivacional Compacto */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-zinc-950/80 border border-amber-400/25 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                {diagnostico.fase}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white font-sans truncate">
              {sintesis.fraseImpacto}
            </p>
          </div>
        </div>

        {/* Tira Compacta de 3 Métricas Clave (Tu Transformación) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-0.5">
            <span className="uppercase tracking-wider font-bold text-zinc-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Tu Transformación Acumulada</span>
            </span>
            {evaluaciones.length > 1 ? (
              <span className="text-zinc-500">{acumulado.dias_totales} días de constancia</span>
            ) : (
              <span className="text-zinc-500">Punto de partida inicial</span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono">
            {/* 1. Músculo */}
            <div className="p-2.5 sm:p-3 rounded-2xl bg-zinc-950 border border-emerald-500/25 space-y-1">
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-400">
                <Dumbbell className="w-3 h-3 shrink-0" />
                <span className="truncate">Músculo</span>
              </div>
              <div className="text-base sm:text-lg font-black text-white leading-tight">
                {currentEval.masa_muscular_kg.toFixed(1)} <span className="text-[10px] text-zinc-500 font-normal">kg</span>
              </div>
              <div className="text-[10px] font-bold text-emerald-400 truncate">
                {acumulado.delta_musculo_kg >= 0 ? `+${acumulado.delta_musculo_kg}` : acumulado.delta_musculo_kg} kg
              </div>
              {sintesis.rangoMusculo && (
                <div className="pt-0.5">
                  <span className={`inline-block text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-md border font-semibold truncate max-w-full leading-tight ${sintesis.rangoMusculo.badgeBg}`}>
                    {sintesis.rangoMusculo.etiqueta}
                  </span>
                </div>
              )}
            </div>

            {/* 2. Grasa */}
            <div className="p-2.5 sm:p-3 rounded-2xl bg-zinc-950 border border-amber-400/25 space-y-1">
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-400">
                <Flame className="w-3 h-3 shrink-0" />
                <span className="truncate">Grasa</span>
              </div>
              <div className="text-base sm:text-lg font-black text-white leading-tight">
                {currentEval.grasa_corporal_pct.toFixed(1)}<span className="text-[10px] text-zinc-500 font-normal">%</span>
              </div>
              <div className={`text-[10px] font-bold truncate ${acumulado.delta_grasa_kg <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {acumulado.delta_grasa_kg <= 0 ? `${acumulado.delta_grasa_kg}` : `+${acumulado.delta_grasa_kg}`} kg
              </div>
              {sintesis.rangoGrasa && (
                <div className="pt-0.5">
                  <span className={`inline-block text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-md border font-semibold truncate max-w-full leading-tight ${sintesis.rangoGrasa.badgeBg}`}>
                    {sintesis.rangoGrasa.etiqueta}
                  </span>
                </div>
              )}
            </div>

            {/* 3. Peso */}
            <div className="p-2.5 sm:p-3 rounded-2xl bg-zinc-950 border border-white/10 space-y-1">
              <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-zinc-400">
                <Scale className="w-3 h-3 shrink-0" />
                <span className="truncate">Peso</span>
              </div>
              <div className="text-base sm:text-lg font-black text-white leading-tight">
                {currentEval.peso_kg.toFixed(1)} <span className="text-[10px] text-zinc-500 font-normal">kg</span>
              </div>
              <div className="text-[10px] font-bold text-zinc-400 truncate">
                {acumulado.delta_peso_kg > 0 ? `+${acumulado.delta_peso_kg}` : acumulado.delta_peso_kg} kg
              </div>
              {sintesis.rangoPeso && (
                <div className="pt-0.5">
                  <span className={`inline-block text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-md border font-semibold truncate max-w-full leading-tight ${sintesis.rangoPeso.badgeBg}`}>
                    {sintesis.rangoPeso.etiqueta}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel de Diagnóstico Inteligente del Coach & Recomposición */}
        {sintesis.recomposicionDetallada && (
          <div className="p-4 rounded-2xl bg-zinc-950/90 border border-amber-400/25 space-y-3 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Diagnóstico del Coach & Recomposición</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 uppercase w-fit">
                {sintesis.rangoGrasa?.etiqueta || 'Fase Activa'}
              </span>
            </div>

            <div className="space-y-1.5">
              <h4 className="text-sm sm:text-base font-black text-white uppercase font-display tracking-tight">
                {sintesis.recomposicionDetallada.titulo}
              </h4>
              <p className="text-xs sm:text-sm font-bold text-amber-300 font-sans leading-snug">
                {sintesis.recomposicionDetallada.resumen}
              </p>
              <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                {sintesis.recomposicionDetallada.desglose}
              </p>
            </div>

            {/* Escala Visual de % de Grasa Corporal */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span className="uppercase tracking-wider">Escala Grasa Corporal ({currentEval.sexo}):</span>
                <span className="font-bold text-white">
                  Tu nivel: <span className="text-amber-400">{currentEval.grasa_corporal_pct.toFixed(1)}%</span>
                </span>
              </div>

              {/* Barra de Rango Segmentada */}
              <div className="space-y-1">
                <div className="grid grid-cols-5 gap-1 h-2 rounded-full overflow-hidden bg-zinc-800 p-0.5">
                  <div className="bg-cyan-500 rounded-sm" title="Atleta" />
                  <div className="bg-emerald-500 rounded-sm" title="Atlético" />
                  <div className="bg-emerald-400 rounded-sm" title="Saludable" />
                  <div className="bg-amber-500 rounded-sm" title="Límite" />
                  <div className="bg-rose-500 rounded-sm" title="Sobregrasa" />
                </div>
                <div className="grid grid-cols-5 gap-1 text-[9px] font-mono text-center text-zinc-500 leading-tight">
                  <span className="truncate">Atleta</span>
                  <span className="truncate">Atlético</span>
                  <span className="truncate">Saludable</span>
                  <span className="truncate">Límite</span>
                  <span className="truncate">Sobregrasa</span>
                </div>
              </div>
            </div>

            {/* Consejos del Coach */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/5 space-y-1">
                <span className="text-amber-400 font-bold block flex items-center gap-1">
                  <span>💡 Consejo del Coach:</span>
                </span>
                <p className="text-zinc-300 font-sans text-xs leading-relaxed">
                  {sintesis.recomposicionDetallada.consejoCoach}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/5 space-y-1">
                <span className="text-emerald-400 font-bold block flex items-center gap-1">
                  <span>⚡ Enfoque Sugerido:</span>
                </span>
                <p className="text-zinc-300 font-sans text-xs leading-relaxed">
                  {sintesis.recomposicionDetallada.enfoqueSugerido}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botón Plegable: Guía Rápida de Interpretación */}
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setShowGuiaInterpretacion(!showGuiaInterpretacion)}
            className="w-full py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-all flex items-center justify-between text-[11px] font-mono cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>¿Cómo interpretar mis números biométricos?</span>
            </span>
            {showGuiaInterpretacion ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showGuiaInterpretacion && (
            <div className="mt-2 p-3.5 rounded-2xl bg-zinc-950 border border-white/10 space-y-2.5 text-xs font-sans text-zinc-300 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-white/5 pb-2">
                <span className="font-bold text-white font-mono text-[11px] flex items-center gap-1.5 text-emerald-400">
                  <Dumbbell className="w-3 h-3" />
                  1. Músculo vs. Peso de la Báscula
                </span>
                <p className="text-[11px] leading-relaxed text-zinc-400">
                  El músculo es tejido denso y compacto (ocupa 18% menos volumen que la misma cantidad de grasa). Si ganas músculo y quemas grasa, tu peso total puede bajar lento o mantenerse, pero tu cintura y medidas se reducen notablemente.
                </p>
              </div>

              <div className="space-y-1 border-b border-white/5 pb-2">
                <span className="font-bold text-white font-mono text-[11px] flex items-center gap-1.5 text-red-400">
                  <Heart className="w-3 h-3" />
                  2. Grasa Visceral vs. Grasa Subcutánea
                </span>
                <p className="text-[11px] leading-relaxed text-zinc-400">
                  La grasa subcutánea es la que se palpa bajo la piel (estética). La grasa visceral rodea el corazón, hígado y vísceras. Mantenerla en nivel 1 a 9 es el seguro de vida metabólico más potente contra diabetes e hipertensión.
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-white font-mono text-[11px] flex items-center gap-1.5 text-blue-400">
                  <Droplets className="w-3 h-3" />
                  3. Agua e Hidratación Diaria
                </span>
                <p className="text-[11px] leading-relaxed text-zinc-400">
                  El músculo almacena hasta 75% de agua celular. Tomar agua suficiente no engorda: desinflama tejidos, transporta nutrientes y evita fatigas prematuras durante tus series en Trankilandia.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Selector de Historial de Fechas (si hay varias evaluaciones) */}
        {evaluaciones.length > 1 && (
          <div className="pt-2 border-t border-white/5 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase shrink-0">Historial:</span>
            {evaluaciones.map((ev, idx) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => setSelectedEvalIndex(idx)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-mono whitespace-nowrap transition-all cursor-pointer ${
                  selectedEvalIndex === idx
                    ? 'bg-amber-400 text-black font-bold shadow'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-white/10'
                }`}
              >
                {new Date(ev.fecha).toLocaleDateString('es-PE', { month: 'short', day: 'numeric', year: '2-digit' })}
                {idx === 0 ? ' (Actual)' : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. SELECTOR DE PESTAÑAS MOBILE-FIRST */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-zinc-950 border border-white/10 font-mono text-xs shadow-inner">
        <button
          type="button"
          onClick={() => setTabActiva('silueta')}
          className={`py-2.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            tabActiva === 'silueta'
              ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <User className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Mi Silueta</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva('graficos')}
          className={`py-2.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            tabActiva === 'graficos'
              ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Gráficos & Metas</span>
        </button>

        <button
          type="button"
          onClick={() => setTabActiva('salud')}
          className={`py-2.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            tabActiva === 'salud'
              ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Award className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Medallas & Salud</span>
        </button>
      </div>

      {/* 3. CONTENIDO SEGÚN LA PESTAÑA ACTIVA */}
      {tabActiva === 'silueta' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <SiluetaAnatomica evaluacion={currentEval} />
        </div>
      )}

      {tabActiva === 'graficos' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <EvolucionTrendChart
            evaluaciones={evaluaciones}
            onSelectEval={(ev) => {
              const idx = evaluaciones.findIndex((e) => e.id === ev.id);
              if (idx !== -1) setSelectedEvalIndex(idx);
            }}
          />
          <SimuladorMetas evaluaciones={evaluaciones} currentEval={currentEval} />
        </div>
      )}

      {tabActiva === 'salud' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Medallas de Logro e Hitos */}
          <MedallasLogro medallas={medallas} socioNombre={socioNombre} />

          {/* Semáforos de Salud Cotidiana */}
          <div className="space-y-3">
            <div className="px-1">
              <span className="text-xs font-mono font-bold uppercase text-amber-400 tracking-wider">
                SALUD Y RENDIMIENTO
              </span>
              <h4 className="text-lg font-black uppercase text-white font-display">
                Tu Composición en Cristiano
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tarjeta 1: Grasa Visceral & Corazón */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-red-400" />
                    <span>Salud del Corazón & Abdomen</span>
                  </span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-lg text-[10px] uppercase border ${
                      sintesis.visceral.estado === 'optimo'
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                        : sintesis.visceral.estado === 'atencion'
                        ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                        : 'text-red-400 bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    {sintesis.visceral.titulo}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 font-mono">
                  <span className="text-2xl font-black text-white">{currentEval.grasa_visceral}</span>
                  <span className="text-xs text-zinc-500">/ 50 nivel</span>
                </div>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  {sintesis.visceral.descripcion}
                </p>

                {sintesis.visceral.queSignifica && (
                  <div className="pt-2 border-t border-white/5 space-y-1.5 text-xs font-sans">
                    <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-white/5 space-y-1">
                      <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider block">
                        ¿Qué significa para tu salud?
                      </span>
                      <p className="text-zinc-400 text-[11px] leading-relaxed">
                        {sintesis.visceral.queSignifica}
                      </p>
                    </div>
                    {sintesis.visceral.accionPractica && (
                      <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-white/5 space-y-1">
                        <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                          Consejo en Trankilandia:
                        </span>
                        <p className="text-zinc-400 text-[11px] leading-relaxed">
                          {sintesis.visceral.accionPractica}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tarjeta 2: Motor Metabólico */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Tu Motor Metabólico</span>
                  </span>
                  <span className="text-amber-400 font-bold text-[10px] uppercase bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
                    Basal (BMR)
                  </span>
                </div>
                <div className="flex items-baseline gap-2 font-mono">
                  <span className="text-2xl font-black text-amber-400">{currentEval.bmr_kcal}</span>
                  <span className="text-xs text-zinc-400">kcal/día en reposo</span>
                </div>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  {sintesis.metabolismo.descripcion}
                </p>

                {sintesis.metabolismo.queSignifica && (
                  <div className="pt-2 border-t border-white/5 space-y-1.5 text-xs font-sans">
                    <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-white/5 space-y-1">
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                        ¿Cómo funciona tu metabolismo?
                      </span>
                      <p className="text-zinc-400 text-[11px] leading-relaxed">
                        {sintesis.metabolismo.queSignifica}
                      </p>
                    </div>
                    {sintesis.metabolismo.accionPractica && (
                      <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-white/5 space-y-1">
                        <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                          Acelerador en el Gym:
                        </span>
                        <p className="text-zinc-400 text-[11px] leading-relaxed">
                          {sintesis.metabolismo.accionPractica}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tarjeta 3: Hidratación */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                    <Droplets className="w-4 h-4 text-blue-400" />
                    <span>Hidratación Celular</span>
                  </span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-lg text-[10px] uppercase border ${
                      sintesis.hidratacion.estado === 'excelente'
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                        : 'text-blue-400 bg-blue-500/10 border-blue-500/30'
                    }`}
                  >
                    {currentEval.agua_pct.toFixed(1)}% Agua
                  </span>
                </div>
                <div className="flex items-baseline gap-2 font-mono">
                  <span className="text-2xl font-black text-blue-400">{sintesis.hidratacion.litros_recomendados}</span>
                  <span className="text-xs text-zinc-400">Litros/día sugeridos</span>
                </div>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  {sintesis.hidratacion.consejo}
                </p>

                {sintesis.hidratacion.queSignifica && (
                  <div className="pt-2 border-t border-white/5 space-y-1.5 text-xs font-sans">
                    <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-white/5 space-y-1">
                      <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider block">
                        Impacto en tu rendimiento:
                      </span>
                      <p className="text-zinc-400 text-[11px] leading-relaxed">
                        {sintesis.hidratacion.queSignifica}
                      </p>
                    </div>
                    {sintesis.hidratacion.accionPractica && (
                      <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-white/5 space-y-1">
                        <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">
                          Pauta Diaria:
                        </span>
                        <p className="text-zinc-400 text-[11px] leading-relaxed">
                          {sintesis.hidratacion.accionPractica}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tarjeta 4: Consumo Proteico */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-emerald-400" />
                    <span>Meta Proteica Sugerida</span>
                  </span>
                  <span className="text-emerald-400 font-bold text-[10px] uppercase bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    Nutrición
                  </span>
                </div>
                <div className="flex items-baseline gap-2 font-mono">
                  <span className="text-2xl font-black text-emerald-400">{sintesis.proteina.gramos_sugeridos}g</span>
                  <span className="text-xs text-zinc-400">Proteína al día</span>
                </div>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  {sintesis.proteina.consejo}
                </p>

                {sintesis.proteina.queSignifica && (
                  <div className="pt-2 border-t border-white/5 space-y-1.5 text-xs font-sans">
                    <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-white/5 space-y-1">
                      <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider block">
                        ¿Para qué sirve la proteína?
                      </span>
                      <p className="text-zinc-400 text-[11px] leading-relaxed">
                        {sintesis.proteina.queSignifica}
                      </p>
                    </div>
                    {sintesis.proteina.ejemploComida && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                        <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wider block">
                          Ejemplo Real de Menú Diario:
                        </span>
                        <p className="text-zinc-300 text-[11px] leading-relaxed">
                          {sintesis.proteina.ejemploComida}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Acordeón Plegable: Reporte Biométrico Técnico Fitdays (19 Indicadores + Extremidades) */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowDetallesTecnicos(!showDetallesTecnicos)}
          className="w-full py-3.5 px-5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition-all flex items-center justify-between text-xs font-mono font-bold cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-400" />
            <span>
              {showDetallesTecnicos
                ? 'Ocultar Reporte Técnico Detallado'
                : 'Ver Reporte Biométrico Completo (19 Indicadores Técnicos)'}
            </span>
          </div>
          {showDetallesTecnicos ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        {showDetallesTecnicos && (
          <div className="mt-4 space-y-6 animate-in fade-in duration-200">
            {/* 4. Tabla Completa de Indicadores (Estándar Fitdays EUROMAR® G78) */}
            <div className="bg-zinc-900 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <span className="text-xs font-mono font-bold uppercase text-amber-400 tracking-wider">
                    INFORME BIOMÉTRICO FITDAYS
                  </span>
                  <h4 className="text-xl font-black uppercase text-white font-display">
              Indicadores de Composición Corporal
            </h4>
          </div>
          <span className="text-[11px] font-mono text-zinc-500 uppercase hidden sm:inline">
            Balanza Segmental G78-BT
          </span>
        </div>

        <div className="divide-y divide-white/5 text-xs font-mono">
          {/* Header de Tabla */}
          <div className="grid grid-cols-12 py-2 text-zinc-500 font-bold uppercase text-[10px]">
            <div className="col-span-5 sm:col-span-6">Indicador</div>
            <div className="col-span-4 sm:col-span-3 text-right">Valor</div>
            <div className="col-span-3 text-right">Estándar</div>
          </div>

          {/* 1. Peso */}
          {(() => {
            const std = obtenerEstandarFitdays('peso', currentEval.peso_kg, currentEval.sexo, currentEval.imc);
            return (
              <div className="grid grid-cols-12 py-2.5 items-center">
                <div className="col-span-5 sm:col-span-6 font-medium text-zinc-300">Peso</div>
                <div className="col-span-4 sm:col-span-3 text-right font-bold text-white">
                  {currentEval.peso_kg.toFixed(2)} kg
                </div>
                <div className={`col-span-3 text-right font-bold ${std.colorClass}`}>{std.nivel}</div>
              </div>
            );
          })()}

          {/* 2. IMC */}
          {(() => {
            const std = obtenerEstandarFitdays('imc', currentEval.imc, currentEval.sexo, currentEval.imc);
            return (
              <div className="grid grid-cols-12 py-2.5 items-center">
                <div className="col-span-5 sm:col-span-6 font-medium text-zinc-300">IMC</div>
                <div className="col-span-4 sm:col-span-3 text-right font-bold text-white">
                  {currentEval.imc.toFixed(1)}
                </div>
                <div className={`col-span-3 text-right font-bold ${std.colorClass}`}>{std.nivel}</div>
              </div>
            );
          })()}

          {/* 3. Grasa Corporal */}
          {(() => {
            const std = obtenerEstandarFitdays('grasa', currentEval.grasa_corporal_pct, currentEval.sexo, currentEval.imc);
            return (
              <div className="grid grid-cols-12 py-2.5 items-center">
                <div className="col-span-5 sm:col-span-6 font-medium text-zinc-300">Grasa Corporal</div>
                <div className="col-span-4 sm:col-span-3 text-right font-bold text-amber-400">
                  {currentEval.grasa_corporal_pct.toFixed(1)} %
                </div>
                <div className={`col-span-3 text-right font-bold ${std.colorClass}`}>{std.nivel}</div>
              </div>
            );
          })()}

          {/* 4. Masa Grasa */}
          {(() => {
            const std = obtenerEstandarFitdays('grasa', currentEval.grasa_corporal_pct, currentEval.sexo, currentEval.imc);
            return (
              <div className="grid grid-cols-12 py-2.5 items-center">
                <div className="col-span-5 sm:col-span-6 font-medium text-zinc-300">Masa grasa</div>
                <div className="col-span-4 sm:col-span-3 text-right font-bold text-white">
                  {currentEval.grasa_corporal_kg.toFixed(1)} kg
                </div>
                <div className={`col-span-3 text-right font-bold ${std.colorClass}`}>{std.nivel}</div>
              </div>
            );
          })()}

          {/* 5. Masa libre de grasa */}
          <div className="grid grid-cols-12 py-2.5 items-center">
            <div className="col-span-5 sm:col-span-6 font-medium text-zinc-300">Masa libre de grasa</div>
            <div className="col-span-4 sm:col-span-3 text-right font-bold text-white">
              {(currentEval.masa_libre_grasa_kg || (currentEval.peso_kg - currentEval.grasa_corporal_kg)).toFixed(1)} kg
            </div>
            <div className="col-span-3 text-right text-zinc-500">—</div>
          </div>

          {/* 6. Masa Muscular */}
          {(() => {
            const std = obtenerEstandarFitdays('musculo', currentEval.masa_muscular_pct, currentEval.sexo, currentEval.imc);
            return (
              <div className="grid grid-cols-12 py-2.5 items-center">
                <div className="col-span-5 sm:col-span-6 font-medium text-zinc-300">Masa Muscular</div>
                <div className="col-span-4 sm:col-span-3 text-right font-bold text-emerald-400">
                  {currentEval.masa_muscular_kg.toFixed(1)} kg
                </div>
                <div className={`col-span-3 text-right font-bold ${std.colorClass}`}>{std.nivel}</div>
              </div>
            );
          })()}

          {/* 7. Frecuencia muscular */}
          {(() => {
            const std = obtenerEstandarFitdays('frecuencia_muscular', currentEval.masa_muscular_pct, currentEval.sexo, currentEval.imc);
            return (
              <div className="grid grid-cols-12 py-2.5 items-center">
                <div className="col-span-5 sm:col-span-6 font-medium text-zinc-300">Frecuencia muscular</div>
                <div className="col-span-4 sm:col-span-3 text-right font-bold text-white">
                  {currentEval.masa_muscular_pct.toFixed(1)} %
                </div>
                <div className={`col-span-3 text-right font-bold ${std.colorClass}`}>{std.nivel}</div>
              </div>
            );
          })()}

          {/* 8. Músculo esquelético */}
          {(() => {
            const val = currentEval.musculo_esqueletico_pct || Number((currentEval.masa_muscular_pct * 0.61).toFixed(1));
            const std = obtenerEstandarFitdays('musculo_esqueletico', val, currentEval.sexo, currentEval.imc);
            return (
              <div className="grid grid-cols-12 py-2.5 items-center">
                <div className="col-span-5 sm:col-span-6 font-medium text-zinc-300">Músculo esquelético</div>
                <div className="col-span-4 sm:col-span-3 text-right font-bold text-white">
                  {val.toFixed(1)} %
                </div>
                <div className={`col-span-3 text-right font-bold ${std.colorClass}`}>{std.nivel}</div>
              </div>
            );
          })()}

          {/* 9. Masa Esquelética (Ósea) */}
          <div className="grid grid-cols-12 py-2.5 items-center">
            <div className="col-span-5 sm:col-span-6 font-medium text-zinc-300">Masa Esquelética (Ósea)</div>
            <div className="col-span-4 sm:col-span-3 text-right font-bold text-white">
              {currentEval.masa_osea_kg.toFixed(1)} kg
            </div>
            <div className="col-span-3 text-right font-bold text-emerald-400">Excelente</div>
          </div>

          {/* 10. Cantidad de proteína */}
          {(() => {
            const val = currentEval.proteina_kg || Number(((currentEval.peso_kg * currentEval.proteina_pct) / 100).toFixed(1));
            const std = obtenerEstandarFitdays('proteina', currentEval.proteina_pct, currentEval.sexo, currentEval.imc);
            return (
              <div className="grid grid-cols-12 py-2.5 items-center">
                <div className="col-span-5 sm:col-span-6 font-medium text-zinc-300">Cantidad de proteína</div>
                <div className="col-span-4 sm:col-span-3 text-right font-bold text-white">
                  {val.toFixed(1)} kg
                </div>
                <div className={`col-span-3 text-right font-bold ${std.colorClass}`}>{std.nivel}</div>
              </div>
            );
          })()}

          {/* 11. Proteína % */}
          {(() => {
            const std = obtenerEstandarFitdays('proteina', currentEval.proteina_pct, currentEval.sexo, currentEval.imc);
            return (
              <div className="grid grid-cols-12 py-2.5 items-center">
                <div className="col-span-5 sm:col-span-6 font-medium text-zinc-300">Proteína</div>
                <div className="col-span-4 sm:col-span-3 text-right font-bold text-white">
                  {currentEval.proteina_pct.toFixed(1)} %
                </div>
                <div className={`col-span-3 text-right font-bold ${std.colorClass}`}>{std.nivel}</div>
              </div>
            );
          })()}

          {/* 12. Contenido de agua */}
          {(() => {
            const val = currentEval.agua_kg || Number(((currentEval.peso_kg * currentEval.agua_pct) / 100).toFixed(1));
            const std = obtenerEstandarFitdays('agua', currentEval.agua_pct, currentEval.sexo, currentEval.imc);
            return (
              <div className="grid grid-cols-12 py-2.5 items-center">
                <div className="col-span-5 sm:col-span-6 font-medium text-zinc-300">Contenido de agua</div>
                <div className="col-span-4 sm:col-span-3 text-right font-bold text-white">
                  {val.toFixed(1)} kg
                </div>
                <div className={`col-span-3 text-right font-bold ${std.colorClass}`}>{std.nivel}</div>
              </div>
            );
          })()}

          {/* 13. Agua Corporal % */}
          {(() => {
            const std = obtenerEstandarFitdays('agua', currentEval.agua_pct, currentEval.sexo, currentEval.imc);
            return (
              <div className="grid grid-cols-12 py-2.5 items-center">
                <div className="col-span-5 sm:col-span-6 font-medium text-zinc-300">Agua Corporal</div>
                <div className="col-span-4 sm:col-span-3 text-right font-bold text-white">
                  {currentEval.agua_pct.toFixed(1)} %
                </div>
                <div className={`col-span-3 text-right font-bold ${std.colorClass}`}>{std.nivel}</div>
              </div>
            );
          })()}

          {/* 14. Grasa subcutánea */}
          {(() => {
            const val = currentEval.grasa_subcutanea_pct || Number((currentEval.grasa_corporal_pct * 0.71).toFixed(1));
            const std = obtenerEstandarFitdays('subcutanea', val, currentEval.sexo, currentEval.imc);
            return (
              <div className="grid grid-cols-12 py-2.5 items-center">
                <div className="col-span-5 sm:col-span-6 font-medium text-zinc-300">Grasa subcutánea</div>
                <div className="col-span-4 sm:col-span-3 text-right font-bold text-white">
                  {val.toFixed(1)} %
                </div>
                <div className={`col-span-3 text-right font-bold ${std.colorClass}`}>{std.nivel}</div>
              </div>
            );
          })()}

          {/* 15. Grasa Visceral */}
          {(() => {
            const std = obtenerEstandarFitdays('visceral', currentEval.grasa_visceral, currentEval.sexo, currentEval.imc);
            return (
              <div className="grid grid-cols-12 py-2.5 items-center">
                <div className="col-span-5 sm:col-span-6 font-medium text-zinc-300">Grasa Visceral</div>
                <div className="col-span-4 sm:col-span-3 text-right font-bold text-white">
                  {currentEval.grasa_visceral.toFixed(1)}
                </div>
                <div className={`col-span-3 text-right font-bold ${std.colorClass}`}>{std.nivel}</div>
              </div>
            );
          })()}

          {/* 16. BMR */}
          <div className="grid grid-cols-12 py-2.5 items-center">
            <div className="col-span-5 sm:col-span-6 font-medium text-zinc-300">BMR (Metabolismo Basal)</div>
            <div className="col-span-4 sm:col-span-3 text-right font-bold text-amber-400">
              {currentEval.bmr_kcal} kcal
            </div>
            <div className="col-span-3 text-right text-zinc-500">—</div>
          </div>

          {/* 17. Edad Corporal */}
          {(() => {
            const deltaEdad = currentEval.edad_metabolica - currentEval.edad;
            const std = obtenerEstandarFitdays('edad', deltaEdad, currentEval.sexo, currentEval.imc);
            return (
              <div className="grid grid-cols-12 py-2.5 items-center">
                <div className="col-span-5 sm:col-span-6 font-medium text-zinc-300">Edad Corporal</div>
                <div className="col-span-4 sm:col-span-3 text-right font-bold text-white">
                  {currentEval.edad_metabolica} años
                </div>
                <div className={`col-span-3 text-right font-bold ${std.colorClass}`}>{std.nivel}</div>
              </div>
            );
          })()}

          {/* 18. WHR */}
          {(() => {
            const val = currentEval.whr || (currentEval.sexo === 'Masculino' ? 0.90 : 0.82);
            const std = obtenerEstandarFitdays('whr', val, currentEval.sexo, currentEval.imc);
            return (
              <div className="grid grid-cols-12 py-2.5 items-center">
                <div className="col-span-5 sm:col-span-6 font-medium text-zinc-300">WHR (Cintura/Cadera)</div>
                <div className="col-span-4 sm:col-span-3 text-right font-bold text-white">
                  {val.toFixed(2)}
                </div>
                <div className={`col-span-3 text-right font-bold ${std.colorClass}`}>{std.nivel}</div>
              </div>
            );
          })()}

          {/* 19. Peso corporal estándar */}
          <div className="grid grid-cols-12 py-2.5 items-center">
            <div className="col-span-5 sm:col-span-6 font-medium text-zinc-300">Peso corporal estándar</div>
            <div className="col-span-4 sm:col-span-3 text-right font-bold text-zinc-400">
              {(currentEval.peso_estandar_kg || (22.0 * Math.pow(currentEval.estatura_cm / 100, 2))).toFixed(1)} kg
            </div>
            <div className="col-span-3 text-right text-zinc-500">—</div>
          </div>
        </div>
      </div>

      {/* 5. Datos de las Extremidades (Análisis Segmentario de 8 Electrodos) */}
      {segmental && (
        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
          <div className="border-b border-white/5 pb-3">
            <span className="text-xs font-mono font-bold uppercase text-amber-400 tracking-wider">
              DATOS DE LAS EXTREMIDADES (8 ELECTRODOS)
            </span>
            <h4 className="text-xl font-black uppercase text-white font-display">
              Análisis Segmentario Completo
            </h4>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">
              El análisis segmentario desglosa la grasa y masa magra en brazos, piernas y tronco.
            </p>
          </div>

          {/* A. Análisis de Grasa Segmentario */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-amber-400 uppercase tracking-wide">
                Análisis de Grasa Segmentario
              </span>
              <span className="text-zinc-500 text-[11px]">Rango estándar: 80% - 160%</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Brazos */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-2.5">
                <span className="text-xs font-mono font-bold text-zinc-400 uppercase block border-b border-white/5 pb-1">
                  Tren Superior (Brazos)
                </span>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">Brazo Izq (L):</span>
                  <span className="text-amber-400 font-bold">
                    {(segmental.brazo_izq.grasa_kg || (currentEval.grasa_corporal_kg * 0.067)).toFixed(1)} kg · {segmental.brazo_izq.grasa_pct}%
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">Brazo Der (R):</span>
                  <span className="text-amber-400 font-bold">
                    {(segmental.brazo_der.grasa_kg || (currentEval.grasa_corporal_kg * 0.067)).toFixed(1)} kg · {segmental.brazo_der.grasa_pct}%
                  </span>
                </div>
              </div>

              {/* Tronco */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-amber-400/20 space-y-2.5">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase block border-b border-white/5 pb-1">
                  Tronco / Abdomen
                </span>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">Grasa de Tronco:</span>
                  <span className="text-amber-400 font-bold text-sm">
                    {(segmental.tronco.grasa_kg || (currentEval.grasa_corporal_kg * 0.54)).toFixed(1)} kg
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">Nivel de Grasa:</span>
                  <span className="text-white font-bold">{segmental.tronco.grasa_pct}%</span>
                </div>
              </div>

              {/* Piernas */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-2.5">
                <span className="text-xs font-mono font-bold text-zinc-400 uppercase block border-b border-white/5 pb-1">
                  Tren Inferior (Piernas)
                </span>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">Pierna Izq (L):</span>
                  <span className="text-amber-400 font-bold">
                    {(segmental.pierna_izq.grasa_kg || (currentEval.grasa_corporal_kg * 0.147)).toFixed(1)} kg · {segmental.pierna_izq.grasa_pct}%
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">Pierna Der (R):</span>
                  <span className="text-amber-400 font-bold">
                    {(segmental.pierna_der.grasa_kg || (currentEval.grasa_corporal_kg * 0.147)).toFixed(1)} kg · {segmental.pierna_der.grasa_pct}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* B. Equilibrio Muscular */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-emerald-400 uppercase tracking-wide">
                Equilibrio Muscular
              </span>
              <span className="text-zinc-500 text-[11px]">Rango estándar: 90% - 110%</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Brazos */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-2.5">
                <span className="text-xs font-mono font-bold text-zinc-400 uppercase block border-b border-white/5 pb-1">
                  Tren Superior (Brazos)
                </span>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">Brazo Izq (L):</span>
                  <span className="text-emerald-400 font-bold">
                    {segmental.brazo_izq.musculo_kg.toFixed(1)} kg · {segmental.brazo_izq.musculo_pct || 105}%
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">Brazo Der (R):</span>
                  <span className="text-emerald-400 font-bold">
                    {segmental.brazo_der.musculo_kg.toFixed(1)} kg · {segmental.brazo_der.musculo_pct || 105}%
                  </span>
                </div>
              </div>

              {/* Tronco */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/20 space-y-2.5">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase block border-b border-white/5 pb-1">
                  Tronco & Espalda
                </span>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">Músculo Tronco:</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {segmental.tronco.musculo_kg.toFixed(1)} kg
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">Rango Simetría:</span>
                  <span className="text-white font-bold">{segmental.tronco.musculo_pct || 100}%</span>
                </div>
              </div>

              {/* Piernas */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-2.5">
                <span className="text-xs font-mono font-bold text-zinc-400 uppercase block border-b border-white/5 pb-1">
                  Tren Inferior (Piernas)
                </span>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">Pierna Izq (L):</span>
                  <span className="text-emerald-400 font-bold">
                    {segmental.pierna_izq.musculo_kg.toFixed(1)} kg · {segmental.pierna_izq.musculo_pct || 108}%
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">Pierna Der (R):</span>
                  <span className="text-emerald-400 font-bold">
                    {segmental.pierna_der.musculo_kg.toFixed(1)} kg · {segmental.pierna_der.musculo_pct || 108}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Control de Peso y Recomendaciones */}
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
        <div className="border-b border-white/5 pb-3">
          <span className="text-xs font-mono font-bold uppercase text-amber-400 tracking-wider">
            METAS DE RECOMPOSICIÓN
          </span>
          <h4 className="text-xl font-black uppercase text-white font-display">
            Control de Peso Objetivo
          </h4>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/5">
            <span className="text-zinc-500 block text-[10px] uppercase">Peso Objetivo</span>
            <span className="font-bold text-white text-base">
              {(currentEval.peso_objetivo_kg || (22.0 * Math.pow(currentEval.estatura_cm / 100, 2))).toFixed(1)} kg
            </span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">Recomendado</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/5">
            <span className="text-zinc-500 block text-[10px] uppercase">Control de peso</span>
            <span className={`font-bold text-base ${
              (currentEval.control_peso_kg || 0) <= 0 ? 'text-blue-400' : 'text-emerald-400'
            }`}>
              {(currentEval.control_peso_kg || 0) > 0 ? `+${currentEval.control_peso_kg}` : (currentEval.control_peso_kg || 0)} kg
            </span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">Ajuste total</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/5">
            <span className="text-zinc-500 block text-[10px] uppercase">Control de grasa</span>
            <span className={`font-bold text-base ${
              (currentEval.control_grasa_kg || 0) <= 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {(currentEval.control_grasa_kg || 0) > 0 ? `+${currentEval.control_grasa_kg}` : (currentEval.control_grasa_kg || 0)} kg
            </span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">Grasa neta</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/5">
            <span className="text-zinc-500 block text-[10px] uppercase">Control muscular</span>
            <span className="font-bold text-emerald-400 text-base">
              +{(currentEval.control_muscular_kg || 0).toFixed(1)} kg
            </span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">Consolidar masa</span>
          </div>
        </div>
      </div>
    </div>
  )}
</div>
      {/* Modal Generador de Story Card (Instagram / WhatsApp) */}
      <StoryCardModal
        isOpen={showStoryModal}
        onClose={() => setShowStoryModal(false)}
        evaluacion={currentEval}
        medallas={medallas}
        acumulado={acumulado}
        socioNombre={socioNombre}
      />
    </div>
  );
}
