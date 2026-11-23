// ==============================================================================
// TRANKILANDIA GYM · SERVICIO DE ANUNCIOS Y MENSAJES AL PARLANTE BLUETOOTH
// ==============================================================================
// Reproduce los audios oficiales de estudio generados con ElevenLabs a través del
// parlante Bluetooth conectado, respetando el volumen maestro y el silenciador.
// Incluye audios incrustados (base64) para carga instantánea y 100% offline sin
// errores 404 ni dependencia de sintetizadores de voz robóticos.
// ==============================================================================

import { getAlertVolume, isAlertMuted } from './audioVoiceAlerts';
import { OFFICIAL_ANNOUNCEMENTS_EMBEDDED } from './officialAnnouncementsData';
import { requestAudioDuck, releaseAudioDuck } from './autoAudioDucker';

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
  embeddedAudio?: string;
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
      '¡Atención, guerreros! Les recordamos que faltan 10 minutos para cerrar el gimnasio. Por favor, vayan culminando sus rutinas y dejando las máquinas y mancuernas en orden para realizar el cierre a la hora establecida. ¡Muchas gracias por su comprensión y por entrenar con nosotros!',
    audioPath: '/sounds/anuncios/cierre-10min.mp3',
    embeddedAudio: OFFICIAL_ANNOUNCEMENTS_EMBEDDED['cierre-10min'],
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
    duration: '6s',
    fullText:
      '¡Estimados guerreros! Recuerden guardar los accesorios en su lugar después de utilizarlo.',
    audioPath: '/sounds/anuncios/orden-accesorios.mp3',
    embeddedAudio: OFFICIAL_ANNOUNCEMENTS_EMBEDDED['orden-accesorios'],
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
    duration: '8s',
    fullText:
      '¡Atención guerreros y guerreras! Les informamos que ya se encuentra disponible nuestro instructor de clases grupales en el segundo nivel.',
    audioPath: '/sounds/anuncios/clases-grupales.mp3',
    embeddedAudio: OFFICIAL_ANNOUNCEMENTS_EMBEDDED['clases-grupales'],
  },
];

const CUSTOM_AUDIO_KEY_PREFIX = 'trankilandia_custom_audio_v2_';

// Limpieza de claves obsoletas v1 para evitar reproducir cachés robóticos anteriores
if (typeof window !== 'undefined') {
  try {
    ['cierre-10min', 'orden-accesorios', 'clases-grupales'].forEach((id) => {
      localStorage.removeItem('trankilandia_custom_audio_v1_' + id);
    });
  } catch {}
}

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
 * Elimina el audio personalizado y restaura el audio oficial de ElevenLabs.
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

  // Restaurar volumen de música de fondo (YouTube / Spotify)
  releaseAudioDuck('announcement');

  if (currentAnnouncementId !== null) {
    currentAnnouncementId = null;
    dispatchStateChange();
  }
}

/**
 * Reproduce un anuncio oficial (ElevenLabs incrustado) o personalizado por el parlante Bluetooth.
 * Si ya hay otro mensaje reproduciéndose, lo detiene primero.
 * NUNCA recurre a sintetizadores de voz robóticos de navegador.
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
    // Atenuar música de fondo (YouTube Music, Spotify, etc.) para que el anuncio se escuche con total nitidez
    await requestAudioDuck('announcement');

    const customSrc = getCustomAnnouncementAudio(id);
    // Prioridad: 1. Audio subido por usuario -> 2. Audio incrustado ElevenLabs -> 3. Ruta pública
    const audioSrc = customSrc || item.embeddedAudio || item.audioPath;

    const audio = new Audio(audioSrc);
    currentAudio = audio;

    const initialVol = isAlertMuted() ? 0 : getAlertVolume();
    audio.volume = Math.max(0, Math.min(1, initialVol));

    audio.onended = () => {
      releaseAudioDuck('announcement');
      if (currentAnnouncementId === id) {
        currentAnnouncementId = null;
        currentAudio = null;
        dispatchStateChange();
      }
    };

    audio.onerror = (e) => {
      console.warn(`[announcementsService] Error cargando "${audioSrc}":`, e);
      releaseAudioDuck('announcement');
      currentAudio = null;
      if (currentAnnouncementId === id) {
        currentAnnouncementId = null;
        dispatchStateChange();
      }
    };

    await audio.play();
  } catch (err) {
    console.warn('[announcementsService] Error al reproducir audio HTML5:', err);
    releaseAudioDuck('announcement');
    currentAudio = null;
    if (currentAnnouncementId === id) {
      currentAnnouncementId = null;
      dispatchStateChange();
    }
  }
}
