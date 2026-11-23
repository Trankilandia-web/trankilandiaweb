import { useState, useEffect } from 'react';
import {
  Scale,
  Calendar,
  Share2,
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

export interface EvolucionCorporalViewProps {
  socioDni: string;
  socioNombre?: string;
}

export default function EvolucionCorporalView({ socioDni, socioNombre }: EvolucionCorporalViewProps) {
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionCorporal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvalIndex, setSelectedEvalIndex] = useState(0);
  const [showDetallesTecnicos, setShowDetallesTecnicos] = useState(false);

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
  const sintesis = generarSintesisSaludCotidiana(currentEval);
  const medallas = calcularMedallasSocio(evaluaciones);

  const fechaFormateada = new Date(currentEval.fecha).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const fechaInicialCorta = new Date(initialEval.fecha).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
  });

  const fechaActualCorta = new Date(currentEval.fecha).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
  });

  // Compartir en WhatsApp
  const handleShare = () => {
    const texto = encodeURIComponent(
      `*MI EVOLUCIÓN EN TRANKILANDIA GYM* 🏋️‍♂️💪\n` +
      `📅 Fecha: ${fechaFormateada}\n` +
      `⭐ *Fit Score:* ${currentEval.puntuacion_corporal}/100 Pts\n\n` +
      `🏆 *Veredicto:* ${sintesis.fraseImpacto}\n` +
      `💪 *Masa Muscular:* ${currentEval.masa_muscular_kg.toFixed(1)} kg (${acumulado.delta_musculo_kg >= 0 ? '+' : ''}${acumulado.delta_musculo_kg} kg)\n` +
      `🔥 *Grasa Corporal:* ${currentEval.grasa_corporal_pct.toFixed(1)}% (${acumulado.delta_grasa_kg > 0 ? '+' : ''}${acumulado.delta_grasa_kg} kg grasa)\n` +
      `⚖️ *Peso Total:* ${currentEval.peso_kg.toFixed(1)} kg\n` +
      `🫀 *Grasa Visceral:* Nivel ${currentEval.grasa_visceral} (${sintesis.visceral.titulo})\n` +
      `⚡ *Metabolismo Basal:* ${currentEval.bmr_kcal} kcal/día\n\n` +
      `¡A seguir entrenando con todo en Trankilandia Gym!`
    );
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  };

  const segmental = currentEval.segmental_data;

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header con Resumen & Fit Score */}
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              <Scale className="w-4 h-4" />
              <span>Bioimpedancia Segmental (8 Electrodos)</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black uppercase text-white font-display tracking-tight">
              Mi Evolución Corporal
            </h3>
            <p className="text-xs text-zinc-400 font-mono flex items-center gap-2 pt-0.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>Evaluación del <strong className="text-white">{fechaFormateada}</strong></span>
              <span>·</span>
              <span className="text-zinc-500">Coach: {currentEval.evaluador_nombre}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleShare}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-2 text-xs font-mono"
              title="Compartir en WhatsApp"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Compartir</span>
            </button>

            {/* Fit Score Badge */}
            <div className="px-4 py-3 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-black font-mono shadow-lg shadow-amber-400/20 text-center min-w-[100px]">
              <span className="text-[10px] font-black uppercase tracking-wider block">FIT SCORE</span>
              <span className="text-2xl font-black leading-none">{currentEval.puntuacion_corporal}</span>
              <span className="text-[9px] font-bold block mt-0.5 opacity-80">/ 100 PTS</span>
            </div>
          </div>
        </div>

        {/* Selector de Fecha si hay varias evaluaciones */}
        {evaluaciones.length > 1 && (
          <div className="pt-2 border-t border-white/5 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[11px] font-mono text-zinc-500 uppercase shrink-0">Historial:</span>
            {evaluaciones.map((ev, idx) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => setSelectedEvalIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition-all cursor-pointer ${
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

      {/* 2. Tarjeta Hero de Veredicto Motivacional */}
      <div className="bg-gradient-to-br from-amber-400/15 via-zinc-900 to-zinc-950 border border-amber-400/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>{diagnostico.fase}</span>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 font-bold">
            {currentEval.puntuacion_corporal} Pts
          </span>
        </div>
        <h4 className="text-xl sm:text-2xl font-black text-white uppercase font-display tracking-tight leading-tight">
          {sintesis.fraseImpacto}
        </h4>
        <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
          {diagnostico.descripcion}
        </p>
      </div>

      {/* 3. Tarjeta Visual "Tu Transformación" (Antes vs Hoy) */}
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-amber-400 tracking-wider">
              <Zap className="w-3.5 h-3.5" />
              <span>Tu Transformación Acumulada</span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              {evaluaciones.length > 1
                ? `Inicio (${fechaInicialCorta}) → Hoy (${fechaActualCorta}) · ${acumulado.dias_totales} días de constancia`
                : 'Punto de partida registrado en tu primera evaluación'}
            </p>
          </div>
          {evaluaciones.length > 1 && (
            <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {acumulado.meta_progreso_pct}% a tu meta
            </span>
          )}
        </div>

        {/* Barras de Progreso Comparativas */}
        <div className="space-y-3.5 font-mono text-xs">
          {/* Músculo */}
          <div className="space-y-1.5 p-3.5 rounded-2xl bg-zinc-950 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5" />
                <span>Masa Muscular</span>
              </span>
              <span className="font-bold text-white text-sm">
                {currentEval.masa_muscular_kg.toFixed(1)} kg
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-400 h-2.5 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(15, (currentEval.masa_muscular_kg / (currentEval.peso_kg || 1)) * 130))}%`,
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-400">
              <span>Inicio: {initialEval.masa_muscular_kg.toFixed(1)} kg</span>
              <span className={`font-bold ${acumulado.delta_musculo_kg >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {acumulado.delta_musculo_kg >= 0 ? `+${acumulado.delta_musculo_kg}` : acumulado.delta_musculo_kg} kg de músculo
              </span>
            </div>
          </div>

          {/* Grasa */}
          <div className="space-y-1.5 p-3.5 rounded-2xl bg-zinc-950 border border-amber-400/20">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                <span>Grasa Corporal</span>
              </span>
              <span className="font-bold text-white text-sm">
                {currentEval.grasa_corporal_pct.toFixed(1)}% · {currentEval.grasa_corporal_kg.toFixed(1)} kg
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-amber-400 h-2.5 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(15, currentEval.grasa_corporal_pct * 2.2))}%`,
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-400">
              <span>Inicio: {initialEval.grasa_corporal_pct.toFixed(1)}%</span>
              <span className={`font-bold ${acumulado.delta_grasa_kg <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {acumulado.delta_grasa_kg > 0 ? `+${acumulado.delta_grasa_kg}` : acumulado.delta_grasa_kg} kg de grasa neta
              </span>
            </div>
          </div>

          {/* Peso */}
          <div className="space-y-1.5 p-3.5 rounded-2xl bg-zinc-950 border border-white/5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-zinc-400" />
                <span>Peso en Báscula</span>
              </span>
              <span className="font-bold text-white text-sm">
                {currentEval.peso_kg.toFixed(1)} kg
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-400">
              <span>Inicio: {initialEval.peso_kg.toFixed(1)} kg</span>
              <span className="text-zinc-300 font-bold">
                {acumulado.delta_peso_kg > 0 ? `+${acumulado.delta_peso_kg}` : acumulado.delta_peso_kg} kg total
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Gamificación: Medallas de Logro e Hitos */}
      <MedallasLogro medallas={medallas} socioNombre={socioNombre} />

      {/* 5. Gráfico Táctil de Tendencia Mobile */}
      <EvolucionTrendChart
        evaluaciones={evaluaciones}
        onSelectEval={(ev) => {
          const idx = evaluaciones.findIndex((e) => e.id === ev.id);
          if (idx !== -1) setSelectedEvalIndex(idx);
        }}
      />

      {/* 6. Simulador Interactivo de Metas */}
      <SimuladorMetas evaluaciones={evaluaciones} currentEval={currentEval} />

      {/* 7. Semáforos de Salud y Consejos en Lenguaje Cotidiano */}
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
          <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 space-y-2 shadow-lg">
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
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              {sintesis.visceral.descripcion}
            </p>
          </div>

          {/* Tarjeta 2: Motor Metabólico */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 space-y-2 shadow-lg">
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
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              {sintesis.metabolismo.descripcion}
            </p>
          </div>

          {/* Tarjeta 3: Hidratación */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 space-y-2 shadow-lg">
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
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              {sintesis.hidratacion.consejo}
            </p>
          </div>

          {/* Tarjeta 4: Consumo Proteico */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 space-y-2 shadow-lg">
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
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              {sintesis.proteina.consejo}
            </p>
          </div>
        </div>
      </div>

      {/* Botón Destacado de Compartir en WhatsApp */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleShare}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-black uppercase tracking-wider text-xs font-mono shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <Share2 className="w-4 h-4" />
          <span>Compartir Mi Evolución en WhatsApp</span>
        </button>
      </div>

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
    </div>
  );
}
