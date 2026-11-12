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

  it('eliminarProductoInventario debe eliminar el producto del inventario y del almacenamiento local', async () => {
    const dummyId = 'PROD-TEST-DEL';
    await crearOActualizarProducto({
      id: dummyId,
      nombre: 'Producto Temporal',
      categoria: 'Snacks',
      precio_compra: 2,
      precio_venta: 5,
      stock_actual: 0,
      stock_minimo: 1,
      activo: true,
    });

    const prodsAntes = await obtenerProductosInventario();
    expect(prodsAntes.some((p) => p.id === dummyId)).toBe(true);

    const ok = await eliminarProductoInventario(dummyId);
    expect(ok).toBe(true);

    const prodsDespues = await obtenerProductosInventario();
    expect(prodsDespues.some((p) => p.id === dummyId)).toBe(false);
  });

  it('eliminarProductosSinStock debe depurar todos los productos con stock 0', async () => {
    await crearOActualizarProducto({
      id: 'PROD-AGOTADO-1',
      nombre: 'Agotado Uno',
      categoria: 'Bebidas',
      precio_venta: 3,
      stock_actual: 0,
      stock_minimo: 2,
      activo: true,
    });
    await crearOActualizarProducto({
      id: 'PROD-AGOTADO-2',
      nombre: 'Agotado Dos',
      categoria: 'Snacks',
      precio_venta: 4,
      stock_actual: 0,
      stock_minimo: 1,
      activo: true,
    });

    const eliminados = await eliminarProductosSinStock();
    expect(eliminados).toBeGreaterThanOrEqual(2);

    const prods = await obtenerProductosInventario();
    expect(prods.some((p) => p.id === 'PROD-AGOTADO-1')).toBe(false);
    expect(prods.some((p) => p.id === 'PROD-AGOTADO-2')).toBe(false);
  });
});
