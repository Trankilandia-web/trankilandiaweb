import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMemberAttendance } from '../../hooks/useMemberAttendance';
import { GymMember } from '../../data/gymStore';
import { AsistenciaActiva } from '../../lib/supabaseDb';

vi.mock('../../lib/supabaseDb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/supabaseDb')>();
  return {
    ...actual,
    registrarAsistencia: vi.fn().mockResolvedValue({ data: { id: 'mock-ast-1' } }),
  };
});

const MOCK_MEMBERS: GymMember[] = [
  {
    id: 'MEM-001',
    name: 'Carlos Mendoza',
    dni: '70447001',
    plan: '1 Mes · Musculación Libre',
    planPrice: 80,
    paymentType: 'full',
    paymentMethod: 'efectivo',
    advancePaid: 80,
    balanceDue: 0,
    membershipStatus: 'active',
    expiresAt: '2028-12-31',
    receiptNumber: 'B001-001',
    shift: 'manana',
    coachName: 'Coach Marcos',
    registeredAt: '2026-10-01',
  },
  {
    id: 'MEM-002',
    name: 'Juan Perez Deudor',
    dni: '70447002',
    plan: '1 Mes · Musculación Libre',
    planPrice: 80,
    paymentType: 'advance',
    paymentMethod: 'efectivo',
    advancePaid: 50,
    balanceDue: 30,
    membershipStatus: 'active',
    expiresAt: '2028-12-31',
    receiptNumber: 'B001-002',
    shift: 'tarde',
    coachName: 'Coach Marcos',
    registeredAt: '2026-10-01',
  },
  {
    id: 'MEM-003',
    name: 'Ana Vencida',
    dni: '70447003',
    plan: '1 Mes · Musculación Libre',
    planPrice: 80,
    paymentType: 'full',
    paymentMethod: 'efectivo',
    advancePaid: 80,
    balanceDue: 0,
    membershipStatus: 'inactive',
    expiresAt: '2020-01-01',
    receiptNumber: 'B001-003',
    shift: 'noche',
    coachName: 'Coach Marcos',
    registeredAt: '2019-12-01',
  },
  {
    id: 'MEM-629',
    name: 'Yubetzy Cayama Perez',
    dni: '007778365',
    plan: '6 MESES · Musculación Libre',
    planPrice: 330,
    paymentType: 'full',
    paymentMethod: 'efectivo',
    advancePaid: 330,
    balanceDue: 0,
    membershipStatus: 'active',
    expiresAt: '2028-12-31',
    receiptNumber: 'B001-796930',
    shift: 'manana',
    coachName: 'Coach Camila Mendoza',
    registeredAt: '2026-07-30',
  },
];

