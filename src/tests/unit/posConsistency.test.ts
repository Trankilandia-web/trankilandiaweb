import { beforeEach, describe, expect, it, vi } from 'vitest';

const boundary = vi.hoisted(() => ({
  configured: true,
  rpc: vi.fn(),
  from: vi.fn(),
  rows: {} as Record<string, any[]>,
  mutationError: null as null | { message: string },
}));
vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: () => boundary.configured,
  supabase: { rpc: boundary.rpc, from: boundary.from },
}));
import { registrarVentaPOS, procesarColaVentasOffline, obtenerReporteCajaMovimientos, crearOActualizarProducto, ajustarStockProducto, eliminarProductoInventario, eliminarSocio, actualizarRolUsuario } from '../../lib/supabaseDb';
import { getStoredMembers, saveStoredMembers } from '../../data/gymStore';

const productsKey = 'trankilandia_productos_inventario';
const queueKey = 'trankilandia_ventas_offline';
const producto = { id: 'P1', nombre: 'Agua', precio_venta: 10, stock_actual: 5, activo: true };
const items = [{ producto_id: 'P1', cantidad: 1 }];
const pending = () => JSON.parse(localStorage.getItem(queueKey) || '[]');
const stock = () => JSON.parse(localStorage.getItem(productsKey) || '[]')[0].stock_actual;

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  boundary.configured = true;
  boundary.rpc.mockReset();
  boundary.from.mockReset();
  boundary.rows = { productos: [producto], ventas: [], ingresos: [] };
  boundary.mutationError = null;
  boundary.from.mockImplementation((table: string) => {
    const builder: any = {};
    let mutation = false;
    let single = false;
    for (const name of ['select', 'eq', 'order', 'gte', 'lte']) builder[name] = () => builder;
    for (const name of ['upsert', 'update', 'delete']) builder[name] = () => { mutation = true; return builder; };
    builder.single = () => { single = true; return builder; };
    builder.then = (resolve: any) => Promise.resolve({ data: single ? boundary.rows[table]?.[0] : boundary.rows[table] || [], error: mutation ? boundary.mutationError : null }).then(resolve);
    return builder;
  });
  localStorage.setItem(productsKey, JSON.stringify([producto]));
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});

describe('Inventario: persistencia confirmada antes de actualizar la pantalla', () => {
  it('rechaza guardar o ajustar stock sin backend configurado y conserva la caché', async () => {
    boundary.configured = false;
    await expect(crearOActualizarProducto({ ...producto, stock_actual: 9 } as any)).rejects.toThrow();
    await expect(ajustarStockProducto('P1', 9)).rejects.toThrow();
    expect(stock()).toBe(5);
  });
  it('propaga rechazos del backend sin anunciar cambios locales', async () => {
    boundary.mutationError = { message: 'permission denied' };
    await expect(crearOActualizarProducto({ ...producto, stock_actual: 9 } as any)).rejects.toThrow('permission denied');
    await expect(ajustarStockProducto('P1', 9)).rejects.toThrow('permission denied');
    expect(stock()).toBe(5);
  });
  it('conserva el producto local si el servidor rechaza su eliminación', async () => {
    boundary.mutationError = { message: 'permission denied' };
    await expect(eliminarProductoInventario('P1')).rejects.toThrow('permission denied');
    expect(stock()).toBe(5);
  });
  it('actualiza la caché con la fila confirmada al guardar stock y retira el producto tras desactivarlo', async () => {
    boundary.rows.productos = [{ ...producto, stock_actual: 9 }];
    await ajustarStockProducto('P1', 9);
    expect(stock()).toBe(9);
    await eliminarProductoInventario('P1');
    expect(JSON.parse(localStorage.getItem(productsKey) || '[]')).toEqual([]);
  });
  it('conserva la membresía cuando se rechaza su archivo y solo la retira tras confirmación', async () => {
    saveStoredMembers([{ id: 'MEM-FIXTURE', name: 'Fixture' } as any]);
    boundary.rpc.mockResolvedValueOnce({ data: null, error: { message: 'permission denied' } });
    await expect(eliminarSocio('MEM-FIXTURE')).rejects.toThrow('permission denied');
    expect(getStoredMembers()).toHaveLength(1);
    boundary.rpc.mockResolvedValueOnce({ data: { success: true }, error: null });
    await expect(eliminarSocio('MEM-FIXTURE')).resolves.toBe(true);
    expect(getStoredMembers()).toHaveLength(0);
    expect(boundary.from).not.toHaveBeenCalled();
    expect(boundary.rpc).toHaveBeenLastCalledWith('archivar_socio_seguro', { p_socio_id: 'MEM-FIXTURE' });
  });
  it('cambia roles mediante la RPC autorizada y propaga rechazos sin escritura directa a profiles', async () => {
    const id = '00000000-0000-4000-8000-000000000001';
    boundary.rpc.mockResolvedValueOnce({ data: { success: true }, error: null });
    await actualizarRolUsuario(id, 'caja');
    expect(boundary.rpc).toHaveBeenLastCalledWith('cambiar_rol_usuario', { p_user_id: id, p_role: 'caja' });
    boundary.rpc.mockResolvedValueOnce({ data: null, error: { message: 'permission denied' } });
    await expect(actualizarRolUsuario(id, 'admin')).rejects.toThrow('permission denied');
    expect(boundary.from).not.toHaveBeenCalled();
  });
});

