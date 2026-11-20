import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDesktopEnvironment } from '../../App';

describe('Web and packaged routing', () => {
  afterEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });
  it('does not change the web router after visiting the staff terminal', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Chrome/130.0');
    sessionStorage.setItem('trankilandia_desktop_mode', 'true');
    expect(isDesktopEnvironment()).toBe(false);
  });
  it('recognizes the packaged Electron renderer', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 TrankilandiaDesktopApp/1.0 Electron');
    expect(isDesktopEnvironment()).toBe(true);
  });
});
