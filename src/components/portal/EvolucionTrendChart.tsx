import { useState, useMemo } from 'react';
import { Flame, Dumbbell, Scale, Sparkles } from 'lucide-react';
import { EvaluacionCorporal } from '../../types/evaluacion';

export type TrendMetricTab = 'musculo' | 'grasa' | 'peso';

export interface EvolucionTrendChartProps {
  evaluaciones: EvaluacionCorporal[];
  activeTab?: TrendMetricTab;
  onTabChange?: (tab: TrendMetricTab) => void;
  onSelectEval?: (evaluacion: EvaluacionCorporal) => void;
}

export default function EvolucionTrendChart({
  evaluaciones,
  activeTab: externalTab,
  onTabChange,
  onSelectEval,
}: EvolucionTrendChartProps) {
  const [internalTab, setInternalTab] = useState<TrendMetricTab>('musculo');
  const currentTab = externalTab ?? internalTab;

  const handleTabSelect = (tab: TrendMetricTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  // Ordenar cronológicamente (más antigua a más reciente para graficar de izquierda a derecha)
  const cronologicas = useMemo(() => {
    return [...evaluaciones].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );
  }, [evaluaciones]);

  const [tappedIndex, setTappedIndex] = useState<number | null>(
    cronologicas.length > 0 ? cronologicas.length - 1 : null
  );

  // Configuración visual por métrica
  const config = useMemo(() => {
    switch (currentTab) {
      case 'musculo':
        return {
          title: 'Masa Muscular',
          unit: 'kg',
          stroke: '#10B981', // emerald-500
          fillGradientId: 'gradMusculo',
          fillStart: 'rgba(16, 185, 129, 0.35)',
          fillEnd: 'rgba(16, 185, 129, 0.0)',
          badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
          getValue: (ev: EvaluacionCorporal) => ev.masa_muscular_kg,
          format: (v: number) => `${v.toFixed(1)} kg`,
          metaLabel: 'Músculo Firme',
        };
      case 'grasa':
        return {
          title: 'Grasa Corporal',
          unit: '%',
          stroke: '#F59E0B', // amber-500
          fillGradientId: 'gradGrasa',
          fillStart: 'rgba(245, 158, 11, 0.35)',
          fillEnd: 'rgba(245, 158, 11, 0.0)',
          badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          getValue: (ev: EvaluacionCorporal) => ev.grasa_corporal_pct,
          format: (v: number) => `${v.toFixed(1)}%`,
          metaLabel: 'Quema de Grasa',
        };
      case 'peso':
        return {
          title: 'Peso Total',
          unit: 'kg',
          stroke: '#38BDF8', // sky-400
          fillGradientId: 'gradPeso',
          fillStart: 'rgba(56, 189, 248, 0.35)',
          fillEnd: 'rgba(56, 189, 248, 0.0)',
          badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
          getValue: (ev: EvaluacionCorporal) => ev.peso_kg,
          format: (v: number) => `${v.toFixed(1)} kg`,
          metaLabel: 'Báscula Total',
        };
    }
  }, [currentTab]);

  // Si solo hay 1 evaluación
  if (cronologicas.length <= 1) {
    const single = cronologicas[0];
    const val = single ? config.getValue(single) : 0;
    return (
      <div className="bg-zinc-950 border border-white/5 rounded-3xl p-5 space-y-4">
        {/* Selector de Pestañas */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-900 rounded-2xl border border-white/5">
          <button
            type="button"
            onClick={() => handleTabSelect('musculo')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              currentTab === 'musculo'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span className="truncate">Músculo</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabSelect('grasa')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              currentTab === 'grasa'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="truncate">Grasa</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabSelect('peso')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              currentTab === 'peso'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span className="truncate">Peso</span>
          </button>
        </div>

        {/* Punto de inicio único */}
        <div className="text-center py-6 px-4 space-y-3 bg-zinc-900/40 rounded-2xl border border-dashed border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mx-auto text-amber-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase text-zinc-500 block">Punto de Partida</span>
            <span className="text-2xl font-black font-mono text-white">
              {config.format(val)}
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-sans max-w-xs mx-auto leading-relaxed">
            Tu curva de progreso se trazará automáticamente aquí a partir de tu <strong>segunda evaluación mensual</strong>.
          </p>
        </div>
      </div>
    );
  }

  // 2 o más evaluaciones: Generar coordenadas SVG
  const width = 340;
  const height = 150;
  const paddingX = 35;
  const paddingTop = 28;
  const paddingBottom = 32;

  const values = cronologicas.map((e) => config.getValue(e));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = Math.max(0.1, maxVal - minVal);

  const points = cronologicas.map((ev, i) => {
    const x = paddingX + (i / (cronologicas.length - 1)) * (width - 2 * paddingX);
    const yRatio = (config.getValue(ev) - minVal) / valRange;
    const y = height - paddingBottom - yRatio * (height - paddingTop - paddingBottom);
    return { x, y, ev, val: config.getValue(ev), index: i };
  });

  // Generar curva SVG suave (Catmull-Rom / Bézier cúbica)
  const pathD = useMemo(() => {
    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }, [points]);

  // Área sombreada bajo la curva
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  const tappedPoint = tappedIndex !== null ? points[tappedIndex] : points[points.length - 1];

  return (
    <div className="bg-zinc-950 border border-white/10 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xl">
      {/* 1. Selector de Pestañas Táctil */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-900 rounded-2xl border border-white/5">
        <button
          type="button"
          onClick={() => handleTabSelect('musculo')}
          className={`flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
            currentTab === 'musculo'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Dumbbell className="w-3.5 h-3.5" />
          <span className="truncate">Músculo</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabSelect('grasa')}
          className={`flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
            currentTab === 'grasa'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span className="truncate">Grasa</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabSelect('peso')}
          className={`flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
            currentTab === 'peso'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span className="truncate">Peso</span>
        </button>
      </div>

      {/* 2. Banner de Punto Seleccionado al Tocar */}
      {tappedPoint && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-zinc-900/80 border border-white/5 font-mono text-xs">
          <span className="text-zinc-400">
            {new Date(tappedPoint.ev.fecha).toLocaleDateString('es-PE', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-zinc-500">
              {config.metaLabel}:
            </span>
            <span
              className={`font-black text-sm px-2 py-0.5 rounded-lg border ${config.badgeColor}`}
            >
              {config.format(tappedPoint.val)}
            </span>
          </div>
        </div>
      )}

      {/* 3. Lienzo SVG Responsive para Celular */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none touch-manipulation"
        >
          <defs>
            <linearGradient id={config.fillGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={config.fillStart} />
              <stop offset="100%" stopColor={config.fillEnd} />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={config.stroke} floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Línea base horizontal */}
          <line
            x1={paddingX}
            y1={height - paddingBottom}
            x2={width - paddingX}
            y2={height - paddingBottom}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeDasharray="3 3"
          />

          {/* Área degradada bajo la curva */}
          <path d={areaD} fill={`url(#${config.fillGradientId})`} />

          {/* Trazo de la curva */}
          <path
            d={pathD}
            fill="none"
            stroke={config.stroke}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Puntos y Etiquetas */}
          {points.map((pt) => {
            const isSelected = tappedPoint && tappedPoint.index === pt.index;
            const fechaCorta = new Date(pt.ev.fecha).toLocaleDateString('es-PE', {
              day: 'numeric',
              month: 'short',
            });

            return (
              <g
                key={pt.index}
                className="cursor-pointer"
                onClick={() => {
                  setTappedIndex(pt.index);
                  onSelectEval?.(pt.ev);
                }}
              >
                {/* Zona de impacto táctil invisible más grande para dedos en celulares */}
                <circle cx={pt.x} cy={pt.y} r="18" fill="transparent" />

                {/* Resplandor exterior si está seleccionado */}
                {isSelected && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="8.5"
                    fill="none"
                    stroke={config.stroke}
                    strokeWidth="2"
                    opacity="0.8"
                  />
                )}

                {/* Punto principal */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 5.5 : 4}
                  fill={isSelected ? '#FFFFFF' : config.stroke}
                  stroke="#18181B"
                  strokeWidth="2"
                />

                {/* Valor numérico flotante arriba del punto */}
                <text
                  x={pt.x}
                  y={pt.y - 9}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {pt.val.toFixed(1)}
                </text>

                {/* Etiqueta de Fecha abajo del eje */}
                <text
                  x={pt.x}
                  y={height - paddingBottom + 16}
                  textAnchor="middle"
                  fill={isSelected ? '#FFFFFF' : '#71717A'}
                  fontSize="9.5"
                  fontWeight={isSelected ? 'bold' : 'normal'}
                  fontFamily="monospace"
                >
                  {fechaCorta}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="text-center pt-0.5">
        <span className="text-[10px] font-mono text-zinc-500">
          💡 Toca cualquier punto de la curva con el dedo para ver los detalles de esa fecha
        </span>
      </div>
    </div>
  );
}
