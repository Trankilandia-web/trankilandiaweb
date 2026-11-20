import { describe, expect, it } from 'vitest';
import { isSupabaseConfigured } from '../../lib/supabase';

describe('Aislamiento de pruebas', () => {
  it('no hereda la conexión Supabase del entorno de desarrollo', () => {
    expect(isSupabaseConfigured()).toBe(false);
  });
  it('bloquea intentos HTTP sin un mock explícito de transporte', () => {
    expect(() => fetch('https://example.invalid')).toThrow('TEST_NETWORK_BLOCKED');
    expect(() => new XMLHttpRequest().open('GET', 'https://example.invalid')).toThrow('TEST_NETWORK_BLOCKED');
    expect(() => new WebSocket('wss://example.invalid')).toThrow('TEST_NETWORK_BLOCKED');
  });
});
