// ==============================================================================
// TRANKILANDIA GYM · SERVICIO DE ANUNCIOS Y MENSAJES AL PARLANTE BLUETOOTH
// ==============================================================================
// Permite reproducir los mensajes oficiales del gimnasio a través del parlante
// Bluetooth conectado, respetando el volumen maestro y el silenciador.
// Admite también subir audios personalizados propios (ej. nota de voz de WhatsApp).
// ==============================================================================

import { getAlertVolume, isAlertMuted, speakGymAnnouncement, cleanSpeechText } from './audioVoiceAlerts';

export interface GymAnnouncement {
  id: string;
  title: string;
  badge: string;
  badgeColor: {
    bg: string;
    text: string;
    border: string;
  };
  duration: string;
  fullText: string;
  audioPath: string;
}

export const GYM_ANNOUNCEMENTS: GymAnnouncement[] = [
  {
    id: 'cierre-10min',
    title: 'Aviso de Cierre (10 min)',
    badge: 'Cierre',
    badgeColor: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
    },
    duration: '17s',
    fullText:
      '¡Atención, guerreros! Les recordamos que faltan 10 minutos para cerrar el gimnasio. Por favor vayan culminando sus rutinas y dejando las máquinas y mancuernas en orden para realizar el cierre a la hora establecida. ¡Muchas gracias por su comprensión y por entrenar con nosotros!',
    audioPath: '/sounds/anuncios/cierre-10min.mp3',
  },
  {
    id: 'orden-accesorios',
    title: 'Orden y Cuidado de Accesorios',
    badge: 'Disciplina',
    badgeColor: {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
    },
    duration: '10s',
    fullText:
      '¡Estimados guerreros! Recuerden devolver y guardar cada accesorio en su lugar después de utilizarlo. ¡El orden y la disciplina es responsabilidad de todos!',
    audioPath: '/sounds/anuncios/orden-accesorios.mp3',
  },
  {
    id: 'clases-grupales',
    title: 'Inicio de Clases Grupales (2do Piso)',
    badge: 'Clases',
    badgeColor: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
    },
    duration: '9s',
    fullText:
      '¡Guerreros y guerreras! Ya llegó nuestra profesora. ¡Los esperamos a todos en el segundo piso para disfrutar de nuestras clases grupales!',
    audioPath: '/sounds/anuncios/clases-grupales.mp3',
  },
];

const CUSTOM_AUDIO_KEY_PREFIX = 'trankilandia_custom_audio_v1_';

let currentAudio: HTMLAudioElement | null = null;
let currentAnnouncementId: string | null = null;

/**
 * Obtiene el audio personalizado si el usuario subió uno propio para este anuncio.
 */
export function getCustomAnnouncementAudio(id: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(CUSTOM_AUDIO_KEY_PREFIX + id);
  } catch {
    return null;
  }
}

/**
 * Guarda un audio personalizado en base64 para reemplazar el anuncio por defecto.
 */
export function setCustomAnnouncementAudio(id: string, dataUrl: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_AUDIO_KEY_PREFIX + id, dataUrl);
    dispatchStateChange();
  } catch (e) {
    console.error('Error al guardar audio personalizado:', e);
  }
}

/**
 * Elimina el audio personalizado y restaura el audio de estudio oficial.
 */
export function removeCustomAnnouncementAudio(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CUSTOM_AUDIO_KEY_PREFIX + id);
    dispatchStateChange();
  } catch {}
}

// Escuchar cambios de volumen y mute para modular el audio activo en vivo
if (typeof window !== 'undefined') {
  window.addEventListener('gym-alert-volume-changed', (e: any) => {
    if (currentAudio && typeof e.detail?.volume === 'number') {
      currentAudio.volume = isAlertMuted() ? 0 : Math.max(0, Math.min(1, e.detail.volume));
    }
  });

  window.addEventListener('gym-alert-muted-changed', (e: any) => {
    if (currentAudio && typeof e.detail?.muted === 'boolean') {
      currentAudio.volume = e.detail.muted ? 0 : getAlertVolume();
    }
  });
}

function dispatchStateChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('gym-announcement-state-changed', {
      detail: {
        currentId: currentAnnouncementId,
        isPlaying: currentAnnouncementId !== null,
      },
    })
  );
}

/**
 * Retorna el identificador del anuncio reproduciéndose actualmente o null si está en reposo.
 */
export function getPlayingAnnouncementId(): string | null {
  return currentAnnouncementId;
}

/**
 * Indica si hay algún anuncio reproduciéndose en el parlante.
 */
export function isAnnouncementPlaying(): boolean {
  return currentAnnouncementId !== null;
}

/**
 * Detiene cualquier anuncio que se esté emitiendo por el parlante.
 */
export function stopAnnouncement(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.onended = null;
      currentAudio.onerror = null;
    } catch {}
    currentAudio = null;
  }

  // Cancelar también síntesis de voz en caso de fallback
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }

  if (currentAnnouncementId !== null) {
    currentAnnouncementId = null;
    dispatchStateChange();
  }
}

/**
 * Reproduce un anuncio oficial o personalizado por el parlante Bluetooth.
 * Si ya hay otro mensaje reproduciéndose, lo detiene primero.
 */
export async function playAnnouncement(id: string): Promise<void> {
  const item = GYM_ANNOUNCEMENTS.find((a) => a.id === id);
  if (!item) {
    console.warn(`[announcementsService] No se encontró el anuncio con id: "${id}"`);
    return;
  }

  // Detener previo si existe
  stopAnnouncement();

  currentAnnouncementId = id;
  dispatchStateChange();

  if (typeof window === 'undefined') return;

  try {
    const customSrc = getCustomAnnouncementAudio(id);
    const audioSrc = customSrc || item.audioPath;

    const audio = new Audio(audioSrc);
    currentAudio = audio;

    const initialVol = isAlertMuted() ? 0 : getAlertVolume();
    audio.volume = Math.max(0, Math.min(1, initialVol));

    audio.onended = () => {
      if (currentAnnouncementId === id) {
        currentAnnouncementId = null;
        currentAudio = null;
        dispatchStateChange();
      }
    };

    audio.onerror = () => {
      console.warn(`[announcementsService] Error cargando "${audioSrc}". Usando fallback de voz.`);
      currentAudio = null;
      // Fallback a síntesis vocal limpia
      speakGymAnnouncement(cleanSpeechText(item.fullText));
      // Tras el tiempo estimado, restaurar estado
      setTimeout(() => {
        if (currentAnnouncementId === id) {
          currentAnnouncementId = null;
          dispatchStateChange();
        }
      }, 8000);
    };

    await audio.play();
  } catch (err) {
    console.warn('[announcementsService] Error al reproducir audio HTML5:', err);
    // Fallback a voz sintética
    speakGymAnnouncement(cleanSpeechText(item.fullText));
  }
}
