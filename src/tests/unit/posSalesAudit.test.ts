import { describe, it, expect, beforeEach } from 'vitest';
import { obtenerAuditoriaVentasPOS, AuditoriaVentasPOSResponse } from '../../lib/supabaseDb';

describe('Pruebas Unitarias · Auditoría de Ventas POS en Economía', () => {
  const LOCAL_OFFLINE_SALES_KEY = 'trankilandia_ventas_offline';

  beforeEach(() => {
    localStorage.clear();
  });

  it('retorna estructura vacía con totales en cero si no existen ventas registradas', async () => {
    const res = await obtenerAuditoriaVentasPOS('2026-11-17', '2026-11-17');
    expect(res).toBeDefined();
    expect(res.totalVendido).toBeGreaterThanOrEqual(0);
    expect(res.totalUnidades).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(res.ventas)).toBe(true);
    expect(Array.isArray(res.resumenPorProducto)).toBe(true);
  });

  it('procesa y consolida correctamente ventas desde almacenamiento local / offline', async () => {
    const mockVentasOffline = [
      {
        id: 'sale-1',
        numero_ticket: 'TK-20261117-0001',
        fecha: '2026-11-17T10:30:00.000Z',
        cliente_nombre: 'Marisol Flores (Encargada)',
        cliente_dni: '44844089',
        metodo_pago: 'efectivo',
        subtotal: 10,
        total: 10,
        items: [
          { producto_id: 'prod-agua', cantidad: 2, precio_unitario: 2.5, subtotal: 5 },
          { producto_id: 'prod-gatorade', cantidad: 1, precio_unitario: 5, subtotal: 5 },
        ],
      },
      {
        id: 'sale-2',
        numero_ticket: 'TK-20261117-0002',
        fecha: '2026-11-17T11:15:00.000Z',
        cliente_nombre: 'Atleta Mostrador',
        metodo_pago: 'yape',
        subtotal: 5,
        total: 5,
        items: [
          { producto_id: 'prod-agua', cantidad: 2, precio_unitario: 2.5, subtotal: 5 },
        ],
      },
    ];

    localStorage.setItem(LOCAL_OFFLINE_SALES_KEY, JSON.stringify(mockVentasOffline));

    const res = await obtenerAuditoriaVentasPOS('2026-11-17', '2026-11-17');

    // Verificar que se incluyeron las 2 ventas
    expect(res.ventas.length).toBeGreaterThanOrEqual(2);
    expect(res.totalVendido).toBeGreaterThanOrEqual(15);
    expect(res.totalUnidades).toBeGreaterThanOrEqual(5);

    // Verificar consolidado por producto
    const agua = res.resumenPorProducto.find((p) => p.productoId === 'prod-agua');
    expect(agua).toBeDefined();
    expect(agua?.cantidadTotal).toBeGreaterThanOrEqual(4);
    expect(agua?.totalRecaudado).toBeGreaterThanOrEqual(10);
  });
});
