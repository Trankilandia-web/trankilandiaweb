import React, { useState, useEffect, useRef } from 'react';
import {
  Megaphone,
  Play,
  Square,
  Volume2,
  Clock,
  Dumbbell,
  Users,
  Radio,
  Upload,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  GYM_ANNOUNCEMENTS,
  GymAnnouncement,
  playAnnouncement,
  stopAnnouncement,
  getPlayingAnnouncementId,
  isAnnouncementPlaying,
  getCustomAnnouncementAudio,
  setCustomAnnouncementAudio,
  removeCustomAnnouncementAudio,
} from '../../lib/announcementsService';
import { getAlertVolume, isAlertMuted } from '../../lib/audioVoiceAlerts';

export default function GymAnnouncementsControl() {
  const [isOpen, setIsOpen] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(getPlayingAnnouncementId);
  const [isPlaying, setIsPlaying] = useState<boolean>(isAnnouncementPlaying);
  const [currentVolume, setCurrentVolume] = useState<number>(getAlertVolume);
  const [isMuted, setIsMuted] = useState<boolean>(isAlertMuted);
  const [customAudioMap, setCustomAudioMap] = useState<Record<string, boolean>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const refreshCustomMap = () => {
    const map: Record<string, boolean> = {};
    GYM_ANNOUNCEMENTS.forEach((a) => {
      map[a.id] = Boolean(getCustomAnnouncementAudio(a.id));
    });
    setCustomAudioMap(map);
  };

  useEffect(() => {
    refreshCustomMap();
  }, [isOpen]);

  // Escucha del estado de reproducción en vivo
  useEffect(() => {
    const handleStateChange = (e: any) => {
      const detail = e.detail;
      if (detail) {
        setPlayingId(detail.currentId ?? null);
        setIsPlaying(Boolean(detail.isPlaying));
      }
      refreshCustomMap();
    };

    const handleVolumeChange = (e: any) => {
      if (typeof e.detail?.volume === 'number') {
        setCurrentVolume(e.detail.volume);
      }
    };

    const handleMutedChange = (e: any) => {
      if (typeof e.detail?.muted === 'boolean') {
        setIsMuted(e.detail.muted);
      }
    };

    window.addEventListener('gym-announcement-state-changed', handleStateChange);
    window.addEventListener('gym-alert-volume-changed', handleVolumeChange);
    window.addEventListener('gym-alert-muted-changed', handleMutedChange);

    return () => {
      window.removeEventListener('gym-announcement-state-changed', handleStateChange);
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

  const handleTogglePlay = async (ann: GymAnnouncement) => {
    if (playingId === ann.id) {
      stopAnnouncement();
    } else {
      await playAnnouncement(ann.id);
    }
  };

  const handleFileUpload = (annId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result) {
        setCustomAnnouncementAudio(annId, result);
        refreshCustomMap();
      }
    };
    reader.readAsDataURL(file);
    // Limpiar input
    e.target.value = '';
  };

  const handleRestoreOfficial = (annId: string) => {
    removeCustomAnnouncementAudio(annId);
    refreshCustomMap();
  };

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'cierre-10min':
        return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      case 'orden-accesorios':
        return <Dumbbell className="w-3.5 h-3.5 text-cyan-400" />;
      case 'clases-grupales':
        return <Users className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Megaphone className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const volumePercent = isMuted ? 0 : Math.round(currentVolume * 100);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Botón Disparador en la Cabecera */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm border ${
          isPlaying
            ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.5)] animate-pulse'
            : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border-white/10'
        }`}
        title="Reproducir mensajes grabados de aviso por el parlante Bluetooth"
      >
        {isPlaying ? (
          <>
            <Radio className="w-4 h-4 text-black animate-spin" />
            <span className="tracking-wider uppercase font-black">AVISO ACTIVO</span>
            {/* Animación de ondas de sonido */}
            <div className="flex items-center gap-0.5 h-3 ml-0.5">
              <span className="w-1 bg-black rounded-full h-2 animate-bounce" />
              <span className="w-1 bg-black rounded-full h-3 animate-bounce [animation-delay:0.15s]" />
              <span className="w-1 bg-black rounded-full h-2 animate-bounce [animation-delay:0.3s]" />
            </div>
          </>
        ) : (
          <>
            <Megaphone className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Mensajes</span>
            <span className="sm:hidden">Avisos</span>
          </>
        )}
      </button>

      {/* Popover Desplegable */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-zinc-900/95 border border-white/10 shadow-2xl backdrop-blur-xl p-4 z-50 text-white animate-in fade-in zoom-in-95 duration-100">
          {/* Cabecera del Panel */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isPlaying ? 'bg-amber-400/20 text-amber-400' : 'bg-zinc-800 text-amber-400'
                }`}
              >
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Mensajes de Sala
                </h3>
                <p className="text-[10px] text-zinc-400 font-mono">
                  Salida: Parlante Bluetooth
                </p>
              </div>
            </div>

            {isPlaying && (
              <button
                type="button"
                onClick={stopAnnouncement}
                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                title="Detener el audio de inmediato"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Detener</span>
              </button>
            )}
          </div>

          {/* Lista de los 3 Mensajes Oficiales */}
          <div className="mt-3 space-y-2.5 max-h-[60vh] overflow-y-auto pr-0.5">
            {GYM_ANNOUNCEMENTS.map((ann) => {
              const isCurrentPlaying = playingId === ann.id;
              const hasCustomAudio = customAudioMap[ann.id];

              return (
                <div
                  key={ann.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isCurrentPlaying
                      ? 'bg-amber-400/10 border-amber-400/50 shadow-md shadow-amber-400/5'
                      : 'bg-zinc-950/70 border-white/5 hover:border-white/15'
                  }`}
                >
                  {/* Encabezado del anuncio */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${ann.badgeColor.bg} ${ann.badgeColor.text} ${ann.badgeColor.border}`}
                      >
                        {getCategoryIcon(ann.id)}
                        {ann.badge}
                      </span>
                      {hasCustomAudio && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                          <Sparkles className="w-2.5 h-2.5" />
                          Audio Propio
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">
                      ~{ann.duration}
                    </span>
                  </div>

                  {/* Título y texto */}
                  <h4 className="text-xs font-bold text-white mb-1">{ann.title}</h4>
                  <p className="text-[11px] text-zinc-400 leading-snug line-clamp-3 mb-2.5">
                    {ann.fullText}
                  </p>

                  {/* Input de archivo oculto para subir audio propio */}
                  <input
                    type="file"
                    accept="audio/*"
                    ref={(el) => {
                      fileInputRefs.current[ann.id] = el;
                    }}
                    onChange={(e) => handleFileUpload(ann.id, e)}
                    className="hidden"
                  />

                  {/* Botón de Reproducción */}
                  <button
                    type="button"
                    onClick={() => handleTogglePlay(ann)}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                      isCurrentPlaying
                        ? 'bg-red-600 hover:bg-red-700 text-white border border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                        : 'bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black hover:shadow-md'
                    }`}
                  >
                    {isCurrentPlaying ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Detener Mensaje</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Reproducir en Parlante</span>
                      </>
                    )}
                  </button>

                  {/* Opciones de personalización: Subir audio propio o restaurar */}
                  <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[ann.id]?.click()}
                      className="inline-flex items-center gap-1 hover:text-amber-400 transition-colors cursor-pointer py-0.5"
                      title="Subir una nota de voz de WhatsApp o archivo MP3 grabado para este mensaje"
                    >
                      <Upload className="w-3 h-3" />
                      <span>{hasCustomAudio ? 'Cambiar audio propio' : 'Subir audio propio'}</span>
                    </button>

                    {hasCustomAudio && (
                      <button
                        type="button"
                        onClick={() => handleRestoreOfficial(ann.id)}
                        className="inline-flex items-center gap-1 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer py-0.5"
                        title="Restaurar el audio oficial de estudio ElevenLabs"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restaurar original</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pie Informativo de Volumen y Estado */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
            <span className="flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-amber-400" />
              Volumen Parlante:
              <strong className={isMuted ? 'text-red-400' : 'text-amber-400'}>
                {isMuted ? 'Silenciado' : `${volumePercent}%`}
              </strong>
            </span>
            <span className="text-zinc-500">Audio Oficial ElevenLabs</span>
          </div>
        </div>
      )}
    </div>
  );
}
