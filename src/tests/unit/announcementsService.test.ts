import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  GYM_ANNOUNCEMENTS,
  playAnnouncement,
  stopAnnouncement,
  getPlayingAnnouncementId,
  isAnnouncementPlaying,
  getCustomAnnouncementAudio,
  setCustomAnnouncementAudio,
  removeCustomAnnouncementAudio,
} from '../../lib/announcementsService';
import { setAlertVolume, setAlertMuted, cleanSpeechText } from '../../lib/audioVoiceAlerts';

describe('Pruebas Unitarias · Servicio de Anuncios por Parlante Bluetooth', () => {
  beforeEach(() => {
    stopAnnouncement();
    setAlertVolume(0.8);
    setAlertMuted(false);
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    stopAnnouncement();
    localStorage.clear();
  });

  it('el catálogo contiene los 3 anuncios oficiales de Trankilandia Gym con IDs y rutas correctas', () => {
    expect(GYM_ANNOUNCEMENTS).toHaveLength(3);

    const cierre = GYM_ANNOUNCEMENTS.find((a) => a.id === 'cierre-10min');
    expect(cierre).toBeDefined();
    expect(cierre?.title).toContain('Cierre');
    expect(cierre?.audioPath).toBe('/sounds/anuncios/cierre-10min.mp3');
    expect(cierre?.fullText).toContain('minutos para cerrar');

    const orden = GYM_ANNOUNCEMENTS.find((a) => a.id === 'orden-accesorios');
    expect(orden).toBeDefined();
    expect(orden?.title).toContain('Accesorios');
    expect(orden?.audioPath).toBe('/sounds/anuncios/orden-accesorios.mp3');
    expect(orden?.embeddedAudio).toBeDefined();
    expect(orden?.fullText).toContain('guardar los accesorios');

    const clases = GYM_ANNOUNCEMENTS.find((a) => a.id === 'clases-grupales');
    expect(clases).toBeDefined();
    expect(clases?.title).toContain('Clases Grupales');
    expect(clases?.audioPath).toBe('/sounds/anuncios/clases-grupales.mp3');
    expect(clases?.embeddedAudio).toBeDefined();
    expect(clases?.fullText).toContain('segundo nivel');
  });

  it('inicia en estado inactivo sin reproducción', () => {
    expect(isAnnouncementPlaying()).toBe(false);
    expect(getPlayingAnnouncementId()).toBeNull();
  });

  it('playAnnouncement activa el estado con el ID correspondiente y emite evento', async () => {
    const eventSpy = vi.fn();
    window.addEventListener('gym-announcement-state-changed', eventSpy);

    // Mock HTMLMediaElement play
    const playMock = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(async () => {});

    await playAnnouncement('cierre-10min');

    expect(isAnnouncementPlaying()).toBe(true);
    expect(getPlayingAnnouncementId()).toBe('cierre-10min');
    expect(eventSpy).toHaveBeenCalled();

    playMock.mockRestore();
    window.removeEventListener('gym-announcement-state-changed', eventSpy);
  });

  it('stopAnnouncement detiene la reproducción y limpia el estado', async () => {
    const playMock = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(async () => {});
    const pauseMock = vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});

    await playAnnouncement('orden-accesorios');
    expect(isAnnouncementPlaying()).toBe(true);

    stopAnnouncement();
    expect(isAnnouncementPlaying()).toBe(false);
    expect(getPlayingAnnouncementId()).toBeNull();

    playMock.mockRestore();
    pauseMock.mockRestore();
  });

  it('ignora IDs inexistentes sin alterar el estado previo', async () => {
    await playAnnouncement('id-no-existente');
    expect(isAnnouncementPlaying()).toBe(false);
    expect(getPlayingAnnouncementId()).toBeNull();
  });

  it('cleanSpeechText elimina emojis y arrobas para evitar que el motor de voz los lea literalmente', () => {
    const raw = 'ATENCIÓN, GUERREROS 💪 Recuerden devolver cada accesorio 📢 ¡Guerrer@s! ❤️🔥';
    const cleaned = cleanSpeechText(raw);
    expect(cleaned).not.toContain('💪');
    expect(cleaned).not.toContain('📢');
    expect(cleaned).not.toContain('❤️');
    expect(cleaned).not.toContain('🔥');
    expect(cleaned).not.toContain('@');
    expect(cleaned).toBe('ATENCIÓN, GUERREROS Recuerden devolver cada accesorio ¡Guerreras!');
  });

  it('permite guardar, consultar y eliminar audios personalizados en localStorage', () => {
    const testId = 'cierre-10min';
    const dummyAudioData = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2...';

    expect(getCustomAnnouncementAudio(testId)).toBeNull();

    setCustomAnnouncementAudio(testId, dummyAudioData);
    expect(getCustomAnnouncementAudio(testId)).toBe(dummyAudioData);

    removeCustomAnnouncementAudio(testId);
    expect(getCustomAnnouncementAudio(testId)).toBeNull();
  });

  it('reproduce el audio incrustado de ElevenLabs y nunca invoca speechSynthesis si falla la carga', async () => {
    let capturedSrc = '';
    const audioSpy = vi.spyOn(window, 'Audio').mockImplementation(function (this: any, src?: string) {
      capturedSrc = src || '';
      return {
        play: vi.fn().mockRejectedValue(new Error('Audio playback simulation failure')),
        pause: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;
    });

    const speakSpy = vi.fn();
    (window as any).speechSynthesis = {
      speak: speakSpy,
      cancel: vi.fn(),
      getVoices: () => [],
    };

    await playAnnouncement('clases-grupales');

    // Debe usar el audio incrustado en Base64 de ElevenLabs
    expect(capturedSrc).toMatch(/^data:audio\/mp3;base64,/);
    // Jamás debe invocar speechSynthesis (la voz robótica eliminada)
    expect(speakSpy).not.toHaveBeenCalled();

    audioSpy.mockRestore();
  });
});
