import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePosCashier } from '../../hooks/usePosCashier';
import { registrarVentaPOS } from '../../lib/supabaseDb';

vi.mock('../../lib/supabaseDb', () => ({ registrarVentaPOS: vi.fn() }));

describe('Pruebas Unitarias · Custom Hook usePosCashier', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('inicializa con carrito vacío y método de pago efectivo', () => {
    const { result } = renderHook(() => usePosCashier());
    expect(result.current.carrito).toEqual([]);
    expect(result.current.totalCarrito).toBe(0);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.posMetodoPago).toBe('efectivo');
  });

  it('permite agregar productos y calcular correctamente totales', () => {
    const { result } = renderHook(() => usePosCashier());

    act(() => {
      result.current.agregarAlCarrito({
        id: 'BEB-001',
        nombre: 'Agua San Mateo 600ml',
        precio_venta: 2.5,
      });
    });

    expect(result.current.carrito.length).toBe(1);
    expect(result.current.carrito[0].cantidad).toBe(1);
    expect(result.current.totalCarrito).toBe(2.5);
    expect(result.current.totalItems).toBe(1);

    // Agregar el mismo producto incrementa cantidad
    act(() => {
      result.current.agregarAlCarrito({
        id: 'BEB-001',
        nombre: 'Agua San Mateo 600ml',
        precio_venta: 2.5,
      });
    });

    expect(result.current.carrito.length).toBe(1);
    expect(result.current.carrito[0].cantidad).toBe(2);
    expect(result.current.totalCarrito).toBe(5.0);
    expect(result.current.totalItems).toBe(2);
  });

  it('permite modificar cantidades y eliminar ítems al llegar a 0', () => {
    const { result } = renderHook(() => usePosCashier());

    act(() => {
      result.current.agregarAlCarrito({
        id: 'ENE-001',
        nombre: 'Monster Energy Ultra',
        precio_venta: 8.5,
      });
    });

    act(() => {
      result.current.modificarCantidad('ENE-001', 1);
    });
    expect(result.current.carrito[0].cantidad).toBe(2);
    expect(result.current.totalCarrito).toBe(17.0);

    // Disminuir hasta remover
    act(() => {
      result.current.modificarCantidad('ENE-001', -2);
    });
    expect(result.current.carrito.length).toBe(0);
    expect(result.current.totalCarrito).toBe(0);
  });

  it('permite cambiar método de pago y limpiar el carrito', () => {
    const { result } = renderHook(() => usePosCashier());

    act(() => {
      result.current.setPosMetodoPago('yape');
      result.current.agregarAlCarrito({ id: 'P1', nombre: 'Barra Proteica', precio_venta: 9.0 });
    });

    expect(result.current.posMetodoPago).toBe('yape');
    expect(result.current.carrito.length).toBe(1);

    act(() => {
      result.current.limpiarCarrito();
    });

    expect(result.current.carrito).toEqual([]);
    expect(result.current.totalCarrito).toBe(0);
  });

  it('expone el flag isProcessing para control de doble clic y se mantiene en false en reposo', () => {
    const { result } = renderHook(() => usePosCashier());
    expect(result.current.isProcessing).toBe(false);
  });

  it('permite aplicar un descuento y recalcula el total neto correctamente', () => {
    const { result } = renderHook(() => usePosCashier());
    act(() => {
      result.current.agregarAlCarrito({ id: 'P1', nombre: 'Barra Proteica', precio_venta: 10.0 });
      result.current.setDescuentoMonto(3.0);
      result.current.setDescuentoMotivo('Cortesía apertura');
    });
    expect(result.current.subtotalCarrito).toBe(10.0);
    expect(result.current.descuentoMonto).toBe(3.0);
    expect(result.current.totalCarrito).toBe(7.0);
  });

  it('conserva carrito, descuento y stock y muestra error si el cobro es rechazado', async () => {
    vi.mocked(registrarVentaPOS).mockRejectedValueOnce(new Error('Stock insuficiente'));
    const producto = { id: 'P1', nombre: 'Agua', precio_venta: 10, stock_actual: 2 };
    const { result } = renderHook(() => usePosCashier([producto]));
    act(() => {
      result.current.agregarAlCarrito(producto);
      result.current.setDescuentoMonto(2);
      result.current.setDescuentoMotivo('Promoción');
    });
    await act(() => result.current.procesarVentaPOS());
    expect(result.current.carrito).toHaveLength(1);
    expect(result.current.descuentoMonto).toBe(2);
    expect(result.current.productos[0].stock_actual).toBe(2);
    expect(result.current.posSuccessMsg).toBeNull();
    expect(result.current.posErrorMessage).toContain('Stock insuficiente');
    expect(result.current.isProcessing).toBe(false);
  });

  it('solo vacía el carrito cuando existe una venta confirmada y muestra el total autoritativo', async () => {
    vi.mocked(registrarVentaPOS).mockResolvedValueOnce({ success: true, numero_ticket: 'TK-1', total: 8, metodo_pago: 'efectivo' });
    const producto = { id: 'P1', nombre: 'Agua', precio_venta: 10, stock_actual: 2 };
    const { result } = renderHook(() => usePosCashier([producto]));
    act(() => result.current.agregarAlCarrito(producto));
    await act(() => result.current.procesarVentaPOS());
    expect(result.current.carrito).toHaveLength(0);
    expect(result.current.productos[0].stock_actual).toBe(1);
    expect(result.current.posSuccessMsg).toContain('8.00');
    expect(result.current.posErrorMessage).toBeNull();
  });

  it('no vuelve a descontar stock si el evento de inventario ya refrescó el catálogo durante el cobro', async () => {
    const producto = { id: 'P1', nombre: 'Agua', precio_venta: 10, stock_actual: 2 };
    const vendido = { ...producto, stock_actual: 1 };
    const { result } = renderHook(() => usePosCashier([producto]));
    vi.mocked(registrarVentaPOS).mockImplementationOnce(async () => {
      result.current.setProductos([vendido]);
      return { success: true, numero_ticket: 'TK-1', total: 10, metodo_pago: 'efectivo', productos_actualizados: [vendido] } as any;
    });
    act(() => result.current.agregarAlCarrito(producto));
    await act(() => result.current.procesarVentaPOS());
    expect(result.current.productos[0].stock_actual).toBe(1);
  });
});
