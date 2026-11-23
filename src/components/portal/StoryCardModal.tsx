import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Share2,
  Download,
  Flame,
  Sparkles,
  Zap,
  Smartphone,
  Square,
  Check,
} from 'lucide-react';
import {
  EvaluacionCorporal,
  MedallaLogro,
  ProgresoAcumulado,
  TemplateStory,
  FormatoStory,
} from '../../types/evaluacion';
import { prepararDatosStoryCard } from '../../lib/bioimpedanceEngine';
import { renderizarStoryCardCanvas } from '../../lib/storyCardCanvasRenderer';

export interface StoryCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluacion: EvaluacionCorporal;
  medallas: MedallaLogro[];
  acumulado: ProgresoAcumulado;
  socioNombre?: string;
}

export default function StoryCardModal({
  isOpen,
  onClose,
  evaluacion,
  medallas,
  acumulado,
  socioNombre,
}: StoryCardModalProps) {
  const [template, setTemplate] = useState<TemplateStory>('gradient_fire');
  const [formato, setFormato] = useState<FormatoStory>('story_9_16');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const datos = useMemoData(evaluacion, medallas, acumulado, socioNombre);

  const generarCanvas = useCallback(async () => {
    if (!canvasRef.current) return;
    await renderizarStoryCardCanvas(canvasRef.current, datos, { template, formato });
    try {
      const url = canvasRef.current.toDataURL('image/png');
      setPreviewUrl(url);
    } catch (err) {
      console.warn('Canvas export fallback:', err);
    }
  }, [datos, template, formato]);

  useEffect(() => {
    if (isOpen) {
      generarCanvas();
    }
  }, [isOpen, generarCanvas]);

  if (!isOpen) return null;

  const handleDescargar = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `trankilandia-${formato === 'story_9_16' ? 'story' : 'post'}-${evaluacion.socio_dni}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleCompartir = async () => {
    if (!canvasRef.current) return;

    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) {
          handleDescargar();
          return;
        }

        const file = new File([blob], 'trankilandia-evolucion.png', {
          type: 'image/png',
        });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Mi Evolución en Trankilandia Gym',
            text: '¡Mira mi progreso en Trankilandia Gym! 💪🔥 #TrankilandiaGym #FitScore',
          });
        } else {
          // Fallback a descarga directa
          handleDescargar();
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2500);
        }
      }, 'image/png');
    } catch {
      handleDescargar();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Canvas oculto de alta resolución (1080px) */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/5 shrink-0">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
              REDES SOCIALES · EXPORTADOR HD
            </span>
            <h4 className="text-lg sm:text-xl font-black uppercase text-white font-display tracking-tight">
              Story Card Generator
            </h4>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Selectores de Estilo & Formato */}
          <div className="space-y-2.5">
            {/* Formato: Story 9:16 vs Post 1:1 */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-zinc-950 border border-white/5 font-mono text-xs">
              <button
                type="button"
                onClick={() => setFormato('story_9_16')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  formato === 'story_9_16'
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Story 9:16</span>
              </button>
              <button
                type="button"
                onClick={() => setFormato('post_1_1')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  formato === 'post_1_1'
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Square className="w-3.5 h-3.5" />
                <span>Post 1:1</span>
              </button>
            </div>

            {/* Plantillas: Fuego, Minimal, Neón */}
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              {[
                { key: 'gradient_fire', label: 'Fuego', icon: Flame },
                { key: 'minimal_dark', label: 'Minimal', icon: Sparkles },
                { key: 'neon_gym', label: 'Neón', icon: Zap },
              ].map((t) => {
                const Icon = t.icon;
                const active = template === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTemplate(t.key as TemplateStory)}
                    className={`py-2 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                      active
                        ? 'bg-white/10 text-white border-amber-400/60 shadow-sm'
                        : 'bg-zinc-950 text-zinc-400 border-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-amber-400' : ''}`} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Previsualización de la Tarjeta */}
          <div className="flex justify-center p-3 rounded-2xl bg-zinc-950 border border-white/5">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Previsualización de Tarjeta"
                className={`rounded-xl shadow-2xl object-contain border border-white/10 ${
                  formato === 'story_9_16'
                    ? 'max-h-[360px] aspect-[9/16]'
                    : 'max-h-[280px] aspect-square'
                }`}
              />
            ) : (
              <div className="h-64 flex items-center justify-center font-mono text-xs text-zinc-500">
                Generando tarjeta en alta resolución...
              </div>
            )}
          </div>
        </div>

        {/* Footer con Botones de Acción */}
        <div className="p-4 sm:p-5 border-t border-white/5 bg-zinc-950/50 flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCompartir}
            className="w-full sm:flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black uppercase tracking-wider text-xs font-mono shadow-lg shadow-amber-400/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartir en Historia</span>
          </button>

          <button
            type="button"
            onClick={handleDescargar}
            className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white font-mono font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
            <span>{isCopied ? '¡Descargado!' : 'Descargar Imagen'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function useMemoData(
  evaluacion: EvaluacionCorporal,
  medallas: MedallaLogro[],
  acumulado: ProgresoAcumulado,
  socioNombre?: string
) {
  return useCallback(() => {
    return prepararDatosStoryCard(evaluacion, medallas, acumulado, socioNombre);
  }, [evaluacion, medallas, acumulado, socioNombre])();
}
