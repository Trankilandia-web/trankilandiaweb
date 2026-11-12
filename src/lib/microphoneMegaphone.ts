/**
 * TRANKILANDIA GYM · SISTEMA DE PERIFONEO Y MICRÓFONO EN VIVO
 * ==============================================================================
 * Conecta el micrófono de la PC directamente al parlante Bluetooth del gimnasio
 * en tiempo real para anuncios, avisos a atletas en sala y comunicados de mostrador.
 *
 * Características:
 * - Captura en baja latencia con cancelación de eco y supresión de ruido activa.
 * - Procesamiento acústico: Filtro Pasa-Altos (corte de golpes y zumbidos) +
 *   Compresor de dinámica (evita saturación y distorsión en el parlante Bluetooth).
 * - Control de ganancia / volumen del micrófono (50% a 250%).
 * - Jingle / Campana de atención acústica ("Ding-Dong") previa a los anuncios.
 * - Soporte para Modo Continuo (Manos libres) y Push-to-Talk (Mantener presionado).
 * - Medidor de nivel en vivo (VU meter) para verificar que la voz se transmita.
 * ==============================================================================
 */

import { getSharedAudioContext } from './audioVoiceAlerts';

export interface MicStatus {
  isActive: boolean;
  gain: number;
  chimeEnabled: boolean;
  error: string | null;
  mode: 'toggle' | 'ptt';
}

const STORAGE_GAIN_KEY = 'trankilandia_mic_gain_v1';
const STORAGE_CHIME_KEY = 'trankilandia_mic_chime_v1';
const STORAGE_MODE_KEY = 'trankilandia_mic_mode_v1';

let activeMediaStream: MediaStream | null = null;
let micSourceNode: MediaStreamAudioSourceNode | null = null;
let micGainNode: GainNode | null = null;
let micFilterNode: BiquadFilterNode | null = null;
let micCompressorNode: DynamicsCompressorNode | null = null;
let micAnalyserNode: AnalyserNode | null = null;

let isMicActiveState = false;
let currentMicError: string | null = null;

/**
 * Obtiene la ganancia / volumen del micrófono guardada (0.5 a 2.5). Por defecto: 1.25.
 */
export function getMicrophoneGain(): number {
  try {
    const raw = localStorage.getItem(STORAGE_GAIN_KEY);
    if (raw !== null) {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed) && parsed >= 0.2 && parsed <= 3.0) return parsed;
    }
  } catch {}
  return 1.25;
}

/**
 * Guarda y actualiza la ganancia del micrófono en tiempo real.
 */
export function setMicrophoneGain(newGain: number): void {
  const clamped = Math.max(0.2, Math.min(3.0, newGain));
  try {
    localStorage.setItem(STORAGE_GAIN_KEY, clamped.toString());
  } catch {}

  if (micGainNode && getSharedAudioContext()) {
    try {
      micGainNode.gain.setValueAtTime(clamped, getSharedAudioContext()!.currentTime);
    } catch {}
  }

  notifyMicStateChange();
}

/**
 * Verifica si la campana de atención previa (Ding-Dong) está activada.
 */
export function isMicChimeEnabled(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_CHIME_KEY);
    if (raw !== null) return raw === 'true';
  } catch {}
  return true;
}

/**
 * Activa o desactiva la campana previa.
 */
export function setMicChimeEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_CHIME_KEY, String(enabled));
  } catch {}
  notifyMicStateChange();
}

/**
 * Obtiene el modo de operación: 'toggle' (clic on/off) o 'ptt' (mantener presionado).
 */
export function getMicMode(): 'toggle' | 'ptt' {
  try {
    const raw = localStorage.getItem(STORAGE_MODE_KEY);
    if (raw === 'ptt' || raw === 'toggle') return raw;
  } catch {}
  return 'toggle';
}

/**
 * Guarda el modo de operación.
 */
export function setMicMode(mode: 'toggle' | 'ptt'): void {
  try {
    localStorage.setItem(STORAGE_MODE_KEY, mode);
  } catch {}
  notifyMicStateChange();
}

/**
 * Reproduce el jingle oficial de aviso / atención ("Ding-Dong" de gimnasio)
 * a través de la salida de audio conectada (Parlante Bluetooth).
 */
export async function playAnnouncementChime(): Promise<void> {
  const ctx = getSharedAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;

    // Tono 1: F5 (698.46 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(698.46, now);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.35, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Tono 2: C5 (523.25 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(523.25, now + 0.35);

    gain2.gain.setValueAtTime(0.001, now + 0.35);
    gain2.gain.exponentialRampToValueAtTime(0.4, now + 0.39);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.35);
    osc2.stop(now + 0.9);

    // Esperar a que concluya el jingle
    await new Promise((resolve) => setTimeout(resolve, 850));
  } catch (err) {
    console.warn('[playAnnouncementChime] Error reproduciendo campana:', err);
  }
}

/**
 * Inicia la transmisión en vivo del micrófono hacia el parlante Bluetooth.
 */
