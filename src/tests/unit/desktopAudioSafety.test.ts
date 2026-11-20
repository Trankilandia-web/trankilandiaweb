import { beforeEach, describe, expect, it, vi } from 'vitest';

const audio = vi.hoisted(() => ({ context: null as any }));
vi.mock('../../lib/audioVoiceAlerts', () => ({
  getSharedAudioContext: () => audio.context,
  getAlertVolume: () => 1,
  isAlertMuted: () => false,
  speakText: vi.fn(),
}));

import { isMicrophoneActive, startMicrophone, stopMicrophone } from '../../lib/microphoneMegaphone';
import { resolveAnnouncementAudioPath } from '../../lib/announcementsService';

function node() {
  const param = { setValueAtTime: vi.fn() };
  return {
    connect: vi.fn(), disconnect: vi.fn(), gain: param, frequency: param,
    Q: param, threshold: param, knee: param, ratio: param, attack: param, release: param,
  };
}

describe('Desktop audio lifecycle', () => {
  beforeEach(() => {
    stopMicrophone();
    audio.context = {
      state: 'running', currentTime: 0, destination: {},
      createMediaStreamSource: vi.fn(node), createBiquadFilter: node,
      createDynamicsCompressor: node, createGain: node, createAnalyser: node,
    };
  });

  it('closes capture that finishes after push-to-talk was released', async () => {
    let resolveCapture!: (value: MediaStream) => void;
    const stopTrack = vi.fn();
    const capture = new Promise<MediaStream>((resolve) => { resolveCapture = resolve; });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true, value: { getUserMedia: vi.fn(() => capture) },
    });
    const starting = startMicrophone({ withChime: false });
    stopMicrophone();
    resolveCapture({ getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream);

    expect(await starting).toBe(false);
    expect(isMicrophoneActive()).toBe(false);
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(audio.context.createMediaStreamSource).not.toHaveBeenCalled();
  });

  it('keeps packaged announcements beside the Electron index file', () => {
    expect(resolveAnnouncementAudioPath('/sounds/anuncios/cierre-10min.mp3',
      'file:///C:/Program%20Files/Trankilandia/resources/app.asar/dist/index.html#/caja'))
      .toBe('file:///C:/Program%20Files/Trankilandia/resources/app.asar/dist/sounds/anuncios/cierre-10min.mp3');
  });

  it('preserves custom audio sources and normal web paths', () => {
    expect(resolveAnnouncementAudioPath('data:audio/mp3;base64,abc', 'file:///C:/dist/index.html')).toBe('data:audio/mp3;base64,abc');
    expect(resolveAnnouncementAudioPath('/sounds/anuncios/cierre-10min.mp3', 'https://gym.example/caja')).toBe('/sounds/anuncios/cierre-10min.mp3');
  });
});
