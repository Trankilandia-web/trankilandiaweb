import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getMicrophoneGain,
  setMicrophoneGain,
  isMicChimeEnabled,
  setMicChimeEnabled,
  getMicMode,
  setMicMode,
  isMicrophoneActive,
  stopMicrophone,
  getMicrophoneAudioLevel,
  getMicrophoneError,
} from '../../lib/microphoneMegaphone';

describe('Sistema de Megafono y Microfono en Vivo (microphoneMegaphone)', () => {
  beforeEach(() => {
    localStorage.clear();
    stopMicrophone();
    vi.restoreAllMocks();
  });

  it('debe devolver valores por defecto correctos', () => {
    expect(getMicrophoneGain()).toBe(1.25);
    expect(isMicChimeEnabled()).toBe(true);
    expect(getMicMode()).toBe('toggle');
    expect(isMicrophoneActive()).toBe(false);
    expect(getMicrophoneAudioLevel()).toBe(0);
    expect(getMicrophoneError()).toBeNull();
  });

  it('debe actualizar y persistir la ganancia respetando los limites de seguridad', () => {
    setMicrophoneGain(1.8);
    expect(getMicrophoneGain()).toBe(1.8);

    // Limite superior (max 3.0)
    setMicrophoneGain(5.0);
    expect(getMicrophoneGain()).toBe(3.0);

    // Limite inferior (min 0.2)
    setMicrophoneGain(0.05);
    expect(getMicrophoneGain()).toBe(0.2);
  });

  it('debe conmutar y persistir la campana de atencion (Ding-Dong)', () => {
    setMicChimeEnabled(false);
    expect(isMicChimeEnabled()).toBe(false);

    setMicChimeEnabled(true);
    expect(isMicChimeEnabled()).toBe(true);
  });

  it('debe alternar correctamente entre Modo Continuo y Modo Push-to-Talk (PTT)', () => {
    setMicMode('ptt');
    expect(getMicMode()).toBe('ptt');

    setMicMode('toggle');
    expect(getMicMode()).toBe('toggle');
  });

  it('debe emitir el evento custom gym-mic-state-changed al modificar ajustes', () => {
    let capturedDetail: any = null;
    const listener = (e: any) => {
      capturedDetail = e.detail;
    };

    window.addEventListener('gym-mic-state-changed', listener);

    setMicrophoneGain(2.0);

    expect(capturedDetail).not.toBeNull();
    expect(capturedDetail.gain).toBe(2.0);

    window.removeEventListener('gym-mic-state-changed', listener);
  });

  it('debe detener la transmision y reiniciar el VU meter a cero con stopMicrophone', () => {
    stopMicrophone();
    expect(isMicrophoneActive()).toBe(false);
    expect(getMicrophoneAudioLevel()).toBe(0);
  });
});
