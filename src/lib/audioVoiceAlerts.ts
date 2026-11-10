// ==============================================================================
// TRANKILANDIA GYM · SISTEMA DE ALERTAS DE VOZ, TONOS Y SINCRONIZACIÓN MÓVIL
// ==============================================================================
// Diseñado para que la administradora (Marisol) reciba alertas por voz y notificaciones
// en su teléfono mientras limpia o se desplaza por las instalaciones del gimnasio.
// ==============================================================================

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

// Canal de difusión en tiempo real entre navegador del mostrador y el móvil
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('trankilandia_live_scans_channel');
  }
} catch {
  // Fallback si no está disponible BroadcastChannel
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
 * Sintetizador de voz en español natural
 * Emite por los parlantes del celular o del PC el nombre del socio y su estado
 */
export function speakGymAnnouncement(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!isVoiceAlertsEnabled()) return;

  try {
    // Cancelar anuncios en cola anteriores para emitir de inmediato el actual
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-PE'; // Español de Perú / Latinoamericano
    utterance.rate = 1.05; // Velocidad enérgica y clara
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Buscar voz en español si está disponible en el dispositivo
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
 * Emite sonido sintético de alerta y vibra el teléfono móvil
 */
export function playAccessAlert(type: 'success' | 'warning' | 'error' | 'rebote'): void {
  if (typeof window === 'undefined') return;

  // 1. Vibración en móviles (Android / navegadores con soporte)
  try {
    if ('vibrate' in navigator) {
      if (type === 'error') {
        navigator.vibrate([300, 100, 300, 100, 300]); // Triple vibración fuerte (Vencido)
      } else if (type === 'warning') {
        navigator.vibrate([250, 100, 250]); // Doble vibración (Por vencer o deuda)
      } else if (type === 'success') {
        navigator.vibrate(150); // Vibración corta de confirmación
      }
    }
  } catch {}

  // 2. Tono de audio sintetizado con Web Audio API
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (type === 'success') {
      // Audio beep agudo 880Hz ascendente
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'warning') {
      // Tono grave 220Hz (vencido / advertencia)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'error') {
      // Dos beeps cortos graves (DNI no registrado / error)
      const t = ctx.currentTime;
      // Primer beep corto grave (180Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(180, t);
      gain1.gain.setValueAtTime(0.3, t);
      gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.1);

      // Segundo beep corto grave (180Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(180, t + 0.13);
      gain2.gain.setValueAtTime(0.3, t + 0.13);
      gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t + 0.13);
      osc2.stop(t + 0.23);
    } else if (type === 'rebote') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    }
  } catch {}
}

/**
 * Difunde el escaneo en tiempo real para que el teléfono de Marisol
 * lo reciba al instante aunque esté limpiando lejos de la computadora.
 */
export function broadcastLiveScan(event: LiveScanEvent): void {
  try {
    // 1. Guardar en localStorage para sincronizar pestañas / ventanas
    localStorage.setItem(STORAGE_KEY, JSON.stringify(event));

    // 2. Enviar por BroadcastChannel
    if (broadcastChannel) {
      broadcastChannel.postMessage(event);
    }

    // 3. Notificación del sistema si los permisos están concedidos
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
