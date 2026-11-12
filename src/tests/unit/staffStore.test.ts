import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
        ilike: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
      insert: () => Promise.resolve({ error: null }),
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
        ilike: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      }),
    }),
    rpc: () => Promise.resolve({ data: null, error: null }),
  },
  isSupabaseConfigured: () => false,
}));

import {
  StaffUser,
  getStaffList,
  saveStaffUser,
  updateStaffPin,
  deleteStaffUser,
  verifyStaffPin,
  getActiveStaffSession,
  setActiveStaffSession,
} from '../../lib/staffStore';

describe('Pruebas Unitarias · Gestión de Personal y Turnos con PIN en Supabase', () => {
  let createdTestStaffId: string | undefined;

  const MOCK_STAFF: StaffUser[] = [
    {
      id: 'staff-marisol',
      nombre: 'Marisol',
      rol: 'admin',
      turno: 'completo',
      pin: '1234',
      avatarColor: 'from-amber-400 to-amber-600 text-black',
      iniciales: 'M',
      activo: true,
      telefono: '999787489',
      createdAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'staff-luis',
      nombre: 'Luis Lloclla',
      rol: 'admin',
      turno: 'completo',
      pin: '2026',
      avatarColor: 'from-purple-500 to-indigo-600 text-white',
      iniciales: 'LL',
      activo: true,
      telefono: '958183360',
      createdAt: '2026-11-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('trankilandia_staff_verified_v3', JSON.stringify(MOCK_STAFF));
  });

  afterAll(async () => {
    if (createdTestStaffId) {
      await deleteStaffUser(createdTestStaffId);
    }
  });

  it('debe leer el personal verificado en memoria local sincronizado', () => {
    const staff = getStaffList();
    expect(staff.length).toBe(2);
    const marisol = staff.find((u) => u.nombre === 'Marisol');
    expect(marisol).toBeDefined();
    expect(marisol?.rol).toBe('admin');
    expect(marisol?.pin).toBe('1234');

    const luis = staff.find((u) => u.nombre === 'Luis Lloclla');
    expect(luis).toBeDefined();
    expect(luis?.rol).toBe('admin');
    expect(luis?.pin).toBe('2026');
  });

  it('debe rechazar formato inválido de PIN (distinto a 4 dígitos)', async () => {
    const resInvalidLen = await verifyStaffPin('staff-marisol', '12');
    expect(resInvalidLen.success).toBe(false);
    expect(resInvalidLen.error).toContain('4 dígitos');

    const resAlpha = await verifyStaffPin('staff-marisol', 'abcd');
    expect(resAlpha.success).toBe(false);
  });

  it('permite a Marisol registrar un nuevo colaborador cajero con autorización admin', async () => {
    // Intento no autorizado sin adminAuth
    const rechazo = await saveStaffUser({
      nombre: 'Intruso',
      rol: 'admin',
      turno: 'completo',
      pin: '9999',
      avatarColor: 'from-amber-400 to-amber-600 text-black',
      activo: true,
    });
    expect(rechazo.success).toBe(false);
    expect(rechazo.error).toContain('autorización de administrador');

    // Registro autorizado por Marisol
    const res = await saveStaffUser(
      {
        nombre: 'Carla Recepción',
        rol: 'cajero',
        turno: 'tarde',
        pin: '5678',
        avatarColor: 'from-pink-500 to-rose-600 text-white',
        activo: true,
      },
      { adminId: 'staff-marisol', adminPin: '1234' }
    );

    expect(res.success).toBe(true);
    expect(res.user?.id).toBeDefined();
    expect(res.user?.iniciales).toBe('CR');
    createdTestStaffId = res.user?.id;

    const list = getStaffList();
    expect(list.some((u) => u.nombre === 'Carla Recepción')).toBe(true);
  });

  it('permite actualizar el PIN de un colaborador con autorización de administrador', async () => {
    // Asegurar que exista un colaborador para la prueba
    const addRes = await saveStaffUser(
      {
        nombre: 'Colaborador Test PIN',
        rol: 'cajero',
        turno: 'tarde',
        pin: '5678',
        avatarColor: 'from-pink-500 to-rose-600 text-white',
        activo: true,
      },
      { adminId: 'staff-marisol', adminPin: '1234' }
    );
    expect(addRes.success).toBe(true);
    const targetId = addRes.user!.id;

    // Intento no autorizado sin adminAuth
    const rechazo = await updateStaffPin(targetId, '4321');
    expect(rechazo.success).toBe(false);
    expect(rechazo.error).toContain('autorización de administrador');

    // Actualización autorizada por Marisol
    const res = await updateStaffPin(targetId, '4321', {
      adminId: 'staff-marisol',
      adminPin: '1234',
    });
    expect(res.success).toBe(true);

    const list = getStaffList();
    const updated = list.find((u) => u.id === targetId);
    expect(updated?.pin).toBe('4321');
  });

  it('protege a los administradores principales contra eliminación accidental', async () => {
    const intentoBorrar = await deleteStaffUser('staff-marisol');
    expect(intentoBorrar).toBe(false);
    expect(getStaffList().some((u) => u.id === 'staff-marisol')).toBe(true);
  });

  it('permite guardar y limpiar la sesión activa del personal', () => {
    const staff = getStaffList()[0];
    setActiveStaffSession(staff);
    expect(getActiveStaffSession()?.id).toBe(staff.id);

    setActiveStaffSession(null);
    expect(getActiveStaffSession()).toBeNull();
  });
});
