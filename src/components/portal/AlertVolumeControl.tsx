import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Volume1, VolumeX, Sparkles, AlertCircle, ShoppingCart, CheckCircle2, Sliders } from 'lucide-react';
import {
  getAlertVolume,
  setAlertVolume,
  isAlertMuted,
  setAlertMuted,
  playGymAlert,
  GymAlertType,
} from '../../lib/audioVoiceAlerts';

export default function AlertVolumeControl() {
  const [volume, setVolumeState] = useState<number>(getAlertVolume);
  const [muted, setMutedState] = useState<boolean>(isAlertMuted);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTestingSound, setActiveTestingSound] = useState<GymAlertType | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleVolumeChange = (e: any) => {
      if (typeof e.detail?.volume === 'number') {
        setVolumeState(e.detail.volume);
      }
    };
    const handleMutedChange = (e: any) => {
      if (typeof e.detail?.muted === 'boolean') {
        setMutedState(e.detail.muted);
      }
    };

    window.addEventListener('gym-alert-volume-changed', handleVolumeChange);
    window.addEventListener('gym-alert-muted-changed', handleMutedChange);

    return () => {
      window.removeEventListener('gym-alert-volume-changed', handleVolumeChange);
      window.removeEventListener('gym-alert-muted-changed', handleMutedChange);
    };
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolumeState(val);
    setAlertVolume(val);
    if (muted && val > 0) {
      setMutedState(false);
      setAlertMuted(false);
    }
  };

  const handleToggleMute = () => {
    const newMuted = !muted;
    setMutedState(newMuted);
    setAlertMuted(newMuted);
    if (!newMuted && volume === 0) {
      setVolumeState(0.5);
      setAlertVolume(0.5);
    }
  };

  const handlePreset = (val: number) => {
    setVolumeState(val);
    setAlertVolume(val);
    setMutedState(false);
    setAlertMuted(false);
    playGymAlert('saludable');
  };

  const handleTestSound = (type: GymAlertType) => {
    setActiveTestingSound(type);
    playGymAlert(type);
    setTimeout(() => setActiveTestingSound(null), 500);
  };

  const percent = muted ? 0 : Math.round(volume * 100);

  const renderVolumeIcon = () => {
    if (muted || volume === 0) {
      return <VolumeX className="w-4 h-4 text-red-400" />;
    }
    if (volume < 0.4) {
      return <Volume1 className="w-4 h-4 text-amber-400" />;
    }
    return <Volume2 className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón Disparador de Barra de Navegación */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border shadow-sm ${
          isOpen
            ? 'bg-amber-400 text-black border-amber-300 shadow-amber-400/20'
            : 'bg-zinc-950/80 hover:bg-zinc-800 text-zinc-300 border-white/10'
        }`}
        title="Control de volumen de alertas de escáner y caja"
      >
        {renderVolumeIcon()}
        <span>{muted ? 'Silencio' : `${percent}%`}</span>
      </button>

      {/* Menú Desplegable con Control Deslizante y Prueba Acústica */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-zinc-900 border border-amber-400/30 rounded-3xl p-5 shadow-2xl z-50 text-white space-y-4 animate-scale-up backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black font-display uppercase tracking-wide text-white">
                  Volumen de Alertas
                </h4>
                <p className="text-[10px] text-zinc-400 font-mono">Control de escáner y caja</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleMute}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold uppercase transition-colors cursor-pointer border ${
                muted
                  ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                  : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10'
              }`}
            >
              {muted ? 'Reactivar' : 'Silenciar'}
            </button>
          </div>

          {/* Control Deslizante de Volumen */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">Nivel de Salida:</span>
              <span className="font-bold text-amber-400 text-sm">{percent}%</span>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={handleSliderChange}
              className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-amber-400 border border-white/10"
            />

            {/* Presets Rápidos */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { label: '0%', val: 0 },
                { label: '35%', val: 0.35 },
                { label: '70%', val: 0.7 },
                { label: '100%', val: 1 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePreset(p.val)}
                  className={`py-1 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer border ${
                    !muted && Math.abs(volume - p.val) < 0.08
                      ? 'bg-amber-400 text-black border-amber-300'
                      : 'bg-zinc-950 text-zinc-400 hover:text-white border-white/5 hover:bg-zinc-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Botones de Prueba Acústica Oficial */}
          <div className="space-y-2 pt-1 border-t border-white/5">
            <span className="text-[11px] font-mono text-zinc-400 font-bold uppercase tracking-wider block">
              Probar Alertas Acústicas:
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTestSound('saludable')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTestingSound === 'saludable'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 scale-98'
                    : 'bg-zinc-950 border-emerald-500/30 hover:border-emerald-400/60 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Saludable</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                  Acorde mayor brillante (Pase)
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTestSound('por_vencer')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTestingSound === 'por_vencer'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 scale-98'
                    : 'bg-zinc-950 border-amber-500/30 hover:border-amber-400/60 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Por Vencer</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                  Doble campana de aviso
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTestSound('vencida')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTestingSound === 'vencida'
                    ? 'bg-red-500/20 border-red-400 text-red-300 scale-98'
                    : 'bg-zinc-950 border-red-500/30 hover:border-red-400/60 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Vencida</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                  Doble pulso grave (Detención)
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleTestSound('producto_pos')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeTestingSound === 'producto_pos'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 scale-98'
                    : 'bg-zinc-950 border-cyan-500/30 hover:border-cyan-400/60 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                  <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                  <span>Producto POS</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                  Beep láser de caja (1760 Hz)
                </div>
              </button>
            </div>
          </div>

          {/* Reglas de Detección de Código de Barras */}
          <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-1 text-[10px] font-mono text-zinc-400">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Reglas del Escáner Inteligente:</span>
            </div>
            <div>• <strong className="text-amber-400">8 dígitos numéricos</strong>: DNI ➔ Ingreso de Socio</div>
            <div>• <strong className="text-cyan-400">12 ó 13 dígitos numéricos</strong>: Producto ➔ Agregado a POS</div>
          </div>
        </div>
      )}
    </div>
  );
}
