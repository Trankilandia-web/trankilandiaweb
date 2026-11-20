import { useState, useMemo, useCallback, useRef } from 'react';
import { registrarVentaPOS } from '../lib/supabaseDb';
import { getActiveStaffSession } from '../lib/staffStore';

export interface PosCartItem {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface UsePosCashierReturn {
  productos: any[];
  setProductos: React.Dispatch<React.SetStateAction<any[]>>;
  carrito: PosCartItem[];
  posMetodoPago: 'efectivo' | 'yape';
  setPosMetodoPago: React.Dispatch<React.SetStateAction<'efectivo' | 'yape'>>;
  posSuccessMsg: string | null;
  posErrorMessage: string | null;
  setPosSuccessMsg: React.Dispatch<React.SetStateAction<string | null>>;
  subtotalCarrito: number;
  descuentoMonto: number;
  setDescuentoMonto: React.Dispatch<React.SetStateAction<number>>;
  descuentoMotivo: string;
  setDescuentoMotivo: React.Dispatch<React.SetStateAction<string>>;
  totalCarrito: number;
  totalItems: number;
  isProcessing: boolean;
  agregarAlCarrito: (prod: any) => void;
  modificarCantidad: (id: string, delta: number) => void;
  procesarVentaPOS: () => Promise<void>;
  limpiarCarrito: () => void;
}

export function usePosCashier(initialProducts: any[] = []): UsePosCashierReturn {
  const [productos, setProductos] = useState<any[]>(initialProducts);
  const [carrito, setCarrito] = useState<PosCartItem[]>([]);
  const [posMetodoPago, setPosMetodoPago] = useState<'efectivo' | 'yape'>('efectivo');
  const [descuentoMonto, setDescuentoMonto] = useState<number>(0);
  const [descuentoMotivo, setDescuentoMotivo] = useState<string>('');
  const [posSuccessMsg, setPosSuccessMsg] = useState<string | null>(null);
  const [posErrorMessage, setPosErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);

  const agregarAlCarrito = useCallback((prod: any) => {
    setCarrito((prev) => {
      const exists = prev.find((i) => i.id === prod.id);
      if (exists) {
        return prev.map((i) => (i.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [
        ...prev,
        {
          id: prod.id,
          nombre: prod.nombre,
          precio: Number(prod.precio_venta || prod.precio || 0),
          cantidad: 1,
        },
      ];
    });
  }, []);

  const modificarCantidad = useCallback((id: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, cantidad: Math.max(0, i.cantidad + delta) } : i))
        .filter((i) => i.cantidad > 0)
    );
  }, []);

  const limpiarCarrito = useCallback(() => {
    setCarrito([]);
    setDescuentoMonto(0);
    setDescuentoMotivo('');
  }, []);

  const subtotalCarrito = useMemo(
    () => carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0),
    [carrito]
  );

  const totalCarrito = useMemo(
    () => Math.max(0, subtotalCarrito - (Number(descuentoMonto) || 0)),
    [subtotalCarrito, descuentoMonto]
  );

  const totalItems = useMemo(
    () => carrito.reduce((sum, item) => sum + item.cantidad, 0),
    [carrito]
  );

  const procesarVentaPOS = useCallback(async () => {
    if (carrito.length === 0 || isProcessingRef.current) return;
    const operator = getActiveStaffSession()?.nombre || 'Recepción';
    const montoDesc = Number(descuentoMonto) || 0;

    try {
      isProcessingRef.current = true;
      setIsProcessing(true);
      setPosErrorMessage(null);
      setPosSuccessMsg(null);
      const venta = await registrarVentaPOS(
        carrito.map((c) => ({
          producto_id: c.id,
          nombre: c.nombre,
          cantidad: c.cantidad,
          precio_unitario: c.precio,
        })),
        posMetodoPago,
        `Cliente Mostrador (${operator})`,
        '',
        montoDesc > 0
          ? {
              monto: montoDesc,
              motivo: descuentoMotivo || 'Descuento autorizado',
              autorizadoPor: operator,
            }
          : undefined
      );
      if (!venta.success) throw new Error('No se pudo confirmar el cobro. Revisa el carrito e intenta nuevamente.');
      // Descontar inmediatamente el stock en el catálogo reactivo en memoria del POS
      setProductos((prevProds) =>
        venta.productos_actualizados ?? prevProds.map((p) => {
          const itemVendido = carrito.find((c) => c.id === p.id);
          if (itemVendido) {
            const currentStock = p.stock_actual ?? p.stock ?? 0;
            const updatedStock = Math.max(0, currentStock - itemVendido.cantidad);
            return {
              ...p,
              stock_actual: updatedStock,
              stock: updatedStock,
            };
          }
          return p;
        })
      );

      setPosSuccessMsg(venta.pendiente_sync
        ? `Cobro de S/. ${venta.total.toFixed(2)} guardado en este equipo. Pendiente de sincronización.`
        : `¡Cobro de S/. ${venta.total.toFixed(2)} registrado con éxito!`);
      setCarrito([]);
      setDescuentoMonto(0);
      setDescuentoMotivo('');
      setTimeout(() => setPosSuccessMsg(null), 4000);
    } catch (error) {
      setPosErrorMessage(error instanceof Error ? error.message : 'No se pudo registrar el cobro. El carrito se conserva.');
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [carrito, posMetodoPago, totalCarrito, descuentoMonto, descuentoMotivo]);

  return {
    productos,
    setProductos,
    carrito,
    posMetodoPago,
    setPosMetodoPago,
    posSuccessMsg,
    posErrorMessage,
    setPosSuccessMsg,
    subtotalCarrito,
    descuentoMonto,
    setDescuentoMonto,
    descuentoMotivo,
    setDescuentoMotivo,
    totalCarrito,
    totalItems,
    isProcessing,
    agregarAlCarrito,
    modificarCantidad,
    procesarVentaPOS,
    limpiarCarrito,
  };
}
