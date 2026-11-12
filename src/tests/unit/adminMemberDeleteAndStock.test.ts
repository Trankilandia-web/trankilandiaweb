import { describe, it, expect, beforeEach } from 'vitest';
import { eliminarSocio, registrarVentaPOS, obtenerProductosInventario } from '../../lib/supabaseDb';
import { getStoredMembers, saveStoredMembers, GymMember } from '../../data/gymStore';

describe('Pruebas Unitarias · Eliminación de Socios y Descuento de Stock en POS', () => {
  const MOCK_MEMBER: GymMember = {
    id: 'MEM-TEST-DEL',
    name: 'Socio Temporal Prueba',
    dni: '99887766',
    plan: 'Plan Libre Mensual',
    planPrice: 80,
    paymentType: 'full',
    advancePaid: 80,
    balanceDue: 0,
    paymentMethod: 'efectivo',
    receiptNumber: 'B001-9999',
    membershipStatus: 'active',
    expiresAt: '2026-12-31',
    coachName: 'Coach Marcos',
    registeredAt: '2026-11-01',
    shift: 'manana',
  };

  beforeEach(() => {
    localStorage.clear();
    saveStoredMembers([MOCK_MEMBER]);
  });

  it('eliminarSocio remueve al socio de la memoria local y padrón de forma definitiva', async () => {
    expect(getStoredMembers().some((m) => m.id === 'MEM-TEST-DEL')).toBe(true);

    const result = await eliminarSocio('MEM-TEST-DEL');
    expect(result).toBe(true);

    const remaining = getStoredMembers();
    expect(remaining.some((m) => m.id === 'MEM-TEST-DEL')).toBe(false);
  }, 20000);

  it('registrarVentaPOS descuenta el stock en el inventario de productos', async () => {
    const prods = await obtenerProductosInventario();
    const targetProd = prods.find((p) => p.activo !== false && p.stock_actual > 0);
    expect(targetProd).toBeDefined();

    if (targetProd) {
      const initialStock = targetProd.stock_actual;
      const result = await registrarVentaPOS(
        [{ producto_id: targetProd.id, cantidad: 1 }],
        'efectivo',
        'Cliente Prueba Stock'
      );

      expect(result.success).toBe(true);

      const prodsActualizados = await obtenerProductosInventario();
      const updated = prodsActualizados.find((p) => p.id === targetProd.id);
      expect(updated?.stock_actual).toBe(initialStock - 1);

      // Revertir el stock descontado en el test para no alterar los datos reales
      const { supabase } = await import('../../lib/supabase');
      await supabase.from('productos').update({ stock_actual: initialStock }).eq('id', targetProd.id);
    }
  }, 20000);
});
