import { beforeEach, describe, expect, it, vi } from 'vitest';
const remote = vi.hoisted(() => ({ configured: true, rpc: vi.fn(), getUser: vi.fn(), from: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ isSupabaseConfigured: () => remote.configured, supabase: { rpc: remote.rpc, from: remote.from, auth: { getUser: remote.getUser } } }));
import { fetchStaffFromSupabase, getActiveStaffSession, getStaffList, setActiveStaffSession, verifyStaffPin, updateStaffPin } from '../../lib/staffStore';
const staff = { id: 'staff-test', nombre: 'Operador Prueba', rol: 'cajero' as const, turno: 'tarde' as const, avatarColor: '', iniciales: 'OP', activo: true, createdAt: '2026-01-01' };
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); vi.resetAllMocks(); remote.configured = true; setActiveStaffSession(null);
  remote.getUser.mockResolvedValue({ data: { user: { id: 'auth-test' } }, error: null });
  remote.rpc.mockResolvedValue({ data: null, error: { message: 'Servidor no disponible' } });
});
describe('Autorización de personal desde servidor', () => {
  it('deniega PIN ante fallo RPC aunque exista un perfil local sin PIN', async () => {
    localStorage.setItem('trankilandia_staff_profiles_v4', JSON.stringify([staff]));
    expect((await verifyStaffPin(staff.id, '9876')).success).toBe(false); expect(getActiveStaffSession()).toBeNull();
  });
  it('deniega PIN sin sesión Auth verificada', async () => {
    remote.getUser.mockResolvedValue({ data: { user: null }, error: null });
    remote.rpc.mockResolvedValue({ data: { success: true, user: staff }, error: null });
    expect((await verifyStaffPin(staff.id, '9876')).success).toBe(false);
  });
  it('acepta respuesta servidor y nunca conserva PIN en perfil o almacenamiento', async () => {
    remote.rpc.mockResolvedValue({ data: { success: true, auth_user_id: 'auth-test', user: { ...staff, pin: '9876' } }, error: null });
    const result = await verifyStaffPin(staff.id, '9876');
    expect(result.success).toBe(true); expect(result.user).not.toHaveProperty('pin'); expect(getActiveStaffSession()).not.toHaveProperty('pin');
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain('9876');
  });
  it('ignora sesiones de personal falsificadas en storage', () => {
    localStorage.setItem('trankilandia_staff_active_session_v4', JSON.stringify({ ...staff, rol: 'admin' })); expect(getActiveStaffSession()).toBeNull();
  });
  it('purga credenciales de cachés viejas y no las devuelve', () => {
    localStorage.setItem('trankilandia_staff_verified_v3', JSON.stringify([{ ...staff, pin: '9876' }]));
    expect(getStaffList()).toEqual([]); expect(localStorage.getItem('trankilandia_staff_verified_v3')).toBeNull();
  });
  it('consulta únicamente columnas públicas y no borra perfiles al leer', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ ...staff, avatar_color: '', created_at: staff.createdAt }], error: null });
    const select = vi.fn((_columns: string) => ({ eq: () => ({ order }) })); remote.from.mockReturnValue({ select });
    expect((await fetchStaffFromSupabase()).users).toHaveLength(1); expect(select.mock.calls[0]?.[0]).not.toMatch(/\bpin\b|pin_hash/);
  });
  it('no anuncia actualización exitosa de PIN cuando servidor la rechaza', async () => {
    expect((await updateStaffPin(staff.id, '9876', { adminId: 'admin-test', adminPin: '4567' })).success).toBe(false); expect(localStorage.length).toBe(0);
  });
});
