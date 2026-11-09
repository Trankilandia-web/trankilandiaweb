import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, Sparkles, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extraerDniPeru } from '../../lib/dniParser';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanDni: (dni: string) => void;
}

export default function CameraScannerModal({
  isOpen,
  onClose,
  onScanDni,
}: CameraScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [highContrastMode, setHighContrastMode] = useState(true); // Activo por defecto para DNI Azul
  const [detectedDni, setDetectedDni] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setDetectedDni(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);
      }
    } catch (err: any) {
      setCameraError(
        'No se pudo acceder a la cámara. Verifica los permisos del navegador o selecciona otra cámara.'
      );
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Ciclo de detección de código de barras
  useEffect(() => {
    if (!isScanning || !isOpen) return;

    let detector: any = null;
    const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

    if (hasBarcodeDetector) {
      try {
        detector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'code_39', 'qr_code', 'pdf417', 'data_matrix', 'ean_13'],
        });
      } catch {
        detector = null;
      }
    }

    let isProcessing = false;

    const scanFrame = async () => {
      if (!isScanning || !videoRef.current || videoRef.current.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      if (detector && !isProcessing) {
        isProcessing = true;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            for (const b of barcodes) {
              const rawVal = b.rawValue;
              const clean = extraerDniPeru(rawVal);
              if (clean) {
                setDetectedDni(clean);
                stopCamera();
                onScanDni(clean);
                return;
              }
            }
          }
        } catch {}
        isProcessing = false;
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isScanning, isOpen, onScanDni, stopCamera]);

  const handleManualDniSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const manualDni = String(formData.get('manualDni') || '');
    const clean = extraerDniPeru(manualDni);
    if (clean) {
      onScanDni(clean);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-zinc-900 border border-amber-400/30 rounded-3xl p-5 shadow-2xl overflow-hidden font-mono text-xs text-white"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-400 text-black font-black">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white font-display uppercase tracking-tight">
                  Escáner Óptico de DNI
                </h3>
                <p className="text-[10px] text-zinc-400">
                  Optimizado para DNI Azul Clásico y DNI Electrónico (DNIe)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Toggle Filtro Anti-Brillo DNI Azul */}
          <div className="my-3 flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-bold text-zinc-200">
                Filtro Alto Contraste (DNI Azul Antiguo)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setHighContrastMode(!highContrastMode)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                highContrastMode
                  ? 'bg-amber-400 text-black shadow-sm'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {highContrastMode ? 'ACTIVADO · ANTI-REFLEJO' : 'DESACTIVADO'}
            </button>
          </div>

          {/* Video Preview con Guía de DNI */}
          <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
            {cameraError ? (
              <div className="p-6 text-center text-red-400 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto" />
                <p className="text-xs">{cameraError}</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] cursor-pointer"
                >
                  Reintentar Cámara
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-all ${
                    highContrastMode
                      ? 'contrast-200 grayscale brightness-110 saturate-0'
                      : ''
                  }`}
                />

                {/* Retícula de Enfoque */}
                <div className="absolute inset-8 border-2 border-dashed border-amber-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                  <div className="flex justify-between text-[10px] text-amber-300 font-bold bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm self-start">
                    <span>Ubica el código de barras o QR</span>
                  </div>
                  <div className="w-full h-0.5 bg-amber-400/60 shadow-[0_0_12px_rgba(251,191,36,0.8)] animate-pulse" />
                  <div className="flex justify-end text-[9px] text-zinc-400 bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm self-end">
                    <span>Reverso DNI Azul o DNIe</span>
                  </div>
                </div>

                {/* Indicador de lectura exitosa */}
                {detectedDni && (
                  <div className="absolute inset-0 bg-emerald-500/30 backdrop-blur-sm flex items-center justify-center">
                    <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-400 text-emerald-400 font-black text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>DNI DETECTADO: {detectedDni}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Canvas oculto para análisis */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Footer Controls: Cambiar Cámara y Fallback manual */}
          <div className="mt-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Alternar Cámara ({facingMode === 'environment' ? 'Trasera' : 'Frontal'})</span>
              </button>

              <span className="text-zinc-500 text-[10px]">Lente optimizado</span>
            </div>

            {/* Fallback de digitación rápida directa */}
            <form onSubmit={handleManualDniSubmit} className="flex gap-2 pt-1">
              <input
                type="text"
                name="manualDni"
                placeholder="O digita el DNI aquí (8 o 9 dígitos)..."
                maxLength={10}
                className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold uppercase text-[11px] cursor-pointer"
              >
                Ingresar
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