describe('POS: integridad entre cobro, stock y cola durable', () => {
  it('rechaza un error de negocio sin descontar stock ni encolar una venta ficticia', async () => {
    boundary.rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'Stock insuficiente' } });
    await expect(registrarVentaPOS(items, 'efectivo')).rejects.toThrow('Stock insuficiente');
    expect(stock()).toBe(5);
    expect(pending()).toEqual([]);
  });

  it('rechaza RLS y una RPC faltante sin pasar al modo offline', async () => {
    for (const error of [{ code: '42501', message: 'permission denied' }, { code: 'PGRST202', message: 'RPC missing' }]) {
      boundary.rpc.mockResolvedValue({ data: null, error });
      await expect(registrarVentaPOS(items, 'efectivo')).rejects.toThrow();
      expect(pending()).toEqual([]);
      expect(stock()).toBe(5);
    }
  });

  it('guarda un cobro offline con descuento antes del éxito sin modificar stock remoto', async () => {
    boundary.rpc.mockRejectedValue(new TypeError('Failed to fetch'));
    const result = await registrarVentaPOS(items, 'yape', 'Cliente', '', { monto: 2, motivo: 'Promo', autorizadoPor: 'Operadora' });
    expect(result.total).toBe(8);
    expect(result.pendiente_sync).toBe(true);
    expect(stock()).toBe(4);
    expect(pending()).toHaveLength(1);
    expect(pending()[0]).toMatchObject({ total: 8, subtotal: 10, descuento: { monto: 2, motivo: 'Promo', autorizadoPor: 'Operadora' }, request_version: 2 });
    expect(boundary.from.mock.calls.every(([table]) => table === 'productos')).toBe(true);
  });

  it('no anuncia cobro ni reduce stock cuando falla la persistencia de la cola', async () => {
    boundary.configured = false;
    const storage = localStorage;
    vi.stubGlobal('localStorage', {
      getItem: storage.getItem.bind(storage),
      setItem: (key: string, value: string) => {
        if (key === queueKey) throw new Error('QuotaExceededError');
        storage.setItem(key, value);
      },
    });
    try {
      await expect(registrarVentaPOS(items, 'efectivo')).rejects.toThrow(/guardar|persistir/i);
      expect(stock()).toBe(5);
      expect(pending()).toEqual([]);
    } finally { vi.stubGlobal('localStorage', storage); }
  });

  it('reintenta la misma operación preservando identificador, ticket, fecha y descuento', async () => {
    boundary.rpc.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await registrarVentaPOS(items, 'yape', 'Cliente', '', { monto: 2, motivo: 'Promo', autorizadoPor: 'Operadora' });
    const venta = pending()[0];
    boundary.rpc.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'denied' } });
    expect(await procesarColaVentasOffline()).toBe(0);
    expect(pending()[0].id).toBe(venta.id);
    boundary.rpc.mockResolvedValueOnce({ data: { success: true, total: 8, numero_ticket: venta.numero_ticket }, error: null });
    expect(await procesarColaVentasOffline()).toBe(1);
    const args = boundary.rpc.mock.calls.map(([, params]) => params);
    for (const params of args) {
      expect(params).toMatchObject({ p_venta_id: venta.id, p_numero_ticket: venta.numero_ticket, p_fecha: venta.fecha, p_descuento: 2, p_descuento_motivo: 'Promo', p_descuento_autorizado_por: 'Operadora' });
    }
    expect(pending()).toEqual([]);
    expect(stock()).toBe(4);
  });

  it.each([
    { data: null, error: { message: 'Bad Gateway', code: '502' }, status: 502 },
    { data: null, error: null, status: 200 },
  ])('conserva un resultado ambiguo y el reintento manual usa el mismo UUID aunque ya no quede stock', async (response) => {
    boundary.rpc.mockResolvedValueOnce(response);
    await expect(registrarVentaPOS(items, 'efectivo', 'Cliente')).rejects.toThrow();
    const venta = pending()[0];
    expect(venta).toBeDefined();
    expect(stock()).toBe(5);
    boundary.rows.productos = [{ ...producto, stock_actual: 0 }];
    boundary.rpc.mockResolvedValueOnce({ data: { success: true, total: 10, numero_ticket: venta.numero_ticket }, error: null });
    const result = await registrarVentaPOS(items, 'efectivo', 'Cliente');
    expect(result.success).toBe(true);
    expect(pending()).toEqual([]);
    expect(boundary.rpc.mock.calls[1][1]).toEqual(boundary.rpc.mock.calls[0][1]);
  });

  it('conserva ventas legacy para conciliación sin volver a descontar existencias', async () => {
    localStorage.setItem(queueKey, JSON.stringify([{ id: 'legacy-sale', numero_ticket: 'TK-OLD', fecha: '2026-11-17T15:00:00Z', items, total: 10, metodo_pago: 'efectivo' }]));
    expect(await procesarColaVentasOffline()).toBe(0);
    expect(boundary.rpc).not.toHaveBeenCalled();
    expect(pending()).toHaveLength(1);
  });

  it('un fallo de sync no confunde otra compra idéntica con un cobro offline ya aceptado', async () => {
    boundary.rpc.mockRejectedValue(new TypeError('Failed to fetch'));
    await registrarVentaPOS(items, 'efectivo');
    const firstId = pending()[0].id;
    await procesarColaVentasOffline();
    await registrarVentaPOS(items, 'efectivo');
    expect(pending()).toHaveLength(2);
    expect(pending()[1].id).not.toBe(firstId);
  });

  it.each([0, -1, 1.5, NaN])('rechaza cantidades inválidas (%s) antes de cualquier cobro', async (cantidad) => {
    boundary.configured = false;
    await expect(registrarVentaPOS([{ producto_id: 'P1', cantidad }], 'efectivo')).rejects.toThrow();
    expect(stock()).toBe(5);
    expect(pending()).toEqual([]);
  });

  it('acumula líneas repetidas antes de validar stock', async () => {
    boundary.configured = false;
    await expect(registrarVentaPOS([{ producto_id: 'P1', cantidad: 3 }, { producto_id: 'P1', cantidad: 3 }], 'efectivo')).rejects.toThrow('Stock insuficiente');
    expect(stock()).toBe(5);
  });

  it('reserva stock pendiente aunque el catálogo remoto vuelva a responder antes de sincronizar', async () => {
    boundary.rows.productos = [{ ...producto, stock_actual: 1 }];
    boundary.rpc.mockRejectedValue(new TypeError('Failed to fetch'));
    await registrarVentaPOS(items, 'efectivo');
    await expect(registrarVentaPOS(items, 'efectivo')).rejects.toThrow('Stock insuficiente');
    expect(pending()).toHaveLength(1);
  });

  it('contabiliza un contra-asiento legacy de descuento sin duplicar el ingreso bruto POS', async () => {
    boundary.rows.ventas = [{ id: 1, numero_ticket: 'TK-1', total: 10, metodo_pago: 'efectivo', cliente_nombre: 'Cliente', created_at: '2026-11-17T15:00:00Z', venta_items: [] }];
    boundary.rows.ingresos = [
      { id: 1, monto: 10, tipo: 'Venta POS Productos', observacion: 'Venta POS Ticket TK-1', metodo_pago: 'efectivo', created_at: '2026-11-17T15:00:00Z' },
      { id: 2, monto: -2, tipo: 'Descuento POS', observacion: 'Ajuste por descuento en Ticket TK-1', metodo_pago: 'efectivo', created_at: '2026-11-17T15:00:00Z' },
    ];
    const report = await obtenerReporteCajaMovimientos('2026-11-17', '2026-11-17');
    expect(report.totalRecaudado).toBe(8);
    expect(report.totalVentasPOS).toBe(8);
    expect(report.conteoVentasPOS).toBe(1);
  });
});
