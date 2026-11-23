import { describe, it, expect, beforeEach } from 'vitest';
import {
  obtenerAuditoriaVentasPOS,
  obtenerReporteCajaMovimientos,
  guardarEnHistorialVentasLocal,
  obtenerHistorialVentasLocal,
} from '../../lib/supabaseDb';

describe('Pruebas Unitarias · Historial de Tickets y Recuperación de Ventas Offline', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('guarda y recupera tickets de venta en el historial local persistente', () => {
    const fakeTicket = {
      id: 'ticket-101',
      numeroTicket: 'TK-20261123-0101',
      fecha: '23/11/2026',
      hora: '04:15 p. m.',
      fechaHoraISO: '2026-11-23T21:15:00.000Z',
      clienteNombre: 'Carlos Mostrador',
      metodoPago: 'efectivo',
      total: 15,
      items: [
        {
          productoId: 'prod-agua',
          nombreProducto: 'Agua San Luis 625ml',
          cantidad: 2,
          precioUnitario: 2.5,
          subtotal: 5,
        },
        {
          productoId: 'prod-gatorade',
          nombreProducto: 'Gatorade Blue 500ml',
          cantidad: 2,
          precioUnitario: 5,
          subtotal: 10,
        },
      ],
    };

    guardarEnHistorialVentasLocal(fakeTicket);

    const historial = obtenerHistorialVentasLocal();
    expect(historial.length).toBe(1);
    expect(historial[0].numeroTicket).toBe('TK-20261123-0101');
    expect(historial[0].items.length).toBe(2);
    expect(historial[0].items[0].nombreProducto).toBe('Agua San Luis 625ml');
  });

  it('obtenerAuditoriaVentasPOS incluye ventas del historial local persistente sin duplicar', async () => {
    const fakeTicket = {
      id: 'ticket-102',
      numeroTicket: 'TK-20261123-0102',
      fecha: '23/11/2026',
      hora: '04:30 p. m.',
      fechaHoraISO: '2026-11-23T21:30:00.000Z',
      clienteNombre: 'Atleta Local',
      metodoPago: 'yape',
      total: 8,
      items: [
        {
          productoId: 'prod-barra',
          nombreProducto: 'Barra Proteica',
          cantidad: 1,
          precioUnitario: 8,
          subtotal: 8,
        },
      ],
    };

    guardarEnHistorialVentasLocal(fakeTicket);

    const res = await obtenerAuditoriaVentasPOS('2026-11-23', '2026-11-23');
    const encontrado = res.ventas.find((v) => v.numeroTicket === 'TK-20261123-0102');
    expect(encontrado).toBeDefined();
    expect(encontrado?.items.length).toBe(1);
    expect(encontrado?.items[0].nombreProducto).toBe('Barra Proteica');
  });

  it('obtenerReporteCajaMovimientos incluye el detalle de ítems en los movimientos de venta POS', async () => {
    const fakeOfflineSale = [
      {
        id: 'sale-offline-300',
        numero_ticket: 'TK-2099-0300',
        total: 10,
        metodo_pago: 'efectivo',
        cliente_nombre: 'Maria Gomez',
        fecha: '2099-01-01T16:00:00.000Z',
        items: [
          {
            producto_id: 'prod-agua',
            nombre_producto: 'Agua Mineral',
            cantidad: 4,
            precio_unitario: 2.5,
            subtotal: 10,
          },
        ],
      },
    ];
    localStorage.setItem('trankilandia_ventas_offline', JSON.stringify(fakeOfflineSale));

    const reporte = await obtenerReporteCajaMovimientos('2099-01-01T00:00:00Z', '2099-01-01T23:59:59Z');
    const mov = reporte.movimientos.find((m) => m.ticketOBoleta === 'TK-2099-0300');
    expect(mov).toBeDefined();
    expect(mov?.tipo).toBe('venta_pos');
    expect(mov?.items).toBeDefined();
    expect(mov?.items?.length).toBe(1);
    expect(mov?.items?.[0].nombreProducto).toBe('Agua Mineral');
  });
});
