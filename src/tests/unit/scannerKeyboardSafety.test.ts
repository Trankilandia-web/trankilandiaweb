import { afterEach, describe, expect, it, vi } from 'vitest';
import { createScannerKeyHandler } from '../../lib/scannerKeyboard';

describe('Global scanner keyboard boundary', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  function setup() {
    let time = 100;
    const scan = vi.fn();
    const handler = createScannerKeyHandler(scan, () => time);
    const key = (value: string, delay = 20, target: HTMLElement = document.body) => {
      time += delay;
      const event = new KeyboardEvent('keydown', { key: value, cancelable: true, bubbles: true });
      target.addEventListener('keydown', handler, { once: true });
      target.dispatchEvent(event);
      return event;
    };
    return { scan, key };
  }

  it('does not turn form typing into a scan or cancel its Enter key', () => {
    const { scan, key } = setup();
    const input = document.createElement('input');
    document.body.append(input);
    for (const char of 'Carlos') key(char, 20, input);
    expect(key('Enter', 20, input).defaultPrevented).toBe(false);
    expect(scan).not.toHaveBeenCalled();
  });

  it('discards old buffers instead of scanning after a pause', () => {
    const { scan, key } = setup();
    for (const char of '12345678') key(char);
    expect(key('Enter', 10000).defaultPrevented).toBe(false);
    expect(scan).not.toHaveBeenCalled();
  });

  it('recognizes a scanner burst outside editable fields', () => {
    const { scan, key } = setup();
    for (const char of '12345678') key(char);
    expect(key('Enter').defaultPrevented).toBe(true);
    expect(scan).toHaveBeenCalledExactlyOnceWith('12345678');
  });

  it('leaves all keys alone while a modal is open', () => {
    const { scan, key } = setup();
    document.body.innerHTML = '<div role="dialog" aria-modal="true"></div>';
    for (const char of '12345678') key(char);
    expect(key('Enter').defaultPrevented).toBe(false);
    expect(scan).not.toHaveBeenCalled();
  });
});
