import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCode2DProps {
  value: string;
  size?: number;
  className?: string;
  darkColor?: string;
  lightColor?: string;
  includeMargin?: boolean;
}

/**
 * Componente declarativo para renderizar códigos QR 2D optimizados
 * para lectores omnidireccionales láser e imagen 2D (lectura 360° desde pantallas móviles).
 */
export default function QRCode2D({
  value,
  size = 180,
  className = '',
  darkColor = '#000000',
  lightColor = '#ffffff',
  includeMargin = true,
}: QRCode2DProps) {
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setSvgContent('');
      return;
    }

    let isMounted = true;

    // Generar SVG con alta corrección de errores (nivel M o Q) para lectura instantánea en celular
    QRCode.toString(value, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: includeMargin ? 2 : 0,
      width: size,
      color: {
        dark: darkColor,
        light: lightColor,
      },
    })
      .then((svg) => {
        if (isMounted) {
          setSvgContent(svg);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Error al generar código QR');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value, size, darkColor, lightColor, includeMargin]);

  if (error) {
    return (
      <div className="text-red-400 text-[10px] font-mono p-2 border border-red-500/20 rounded bg-red-500/5">
        QR Error: {error}
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div
        style={{ width: size, height: size }}
        className="animate-pulse bg-zinc-200 rounded-lg flex items-center justify-center text-zinc-400 text-xs font-mono"
      >
        Generando QR...
      </div>
    );
  }

  return (
    <div
      className={`inline-block select-none overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
