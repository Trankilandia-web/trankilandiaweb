import { useState, useMemo } from 'react';
import {
  User,
  Flame,
  Dumbbell,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import {
  EvaluacionCorporal,
  ModoSilueta,
  ExtremidadId,
} from '../../types/evaluacion';
import {
  calcularZonasCalorSilueta,
  analizarSimetriaCorporal,
} from '../../lib/bioimpedanceEngine';

interface SiluetaAnatomicaProps {
  evaluacion: EvaluacionCorporal;
}

export default function SiluetaAnatomica({ evaluacion }: SiluetaAnatomicaProps) {
  const [modo, setModo] = useState<ModoSilueta>('musculo');
  const [zonaSeleccionada, setZonaSeleccionada] = useState<ExtremidadId>('tronco');

  const zonas = useMemo(
    () => calcularZonasCalorSilueta(evaluacion, modo),
    [evaluacion, modo]
  );

  const simetria = useMemo(
    () => analizarSimetriaCorporal(evaluacion.segmental_data),
    [evaluacion.segmental_data]
  );

  const zonaActiva = zonas[zonaSeleccionada] || zonas.tronco;

  // Comparativa de simetría correspondiente
  const simetriaInfo = useMemo(() => {
    if (zonaSeleccionada === 'brazo_izq' || zonaSeleccionada === 'brazo_der') {
      return {
        titulo: 'Simetría de Brazos',
        detalle: simetria.brazos,
        contraparte:
          zonaSeleccionada === 'brazo_izq' ? 'Brazo Derecho' : 'Brazo Izquierdo',
      };
    }
    if (zonaSeleccionada === 'pierna_izq' || zonaSeleccionada === 'pierna_der') {
      return {
        titulo: 'Simetría de Piernas',
        detalle: simetria.piernas,
        contraparte:
          zonaSeleccionada === 'pierna_izq' ? 'Pierna Derecha' : 'Pierna Izquierda',
      };
    }
    return null;
  }, [zonaSeleccionada, simetria]);

  // SVG Paths
  const svgWidth = 280;
  const svgHeight = 440;

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-amber-400 tracking-wider">
            <User className="w-4 h-4" />
            <span>Mapa Corporal Segmental (8 Electrodos)</span>
          </div>
          <h4 className="text-xl sm:text-2xl font-black uppercase text-white font-display tracking-tight">
            Silueta Anatómica Visual
          </h4>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            {modo === 'musculo'
              ? 'Mapa de calor: Distribución y desarrollo de tu masa muscular.'
              : 'Distribución de Grasa Segmental: Concentración de tejido adiposo.'}
          </p>
        </div>

        {/* Toggle Modo: Músculo vs Grasa */}
        <div className="inline-flex p-1 rounded-2xl bg-zinc-950 border border-white/5 font-mono text-xs">
          <button
            type="button"
            onClick={() => setModo('musculo')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              modo === 'musculo'
                ? 'bg-emerald-400 text-black shadow-md shadow-emerald-400/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Ver Músculo</span>
          </button>
          <button
            type="button"
            onClick={() => setModo('grasa')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              modo === 'grasa'
                ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Ver Grasa</span>
          </button>
        </div>
      </div>

      {/* Grid Silueta & Detalle */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Columna Izquierda: Silueta SVG Táctil */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-3xl bg-zinc-950 border border-white/5 relative">
          {/* Leyenda de colores rápida */}
          <div className="w-full flex items-center justify-between text-[10px] font-mono mb-2 px-2 text-zinc-400 border-b border-white/5 pb-2">
            <span>{modo === 'musculo' ? 'Masa Muscular' : 'Tejido Graso'}</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{
                    backgroundColor: modo === 'musculo' ? '#10b981' : '#fbbf24',
                  }}
                />
                {modo === 'musculo' ? 'Estándar' : 'Óptimo'}
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{
                    backgroundColor: modo === 'musculo' ? '#38bdf8' : '#f87171',
                  }}
                />
                {modo === 'musculo' ? 'Desarrollado' : 'Elevado'}
              </span>
            </div>
          </div>

          {/* SVG Anatómico Humano */}
          <div className="relative w-full max-w-[240px] aspect-[280/440]">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-full drop-shadow-2xl select-none"
            >
              {/* Filtro de resplandor para selección */}
              <defs>
                <filter id="glow-selected" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ffffff" floodOpacity="0.6" />
                </filter>
              </defs>

              {/* Cabeza y cuello (silueta de referencia neutral) */}
              <circle cx="140" cy="42" r="22" fill="#27272a" stroke="#3f3f46" strokeWidth="1.5" />
              <path
                d="M 132 64 L 132 86 C 132 88, 148 88, 148 86 L 148 64 Z"
                fill="#27272a"
                stroke="#3f3f46"
                strokeWidth="1.5"
              />

              {/* 1. TRONCO */}
              <path
                d="M 96 88 C 118 84, 162 84, 184 88 C 190 128, 186 178, 174 228 C 154 238, 126 238, 106 228 C 94 178, 90 128, 96 88 Z"
                fill={zonas.tronco.colorHex}
                fillOpacity={zonaSeleccionada === 'tronco' ? 1 : 0.75}
                stroke={zonaSeleccionada === 'tronco' ? '#ffffff' : '#000000'}
                strokeWidth={zonaSeleccionada === 'tronco' ? 3 : 1.5}
                className="cursor-pointer transition-all duration-200 hover:opacity-100"
                onClick={() => setZonaSeleccionada('tronco')}
                filter={zonaSeleccionada === 'tronco' ? 'url(#glow-selected)' : undefined}
              />

              {/* 2. BRAZO IZQUIERDO (Visor Izq) */}
              <path
                d="M 94 92 C 76 102, 64 132, 62 176 C 60 200, 50 230, 48 255 C 56 260, 66 258, 70 246 C 76 222, 84 188, 86 172 C 90 148, 97 122, 102 102 Z"
                fill={zonas.brazo_izq.colorHex}
                fillOpacity={zonaSeleccionada === 'brazo_izq' ? 1 : 0.75}
                stroke={zonaSeleccionada === 'brazo_izq' ? '#ffffff' : '#000000'}
                strokeWidth={zonaSeleccionada === 'brazo_izq' ? 3 : 1.5}
                className="cursor-pointer transition-all duration-200 hover:opacity-100"
                onClick={() => setZonaSeleccionada('brazo_izq')}
                filter={zonaSeleccionada === 'brazo_izq' ? 'url(#glow-selected)' : undefined}
              />

              {/* 3. BRAZO DERECHO (Visor Der) */}
              <path
                d="M 186 92 C 204 102, 216 132, 218 176 C 220 200, 230 230, 232 255 C 224 260, 214 258, 210 246 C 204 222, 196 188, 194 172 C 190 148, 183 122, 178 102 Z"
                fill={zonas.brazo_der.colorHex}
                fillOpacity={zonaSeleccionada === 'brazo_der' ? 1 : 0.75}
                stroke={zonaSeleccionada === 'brazo_der' ? '#ffffff' : '#000000'}
                strokeWidth={zonaSeleccionada === 'brazo_der' ? 3 : 1.5}
                className="cursor-pointer transition-all duration-200 hover:opacity-100"
                onClick={() => setZonaSeleccionada('brazo_der')}
                filter={zonaSeleccionada === 'brazo_der' ? 'url(#glow-selected)' : undefined}
              />

              {/* 4. PIERNA IZQUIERDA */}
              <path
                d="M 108 232 C 104 272, 100 312, 102 338 C 103 362, 98 396, 96 418 C 108 420, 118 418, 120 402 C 124 372, 126 342, 127 332 C 130 298, 134 262, 136 240 Z"
                fill={zonas.pierna_izq.colorHex}
                fillOpacity={zonaSeleccionada === 'pierna_izq' ? 1 : 0.75}
                stroke={zonaSeleccionada === 'pierna_izq' ? '#ffffff' : '#000000'}
                strokeWidth={zonaSeleccionada === 'pierna_izq' ? 3 : 1.5}
                className="cursor-pointer transition-all duration-200 hover:opacity-100"
                onClick={() => setZonaSeleccionada('pierna_izq')}
                filter={zonaSeleccionada === 'pierna_izq' ? 'url(#glow-selected)' : undefined}
              />

              {/* 5. PIERNA DERECHA */}
              <path
                d="M 172 232 C 176 272, 180 312, 178 338 C 177 362, 182 396, 184 418 C 172 420, 162 418, 160 402 C 156 372, 154 342, 153 332 C 150 298, 146 262, 144 240 Z"
                fill={zonas.pierna_der.colorHex}
                fillOpacity={zonaSeleccionada === 'pierna_der' ? 1 : 0.75}
                stroke={zonaSeleccionada === 'pierna_der' ? '#ffffff' : '#000000'}
                strokeWidth={zonaSeleccionada === 'pierna_der' ? 3 : 1.5}
                className="cursor-pointer transition-all duration-200 hover:opacity-100"
                onClick={() => setZonaSeleccionada('pierna_der')}
                filter={zonaSeleccionada === 'pierna_der' ? 'url(#glow-selected)' : undefined}
              />

              {/* Alertas de simetría visual sobre extremidades */}
              {simetria.brazos.alertaDesbalance && (
                <circle cx="58" cy="180" r="8" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
              )}
              {simetria.piernas.alertaDesbalance && (
                <circle cx="102" cy="330" r="8" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
              )}
            </svg>
          </div>

          {/* Selector de zona por botones para máxima accesibilidad móvil */}
          <div className="w-full grid grid-cols-3 gap-1.5 pt-3 border-t border-white/5 mt-2">
            {[
              { id: 'brazo_izq', label: 'Brazo Izq' },
              { id: 'tronco', label: 'Tronco' },
              { id: 'brazo_der', label: 'Brazo Der' },
              { id: 'pierna_izq', label: 'Pierna Izq' },
              { id: 'pierna_der', label: 'Pierna Der' },
            ].map((z) => (
              <button
                key={z.id}
                type="button"
                aria-label={`Seleccionar ${z.label.toLowerCase() === 'brazo izq' ? 'brazo izquierdo' : z.label.toLowerCase() === 'brazo der' ? 'brazo derecho' : z.label.toLowerCase() === 'pierna izq' ? 'pierna izquierda' : z.label.toLowerCase() === 'pierna der' ? 'pierna derecha' : 'tronco'}`}
                onClick={() => setZonaSeleccionada(z.id as ExtremidadId)}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer border text-center ${
                  zonaSeleccionada === z.id
                    ? 'bg-white/10 text-white border-white/30 shadow'
                    : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                }`}
              >
                {z.label}
              </button>
            ))}
          </div>
        </div>

        {/* Columna Derecha: Tarjeta de Inspección de la Zona */}
        <div className="md:col-span-7 space-y-4">
          <div className="p-5 rounded-3xl bg-zinc-950 border border-white/10 space-y-4 shadow-lg">
            {/* Cabecera de la zona */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 block">
                  EXTREMIDAD INSPECCIONADA
                </span>
                <h5 className="text-xl sm:text-2xl font-black uppercase text-white font-display tracking-tight">
                  {zonaActiva.nombre}
                </h5>
              </div>

              <span
                className={`text-xs font-mono font-bold px-3 py-1 rounded-xl border uppercase ${zonaActiva.colorClase}`}
              >
                {modo === 'musculo' ? zonaActiva.nivelMusculo : zonaActiva.nivelGrasa}
              </span>
            </div>

            {/* Métricas clave en paralelo */}
            <div className="grid grid-cols-2 gap-3 font-mono">
              <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-emerald-500/20 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase flex items-center gap-1">
                  <Dumbbell className="w-3 h-3 text-emerald-400" />
                  Masa Muscular
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-emerald-400">
                    {zonaActiva.musculoKg.toFixed(1)}
                  </span>
                  <span className="text-xs text-zinc-400 font-bold">kg</span>
                </div>
                <span className="text-[11px] text-zinc-500 block">
                  {zonaActiva.musculoPct}% del estándar
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-amber-400/20 space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  Grasa Segmental
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-amber-400">
                    {zonaActiva.grasaKg.toFixed(1)}
                  </span>
                  <span className="text-xs text-zinc-400 font-bold">kg</span>
                </div>
                <span className="text-[11px] text-zinc-500 block">
                  {zonaActiva.grasaPct}% del estándar
                </span>
              </div>
            </div>

            {/* Veredicto de la extremidad */}
            <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed">
              {zonaActiva.descripcionEstado}
            </p>

            {/* Interpretación Clínica y Funcional */}
            {zonaActiva.interpretacionClinica && (
              <div className="p-3 rounded-2xl bg-zinc-900/80 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 block">
                  Función Biomecánica & Rendimiento
                </span>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  {zonaActiva.interpretacionClinica}
                </p>
              </div>
            )}

            {/* Ejercicios Recomendados en Trankilandia */}
            {zonaActiva.ejerciciosRecomendados && (
              <div className="p-3 rounded-2xl bg-amber-400/5 border border-amber-400/20 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5" />
                  <span>Ejercicios Clave en Trankilandia</span>
                </span>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  {zonaActiva.ejerciciosRecomendados}
                </p>
              </div>
            )}

            {/* Comparativa bilateral con contraparte */}
            {simetriaInfo && (
              <div className="pt-3 border-t border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Equilibrio vs {simetriaInfo.contraparte}</span>
                  </span>
                  <span
                    className={`font-black text-xs ${
                      simetriaInfo.detalle.alertaDesbalance
                        ? 'text-red-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {simetriaInfo.detalle.indiceSimetriaPct}% Simétrico
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                  {simetriaInfo.detalle.mensaje}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Banner de Simetría y Equilibrio Bilateral Global */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950 border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-300 uppercase">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Simetría y Equilibrio Bilateral</span>
          </div>

          <span
            className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase ${
              simetria.balanceGlobal === 'optimo'
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                : simetria.balanceGlobal === 'leve_asimetria'
                ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                : 'text-red-400 bg-red-500/10 border-red-500/30'
            }`}
          >
            {simetria.balanceGlobal === 'optimo'
              ? 'Simetría Óptima'
              : simetria.balanceGlobal === 'leve_asimetria'
              ? 'Leve Asimetría'
              : 'Desbalance Detectado'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-zinc-900 border border-white/5 space-y-1">
            <span className="text-zinc-400 font-bold block">Brazos (L vs R):</span>
            <span className="text-white block font-bold">
              {simetria.brazos.indiceSimetriaPct}% Simetría · Diff {simetria.brazos.diferenciaKg} kg
            </span>
            <span className="text-[11px] text-zinc-500 font-sans block">
              {simetria.brazos.mensaje}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-white/5 space-y-1">
            <span className="text-zinc-400 font-bold block">Piernas (L vs R):</span>
            <span className="text-white block font-bold">
              {simetria.piernas.indiceSimetriaPct}% Simetría · Diff {simetria.piernas.diferenciaKg} kg
            </span>
            <span className="text-[11px] text-zinc-500 font-sans block">
              {simetria.piernas.mensaje}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 text-[11px] font-sans text-zinc-400 leading-relaxed">
          <span className="font-bold text-zinc-300 font-mono text-[10px] uppercase block mb-0.5">
            ¿Por qué importa la simetría bilateral?
          </span>
          Un equilibrio menor al 10% entre ambos lados previene sobrecargas en articulaciones y tendones, garantiza una postura erguida y protege tu espalda baja en levantamientos como sentadillas, peso muerto y prensa.
        </div>
      </div>
    </div>
  );
}
