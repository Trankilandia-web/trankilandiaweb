import { beforeEach, describe, expect, it, vi } from 'vitest';

const remote = vi.hoisted(() => ({ configured: true, rpc: vi.fn(), from: vi.fn(), signUp: vi.fn() }));
vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: () => remote.configured,
  supabase: { rpc: remote.rpc, from: remote.from, auth: { signUp: remote.signUp } },
}));
import { registerGymMember } from '../../lib/supabaseDb';
import { getStoredMembers, saveStoredMembers, type GymMember } from '../../data/gymStore';

const journalKey = 'trankilandia_inscripciones_operaciones_v1';
const member: GymMember = {
  id: 'MEM-ENROLL-FIXTURE', name: 'Persona sintética', dni: '12345678',
  plan: 'Plan sintético', planPrice: 80, paymentType: 'advance', advancePaid: 30,
  balanceDue: 50, paymentDueDate: '2026-11-25', paymentMethod: 'efectivo',
  receiptNumber: 'TEST-ENROLL-1', membershipStatus: 'active', expiresAt: '2026-12-19',
  coachName: 'Coach sintético', registeredAt: '2026-11-19', shift: 'manana',
};
const confirmed = {
  id: member.id, nombre: 'Nombre confirmado', dni: member.dni, email: null, celular: null,
  plan: member.plan, precio_plan: 80, tipo_pago: 'advance', adelanto_pagado: 30,
  saldo_pendiente: 50, fecha_limite_pago: '2026-11-25', metodo_pago: 'efectivo',
  numero_boleta: 'TEST-ENROLL-1', fecha_inicio: '2026-11-19', fecha_fin: '2026-12-19',
  coach_asignado: member.coachName, turno: 'manana', observaciones: null, edad: null, sexo: null,
};
const journal = () => JSON.parse(localStorage.getItem(journalKey) || '[]');
const rpcSuccess = (_name: string, args: any) => Promise.resolve({
  data: { success: true, operacion_id: args.p_operacion_id, socio: confirmed, ingreso_id: 1 }, error: null,
});

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  remote.configured = true;
  remote.rpc.mockReset().mockImplementation(rpcSuccess);
  remote.from.mockReset().mockImplementation(() => {
    const query: any = {};
    for (const action of ['select', 'eq', 'upsert']) query[action] = () => query;
    query.maybeSingle = async () => ({ data: null, error: null });
    query.single = async () => ({ data: confirmed, error: null });
    query.insert = async () => ({ data: null, error: null });
    return query;
  });
  remote.signUp.mockReset();
  saveStoredMembers([{ ...member, id: 'MEM-EXISTING', dni: '87654321', name: 'Socio existente' }]);
});

