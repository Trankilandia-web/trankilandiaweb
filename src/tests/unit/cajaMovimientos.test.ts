import { describe, it, expect, beforeEach } from 'vitest';
import { obtenerReporteCajaMovimientos } from '../../lib/supabaseDb';

describe('Pruebas Unitarias · Reporte de Caja y Movimientos Unificados', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('retorna reporte con totales en cero y array de movimientos vacío cuando no hay transacciones', async () => {
    const reporte = await obtenerReporteCajaMovimientos('2099-01-01T00:00:00Z', '2099-01-01T23:59:59Z');
    expect(reporte).toBeDefined();
    expect(reporte.totalRecaudado).toBe(0);
    expect(reporte.totalEfectivo).toBe(0);
    expect(reporte.totalYape).toBe(0);
    expect(reporte.totalPlin).toBe(0);
    expect(reporte.totalTarjeta).toBe(0);
    expect(Array.isArray(reporte.movimientos)).toBe(true);
    expect(Array.isArray(reporte.resumenProductos)).toBe(true);
  });

  it('consolida ventas de cola offline e ingresos locales calculando arqueo exacto por método de pago', async () => {
    const fakeOfflineSale = [
      {
        id: 'sale-offline-1',
        numero_ticket: 'TICK-901',
        total: 12.5,
        metodo_pago: 'efectivo',
        cliente_nombre: 'Carlos Perez',
        cliente_dni: '45678912',
        fecha: '2099-01-01T14:30:00.000Z',
        items: [{ producto_id: 'BEB-001', cantidad: 2 }],
      },
      {
        id: 'sale-offline-2',
        numero_ticket: 'TICK-902',
        total: 8.5,
        metodo_pago: 'yape',
        cliente_nombre: 'Maria Gomez',
        cliente_dni: '78912345',
        fecha: '2099-01-01T15:15:00.000Z',
        items: [{ producto_id: 'ENE-001', cantidad: 1 }],
      },
    ];
    localStorage.setItem('trankilandia_ventas_offline', JSON.stringify(fakeOfflineSale));

    const reporte = await obtenerReporteCajaMovimientos('2099-01-01T00:00:00Z', '2099-01-01T23:59:59Z');
    expect(reporte.totalVentasPOS).toBe(21);
    expect(reporte.conteoVentasPOS).toBe(2);
    expect(reporte.totalEfectivo).toBe(12.5);
    expect(reporte.totalYape).toBe(8.5);
    expect(reporte.totalRecaudado).toBe(21);

    expect(reporte.movimientos.length).toBe(2);
    // Orden cronológico descendente (15:15 antes que 14:30)
    expect(reporte.movimientos[0].ticketOBoleta).toBe('TICK-902');
    expect(reporte.movimientos[1].ticketOBoleta).toBe('TICK-901');
  });
});
