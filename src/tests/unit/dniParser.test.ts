import { describe, it, expect } from 'vitest';
import { extraerDniPeru, analizarDniPeru } from '../../lib/dniParser';

describe('Pruebas Unitarias · Validador y Parser de DNI Peruano', () => {
  it('debe extraer un DNI limpio de 8 dígitos numéricos (DNIe)', () => {
    expect(extraerDniPeru('70447554')).toBe('70447554');
    expect(extraerDniPeru('46410051')).toBe('46410051');
  });

  it('debe limpiar espacios en blanco y guiones accidentales', () => {
    expect(extraerDniPeru('  70447554  ')).toBe('70447554');
    expect(extraerDniPeru('70-44-75-54')).toBe('70447554');
  });

  it('debe extraer el DNI si viene precedido por prefijos como DNI o DOC', () => {
    expect(extraerDniPeru('DNI: 70447554')).toBe('70447554');
    expect(extraerDniPeru('DNI 46410051')).toBe('46410051');
  });

  it('debe extraer el DNI de 9 dígitos del código de barras 1D de DNI azul (8 dígitos + 1 verificador)', () => {
    const res = analizarDniPeru('704475541');
    expect(res).not.toBeNull();
    expect(res?.dni).toBe('70447554');
    expect(res?.sourceType).toBe('dni_azul_1d');
  });

  it('debe extraer el DNI con 10 dígitos con 0 inicial (escáneres en modo emulación teclado)', () => {
    const res = analizarDniPeru('0704475541');
    expect(res).not.toBeNull();
    expect(res?.dni).toBe('70447554');
  });

  it('debe extraer el DNI de lecturas Code 39 con asteriscos de pistola láser (*70447554*)', () => {
    expect(extraerDniPeru('*70447554*')).toBe('70447554');
    expect(extraerDniPeru('*704475541*')).toBe('70447554');
  });

  it('debe extraer el DNI del bloque MRZ de pasaportes o DNIe (I<PER70447554<<<<)', () => {
    expect(extraerDniPeru('I<PER70447554<<<<<<<<<<<<<<<<<<')).toBe('70447554');
  });

  it('debe extraer el DNI de códigos QR JSON {"dni":"70447554"}', () => {
    expect(extraerDniPeru('{"dni":"70447554"}')).toBe('70447554');
  });

  it('debe extraer el DNI de URLs de invitación o acceso (?dni=70447554)', () => {
    expect(extraerDniPeru('https://trankilandia.pe/cliente?dni=70447554')).toBe('70447554');
  });

  it('debe extraer el DNI de tramas PDF417 de DNI azul (704475541PEREZ<JUAN...)', () => {
    expect(extraerDniPeru('704475541PEREZ<JUAN<<<<<<<<')).toBe('70447554');
  });

  it('debe rechazar cadenas que no contengan 8 dígitos válidos', () => {
    expect(extraerDniPeru('')).toBeNull();
    expect(extraerDniPeru('12345')).toBeNull(); // Muy corto
    expect(extraerDniPeru('abcdefgh')).toBeNull(); // No numérico
  });
});
