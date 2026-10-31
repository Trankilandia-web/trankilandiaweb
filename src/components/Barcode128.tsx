import React from 'react';
import { encodeCode128B } from '../lib/barcode128';

export interface Barcode128Props {
  value?: string | null;
  moduleWidth?: number;
  height?: number;
  quietZone?: number;
  includeText?: boolean;
  className?: string;
}

/**
 * Componente SVG declarativo para Código de Barras Industrial Code 128 (1D)
 * - Renderizado instantáneo (100% determinístico sin problemas de timing en Canvas)
 * - Fondo blanco puro (#FFFFFF) y barras negras puras (#000000)
 * - Márgenes laterales Quiet Zone >= 18px obligatorios para lectura con pistolas láser/CCD
 * - Tipografía monoespaciada de alta legibilidad
 */
export default function Barcode128({
  value,
  moduleWidth = 2,
  height = 54,
  quietZone = 18,
  includeText = true,
  className = '',
}: Barcode128Props): React.JSX.Element {
  const clean = (value || '').trim();

  if (!clean) {
    return (
      <div className="py-4 text-xs font-mono text-zinc-400 text-center">
        DNI no disponible para código de barras
      </div>
    );
  }

  const modules = encodeCode128B(clean);
  const totalModuleUnits = modules.reduce((sum, m) => sum + m.width, 0);
  const totalWidth = totalModuleUnits * moduleWidth + quietZone * 2;
  const totalHeight = height + (includeText ? 24 : 8);

  let currentX = quietZone;
  const bars: Array<{ x: number; width: number }> = [];

  modules.forEach((mod) => {
    const w = mod.width * moduleWidth;
    if (mod.isBlack) {
      bars.push({ x: currentX, width: w });
    }
    currentX += w;
  });

  return (
    <div className={`flex flex-col items-center justify-center w-full overflow-hidden ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="w-full max-w-[320px] h-auto drop-shadow-sm select-none"
        style={{ shapeRendering: 'crispEdges' }}
        aria-label={`Código de barras Code 128 para DNI ${clean}`}
      >
        {/* Fondo blanco puro obligatorio */}
        <rect x="0" y="0" width={totalWidth} height={totalHeight} fill="#FFFFFF" rx="4" />

        {/* Barras negras puras */}
        {bars.map((bar, i) => (
          <rect
            key={i}
            x={bar.x}
            y={6}
            width={bar.width}
            height={height}
            fill="#000000"
          />
        ))}

        {/* Texto numérico centrado debajo del código */}
        {includeText && (
          <text
            x={totalWidth / 2}
            y={height + 18}
            textAnchor="middle"
            fill="#000000"
            fontFamily='"Courier New", Courier, monospace, sans-serif'
            fontWeight="900"
            fontSize="14"
            letterSpacing="3px"
          >
            {clean}
          </text>
        )}
      </svg>
    </div>
  );
}