describe('Pruebas Unitarias · Custom Hook useMemberAttendance', () => {
  let asistenciasList: AsistenciaActiva[] = [];
  const setAsistencias = vi.fn((updater) => {
    if (typeof updater === 'function') {
      asistenciasList = updater(asistenciasList);
    } else {
      asistenciasList = updater;
    }
  });

  beforeEach(() => {
    asistenciasList = [];
    vi.clearAllMocks();
  });

  it('permite registrar ingreso para socio activo al día', async () => {
    const { result } = renderHook(() =>
      useMemberAttendance({
        members: MOCK_MEMBERS,
        setAsistencias,
      })
    );

    act(() => {
      result.current.setScanInput('70447001');
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

    await act(async () => {
      await result.current.handleScanSubmit(fakeEvent);
    });

    expect(result.current.lastScanStatus).toBe('activo');
    expect(result.current.lastScannedSocio?.nombre).toBe('Carlos Mendoza');
    expect(result.current.lastScanMessage).toContain('Pase Libre');
    expect(setAsistencias).toHaveBeenCalled();
  });

  it('detecta socio con deuda activa y genera estado deuda', async () => {
    const { result } = renderHook(() =>
      useMemberAttendance({
        members: MOCK_MEMBERS,
        setAsistencias,
      })
    );

    act(() => {
      result.current.setScanInput('70447002');
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

    await act(async () => {
      await result.current.handleScanSubmit(fakeEvent);
    });

    expect(result.current.lastScanStatus).toBe('deuda');
    expect(result.current.lastScannedSocio?.saldo_pendiente).toBe(30);
    expect(result.current.lastScanMessage).toContain('DEBE S/. 30.00');
  });

  it('detecta membresía vencida y genera estado vencido', async () => {
    const { result } = renderHook(() =>
      useMemberAttendance({
        members: MOCK_MEMBERS,
        setAsistencias,
      })
    );

    act(() => {
      result.current.setScanInput('70447003');
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

    await act(async () => {
      await result.current.handleScanSubmit(fakeEvent);
    });

    expect(result.current.lastScanStatus).toBe('vencido');
    expect(result.current.lastScanMessage).toContain('Membresía vencida');
  });

  it('rechaza consultas de DNI no registrado en el padrón', async () => {
    const { result } = renderHook(() =>
      useMemberAttendance({
        members: MOCK_MEMBERS,
        setAsistencias,
      })
    );

    act(() => {
      result.current.setScanInput('99999999');
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

    await act(async () => {
      await result.current.handleScanSubmit(fakeEvent);
    });

    expect(result.current.lastScanStatus).toBe('no_inscrito');
    expect(result.current.lastScannedSocio).toBeNull();
    expect(result.current.lastScanMessage).toContain('no registrado');
  });

  it('bloquea ráfagas repetidas del lector de código de barras en menos de 800ms', async () => {
    const { result } = renderHook(() =>
      useMemberAttendance({
        members: MOCK_MEMBERS,
        setAsistencias,
      })
    );

    act(() => {
      result.current.setScanInput('70447001');
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

    await act(async () => {
      await result.current.handleScanSubmit(fakeEvent);
    });

    const primerLlamado = setAsistencias.mock.calls.length;

    // Disparo inmediato en ráfaga (<800ms)
    act(() => {
      result.current.setScanInput('70447001');
    });

    await act(async () => {
      await result.current.handleScanSubmit(fakeEvent);
    });

    // El cooldown debe absorber la ráfaga y no registrar una segunda asistencia
    expect(setAsistencias.mock.calls.length).toBe(primerLlamado);
  });

  it('bloquea ingresos múltiples si el atleta ya se encuentra en sala dentro de los 90 minutos', async () => {
    const fakeAsistenciasActivas: AsistenciaActiva[] = [
      {
        id: 'ast-101',
        socio_id: 'MEM-001',
        dni: '70447001',
        nombre: 'Carlos Mendoza',
        turno: 'manana',
        fecha_ingreso: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // hace 20 minutos
      },
    ];

    const { result } = renderHook(() =>
      useMemberAttendance({
        members: MOCK_MEMBERS,
        asistencias: fakeAsistenciasActivas,
        setAsistencias,
      })
    );

    act(() => {
      result.current.setScanInput('70447001');
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

    await act(async () => {
      await result.current.handleScanSubmit(fakeEvent);
    });

    // Debe detectar que ya está en sala y NO invocar registrarIngreso
    expect(result.current.lastScanMessage).toContain('ya se encuentra entrenando en sala');
    expect(result.current.lastScanMessage).toContain('No se duplica su ingreso');
    expect(setAsistencias).not.toHaveBeenCalled();
  });

  it('permite registrar ingreso para socio con Carnet de Extranjeria / documento de 9 digitos sin truncarlo', async () => {
    const { result } = renderHook(() =>
      useMemberAttendance({
        members: MOCK_MEMBERS,
        setAsistencias,
      })
    );

    act(() => {
      result.current.setScanInput('007778365');
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

    await act(async () => {
      await result.current.handleScanSubmit(fakeEvent);
    });

    expect(result.current.lastScanStatus).toBe('activo');
    expect(result.current.lastScannedSocio?.id).toBe('MEM-629');
    expect(result.current.lastScannedSocio?.nombre).toBe('Yubetzy Cayama Perez');
    expect(result.current.lastScannedSocio?.dni).toBe('007778365');
    expect(result.current.lastScanMessage).toContain('Pase Libre');
    expect(setAsistencias).toHaveBeenCalled();
  });

  it('encuentra al socio buscando por apellido o nombre parcial aunque no se ingrese el DNI', async () => {
    const { result } = renderHook(() =>
      useMemberAttendance({
        members: MOCK_MEMBERS,
        setAsistencias,
      })
    );

    act(() => {
      result.current.setScanInput('Cayama');
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

    await act(async () => {
      await result.current.handleScanSubmit(fakeEvent);
    });

    expect(result.current.lastScanStatus).toBe('activo');
    expect(result.current.lastScannedSocio?.id).toBe('MEM-629');
    expect(result.current.lastScannedSocio?.nombre).toBe('Yubetzy Cayama Perez');
  });
});
