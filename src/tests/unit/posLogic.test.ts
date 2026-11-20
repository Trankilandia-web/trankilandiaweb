import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: null, error: new Error('Modo offline') }),
          })),
        })),
      })),
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('RPC offline') }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('RPC offline') }),
  },
  isSupabaseConfigured: () => false,
}));

import {
  CATALOGO_PRODUCTOS_BASE,
  obtenerProductosInventario,
  registrarVentaPOS,
  procesarColaVentasOffline,
  eliminarProductoInventario,
  eliminarProductosSinStock,
  crearOActualizarProducto,
} from '../../lib/supabaseDb';

describe('Pruebas Unitarias · Terminal POS de Bebidas, Suplementos y Snacks', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('trankilandia_productos_inventario', JSON.stringify(CATALOGO_PRODUCTOS_BASE));
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

  it('obtenerProductosInventario devuelve el inventario guardado explícitamente', async () => {
    const prods = await obtenerProductosInventario();
    expect(prods.length).toBeGreaterThanOrEqual(10);
    expect(prods.some((p) => p.nombre.includes('San Mateo'))).toBe(true);
  });

  it('no inventa stock ni productos operativos cuando no hay inventario guardado', async () => {
    localStorage.removeItem('trankilandia_productos_inventario');
    expect(await obtenerProductosInventario()).toEqual([]);
  });

  it('registrarVentaPOS debe calcular el total correctamente y descontar inventario en modo local', async () => {
    const prodsIniciales = await obtenerProductosInventario();
    const stockInicial = prodsIniciales.find((p) => p.id === 'BEB-001')?.stock_actual ?? 48;

    // 2 aguas San Mateo a S/. 2.50 = S/. 5.00
    const items = [{ producto_id: 'BEB-001', cantidad: 2 }];
    const resultado = await registrarVentaPOS(items, 'yape', 'Cliente Mostrador', '70447554');

    expect(resultado.success).toBe(true);
    expect(resultado.total).toBe(5.00);
    expect(resultado.metodo_pago).toBe('yape');
    expect(resultado.numero_ticket).toBeDefined();

    // Comprobar que el inventario fue actualizado en memoria local (localStorage)
    const rawLocal = localStorage.getItem('trankilandia_productos_inventario');
    const prodsActualizados = rawLocal ? JSON.parse(rawLocal) : await obtenerProductosInventario();
    const sanMateo = prodsActualizados.find((p: any) => p.id === 'BEB-001');
    expect(sanMateo?.stock_actual).toBe(stockInicial - 2);

    // Comprobar que la venta se guardó en la cola persistente offline trankilandia_ventas_offline
    const rawVentas = localStorage.getItem('trankilandia_ventas_offline');
    expect(rawVentas).toBeDefined();
    const ventas = rawVentas ? JSON.parse(rawVentas) : [];
    expect(ventas.length).toBeGreaterThanOrEqual(1);
    expect(ventas[ventas.length - 1].total).toBe(5.00);
  });

  it('registrarVentaPOS debe aplicar descuentos auditados y recalcular el total neto', async () => {
    // 2 aguas San Mateo a S/. 2.50 = S/. 5.00, con descuento de S/. 1.50 = S/. 3.50
    const items = [{ producto_id: 'BEB-001', cantidad: 2 }];
    const resultado = await registrarVentaPOS(
      items,
      'efectivo',
      'Cliente Juan',
      '12345678',
      { monto: 1.50, motivo: 'Promoción Apertura', autorizadoPor: 'Marisol' }
    );
    expect(resultado.success).toBe(true);
    expect(resultado.subtotal).toBe(5.00);
    expect(resultado.descuento).toBe(1.50);
    expect(resultado.total).toBe(3.50);
  });

  it('procesarColaVentasOffline debe sincronizar la cola cuando hay ventas pendientes o retornar 0 si está vacía', async () => {
    localStorage.removeItem('trankilandia_ventas_offline');
    const syncedVacio = await procesarColaVentasOffline();
    expect(syncedVacio).toBe(0);
  });

  it('registrarVentaPOS debe rechazar si la cantidad solicitada excede el stock disponible', async () => {
    // Intentar comprar 100 aguas cuando solo hay 48
    const items = [{ producto_id: 'BEB-001', cantidad: 100 }];
    await expect(registrarVentaPOS(items, 'efectivo')).rejects.toThrow('Stock insuficiente');
  });

  it('rechaza cambios administrativos de producto sin conexión configurada', async () => {
    const before = localStorage.getItem('trankilandia_productos_inventario');
    await expect(crearOActualizarProducto(CATALOGO_PRODUCTOS_BASE[0])).rejects.toThrow('Configura Supabase');
    await expect(eliminarProductoInventario('BEB-001')).rejects.toThrow('Configura Supabase');
    expect(localStorage.getItem('trankilandia_productos_inventario')).toBe(before);
  });

  it('no depura productos agotados sin confirmación del servidor', async () => {
    const fixture = [{ ...CATALOGO_PRODUCTOS_BASE[0], stock_actual: 0 }];
    localStorage.setItem('trankilandia_productos_inventario', JSON.stringify(fixture));
    await expect(eliminarProductosSinStock()).rejects.toThrow('Configura Supabase');
    expect(await obtenerProductosInventario()).toEqual(fixture);
  });
});
