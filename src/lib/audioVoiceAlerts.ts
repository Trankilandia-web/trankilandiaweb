// ==============================================================================
// TRANKILANDIA GYM · SISTEMA DE ALERTAS SONORAS, SÍNTESIS DE VOZ Y VOLUMEN
// ==============================================================================
// Soporte para:
// - Regla de Escáner inteligente:
//   * 8 dígitos numéricos -> DNI (Ingreso de Socio)
//   * 12 o 13 dígitos numéricos -> Producto (POS)
// - Personalización acústica por estado:
//   * Saludable: Acorde mayor armónico ascendente (C5-E5-G5-C6)
//   * Por Vencer / Deuda: Doble campana de notificación cálida (D5-A5)
//   * Vencida: Doble pulso grave descendente disonante (F#3-D3)
//   * Producto POS: Beep láser de caja registradora (1760 Hz puro)
//   * Producto No Encontrado: Doble tono de advertencia (330Hz-220Hz)
//   * Rebote: Glissando descendente (440Hz -> 330Hz)
//   * Error: Doble pulso grave de detención (180 Hz)
// - Control de volumen persistente y opción de silenciado rápido
// ==============================================================================

export type GymAlertType =
  | 'saludable'
  | 'por_vencer'
  | 'vencida'
  | 'producto_pos'
  | 'producto_no_encontrado'
  | 'rebote'
  | 'error';

export interface LiveScanEvent {
  id: string;
  timestamp: number;
  status: 'al_dia' | 'por_vencer' | 'vencido' | 'con_deuda' | 'rebote' | 'no_encontrado' | 'no_inscrito';
  athleteName: string;
  dni: string;
  plan: string;
  daysRemaining?: number;
  balanceDue?: number;
  shift?: string;
  spokenText: string;
  alertTitle: string;
}

const STORAGE_KEY = 'trankilandia_last_live_scan';
const VOICE_ENABLED_KEY = 'trankilandia_voice_alerts_enabled';
const ALERT_VOLUME_KEY = 'trankilandia_alert_volume_v1';
const ALERT_MUTED_KEY = 'trankilandia_alert_muted_v1';

// Canal de difusión en tiempo real entre navegador del mostrador y el móvil
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('trankilandia_live_scans_channel');
  }
} catch {
  // Fallback si no está disponible BroadcastChannel
}

let sharedAudioContext: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContextClass();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

/**
 * Obtiene el volumen configurado de las alertas (0.0 a 1.0).
 * Por defecto: 0.8 (80%).
 */
export function getAlertVolume(): number {
  try {
    const raw = localStorage.getItem(ALERT_VOLUME_KEY);
    if (raw === null) return 0.8;
    const parsed = parseFloat(raw);
    return isNaN(parsed) ? 0.8 : Math.max(0, Math.min(1, parsed));
  } catch {
    return 0.8;
  }
}

/**
 * Establece y persiste el volumen del sistema de sonido.
 */
export function setAlertVolume(volume: number): void {
  try {
    const clamped = Math.max(0, Math.min(1, volume));
    localStorage.setItem(ALERT_VOLUME_KEY, clamped.toString());
    window.dispatchEvent(
      new CustomEvent('gym-alert-volume-changed', { detail: { volume: clamped } })
    );
  } catch {}
}

/**
 * Indica si el audio de alertas se encuentra silenciado.
 */
export function isAlertMuted(): boolean {
  try {
    return localStorage.getItem(ALERT_MUTED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Silencia o activa el sonido de las alertas.
 */
export function setAlertMuted(muted: boolean): void {
  try {
    localStorage.setItem(ALERT_MUTED_KEY, muted ? 'true' : 'false');
    window.dispatchEvent(
      new CustomEvent('gym-alert-muted-changed', { detail: { muted } })
    );
  } catch {}
}

export const isVoiceAlertsEnabled = (): boolean => {
  try {
    const val = localStorage.getItem(VOICE_ENABLED_KEY);
    return val === null ? true : val === 'true'; // Activo por defecto
  } catch {
    return true;
  }
};

export const setVoiceAlertsEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(VOICE_ENABLED_KEY, String(enabled));
  } catch {}
};

/**
 * Sintetizador de voz en español natural con modulación de volumen.
 */
export function speakGymAnnouncement(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!isVoiceAlertsEnabled() || isAlertMuted()) return;

  const currentVol = getAlertVolume();
  if (currentVol <= 0) return;

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-PE';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = currentVol;

    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(
      (v) => v.lang.startsWith('es-PE') || v.lang.startsWith('es-MX') || v.lang.startsWith('es')
    );
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Error al emitir síntesis de voz:', err);
  }
}

/**
 * Motor Acústico Principal de Alertas Sonoras de Trankilandia Gym
 * Genera síntesis Web Audio API modulada por el control de volumen maestro.
 */
