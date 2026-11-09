import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredCustomPassword,
  saveStoredCustomPassword,
  actualizarPasswordSocio,
} from '../../lib/authPasswords';

describe('Pruebas Unitarias · Gestión de Contraseñas de Socios', () => {
  const TEST_DNI = '70447554';

  beforeEach(() => {
    localStorage.clear();
  });

  it('debe retornar null si el socio nunca ha cambiado su contraseña (contraseña por defecto es su DNI)', () => {
    expect(getStoredCustomPassword(TEST_DNI)).toBeNull();
  });

  it('debe permitir guardar y recuperar una contraseña personalizada', () => {
    saveStoredCustomPassword(TEST_DNI, 'miClaveSecreta123');
    expect(getStoredCustomPassword(TEST_DNI)).toBe('miClaveSecreta123');
  });

  it('debe rechazar contraseñas con menos de 6 caracteres', async () => {
    const res = await actualizarPasswordSocio(TEST_DNI, '12345');
    expect(res.success).toBe(false);
    expect(res.message).toContain('6 caracteres');
  });

  it('debe rechazar un DNI con formato inválido', async () => {
    const res = await actualizarPasswordSocio('123', 'nuevaClaveSegura');
    expect(res.success).toBe(false);
    expect(res.message).toContain('8 dígitos');
  });

  it('debe actualizar la contraseña exitosamente si cumple con los requisitos', async () => {
    const res = await actualizarPasswordSocio(TEST_DNI, 'claveNueva2026', TEST_DNI);
    expect(res.success).toBe(true);
    expect(getStoredCustomPassword(TEST_DNI)).toBe('claveNueva2026');
  });

  it('debe fallar si la contraseña anterior ingresada es incorrecta', async () => {
    saveStoredCustomPassword(TEST_DNI, 'claveActualValida');
    const res = await actualizarPasswordSocio(TEST_DNI, 'nuevaClaveSegura', 'claveEquivocada');
    expect(res.success).toBe(false);
    expect(res.message).toContain('no es correcta');
  });
});
