import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  isAutoDuckingEnabled,
  setAutoDuckingEnabled,
  getAutoDuckingLevel,
  setAutoDuckingLevel,
  isAudioDucked,
  requestAudioDuck,
  releaseAudioDuck,
  forceRestoreAudioDuck,
} from '../../lib/autoAudioDucker';

describe('Pruebas Unitarias · Sistema de Auto-Ducking (Atenuación de Música de Fondo)', () => {
  beforeEach(() => {
    localStorage.clear();
    forceRestoreAudioDuck();
    vi.clearAllMocks();
  });

  afterEach(() => {
    forceRestoreAudioDuck();
    localStorage.clear();
  });

  it('inicia habilitado por defecto y permite alternar estado en localStorage', () => {
    expect(isAutoDuckingEnabled()).toBe(true);

    setAutoDuckingEnabled(false);
    expect(isAutoDuckingEnabled()).toBe(false);

    setAutoDuckingEnabled(true);
    expect(isAutoDuckingEnabled()).toBe(true);
  });

  it('el nivel de ducking por defecto es 15% (0.15) y se restringe a valores seguros', () => {
    expect(getAutoDuckingLevel()).toBe(0.15);

    setAutoDuckingLevel(0.25);
    expect(getAutoDuckingLevel()).toBe(0.25);

    // No debe permitir valores negativos ni mayores a 0.80
    setAutoDuckingLevel(-0.5);
    expect(getAutoDuckingLevel()).toBe(0);

    setAutoDuckingLevel(1.5);
    expect(getAutoDuckingLevel()).toBe(0.8);
  });

  it('requestAudioDuck llama a la API nativa de Electron y maneja conteo de referencias', async () => {
    const duckMock = vi.fn().mockResolvedValue({ ok: true });
    const unduckMock = vi.fn().mockResolvedValue({ ok: true });

    (window as any).electronAPI = {
      isElectron: true,
      duckBackgroundAudio: duckMock,
      unduckBackgroundAudio: unduckMock,
    };

    expect(isAudioDucked()).toBe(false);

    // 1. Primer llamado desde anuncio
    await requestAudioDuck('announcement', 0.15);
    expect(isAudioDucked()).toBe(true);
    expect(duckMock).toHaveBeenCalledTimes(1);
    expect(duckMock).toHaveBeenCalledWith(0.15);

    // 2. Segundo llamado concurrente desde micrófono
    await requestAudioDuck('microphone', 0.15);
    expect(isAudioDucked()).toBe(true);
    // No debe repetir la llamada nativa porque ya está atenuado
    expect(duckMock).toHaveBeenCalledTimes(1);

    // 3. Termina el anuncio pero el micrófono sigue activo
    await releaseAudioDuck('announcement');
    expect(isAudioDucked()).toBe(true);
    // Aún no debe restaurar
    expect(unduckMock).not.toHaveBeenCalled();

    // 4. Se cierra el micrófono: ahora sí restaura
    await releaseAudioDuck('microphone');
    expect(isAudioDucked()).toBe(false);
    expect(unduckMock).toHaveBeenCalledTimes(1);
  });

  it('forceRestoreAudioDuck limpia inmediatamente todas las fuentes activas', async () => {
    const unduckMock = vi.fn().mockResolvedValue({ ok: true });
    (window as any).electronAPI = {
      isElectron: true,
      duckBackgroundAudio: vi.fn(),
      unduckBackgroundAudio: unduckMock,
    };

    await requestAudioDuck('test1');
    await requestAudioDuck('test2');
    expect(isAudioDucked()).toBe(true);

    await forceRestoreAudioDuck();
    expect(isAudioDucked()).toBe(false);
    expect(unduckMock).toHaveBeenCalled();
  });

  it('mantiene la atenuación activa sin rebotes al encadenar múltiples anuncios o mensajes consecutivos', async () => {
    const duckMock = vi.fn().mockResolvedValue({ ok: true });
    const unduckMock = vi.fn().mockResolvedValue({ ok: true });
    (window as any).electronAPI = {
      isElectron: true,
      duckBackgroundAudio: duckMock,
      unduckBackgroundAudio: unduckMock,
    };

    // Mensaje 1
    await requestAudioDuck('announcement');
    expect(isAudioDucked()).toBe(true);
    expect(duckMock).toHaveBeenCalledTimes(1);

    // Mensaje 2 (inmediato, sin liberar previamente)
    await requestAudioDuck('announcement');
    expect(isAudioDucked()).toBe(true);
    expect(duckMock).toHaveBeenCalledTimes(1);
    expect(unduckMock).not.toHaveBeenCalled();

    // Finaliza
    await releaseAudioDuck('announcement');
    expect(isAudioDucked()).toBe(false);
    expect(unduckMock).toHaveBeenCalledTimes(1);
  });
});