export function playGymAlert(type: GymAlertType): void {
  if (typeof window === 'undefined') return;
  if (isAlertMuted()) return;

  const masterVol = getAlertVolume();
  if (masterVol <= 0) return;

  // 1. Vibración háptica en dispositivos móviles compatibles
  try {
    if ('vibrate' in navigator) {
      if (type === 'vencida' || type === 'error') {
        navigator.vibrate([300, 100, 300, 100, 300]);
      } else if (type === 'por_vencer' || type === 'producto_no_encontrado') {
        navigator.vibrate([250, 100, 250]);
      } else if (type === 'saludable' || type === 'producto_pos') {
        navigator.vibrate(100);
      }
    }
  } catch {}

  // 2. Generación acústica de precisión con Web Audio API
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'saludable') {
      // =========================================================================
      // ALERTA 1: MEMBRESÍA SALUDABLE (ACCESO CONCEDIDO)
      // Acorde armónico ascendente en Do Mayor brillante (C5 -> E5 -> G5 -> C6)
      // =========================================================================
      const notes = [
        { freq: 523.25, time: 0, dur: 0.12 },     // C5
        { freq: 659.25, time: 0.06, dur: 0.14 },  // E5
        { freq: 783.99, time: 0.12, dur: 0.16 },  // G5
        { freq: 1046.50, time: 0.18, dur: 0.28 }, // C6
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        const targetGain = masterVol * 0.22;
        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.exponentialRampToValueAtTime(targetGain, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + time);
        osc.stop(now + time + dur + 0.02);
      });
    } else if (type === 'por_vencer') {
      // =========================================================================
      // ALERTA 2: MEMBRESÍA POR VENCER O CON SALDO PENDIENTE
      // Doble campana de aviso cálida (D5 -> A5)
      // Notificación amistosa que llama la atención de recepción para el cobro
      // =========================================================================
      const chimes = [
        { freq: 587.33, time: 0, dur: 0.16, wave: 'sine' as OscillatorType },
        { freq: 880.00, time: 0.12, dur: 0.32, wave: 'triangle' as OscillatorType },
      ];

      chimes.forEach(({ freq, time, dur, wave }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, now + time);

        const targetGain = masterVol * 0.26;
        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.exponentialRampToValueAtTime(targetGain, now + time + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + time);
        osc.stop(now + time + dur + 0.02);
      });
    } else if (type === 'vencida') {
      // =========================================================================
      // ALERTA 3: MEMBRESÍA VENCIDA
      // Doble tono grave descendente y disonante (F#3 185Hz -> D3 146Hz)
      // Indica inequívocamente detención / renovación requerida
      // =========================================================================
      const pulses = [
        { freq: 185.00, time: 0, dur: 0.14 },
        { freq: 146.83, time: 0.18, dur: 0.24 },
      ];

      pulses.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + time);

        const targetGain = masterVol * 0.30;
        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.linearRampToValueAtTime(targetGain, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + time);
        osc.stop(now + time + dur + 0.02);
      });
    } else if (type === 'producto_pos') {
      // =========================================================================
      // ALERTA 4: PRODUCTO ESCANEADO PARA POS (12 O 13 DÍGITOS)
      // Clásico beep de caja registradora / lector láser de mostrador (1760 Hz puro)
      // =========================================================================
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, now);

      const targetGain = masterVol * 0.25;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'producto_no_encontrado') {
      // =========================================================================
      // ALERTA 5: PRODUCTO NO ENCONTRADO EN EL CATÁLOGO
      // Dos beeps rápidos de advertencia (330 Hz -> 220 Hz)
      // =========================================================================
      const errorNotes = [
        { freq: 330, time: 0, dur: 0.09 },
        { freq: 220, time: 0.11, dur: 0.12 },
      ];
      errorNotes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + time);

        const targetGain = masterVol * 0.18;
        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.linearRampToValueAtTime(targetGain, now + time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + time);
        osc.stop(now + time + dur + 0.02);
      });
    } else if (type === 'rebote') {
      // Socio ya en sala en los últimos 90 minutos
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.12);

      gain.gain.setValueAtTime(masterVol * 0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else {
      // DNI no registrado / Error general (doble 180 Hz)
      [0, 0.12].forEach((time) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now + time);
        gain.gain.setValueAtTime(masterVol * 0.28, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.09);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + time);
        osc.stop(now + time + 0.1);
      });
    }
  } catch (err) {
    console.warn('[playGymAlert] Error en síntesis de audio:', err);
  }
}

/**
 * Función de compatibilidad para llamadas previas
 */
export function playAccessAlert(type: 'success' | 'warning' | 'error' | 'rebote'): void {
  const map: Record<string, GymAlertType> = {
    success: 'saludable',
    warning: 'por_vencer',
    error: 'vencida',
    rebote: 'rebote',
  };
  playGymAlert(map[type] || 'saludable');
}

/**
 * Difunde el escaneo en tiempo real para sincronización multidispositivo.
 */
export function broadcastLiveScan(event: LiveScanEvent): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
    if (broadcastChannel) {
      broadcastChannel.postMessage(event);
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(`Trankilandia Gym: ${event.alertTitle}`, {
        body: `${event.athleteName} - ${event.plan}. ${event.spokenText}`,
        icon: '/favicon.svg',
        tag: 'gym-access-alert',
      });
    }
  } catch (err) {
    console.warn('Error en broadcastLiveScan:', err);
  }
}

/**
 * Hook / Suscripción para escuchar escaneos en vivo en el celular
 */
export function subscribeToLiveScans(callback: (event: LiveScanEvent) => void): () => void {
  const handleMessage = (e: MessageEvent) => {
    if (e.data && e.data.athleteName) {
      callback(e.data);
    }
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(parsed);
      } catch {}
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleMessage);
  }
  window.addEventListener('storage', handleStorage);

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleMessage);
    }
    window.removeEventListener('storage', handleStorage);
  };
}
