import { describe, it, expect, beforeEach } from 'vitest';
import { eliminarSocio, registrarVentaPOS, obtenerProductosInventario, CATALOGO_PRODUCTOS_BASE } from '../../lib/supabaseDb';
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
    localStorage.setItem('trankilandia_productos_inventario', JSON.stringify(CATALOGO_PRODUCTOS_BASE));
    saveStoredMembers([MOCK_MEMBER]);
  });

  it('conserva al socio si no existe un backend que confirme su archivo', async () => {
    expect(getStoredMembers().some((m) => m.id === 'MEM-TEST-DEL')).toBe(true);

    await expect(eliminarSocio('MEM-TEST-DEL')).rejects.toThrow('Configura Supabase');

    const remaining = getStoredMembers();
    expect(remaining.some((m) => m.id === 'MEM-TEST-DEL')).toBe(true);
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

    }
  }, 20000);
});
