import { describe, it, expect, beforeEach } from 'vitest';
import {
  INITIAL_MEMBERS,
  getStoredMembers,
  saveStoredMembers,
  reloadFreshMembersFromExcel,
  loadCanonicalMembersFromExcel,
  generateNextMemberId,
  GymMember,
} from '../../data/gymStore';
import realMembersData from '../../data/realMembers.json';

const CANONICAL_EXCEL_MEMBERS = (realMembersData as unknown) as GymMember[];

describe('Pruebas Unitarias · Store Canónico de Socios y Caché Local Desacoplada', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('el archivo canónico de respaldo realMembers.json debe contener exactamente 417 socios oficiales del Excel', () => {
    expect(CANONICAL_EXCEL_MEMBERS.length).toBe(417);
  });

  it('todos los 417 socios canónicos deben poseer un ID válido tipo MEM-XXX y un nombre definido', () => {
    for (const member of CANONICAL_EXCEL_MEMBERS) {
      expect(member.id).toMatch(/^MEM-\d+/);
      expect(member.name).toBeDefined();
      expect(member.name.trim().length).toBeGreaterThan(0);
      expect(member.planPrice).toBeGreaterThanOrEqual(0);
    }
  });

  it('el cálculo de saldo pendiente (balanceDue) debe coincidir con planPrice - advancePaid', () => {
    for (const member of CANONICAL_EXCEL_MEMBERS) {
      const expectedDue = Math.max(0, (member.planPrice || 0) - (member.advancePaid || 0));
      expect(member.balanceDue).toBe(expectedDue);
    }
  });

  it('INITIAL_MEMBERS en el bundle público no debe exponer masivamente los 417 socios', () => {
    // Protección de privacidad: el bundle solo incluye el socio demo fundador
    expect(INITIAL_MEMBERS.length).toBeLessThan(10);
    expect(INITIAL_MEMBERS[0].id).toBe('MEM-2713');
  });

  it('loadCanonicalMembersFromExcel debe cargar los 417 socios bajo demanda asíncrona (lazy chunk)', async () => {
    const loaded = await loadCanonicalMembersFromExcel();
    expect(loaded.length).toBe(417);
  });

  it('getStoredMembers debe purgar automáticamente versiones obsoletas (v1..v5)', () => {
    localStorage.setItem('trankilandia_members_v4', JSON.stringify([{ id: 'MEM-OBSOLETO' }]));
    localStorage.setItem('trankilandia_members_v5', JSON.stringify([{ id: 'MEM-OBSOLETO-5' }]));

    const members = getStoredMembers();
    expect(localStorage.getItem('trankilandia_members_v4')).toBeNull();
    expect(localStorage.getItem('trankilandia_members_v5')).toBeNull();
    expect(members).toEqual([]);
  });

  it('saveStoredMembers debe persistir correctamente y permitir recuperación fiel', () => {
    const subset = CANONICAL_EXCEL_MEMBERS.slice(0, 5);
    saveStoredMembers(subset);

    const retrieved = getStoredMembers();
    expect(retrieved.length).toBe(5);
    expect(retrieved[0].id).toBe(subset[0].id);
  });

  it('reloadFreshMembersFromExcel debe restablecer limpiamente los 417 socios de forma asíncrona', async () => {
    localStorage.setItem('trankilandia_members_v6', JSON.stringify([{ id: 'MEM-CORRUPTO' }]));

    const fresh = await reloadFreshMembersFromExcel();
    expect(fresh.length).toBe(417);

    const verified = getStoredMembers();
    expect(verified.length).toBe(417);
  });

  it('generateNextMemberId debe generar IDs únicos y secuenciales mayores a MEM-928 sin colisiones', () => {
    const list: GymMember[] = [
      { id: 'MEM-927', name: 'Naydu', plan: '1 Mes', planPrice: 80, paymentType: 'full', advancePaid: 80, balanceDue: 0, paymentMethod: 'efectivo', receiptNumber: 'B001', membershipStatus: 'active', expiresAt: '2027-01-01', coachName: 'Coach', registeredAt: '2026-11-01' },
      { id: 'MEM-928', name: 'Enma', plan: 'Anual', planPrice: 430, paymentType: 'advance', advancePaid: 100, balanceDue: 330, paymentMethod: 'efectivo', receiptNumber: 'B002', membershipStatus: 'active', expiresAt: '2027-11-01', coachName: 'Coach', registeredAt: '2026-11-10' },
    ];

    const nextId = generateNextMemberId(list);
    expect(nextId).toBe('MEM-929');

    // Si ya existe MEM-929, debe avanzar a MEM-930
    list.push({ ...list[0], id: 'MEM-929' });
    const nextId2 = generateNextMemberId(list);
    expect(nextId2).toBe('MEM-930');
  });
});
