import { useState, useMemo } from 'react';
import {
  Target,
  Flame,
  Dumbbell,
  Calendar,
  Sparkles,
  Minus,
  Plus,
  Clock,
} from 'lucide-react';
import { EvaluacionCorporal } from '../../types/evaluacion';
import { calcularProyeccionMeta } from '../../lib/bioimpedanceEngine';

interface SimuladorMetasProps {
  evaluaciones: EvaluacionCorporal[];
  currentEval: EvaluacionCorporal;
}

export default function SimuladorMetas({ evaluaciones, currentEval }: SimuladorMetasProps) {
  const [tipo, setTipo] = useState<'grasa' | 'musculo'>('grasa');
  const [frecuenciaSemanal, setFrecuenciaSemanal] = useState<number>(3);

  // Valor por defecto según tipo
  const defaultGrasa = Math.max(10, Math.round(currentEval.grasa_corporal_pct - 3));
  const defaultMusculo = Number((currentEval.masa_muscular_kg + 2.0).toFixed(1));

  const [metaGrasa, setMetaGrasa] = useState<number>(defaultGrasa);
  const [metaMusculo, setMetaMusculo] = useState<number>(defaultMusculo);

  const valorActual = tipo === 'grasa' ? currentEval.grasa_corporal_pct : currentEval.masa_muscular_kg;
  const valorObjetivo = tipo === 'grasa' ? metaGrasa : metaMusculo;

  // Presets rápidos
  const presets = useMemo(() => {
    if (tipo === 'grasa') {
      const p1 = Math.max(10, Number((currentEval.grasa_corporal_pct - 1.5).toFixed(1)));
      const p2 = Math.max(8, Number((currentEval.grasa_corporal_pct - 3.5).toFixed(1)));
      const p3 = currentEval.sexo === 'Masculino' ? 12.0 : 18.0;
      return [
        { label: 'Conservador', valor: p1, desc: '-1.5%' },
        { label: 'Ideal', valor: p2, desc: '-3.5%' },
        { label: 'Atlético', valor: p3, desc: `${p3}%` },
      ];
    } else {
      const p1 = Number((currentEval.masa_muscular_kg + 1.0).toFixed(1));
      const p2 = Number((currentEval.masa_muscular_kg + 2.5).toFixed(1));
      const p3 = Number((currentEval.masa_muscular_kg + 5.0).toFixed(1));
      return [
        { label: 'Conservador', valor: p1, desc: '+1.0 kg' },
        { label: 'Ideal', valor: p2, desc: '+2.5 kg' },
        { label: 'Titán', valor: p3, desc: '+5.0 kg' },
      ];
    }
  }, [tipo, currentEval]);

  const proyeccion = useMemo(() => {
    return calcularProyeccionMeta(evaluaciones, {
      tipo,
      valorActual,
      valorObjetivo,
      frecuenciaSemanal,
    });
  }, [evaluaciones, tipo, valorActual, valorObjetivo, frecuenciaSemanal]);

  const fechaFormateada = new Date(proyeccion.fechaEstimada).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const cambiarValor = (delta: number) => {
    if (tipo === 'grasa') {
      setMetaGrasa((prev) => Math.max(5, Math.min(50, Number((prev + delta).toFixed(1)))));
    } else {
      setMetaMusculo((prev) => Math.max(15, Math.min(90, Number((prev + delta).toFixed(1)))));
    }
  };

  // Coordenadas SVG para la curva
  const svgWidth = 480;
  const svgHeight = 150;
  const paddingX = 40;
  const paddingY = 25;

  const puntos = proyeccion.puntosCurva;
  const valores = puntos.map((p) => p.valor);
  const minVal = Math.min(...valores) * 0.96;
  const maxVal = Math.max(...valores) * 1.04;
  const rangeVal = Math.max(0.1, maxVal - minVal);

  const getCoord = (idx: number, val: number) => {
    const x = paddingX + (idx / Math.max(1, puntos.length - 1)) * (svgWidth - 2 * paddingX);
    const y = svgHeight - paddingY - ((val - minVal) / rangeVal) * (svgHeight - 2 * paddingY);
    return { x, y };
  };

  // Separar puntos en históricos y proyectados
  const coords = puntos.map((p, idx) => ({ ...getCoord(idx, p.valor), punto: p }));

  const puntosHistoricos = coords.filter((c) => !c.punto.esProyectado);
  const puntosProyectados = coords.filter((c) => c.punto.esProyectado);

  const pathHistorico = puntosHistoricos.reduce(
    (acc, c, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`,
    ''
  );

  // La línea proyectada inicia en el último punto histórico
  const ultimoHistorico = puntosHistoricos[puntosHistoricos.length - 1] || coords[0];
  const pathProyectado = [ultimoHistorico, ...puntosProyectados].reduce(
    (acc, c, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`,
    ''
  );

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-amber-400 tracking-wider">
            <Target className="w-4 h-4" />
            <span>Simulador Interactivo</span>
          </div>
          <h4 className="text-xl sm:text-2xl font-black uppercase text-white font-display tracking-tight">
            Simulador de Metas
          </h4>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Proyecta en cuánto tiempo alcanzarás tu composición física ideal.
          </p>
        </div>

        {/* Switch Grasa vs Músculo */}
        <div className="inline-flex p-1 rounded-2xl bg-zinc-950 border border-white/5 font-mono text-xs">
          <button
            type="button"
            onClick={() => setTipo('grasa')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              tipo === 'grasa'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Grasa Corporal</span>
          </button>
          <button
            type="button"
            onClick={() => setTipo('musculo')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              tipo === 'musculo'
                ? 'bg-emerald-400 text-black shadow-md shadow-emerald-400/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Masa Muscular</span>
          </button>
        </div>
      </div>

      {/* Controles de Selección de Meta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Selector de Valor Objetivo */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400 uppercase">
              {tipo === 'grasa' ? 'Meta de Grasa (%)' : 'Meta de Músculo (kg)'}
            </span>
            <span className="text-zinc-500">
              Actual: <strong className="text-white">{valorActual.toFixed(1)}{tipo === 'grasa' ? '%' : ' kg'}</strong>
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => cambiarValor(tipo === 'grasa' ? -0.5 : -0.5)}
              className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
              title="Reducir"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="text-center font-mono">
              <span className="text-3xl font-black text-white">
                {valorObjetivo.toFixed(1)}
              </span>
              <span className="text-xs text-zinc-400 ml-1 font-bold">
                {tipo === 'grasa' ? '%' : 'kg'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => cambiarValor(tipo === 'grasa' ? 0.5 : 0.5)}
              className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
              title="Aumentar"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Presets Rápidos */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  if (tipo === 'grasa') setMetaGrasa(p.valor);
                  else setMetaMusculo(p.valor);
                }}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer border text-center ${
                  valorObjetivo === p.valor
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                    : 'bg-zinc-900/60 text-zinc-400 border-white/5 hover:text-white'
                }`}
              >
                <span className="block truncate">{p.label}</span>
                <span className="text-[9px] opacity-75 font-normal block">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Frecuencia Semanal */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400 uppercase">Frecuencia de Gym</span>
            <span className="text-amber-400 font-bold">{frecuenciaSemanal} días / semana</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[2, 3, 4, 5].map((dias) => (
              <button
                key={dias}
                type="button"
                onClick={() => setFrecuenciaSemanal(dias)}
                className={`py-3 rounded-xl font-mono font-black text-sm transition-all cursor-pointer border text-center ${
                  frecuenciaSemanal === dias
                    ? 'bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-400/20'
                    : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                }`}
              >
                {dias}x
              </button>
            ))}
          </div>

          <p className="text-[11px] text-zinc-500 font-sans leading-relaxed">
            {frecuenciaSemanal <= 2
              ? 'Ritmo moderado y sostenible. Ideal para iniciar.'
              : frecuenciaSemanal === 3
              ? 'Frecuencia óptima recomendada para recomposición corporal.'
              : 'Frecuencia avanzada. Mayor estímulo muscular y quema metabólica.'}
          </p>
        </div>
      </div>

      {/* Gráfico SVG de Proyección */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
          <span className="flex items-center gap-1.5 font-bold text-zinc-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Curva de Proyección Temporal</span>
          </span>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> Histórico
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 border-t border-dashed border-amber-400 inline-block" /> Proyectado
            </span>
          </div>
        </div>

        <div className="w-full overflow-hidden">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto">
            {/* Líneas horizontales de guía */}
            <line
              x1={paddingX}
              y1={paddingY}
              x2={svgWidth - paddingX}
              y2={paddingY}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="4 4"
            />
            <line
              x1={paddingX}
              y1={svgHeight - paddingY}
              x2={svgWidth - paddingX}
              y2={svgHeight - paddingY}
              stroke="rgba(255,255,255,0.05)"
            />

            {/* Path histórico (línea continua) */}
            {pathHistorico && (
              <path
                d={pathHistorico}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Path proyectado (línea punteada) */}
            {pathProyectado && (
              <path
                d={pathProyectado}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeDasharray="5 5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Puntos y etiquetas */}
            {coords.map((c, idx) => (
              <g key={idx}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={c.punto.esProyectado ? 4 : 4.5}
                  fill={c.punto.esProyectado ? '#f59e0b' : '#10b981'}
                  stroke="#09090b"
                  strokeWidth="2"
                />
                {c.punto.etiqueta && (
                  <text
                    x={c.x}
                    y={c.y - 10}
                    textAnchor="middle"
                    fill={c.punto.esProyectado ? '#f59e0b' : '#ffffff'}
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {c.punto.etiqueta} ({c.punto.valor}{tipo === 'grasa' ? '%' : 'kg'})
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Tarjeta de Veredicto de la Meta */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-400/10 via-zinc-950 to-zinc-950 border border-amber-400/20 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 uppercase">
            <Sparkles className="w-4 h-4" />
            <span>Fecha Estimada de Conquista</span>
          </div>
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${
              proyeccion.estadoFactibilidad === 'alcanzable'
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                : proyeccion.estadoFactibilidad === 'mantenimiento'
                ? 'text-blue-400 bg-blue-500/10 border-blue-500/30'
                : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
            }`}
          >
            {proyeccion.estadoFactibilidad}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <h5 className="text-xl sm:text-2xl font-black text-white uppercase font-display tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
            <span>{fechaFormateada}</span>
          </h5>
          <span className="text-xs font-mono text-zinc-400 font-bold">
            ~{proyeccion.semanasRestantes} semanas restantes
          </span>
        </div>

        <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
          {proyeccion.mensajeMotivacional}
        </p>
      </div>
    </div>
  );
}
