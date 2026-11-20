import { beforeEach, describe, expect, it, vi } from 'vitest';
const remote = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), signUp: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ isSupabaseConfigured: () => true, supabase: { rpc: remote.rpc, from: remote.from, auth: { signUp: remote.signUp } } }));
import { asignarDniYActivarCuenta, updateMemberProfile, registerGymMember, vincularDniCliente, vincularCorreoASocio } from '../../lib/supabaseDb';
import { getStoredMembers, saveStoredMembers, type GymMember } from '../../data/gymStore';
const member: GymMember = { id: 'MEM-SYNTHETIC', name: 'Persona Prueba', dni: '87654321', plan: 'Plan Prueba', planPrice: 80, paymentType: 'full', advancePaid: 80, balanceDue: 0, paymentMethod: 'efectivo', receiptNumber: 'TEST', membershipStatus: 'active', expiresAt: '2027-01-01', coachName: 'Prueba', registeredAt: '2026-11-01' };
beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); saveStoredMembers([member]); });
describe('Cambios de identidad y perfil confirmados por servidor', () => {
  it('no provisiona cuentas Auth ni anuncia activación al fallar asignación DNI', async () => {
    const query: Record<string, any> = {};
    for (const name of ['select','eq','neq','update','ilike']) query[name] = vi.fn(() => query);
    query.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Sin permisos' } });
    remote.from.mockReturnValue(query);
    const result = await asignarDniYActivarCuenta(member.id, '12345678');
    expect(result.success).toBe(false); expect(remote.signUp).not.toHaveBeenCalled(); expect(getStoredMembers()[0].dni).toBe('87654321');
  });
  it('conserva caché al denegar la actualización de perfil del socio', async () => {
    remote.rpc.mockImplementation(async (name: string) => name === 'get_auth_role' ? { data: 'cliente', error: null } : { data: { success: false, error: 'No pertenece a la cuenta' }, error: null });
    await expect(updateMemberProfile(member.id, { name: 'Cambio rechazado' })).rejects.toThrow();
    expect(getStoredMembers()[0].name).toBe('Persona Prueba');
  });
  it('no entrega cambios financieros a la RPC de autoedición', async () => {
    remote.rpc.mockResolvedValue({ data: 'cliente', error: null });
    await expect(updateMemberProfile(member.id, { planPrice: 0 })).rejects.toThrow();
    expect(getStoredMembers()[0].planPrice).toBe(80);
  });
  it('no agrega un socio a la caché cuando el servidor rechaza la inscripción', async () => {
    const query: Record<string, any> = {};
    for (const name of ['select','eq']) query[name] = vi.fn(() => query);
    query.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    query.upsert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'Sin permisos' } }) }) }));
    remote.from.mockReturnValue(query);
    await expect(registerGymMember({ ...member, id: 'MEM-RECHAZADO', dni: '12345678' })).rejects.toThrow();
    expect(getStoredMembers().map((item) => item.id)).toEqual(['MEM-SYNTHETIC']);
  });
  it('no fabrica membresías ni unifica cuentas al conocer DNI y correo', async () => {
    expect((await vincularDniCliente('uuid', 'test@example.test', '87654321')).success).toBe(false);
    expect((await vincularCorreoASocio('87654321', 'test@example.test')).success).toBe(false);
    expect(getStoredMembers()[0].email).toBeUndefined();
  });
});
