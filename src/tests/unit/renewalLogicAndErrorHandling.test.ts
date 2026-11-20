import { describe, it, expect, beforeEach } from 'vitest';
import { renovarMembresiaSocio, RenovarMembresiaParams } from '../../lib/supabaseDb';
import { getStoredMembers, saveStoredMembers, GymMember } from '../../data/gymStore';

describe('Pruebas Unitarias · Renovación de Membresías y Manejo de Errores', () => {
  const MOCK_MEMBER_676: GymMember = {
    id: 'MEM-676',
    name: 'Jesus Anaya Romero',
    dni: '61509957',
    plan: '1 mes · Musculación Libre',
    planPrice: 80,
    paymentType: 'full',
    advancePaid: 80,
    balanceDue: 0,
    paymentMethod: 'efectivo',
    receiptNumber: 'B001-492530',
    membershipStatus: 'inactive',
    expiresAt: '2026-09-10',
    coachName: 'Coach Marcos Rivas',
    registeredAt: '2026-08-11',
    shift: 'manana',
  };

  const MOCK_MEMBER_188: GymMember = {
    id: 'MEM-188',
    name: 'Brigit Quispe Ramos',
    dni: '70223415',
    plan: '6 MESES · Musculación Libre',
    planPrice: 350,
    paymentType: 'full',
    advancePaid: 440,
    balanceDue: 0,
    paymentMethod: 'efectivo',
    receiptNumber: 'B001-000117',
    membershipStatus: 'active',
    expiresAt: '2026-11-17',
    coachName: 'Coach Camila Mendoza',
    registeredAt: '2026-05-21',
    shift: 'manana',
  };

  beforeEach(() => {
    localStorage.clear();
    saveStoredMembers([MOCK_MEMBER_676, MOCK_MEMBER_188]);
  });

  it('renovarMembresiaSocio valida parámetros requeridos y rechaza socioId vacío', async () => {
    const invalidParams = {
      socioId: '',
      plan: 'Plan Libre Mensual (Adulto)',
      precioPlan: 80,
      tipoPago: 'full' as const,
      adelantoPagado: 80,
      saldoPendiente: 0,
      fechaInicio: '2026-11-10',
      fechaFin: '2026-12-10',
    };

    await expect(renovarMembresiaSocio(invalidParams)).rejects.toThrow('ID del socio');
  });

  it('renovarMembresiaSocio actualiza vigencia con fecha pasada acordada (10 de noviembre) en memoria local', async () => {
    const params: RenovarMembresiaParams = {
      socioId: 'MEM-676',
      plan: 'Plan Libre Mensual (Adulto)',
      precioPlan: 80,
      tipoPago: 'full',
      adelantoPagado: 80,
      saldoPendiente: 0,
      fechaInicio: '2026-11-10',
      fechaFin: '2026-12-10',
      metodoPago: 'efectivo',
      numeroBoleta: 'B001-000933',
      turno: 'manana',
      registrarIngreso: false, // Ya pagó al primo el día 10
      operador: 'Marisol',
    };

    const res = await renovarMembresiaSocio(params);
    expect(res.success).toBe(true);

    const stored = getStoredMembers();
    const updated = stored.find((m) => m.id === 'MEM-676');
    expect(updated).toBeDefined();
    expect(updated?.plan).toBe('Plan Libre Mensual (Adulto)');
    expect(updated?.expiresAt).toBe('2026-12-10');
    expect(updated?.registeredAt).toBe('2026-11-10');
    expect(updated?.membershipStatus).toBe('active');
    expect(updated?.balanceDue).toBe(0);
  }, 15000);

  it('renovarMembresiaSocio maneja renovaciones con adelanto y saldo pendiente correctamente', async () => {
    const params: RenovarMembresiaParams = {
      socioId: 'MEM-188',
      plan: 'Promo Personalizada (8 Meses)',
      precioPlan: 300,
      tipoPago: 'advance',
      adelantoPagado: 150,
      saldoPendiente: 150,
      fechaInicio: '2026-11-17',
      fechaFin: '2027-07-17',
      fechaLimitePago: '2026-12-01',
      metodoPago: 'efectivo',
      numeroBoleta: 'B001-000956',
      turno: 'manana',
      registrarIngreso: false,
      operador: 'Recepción',
    };

    const res = await renovarMembresiaSocio(params);
    expect(res.success).toBe(true);

    const stored = getStoredMembers();
    const updated = stored.find((m) => m.id === 'MEM-188');
    expect(updated?.plan).toBe('Promo Personalizada (8 Meses)');
    expect(updated?.planPrice).toBe(300);
    expect(updated?.advancePaid).toBe(150);
    expect(updated?.balanceDue).toBe(150);
    expect(updated?.paymentType).toBe('advance');
    expect(updated?.expiresAt).toBe('2027-07-17');
    expect(updated?.membershipStatus).toBe('active');
  }, 15000);
});
