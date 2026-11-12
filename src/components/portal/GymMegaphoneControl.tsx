import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Bell,
  Volume2,
  AlertTriangle,
  ChevronDown,
  Activity,
} from 'lucide-react';
import {
  isMicrophoneActive,
  startMicrophone,
  stopMicrophone,
  toggleMicrophone,
  getMicrophoneGain,
  setMicrophoneGain,
  isMicChimeEnabled,
  setMicChimeEnabled,
  getMicMode,
  setMicMode,
  getMicrophoneAudioLevel,
  getMicrophoneError,
  playAnnouncementChime,
} from '../../lib/microphoneMegaphone';

export default function GymMegaphoneControl() {
  const [isActive, setIsActive] = useState<boolean>(isMicrophoneActive);
  const [gain, setGainState] = useState<number>(getMicrophoneGain);
  const [chimeEnabled, setChimeEnabledState] = useState<boolean>(isMicChimeEnabled);
  const [mode, setModeState] = useState<'toggle' | 'ptt'>(getMicMode);
  const [errorMessage, setErrorMessage] = useState<string | null>(getMicrophoneError);
  const [isOpen, setIsOpen] = useState(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isChiming, setIsChiming] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Escucha de eventos de cambio de estado del micrófono
  useEffect(() => {
    const handleMicStateChange = (e: any) => {
      const detail = e.detail;
      if (detail) {
        if (typeof detail.isActive === 'boolean') setIsActive(detail.isActive);
        if (typeof detail.gain === 'number') setGainState(detail.gain);
        if (typeof detail.chimeEnabled === 'boolean') setChimeEnabledState(detail.chimeEnabled);
        if (detail.mode) setModeState(detail.mode);
        setErrorMessage(detail.error || null);
      }
    };

    window.addEventListener('gym-mic-state-changed', handleMicStateChange);
    return () => {
      window.removeEventListener('gym-mic-state-changed', handleMicStateChange);
    };
  }, []);

  // Medidor VU Meter en tiempo real cuando el micrófono está activo
  useEffect(() => {
    let active = true;

    const updateVU = () => {
      if (!active) return;
      if (isMicrophoneActive()) {
        const lvl = getMicrophoneAudioLevel();
        setAudioLevel(lvl);
        animFrameRef.current = requestAnimationFrame(updateVU);
      } else {
        setAudioLevel(0);
      }
    };

    if (isActive) {
      updateVU();
    } else {
      setAudioLevel(0);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    }

    return () => {
      active = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isActive]);

  // Cerrar el popover al hacer clic afuera
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

  // Manejador del botón principal en modo Toggle
  const handleToggleClick = async () => {
    if (mode === 'ptt') {
      // En modo PTT, el botón del header abre la botonera de PTT
      setIsOpen(true);
      return;
    }
    await toggleMicrophone();
  };

  // Manejadores de Push-to-Talk (PTT)
  const handlePTTDown = async () => {
    if (mode !== 'ptt') return;
    await startMicrophone({ withChime: chimeEnabled });
  };

  const handlePTTUp = () => {
    if (mode !== 'ptt') return;
    stopMicrophone();
  };

  // Cambio del slider de ganancia / volumen de voz
  const handleGainSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setGainState(val);
    setMicrophoneGain(val);
  };

  const handleGainPreset = (val: number) => {
    setGainState(val);
    setMicrophoneGain(val);
  };

  // Reproducción manual del Ding-Dong
  const handleManualChime = async () => {
    if (isChiming) return;
    setIsChiming(true);
    await playAnnouncementChime();
    setIsChiming(false);
  };

  const gainPercent = Math.round(gain * 100);

  // Renderizador de barras del VU meter (12 segmentos)
  const renderVUBars = (totalBars = 12) => {
    const activeBars = Math.round((audioLevel / 100) * totalBars);
    return (
      <div className="flex items-center gap-1 h-3.5 w-full bg-zinc-950 p-1 rounded-md border border-white/5">
        {Array.from({ length: totalBars }).map((_, idx) => {
          const isLit = idx < activeBars;
          let barColor = 'bg-zinc-800';
          if (isLit) {
            if (idx < totalBars * 0.6) {
              barColor = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
            } else if (idx < totalBars * 0.85) {
              barColor = 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]';
            } else {
              barColor = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]';
            }
          }
          return (
            <div
              key={idx}
              className={`flex-1 h-full rounded-xs transition-colors duration-75 ${barColor}`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Botón Principal de Cabecera */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={handleToggleClick}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-l-xl text-xs font-bold transition-all cursor-pointer shadow-sm border ${
            isActive
              ? 'bg-red-600 hover:bg-red-700 text-white border-red-500 animate-pulse shadow-[0_0_14px_rgba(239,68,68,0.6)]'
              : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border-white/10'
          }`}
          title={
            isActive
              ? 'Microfono transmitiendo en vivo al parlante. Haz clic para apagar.'
              : 'Encender microfono para hablar por el parlante Bluetooth'
          }
        >
          {isActive ? (
            <>
              <Radio className="w-4 h-4 text-white animate-spin" />
              <span className="tracking-wider uppercase font-black">EN VIVO</span>
              {/* Mini indicador VU integrado */}
              <div className="flex items-center gap-0.5 h-3 ml-1">
                <span
                  className="w-1 bg-white rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(20, Math.min(100, audioLevel * 1.2))}%` }}
                />
                <span
                  className="w-1 bg-white rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(30, Math.min(100, audioLevel * 1.5))}%` }}
                />
                <span
                  className="w-1 bg-white rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(15, Math.min(100, audioLevel * 0.9))}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Microfono</span>
              <span className="sm:hidden">Mic</span>
            </>
          )}
        </button>

        {/* Boton para abrir panel de ajustes */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`px-2 py-1.5 rounded-r-xl border-y border-r text-xs transition-colors cursor-pointer ${
            isActive
              ? 'bg-red-700 hover:bg-red-800 text-white border-red-500'
              : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white border-white/10'
          }`}
          title="Ajustes de microfono, volumen y campana de aviso"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Popover Desplegable de Control Completo */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl bg-zinc-900/95 border border-white/10 shadow-2xl backdrop-blur-xl p-4 z-50 text-white animate-in fade-in zoom-in-95 duration-100">
          {/* Cabecera del Panel */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isActive ? 'bg-red-500/20 text-red-400' : 'bg-amber-400/20 text-amber-400'
                }`}
              >
                {isActive ? <Radio className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Megafono / Perifoneo
                </h3>
                <p className="text-[10px] text-zinc-400 font-mono">
                  Salida: Parlante Bluetooth Local
                </p>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isActive
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-zinc-800 text-zinc-400 border border-white/5'
              }`}
            >
              {isActive ? 'Transmitiendo' : 'En Espera'}
            </span>
          </div>

          {/* Mensaje de Error si ocurre */}
          {errorMessage && (
            <div className="mt-3 p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-[11px] leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Medidor VU en Vivo */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] mb-1 font-mono text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-zinc-400" />
                Nivel de Entrada de Voz
              </span>
              <span className={audioLevel > 5 ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                {isActive ? `${audioLevel}%` : 'Inactivo'}
              </span>
            </div>
            {renderVUBars(14)}
          </div>

          {/* Selector de Modo: Continuo vs Push-to-Talk */}
          <div className="mt-3.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              Modo de Operacion
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => {
                  setModeState('toggle');
                  setMicMode('toggle');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  mode === 'toggle'
                    ? 'bg-amber-400 text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Continuo (Clic)
              </button>
              <button
                type="button"
                onClick={() => {
                  setModeState('ptt');
                  setMicMode('ptt');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  mode === 'ptt'
                    ? 'bg-amber-400 text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Pulsar (PTT)
              </button>
            </div>
          </div>

          {/* Boton Principal de Accion segun el Modo */}
          <div className="mt-3.5">
            {mode === 'toggle' ? (
              <button
                type="button"
                onClick={async () => {
                  await toggleMicrophone();
                }}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                  isActive
                    ? 'bg-red-600 hover:bg-red-700 text-white border border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-zinc-950 border border-emerald-400'
                }`}
              >
                {isActive ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Apagar Microfono</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Encender Microfono</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onMouseDown={handlePTTDown}
                onMouseUp={handlePTTUp}
                onMouseLeave={handlePTTUp}
                onTouchStart={handlePTTDown}
                onTouchEnd={handlePTTUp}
                className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer select-none shadow-md ${
                  isActive
                    ? 'bg-red-600 text-white border border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.7)]'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 active:bg-red-600 active:text-white'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>{isActive ? 'HABLANDO (Suelte para callar)' : 'MANTENGA PRESIONADO PARA HABLAR'}</span>
              </button>
            )}
          </div>

          {/* Boton Ding-Dong / Jingle de Atencion */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleManualChime}
                disabled={isChiming}
                className="flex-1 py-1.5 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-white/5 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                title="Hacer sonar campana de atencion en el parlante"
              >
                <Bell className={`w-3.5 h-3.5 text-amber-400 ${isChiming ? 'animate-bounce' : ''}`} />
                <span>Sonar Ding-Dong</span>
              </button>

              <label
                className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer select-none"
                title="Tocar campana automaticamente antes de abrir el microfono"
              >
                <input
                  type="checkbox"
                  checked={chimeEnabled}
                  onChange={(e) => {
                    setChimeEnabledState(e.target.checked);
                    setMicChimeEnabled(e.target.checked);
                  }}
                  className="rounded border-zinc-700 bg-zinc-950 text-amber-400 focus:ring-0 cursor-pointer"
                />
                <span>Auto-aviso</span>
              </label>
            </div>
          </div>

          {/* Control de Ganancia / Volumen del Microfono */}
          <div className="mt-3.5 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                Volumen / Ganancia
              </span>
              <span className="font-mono text-amber-400 font-bold">{gainPercent}%</span>
            </div>

            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.05"
              value={gain}
              onChange={handleGainSlider}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
            />

            {/* Presets de Volumen */}
            <div className="grid grid-cols-4 gap-1 mt-2">
              {[
                { label: '80%', val: 0.8 },
                { label: '125%', val: 1.25 },
                { label: '180%', val: 1.8 },
                { label: '220%', val: 2.2 },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => handleGainPreset(p.val)}
                  className={`py-1 text-[10px] font-mono rounded-lg transition-colors cursor-pointer border ${
                    Math.abs(gain - p.val) < 0.04
                      ? 'bg-amber-400 text-black font-bold border-amber-400'
                      : 'bg-zinc-800/60 text-zinc-400 hover:text-white border-white/5'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mensaje Informativo Inferior */}
          <div className="mt-3.5 pt-2 border-t border-white/5 text-[10px] text-zinc-500 font-mono leading-tight">
            Transmision directa con filtro de graves y compresor de volumen. La salida utiliza el dispositivo de audio predeterminado de Windows (parlante Bluetooth).
          </div>
        </div>
      )}
    </div>
  );
}