export async function startMicrophone(options?: { withChime?: boolean }): Promise<boolean> {
  if (isMicActiveState) return true;

  const ctx = getSharedAudioContext();
  if (!ctx) {
    currentMicError = 'AudioContext no soportado en este entorno.';
    notifyMicStateChange();
    return false;
  }

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // 1. Si está habilitado el jingle de atención, hacerlo sonar antes de abrir el micrófono
    const shouldPlayChime = options?.withChime ?? isMicChimeEnabled();
    if (shouldPlayChime) {
      await playAnnouncementChime();
    }

    // 2. Solicitar acceso al micrófono con configuración de voz profesional
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    };

    activeMediaStream = await navigator.mediaDevices.getUserMedia(constraints);

    // 3. Cadena de Procesamiento Web Audio API:
    // micSource -> micFilter (corte bajos <90Hz) -> micCompressor (evita picos) -> micGain -> micAnalyser -> destination
    micSourceNode = ctx.createMediaStreamSource(activeMediaStream);

    // Filtro Pasa-Altos a 90 Hz: Elimina golpes de mesa, viento y retumbos graves
    micFilterNode = ctx.createBiquadFilter();
    micFilterNode.type = 'highpass';
    micFilterNode.frequency.setValueAtTime(90, ctx.currentTime);
    micFilterNode.Q.setValueAtTime(0.7, ctx.currentTime);

    // Compresor de dinámica: Nivela la voz y protege el parlante Bluetooth de saturación
    micCompressorNode = ctx.createDynamicsCompressor();
    micCompressorNode.threshold.setValueAtTime(-20, ctx.currentTime);
    micCompressorNode.knee.setValueAtTime(10, ctx.currentTime);
    micCompressorNode.ratio.setValueAtTime(4, ctx.currentTime);
    micCompressorNode.attack.setValueAtTime(0.005, ctx.currentTime);
    micCompressorNode.release.setValueAtTime(0.2, ctx.currentTime);

    // Control de Ganancia / Volumen
    micGainNode = ctx.createGain();
    const gainValue = getMicrophoneGain();
    micGainNode.gain.setValueAtTime(gainValue, ctx.currentTime);

    // Analizador de nivel (para el VU Meter visual)
    micAnalyserNode = ctx.createAnalyser();
    micAnalyserNode.fftSize = 256;
    micAnalyserNode.smoothingTimeConstant = 0.5;

    // Conexión de la cadena hacia la salida física (Bluetooth / Parlantes)
    micSourceNode.connect(micFilterNode);
    micFilterNode.connect(micCompressorNode);
    micCompressorNode.connect(micGainNode);
    micGainNode.connect(micAnalyserNode);
    micGainNode.connect(ctx.destination);

    isMicActiveState = true;
    currentMicError = null;
    notifyMicStateChange();
    return true;
  } catch (err: any) {
    console.error('[startMicrophone] Error al acceder al micrófono:', err);
    isMicActiveState = false;
    currentMicError =
      err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
        ? 'Permiso de micrófono denegado. Concede acceso al micrófono para transmitir al parlante.'
        : err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError'
        ? 'No se detectó ningún micrófono conectado a la computadora.'
        : err?.message || 'Error desconocido al activar el micrófono.';

    notifyMicStateChange();
    stopMicrophone();
    return false;
  }
}

/**
 * Detiene la transmisión del micrófono de inmediato y apaga los dispositivos físicos.
 */
export function stopMicrophone(): void {
  try {
    if (micGainNode && getSharedAudioContext()) {
      try {
        micGainNode.gain.setValueAtTime(0, getSharedAudioContext()!.currentTime);
      } catch {}
    }

    if (micSourceNode) {
      try {
        micSourceNode.disconnect();
      } catch {}
      micSourceNode = null;
    }

    if (micFilterNode) {
      try {
        micFilterNode.disconnect();
      } catch {}
      micFilterNode = null;
    }

    if (micCompressorNode) {
      try {
        micCompressorNode.disconnect();
      } catch {}
      micCompressorNode = null;
    }

    if (micGainNode) {
      try {
        micGainNode.disconnect();
      } catch {}
      micGainNode = null;
    }

    if (micAnalyserNode) {
      try {
        micAnalyserNode.disconnect();
      } catch {}
      micAnalyserNode = null;
    }

    if (activeMediaStream) {
      activeMediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      activeMediaStream = null;
    }
  } catch (err) {
    console.warn('[stopMicrophone] Error cerrando nodos:', err);
  } finally {
    isMicActiveState = false;
    notifyMicStateChange();
  }
}

/**
 * Conmuta entre encendido y apagado del micrófono.
 */
export async function toggleMicrophone(options?: { withChime?: boolean }): Promise<boolean> {
  if (isMicActiveState) {
    stopMicrophone();
    return false;
  }
  return await startMicrophone(options);
}

/**
 * Retorna el estado actual del micrófono.
 */
export function isMicrophoneActive(): boolean {
  return isMicActiveState;
}

/**
 * Retorna el último mensaje de error, si existe.
 */
export function getMicrophoneError(): string | null {
  return currentMicError;
}

/**
 * Obtiene el nivel de audio actual (0 a 100) para visualización en el VU meter.
 */
export function getMicrophoneAudioLevel(): number {
  if (!isMicActiveState || !micAnalyserNode) return 0;
  try {
    const dataArray = new Uint8Array(micAnalyserNode.frequencyBinCount);
    micAnalyserNode.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    // Normalizado de 0 a 100 con escalado logarítmico suave
    return Math.min(100, Math.round((avg / 128) * 100));
  } catch {
    return 0;
  }
}

function notifyMicStateChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('gym-mic-state-changed', {
      detail: {
        isActive: isMicActiveState,
        gain: getMicrophoneGain(),
        chimeEnabled: isMicChimeEnabled(),
        error: currentMicError,
        mode: getMicMode(),
      },
    })
  );
}
