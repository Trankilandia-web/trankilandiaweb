import { describe, it, expect, beforeEach } from 'vitest';
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
    {
      id: 'staff-recepcion-m',
      nombre: 'Recepción Mañana',
      rol: 'cajero',
      turno: 'manana',
      pin: '1111',
      avatarColor: 'from-emerald-400 to-teal-600 text-black',
      iniciales: 'RM',
      activo: true,
      createdAt: '2026-11-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('trankilandia_staff_verified_v3', JSON.stringify(MOCK_STAFF));
  });

  it('debe leer el personal verificado en memoria local sincronizado', () => {
    const staff = getStaffList();
    expect(staff.length).toBe(3);
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

  it('permite a Marisol registrar un nuevo colaborador cajero de forma asíncrona', async () => {
    const nuevo = await saveStaffUser({
      nombre: 'Carla Recepción',
      rol: 'cajero',
      turno: 'tarde',
      pin: '5678',
      avatarColor: 'from-pink-500 to-rose-600 text-white',
      activo: true,
    });

    expect(nuevo.id).toBeDefined();
    expect(nuevo.iniciales).toBe('CR');

    const list = getStaffList();
    expect(list.some((u) => u.nombre === 'Carla Recepción')).toBe(true);
  });

  it('permite actualizar el PIN de un colaborador', async () => {
    const ok = await updateStaffPin('staff-recepcion-m', '4321');
    expect(ok).toBe(true);

    const list = getStaffList();
    const updated = list.find((u) => u.id === 'staff-recepcion-m');
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