describe('Inscripción: socio y cobro confirmados en una sola operación', () => {
  it('usa una sola RPC y guarda únicamente la fila confirmada, sin vincular Auth ni escribir tablas directamente', async () => {
    remote.rpc.mockImplementation(async (name, args) => {
      expect(getStoredMembers().map((row) => row.id)).toEqual(['MEM-EXISTING']);
      expect(journal()[0].id).toBe(args.p_operacion_id);
      return rpcSuccess(name, args);
    });
    const result = await registerGymMember(member);
    expect(remote.rpc).toHaveBeenCalledTimes(1);
    expect(remote.rpc).toHaveBeenCalledWith('registrar_socio_atomico', expect.objectContaining({
      p_operacion_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      p_socio: expect.objectContaining({ id: member.id, dni: '12345678', precio_plan: 80, adelanto_pagado: 30, saldo_pendiente: 50, email: null }),
    }));
    expect(remote.from).not.toHaveBeenCalled();
    expect(remote.signUp).not.toHaveBeenCalled();
    expect(getStoredMembers()[0]).toMatchObject({ id: member.id, name: 'Nombre confirmado', advancePaid: 30 });
    expect(result).toMatchObject({ id: member.id, name: 'Nombre confirmado', advancePaid: 30 });
  });

  it('propaga el rechazo del servidor sin cambiar la caché ni sustituir un DNI existente', async () => {
    remote.rpc.mockResolvedValue({ data: null, error: { code: '23505', message: 'DNI ya registrado' } });
    await expect(registerGymMember({ ...member, dni: '87654321' })).rejects.toThrow('DNI ya registrado');
    expect(getStoredMembers()).toHaveLength(1);
    expect(getStoredMembers()[0].name).toBe('Socio existente');
    expect(remote.from).not.toHaveBeenCalled();
  });

  it('explica la migración faltante y no recurre a escrituras legacy', async () => {
    remote.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'function not found' } });
    await expect(registerGymMember(member)).rejects.toThrow('migration_enrollment_consistency.sql');
    expect(remote.from).not.toHaveBeenCalled();
    expect(getStoredMembers()).toHaveLength(1);
  });

  it.each([
    { data: null, error: { code: '502', message: 'Bad Gateway' }, status: 502 },
    { data: null, error: null, status: 200 },
    { data: { success: true, socio: { id: member.id } }, error: null, status: 200 },
  ])('retiene la UUID durable ante respuesta ambigua y la reutiliza después de recargar módulos', async (response) => {
    remote.rpc.mockResolvedValueOnce(response);
    await expect(registerGymMember(member)).rejects.toThrow();
    expect(getStoredMembers()).toHaveLength(1);
    const originalArgs = remote.rpc.mock.calls[0][1];
    expect(journal()[0].id).toBe(originalArgs.p_operacion_id);
    vi.resetModules();
    const reloaded = await import('../../lib/supabaseDb');
    await reloaded.registerGymMember({ ...member });
    expect(remote.rpc.mock.calls[1][1]).toEqual(originalArgs);
    expect(getStoredMembers().filter((row) => row.id === member.id)).toHaveLength(1);
  });

  it('conserva un fallo de red para reintentar y bloquea cambios en una inscripción aún ambigua', async () => {
    remote.rpc.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(registerGymMember(member)).rejects.toThrow(/confirmar|conexión/i);
    await expect(registerGymMember({ ...member, advancePaid: 40, balanceDue: 40 })).rejects.toThrow(/pendiente|mismos datos/i);
    expect(remote.rpc).toHaveBeenCalledTimes(1);
    await registerGymMember(member);
    expect(remote.rpc.mock.calls[1][1]).toEqual(remote.rpc.mock.calls[0][1]);
  });

  it('al repetir una operación confirmada respeta los datos actuales que devuelve el servidor', async () => {
    await registerGymMember(member);
    remote.rpc.mockImplementation(async (_name, args) => ({
      data: { success: true, operacion_id: args.p_operacion_id, socio: { ...confirmed, dni: '22223333', nombre: 'Perfil verificado después' }, ingreso_id: 1 }, error: null,
    }));
    await registerGymMember(member);
    expect(getStoredMembers()[0]).toMatchObject({ dni: '22223333', name: 'Perfil verificado después' });
    expect(remote.rpc.mock.calls[1][1]).toEqual(remote.rpc.mock.calls[0][1]);
  });

  it('recupera el alta ambigua tras recargar para reintentarla aunque el socio ya aparezca en caché', async () => {
    remote.rpc.mockResolvedValueOnce({ data: null, error: { code: '502', message: 'Bad Gateway' } });
    await expect(registerGymMember(member)).rejects.toThrow();
    const originalArgs = remote.rpc.mock.calls[0][1];
    saveStoredMembers([{ ...member, name: 'Datos recibidos por realtime', receiptNumber: 'OTRA-BOLETA' }]);
    vi.resetModules();
    const api = await import('../../lib/supabaseDb');
    const pendingMember = (api as any).getPendingEnrollmentMember('12345678');
    expect(pendingMember).toMatchObject({ id: member.id, name: 'Persona sintética', receiptNumber: 'TEST-ENROLL-1', advancePaid: 30, balanceDue: 50 });
    await api.registerGymMember(pendingMember);
    expect(remote.rpc.mock.calls[1][1]).toEqual(originalArgs);
    expect((api as any).getPendingEnrollmentMember('12345678')).toBeNull();
  });

  it('conserva el alta pendiente si no puede persistir su confirmación local después del commit', async () => {
    const storage = localStorage;
    vi.stubGlobal('localStorage', {
      getItem: storage.getItem.bind(storage), removeItem: storage.removeItem.bind(storage),
      setItem: (key: string, value: string) => {
        if (key === journalKey && JSON.parse(value).some((operation: any) => operation.confirmed === true)) throw new Error('QuotaExceededError');
        storage.setItem(key, value);
      },
    });
    try {
      await expect(registerGymMember(member)).rejects.toThrow(/confirmad|persistir/i);
      expect(getStoredMembers().map((row) => row.id)).toEqual(['MEM-EXISTING']);
      const api = await import('../../lib/supabaseDb');
      expect((api as any).getPendingEnrollmentMember('12345678')?.id).toBe(member.id);
    } finally { vi.stubGlobal('localStorage', storage); }
  });

  it('impide clasificar como renovación un diario corrupto', async () => {
    localStorage.setItem(journalKey, '{corrupto');
    const api = await import('../../lib/supabaseDb');
    expect(() => (api as any).getPendingEnrollmentMember('12345678')).toThrow(/registro|pendientes|revisión/i);
  });

  it('no pierde una UUID ambigua cuando un reintento posterior rechaza permisos', async () => {
    remote.rpc.mockResolvedValueOnce({ data: null, error: { code: '502', message: 'Bad Gateway' } });
    await expect(registerGymMember(member)).rejects.toThrow();
    const originalArgs = remote.rpc.mock.calls[0][1];
    remote.rpc.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'Sin permisos' } });
    await expect(registerGymMember(member)).rejects.toThrow('Sin permisos');
    expect(journal()[0]?.id).toBe(originalArgs.p_operacion_id);
  });

  it('no envía una inscripción si no puede persistir su identidad antes de cobrar', async () => {
    const storage = localStorage;
    vi.stubGlobal('localStorage', { getItem: storage.getItem.bind(storage), setItem: () => { throw new Error('QuotaExceededError'); } });
    try {
      await expect(registerGymMember(member)).rejects.toThrow(/guardar|persistir/i);
      expect(remote.rpc).not.toHaveBeenCalled();
      expect(getStoredMembers()).toHaveLength(1);
    } finally { vi.stubGlobal('localStorage', storage); }
  });

  it.each([
    { planPrice: -1 }, { advancePaid: NaN }, { advancePaid: 80.001 }, { balanceDue: 49 },
    { paymentType: 'full', advancePaid: 30, balanceDue: 50 },
    { dni: '123456789' }, { registeredAt: '2026-02-30' }, { expiresAt: '2026-11-01' },
    { paymentDueDate: '2026-12-20' }, { name: '' }, { paymentMethod: 'bitcoin' },
  ])('rechaza datos inválidos antes de cualquier mutación (%j)', async (changes) => {
    await expect(registerGymMember({ ...member, ...changes } as GymMember)).rejects.toThrow();
    expect(remote.rpc).not.toHaveBeenCalled();
    expect(remote.from).not.toHaveBeenCalled();
    expect(getStoredMembers()).toHaveLength(1);
  });
});
