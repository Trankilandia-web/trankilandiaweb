import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';

// Unit tests never access a real backend, even when .env contains production keys.
// Tests which exercise HTTP must explicitly mock their transport boundary.
const blockNetwork = () => {
  vi.stubGlobal('fetch', vi.fn(() => {
    throw new Error('TEST_NETWORK_BLOCKED: HTTP is disabled in unit tests. Mock the transport boundary.');
  }));
  const denyNetwork = () => {
    throw new Error('TEST_NETWORK_BLOCKED: Network is disabled in unit tests.');
  };
  XMLHttpRequest.prototype.open = denyNetwork as typeof XMLHttpRequest.prototype.open;
  vi.stubGlobal('WebSocket', class { constructor() { denyNetwork(); } });
};
blockNetwork();
beforeEach(blockNetwork);

// Polyfills para entorno de testing
if (typeof window !== 'undefined') {
  // Mock simple de HTMLCanvasElement.getContext para QRCode
  HTMLCanvasElement.prototype.getContext = (() => ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: new Array(4) }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
  })) as any;
}
