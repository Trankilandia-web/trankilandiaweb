// ==============================================================================
// TRANKILANDIA GYM · SISTEMA DE AUTO-DUCKING DE AUDIO DE FONDO
// ==============================================================================
// Reduce automáticamente el volumen de otras aplicaciones en Windows (YouTube,
// YouTube Music, Spotify, navegadores) al 15% cuando suena un anuncio oficial
// o se abre el micrófono/perifoneo, y restaura su volumen original al terminar.
// ==============================================================================

const STORAGE_DUCK_ENABLED_KEY = 'trankilandia_auto_ducking_enabled_v1';
const STORAGE_DUCK_LEVEL_KEY = 'trankilandia_auto_ducking_level_v1';

// Conjunto de fuentes activas que solicitan atenuación (ej: 'announcement', 'microphone')
const activeSources = new Set<string>();

/**
 * Indica si el auto-ducking está habilitado en la configuración. (Por defecto: true).
 */
export function isAutoDuckingEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(STORAGE_DUCK_ENABLED_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

/**
 * Activa o desactiva la atenuación automática de música externa.
 */
export function setAutoDuckingEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_DUCK_ENABLED_KEY, String(enabled));
    window.dispatchEvent(new CustomEvent('gym-auto-ducking-changed', { detail: { enabled } }));
  } catch {}
}

/**
 * Nivel de volumen al que se atenúa la música de fondo (0.0 a 1.0). Por defecto: 0.15 (15%).
 */
export function getAutoDuckingLevel(): number {
  if (typeof window === 'undefined') return 0.15;
  try {
    const val = localStorage.getItem(STORAGE_DUCK_LEVEL_KEY);
    if (val !== null) {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed >= 0.0 && parsed <= 0.8) return parsed;
    }
  } catch {}
  return 0.15;
}

/**
 * Define el nivel de volumen durante la atenuación.
 */
export function setAutoDuckingLevel(level: number): void {
  if (typeof window === 'undefined') return;
  const clamped = Math.max(0.0, Math.min(0.8, level));
  try {
    localStorage.setItem(STORAGE_DUCK_LEVEL_KEY, clamped.toString());
    window.dispatchEvent(new CustomEvent('gym-auto-ducking-changed', { detail: { level: clamped } }));
  } catch {}
}

/**
 * Indica si el audio de fondo está actualmente atenuado.
 */
export function isAudioDucked(): boolean {
  return activeSources.size > 0;
}

/**
 * Solicita atenuar la música externa (YouTube / Spotify / fondo).
 */
export async function requestAudioDuck(sourceId: string, customLevel?: number): Promise<void> {
  if (!isAutoDuckingEnabled()) return;

  const wasEmpty = activeSources.size === 0;
  activeSources.add(sourceId);

  if (wasEmpty) {
    const level = customLevel ?? getAutoDuckingLevel();
    if (typeof window !== 'undefined' && window.electronAPI?.duckBackgroundAudio) {
      try {
        await window.electronAPI.duckBackgroundAudio(level);
      } catch (err) {
        console.warn('[AutoAudioDucker] Falló al atenuar audio nativo:', err);
      }
    }
    dispatchDuckState(true);
  }
}

/**
 * Libera la atenuación de una fuente. Si no quedan fuentes activas, restaura el volumen de YouTube / música.
 */
export async function releaseAudioDuck(sourceId: string): Promise<void> {
  if (!activeSources.has(sourceId)) return;
  activeSources.delete(sourceId);

  if (activeSources.size === 0) {
    if (typeof window !== 'undefined' && window.electronAPI?.unduckBackgroundAudio) {
      try {
        await window.electronAPI.unduckBackgroundAudio();
      } catch (err) {
        console.warn('[AutoAudioDucker] Falló al restaurar audio nativo:', err);
      }
    }
    dispatchDuckState(false);
  }
}

/**
 * Fuerza la restauración inmediata del volumen de todas las aplicaciones de fondo.
 */
export async function forceRestoreAudioDuck(): Promise<void> {
  activeSources.clear();
  if (typeof window !== 'undefined' && window.electronAPI?.unduckBackgroundAudio) {
    try {
      await window.electronAPI.unduckBackgroundAudio();
    } catch {}
  }
  dispatchDuckState(false);
}

function dispatchDuckState(isDucked: boolean): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('gym-auto-duck-state-changed', {
      detail: {
        isDucked,
        activeSourcesCount: activeSources.size,
      },
    })
  );
}
