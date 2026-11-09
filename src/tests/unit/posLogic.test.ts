import { describe, it, expect, beforeEach } from 'vitest';
import {
  CATALOGO_PRODUCTOS_BASE,
  obtenerProductosInventario,
  registrarVentaPOS,
} from '../../lib/supabaseDb';

describe('Pruebas Unitarias · Terminal POS de Bebidas, Suplementos y Snacks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('el catálogo base debe contener 10 productos esenciales con precios y stock iniciales positivos', () => {
    expect(CATALOGO_PRODUCTOS_BASE.length).toBe(10);
    for (const prod of CATALOGO_PRODUCTOS_BASE) {
      expect(prod.precio_venta).toBeGreaterThan(0);
      expect(prod.stock_actual).toBeGreaterThanOrEqual(prod.stock_minimo);
      expect(prod.activo).toBe(true);
      expect(['Bebidas', 'Energizantes', 'Proteinas', 'Suplementos', 'Snacks']).toContain(prod.categoria);
    }
  });

  it('registrarVentaPOS debe lanzar error si el carrito está vacío', async () => {
    await expect(registrarVentaPOS([], 'yape')).rejects.toThrow('El carrito de venta no contiene ningún producto');
  });

  it('obtenerProductosInventario debe retornar los productos del catálogo base por defecto', async () => {
    const prods = await obtenerProductosInventario();
    expect(prods.length).toBeGreaterThanOrEqual(10);
    expect(prods.some((p) => p.nombre.includes('San Mateo'))).toBe(true);
  });

  it('registrarVentaPOS debe calcular el total correctamente y descontar inventario en modo local', async () => {
    // 2 aguas San Mateo a S/. 2.50 = S/. 5.00
    const items = [{ producto_id: 'BEB-001', cantidad: 2 }];
    const resultado = await registrarVentaPOS(items, 'yape', 'Cliente Mostrador', '70447554');

    expect(resultado.success).toBe(true);
    expect(resultado.total).toBe(5.00);
    expect(resultado.metodo_pago).toBe('yape');
    expect(resultado.numero_ticket).toBeDefined();

    // Comprobar que el inventario fue actualizado en memoria local
    const prodsActualizados = await obtenerProductosInventario();
    const sanMateo = prodsActualizados.find((p) => p.id === 'BEB-001');
    expect(sanMateo?.stock_actual).toBe(46); // 48 inicial - 2 = 46
  });

  it('registrarVentaPOS debe rechazar si la cantidad solicitada excede el stock disponible', async () => {
    // Intentar comprar 100 aguas cuando solo hay 48
    const items = [{ producto_id: 'BEB-001', cantidad: 100 }];
    await expect(registrarVentaPOS(items, 'efectivo')).rejects.toThrow('Stock insuficiente');
  });
});
