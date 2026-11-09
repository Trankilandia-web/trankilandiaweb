import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStaffList,
  saveStaffUser,
  updateStaffPin,
  deleteStaffUser,
  verifyStaffPin,
  getActiveStaffSession,
  setActiveStaffSession,
} from '../../lib/staffStore';

describe('Pruebas Unitarias · Gestión de Personal y Turnos con PIN', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('debe inicializar el personal predeterminado con Marisol y Luis', () => {
    const staff = getStaffList();
    expect(staff.length).toBeGreaterThanOrEqual(4);
    const marisol = staff.find((u) => u.nombre === 'Marisol');
    expect(marisol).toBeDefined();
    expect(marisol?.rol).toBe('admin');
    expect(marisol?.pin).toBe('1234');

    const luis = staff.find((u) => u.nombre === 'Luis Lloclla');
    expect(luis).toBeDefined();
    expect(luis?.rol).toBe('admin');
    expect(luis?.pin).toBe('2026');
  });

  it('debe autenticar con PIN correcto y rechazar PIN incorrecto', () => {
    const resOk = verifyStaffPin('staff-marisol', '1234');
    expect(resOk.success).toBe(true);
    expect(resOk.user?.nombre).toBe('Marisol');
    expect(getActiveStaffSession()?.id).toBe('staff-marisol');

    const resFail = verifyStaffPin('staff-marisol', '9999');
    expect(resFail.success).toBe(false);
    expect(resFail.error).toContain('PIN incorrecto');
  });

  it('permite a Marisol crear un nuevo usuario cajero', () => {
    const nuevo = saveStaffUser({
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

    const login = verifyStaffPin(nuevo.id, '5678');
    expect(login.success).toBe(true);
    expect(login.user?.nombre).toBe('Carla Recepción');
  });

  it('permite actualizar el PIN de un usuario', () => {
    const ok = updateStaffPin('staff-recepcion-m', '4321');
    expect(ok).toBe(true);

    const checkOld = verifyStaffPin('staff-recepcion-m', '1111');
    expect(checkOld.success).toBe(false);

    const checkNew = verifyStaffPin('staff-recepcion-m', '4321');
    expect(checkNew.success).toBe(true);
  });

  it('protege a los administradores principales contra eliminación accidental', () => {
    const intentoBorrar = deleteStaffUser('staff-marisol');
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
