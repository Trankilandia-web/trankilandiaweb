import { useState, useEffect } from 'react';
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Calendar,
  Share2,
  Activity,
  Flame,
  Heart,
  MessageCircle,
} from 'lucide-react';
import { EvaluacionCorporal } from '../../types/evaluacion';
import {
  obtenerHistorialEvaluaciones,
} from '../../lib/evaluacionesService';
import {
  calcularDeltasMensuales,
  determinarDiagnostico,
  obtenerEstandarFitdays,
} from '../../lib/bioimpedanceEngine';

export interface EvolucionCorporalViewProps {
  socioDni: string;
  socioNombre?: string;
}

export default function EvolucionCorporalView({ socioDni }: EvolucionCorporalViewProps) {
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionCorporal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvalIndex, setSelectedEvalIndex] = useState(0);

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
  const deltas = calcularDeltasMensuales(currentEval, previousEval);
  const diagnostico = determinarDiagnostico(deltas, currentEval);

  const fechaFormateada = new Date(currentEval.fecha).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Compartir en WhatsApp
  const handleShare = () => {
    const texto = encodeURIComponent(
      `*MI EVOLUCIÓN EN TRANKILANDIA GYM*\n` +
      `📅 Fecha: ${fechaFormateada}\n` +
      `⭐ *Fit Score:* ${currentEval.puntuacion_corporal}/100\n` +
      `⚖️ *Peso:* ${currentEval.peso_kg.toFixed(2)} kg\n` +
      `💪 *Masa Muscular:* ${currentEval.masa_muscular_kg.toFixed(2)} kg (${currentEval.masa_muscular_pct}%)\n` +
      `🔥 *Grasa Corporal:* ${currentEval.grasa_corporal_pct}%\n` +
      `🫀 *Grasa Visceral:* Nivel ${currentEval.grasa_visceral}\n` +
      `💧 *Hidratación:* ${currentEval.agua_pct}%\n` +
      `⚡ *BMR:* ${currentEval.bmr_kcal} kcal/día\n\n` +
      `🏆 *Diagnóstico:* ${diagnostico.titulo}\n${diagnostico.descripcion}`
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

      {/* 2. Tarjeta de Diagnóstico de Recomposición */}
      <div className="bg-gradient-to-r from-amber-400/10 via-zinc-900 to-zinc-900 border border-amber-400/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{diagnostico.fase}</span>
        </div>
        <h4 className="text-lg sm:text-xl font-black text-white uppercase font-display">
          {diagnostico.titulo}
        </h4>
        <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
          {diagnostico.descripcion}
        </p>
      </div>

      {/* 3. Métricas Clave y Deltas Mensuales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Peso Total */}
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>Peso Total</span>
            <Scale className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
              {currentEval.peso_kg.toFixed(2)}
            </span>
            <span className="text-xs text-zinc-500 font-mono ml-1">kg</span>
          </div>
          <div className="mt-2 text-xs font-mono">
            {deltas ? (
              <span
                className={`inline-flex items-center gap-1 font-bold ${
                  deltas.delta_peso_kg < 0 ? 'text-blue-400' : 'text-zinc-300'
                }`}
              >
                {deltas.delta_peso_kg > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>{deltas.delta_peso_kg > 0 ? `+${deltas.delta_peso_kg}` : deltas.delta_peso_kg} kg</span>
              </span>
            ) : (
              <span className="text-zinc-500 text-[11px]">Medición base</span>
            )}
          </div>
        </div>

        {/* Masa Muscular */}
        <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
            <span>Masa Muscular</span>
            <Flame className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-tight">
              {currentEval.masa_muscular_kg.toFixed(2)}
            </span>
            <span className="text-xs text-zinc-500 font-mono ml-1">kg</span>
          </div>
          <div className="mt-2 text-xs font-mono">
            {deltas ? (
              <span
                className={`inline-flex items-center gap-1 font-bold ${
                  deltas.delta_musculo_kg >= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {deltas.delta_musculo_kg >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>{deltas.delta_musculo_kg > 0 ? `+${deltas.delta_musculo_kg}` : deltas.delta_musculo_kg} kg</span>
              </span>
            ) : (
              <span className="text-zinc-500 text-[11px]">{currentEval.masa_muscular_pct}% de tu cuerpo</span>
            )}
          </div>
        </div>

        {/* Grasa Corporal */}
        <div className="bg-zinc-900 border border-amber-400/30 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-amber-400">
            <span>% Grasa Corporal</span>
            <Activity className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-amber-400 tracking-tight">
              {currentEval.grasa_corporal_pct.toFixed(1)}
            </span>
            <span className="text-xs text-zinc-500 font-mono ml-1">%</span>
          </div>
          <div className="mt-2 text-xs font-mono">
            {deltas ? (
              <span
                className={`inline-flex items-center gap-1 font-bold ${
                  deltas.delta_grasa_pct <= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {deltas.delta_grasa_pct <= 0 ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5" />
                )}
                <span>{deltas.delta_grasa_pct > 0 ? `+${deltas.delta_grasa_pct}` : deltas.delta_grasa_pct}%</span>
              </span>
            ) : (
              <span className="text-zinc-500 text-[11px]">{currentEval.grasa_corporal_kg.toFixed(1)} kg grasa</span>
            )}
          </div>
        </div>

        {/* Grasa Visceral */}
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>Grasa Visceral</span>
            <Heart className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
              {currentEval.grasa_visceral}
            </span>
            <span className="text-xs text-zinc-500 font-mono ml-1">/ 50</span>
          </div>
          <div className="mt-2 text-xs font-mono">
            <span className={`font-bold ${currentEval.grasa_visceral <= 9 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {currentEval.grasa_visceral <= 9 ? 'Nivel Saludable' : 'Nivel Elevado'}
            </span>
          </div>
        </div>
      </div>

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
  );
}
