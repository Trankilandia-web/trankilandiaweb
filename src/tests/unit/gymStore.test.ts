import { describe, it, expect, beforeEach } from 'vitest';
import {
  INITIAL_MEMBERS,
  getStoredMembers,
  saveStoredMembers,
  reloadFreshMembersFromExcel,
} from '../../data/gymStore';

describe('Pruebas Unitarias · Store Canónico de Socios y Caché Local', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('INITIAL_MEMBERS debe contener exactamente 417 socios oficiales importados del Excel Gym.xlsm', () => {
    expect(INITIAL_MEMBERS.length).toBe(417);
  });

  it('todos los 417 socios deben poseer un ID válido tipo MEM-XXX y un nombre definido', () => {
    for (const member of INITIAL_MEMBERS) {
      expect(member.id).toMatch(/^MEM-\d+/);
      expect(member.name).toBeDefined();
      expect(member.name.trim().length).toBeGreaterThan(0);
      expect(member.planPrice).toBeGreaterThanOrEqual(0);
    }
  });

  it('el cálculo de saldo pendiente (balanceDue) debe coincidir con planPrice - advancePaid', () => {
    for (const member of INITIAL_MEMBERS) {
      const expectedDue = Math.max(0, (member.planPrice || 0) - (member.advancePaid || 0));
      expect(member.balanceDue).toBe(expectedDue);
    }
  });

  it('getStoredMembers debe purgar automáticamente versiones obsoletas (v1..v5) y cargar v6 limpio', () => {
    // Simular residuo de versiones anteriores en el navegador del usuario
    localStorage.setItem('trankilandia_members_v4', JSON.stringify([{ id: 'MEM-OBSOLETO' }]));
    localStorage.setItem('trankilandia_members_v5', JSON.stringify([{ id: 'MEM-OBSOLETO-5' }]));

    const members = getStoredMembers();

    // Las versiones obsoletas deben haber sido eliminadas
    expect(localStorage.getItem('trankilandia_members_v4')).toBeNull();
    expect(localStorage.getItem('trankilandia_members_v5')).toBeNull();

    // El resultado debe ser el padrón canónico de 417 socios
    expect(members.length).toBe(417);
  });

  it('saveStoredMembers debe persistir correctamente y permitir recuperación fiel', () => {
    const subset = INITIAL_MEMBERS.slice(0, 5);
    saveStoredMembers(subset);

    const retrieved = getStoredMembers();
    expect(retrieved.length).toBe(5);
    expect(retrieved[0].id).toBe(subset[0].id);
  });

  it('reloadFreshMembersFromExcel debe restablecer limpiamente los 417 socios', () => {
    // Corromper el storage temporalmente
    localStorage.setItem('trankilandia_members_v6', JSON.stringify([{ id: 'MEM-CORRUPTO' }]));

    const fresh = reloadFreshMembersFromExcel();
    expect(fresh.length).toBe(417);

    const verified = getStoredMembers();
    expect(verified.length).toBe(417);
  });
});
