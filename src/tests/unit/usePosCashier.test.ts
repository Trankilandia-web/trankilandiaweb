import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePosCashier } from '../../hooks/usePosCashier';

describe('Pruebas Unitarias · Custom Hook usePosCashier', () => {
  beforeEach(() => {
    localStorage.clear();
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
});
