import { beforeEach, describe, expect, it, vi } from 'vitest';
const remote = vi.hoisted(() => ({ getUser: vi.fn(), signInWithPassword: vi.fn(), updateUser: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ isSupabaseConfigured: () => true, supabase: { auth: remote } }));
import { actualizarPasswordSocio, getStoredCustomPassword, saveStoredCustomPassword, restablecerPasswordSocio } from '../../lib/authPasswords';
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear(); remote.getUser.mockResolvedValue({ data: { user: null }, error: null });
  remote.signInWithPassword.mockResolvedValue({ data: { user: { id: 'auth-one', email: '87654321@socio.trankilandia.pe' }, session: { access_token: 'test' } }, error: null });
  remote.updateUser.mockResolvedValue({ data: {}, error: null });
});
describe('Contraseñas de socios', () => {
  it('exige contraseña actual y no permite reset público por DNI', async () => {
    expect((await restablecerPasswordSocio('87654321', 'ClaveNueva123')).success).toBe(false); expect(remote.updateUser).not.toHaveBeenCalled();
  });
  it('jamás guarda ni recupera contraseñas desde localStorage', () => {
    localStorage.setItem('trankilandia_member_passwords_v1', JSON.stringify({ '87654321': 'Legada123' }));
    expect(getStoredCustomPassword('87654321')).toBeNull(); saveStoredCustomPassword('87654321', 'Nueva123'); expect(localStorage.getItem('trankilandia_member_passwords_v1')).toBeNull();
  });
  it('rechaza cambio para DNI distinto al titular de la sesión', async () => {
    remote.getUser.mockResolvedValue({ data: { user: { id: 'otra', email: '11111111@socio.trankilandia.pe' } }, error: null });
    expect((await actualizarPasswordSocio('87654321', 'ClaveNueva123', 'Actual123')).success).toBe(false); expect(remote.updateUser).not.toHaveBeenCalled();
  });
  it('no actualiza contraseña si la reautenticación falla', async () => {
    remote.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'Credenciales inválidas' } });
    expect((await actualizarPasswordSocio('87654321', 'ClaveNueva123', 'Erronea123')).success).toBe(false); expect(remote.updateUser).not.toHaveBeenCalled();
  });
  it('propaga rechazo de updateUser y no produce éxito local', async () => {
    remote.updateUser.mockResolvedValue({ data: {}, error: { message: 'Servicio no disponible' } });
    expect((await actualizarPasswordSocio('87654321', 'ClaveNueva123', 'Actual123')).success).toBe(false); expect(localStorage.length).toBe(0);
  });
  it('cambia clave únicamente tras reautenticar la misma identidad', async () => {
    expect((await actualizarPasswordSocio('87654321', 'ClaveNueva123', 'Actual123')).success).toBe(true);
    expect(remote.signInWithPassword).toHaveBeenCalledWith({ email: '87654321@socio.trankilandia.pe', password: 'Actual123' });
    expect(remote.updateUser).toHaveBeenCalledWith({ password: 'ClaveNueva123' }); expect(localStorage.length).toBe(0);
  });
});
