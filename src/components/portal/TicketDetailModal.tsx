import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Printer,
  Copy,
  CheckCircle2,
  ShoppingBag,
  Coins,
  Calendar,
  Clock,
  User,
  WifiOff,
  Cloud,
} from 'lucide-react';

export interface TicketItemData {
  productoId?: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface TicketVentaModalData {
  numeroTicket: string;
  fecha: string;
  hora: string;
  clienteNombre: string;
  clienteDni?: string;
  metodoPago: string;
  operador?: string;
  esOffline?: boolean;
  total: number;
  subtotal?: number;
  descuento?: { monto: number; motivo: string };
  concepto?: string;
  items?: TicketItemData[];
}

export interface TicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: TicketVentaModalData | null;
}

export default function TicketDetailModal({
  isOpen,
  onClose,
  ticket,
}: TicketDetailModalProps): React.JSX.Element | null {
  const [copiado, setCopiado] = useState(false);

  if (!isOpen || !ticket) return null;

  const handlePrint = () => {
    window.print();
  };

  const items = ticket.items || [];
  const calculatedSubtotal = ticket.subtotal ?? (
    items.length > 0
      ? items.reduce((sum, it) => sum + (it.subtotal || it.precioUnitario * it.cantidad), 0)
      : ticket.total
  );
  const descuentoMonto = ticket.descuento?.monto || 0;

  const handleCopiarTexto = () => {
    const itemsTexto = items.length > 0
      ? items.map((it) => `• ${it.cantidad}x ${it.nombreProducto} (S/. ${it.precioUnitario.toFixed(2)} c/u) = S/. ${it.subtotal.toFixed(2)}`).join('\n')
      : ticket.concepto || 'Venta directa mostrador';

    const texto =
      `==============================\n` +
      `TRANKILANDIA CLUB · TICKET POS\n` +
      `Ticket: ${ticket.numeroTicket}\n` +
      `Fecha: ${ticket.fecha} - ${ticket.hora}\n` +
      `Cliente: ${ticket.clienteNombre}${ticket.clienteDni ? ` (DNI: ${ticket.clienteDni})` : ''}\n` +
      `Operador: ${ticket.operador || 'Recepción / POS'}\n` +
      `Método: ${ticket.metodoPago.toUpperCase()}\n` +
      `------------------------------\n` +
      `PRODUCTOS / DETALLE:\n${itemsTexto}\n` +
      `------------------------------\n` +
      (descuentoMonto > 0 ? `Subtotal: S/. ${calculatedSubtotal.toFixed(2)}\nDescuento: -S/. ${descuentoMonto.toFixed(2)} (${ticket.descuento?.motivo})\n` : '') +
      `TOTAL COBRADO: S/. ${ticket.total.toFixed(2)}\n` +
      `==============================`;

    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg bg-zinc-900 border border-white/20 rounded-3xl p-6 sm:p-7 shadow-2xl relative text-white max-h-[90vh] flex flex-col"
        >
          {/* Botón cerrar */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Encabezado Modal */}
          <div className="flex items-center gap-3 pb-4 border-b border-white/10 pr-10">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black font-display text-white uppercase tracking-tight flex items-center gap-2">
                <span>Detalle de Ticket de Venta</span>
                {ticket.esOffline ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold lowercase">
                    <WifiOff className="w-3 h-3" />
                    <span>offline</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold lowercase">
                    <Cloud className="w-3 h-3" />
                    <span>sincronizado</span>
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                Comprobante oficial de venta y registro contable
              </p>
            </div>
          </div>

          {/* Contenido scrolleable / Caja imprimible del Ticket */}
          <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1">
            <div
              id="printable-ticket"
              className="p-5 rounded-2xl bg-zinc-950 border border-white/15 text-zinc-300 font-mono text-xs space-y-4 print:text-black print:bg-white print:border-black"
            >
              {/* Encabezado del Ticket Físico */}
              <div className="text-center pb-3 border-b border-dashed border-white/20">
                <div className="text-amber-400 font-black font-display text-base tracking-wide">
                  TRANKILANDIA CLUB
                </div>
                <div className="text-[10px] text-zinc-400">PUNTO DE VENTA & RECEPCIÓN OFICIAL</div>
                <div className="text-[10px] text-zinc-500">Jr. José Olaya N° 640, Huamanga, Ayacucho</div>
                <div className="mt-2.5 inline-block px-3 py-1 bg-zinc-900 rounded-lg text-amber-400 font-black text-xs border border-white/10 tracking-widest font-mono">
                  {ticket.numeroTicket}
                </div>
              </div>

              {/* Metadatos de la Venta */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pb-3 border-b border-dashed border-white/20">
                <div className="space-y-1">
                  <div className="text-zinc-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-zinc-400" />
                    <span>Fecha:</span>
                  </div>
                  <div className="text-white font-bold">{ticket.fecha}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    <span>Hora:</span>
                  </div>
                  <div className="text-white font-bold">{ticket.hora}</div>
                </div>

                <div className="space-y-1 col-span-2 pt-1 border-t border-white/5">
                  <div className="text-zinc-500 flex items-center gap-1">
                    <User className="w-3 h-3 text-zinc-400" />
                    <span>Cliente / Atleta:</span>
                  </div>
                  <div className="text-white font-bold text-xs flex items-center gap-2">
                    <span>{ticket.clienteNombre}</span>
                    {ticket.clienteDni && (
                      <span className="text-[10px] text-amber-400 font-normal">
                        (DNI: {ticket.clienteDni})
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-zinc-500 flex items-center gap-1">
                    <Coins className="w-3 h-3 text-zinc-400" />
                    <span>Método de Pago:</span>
                  </div>
                  <div className="text-amber-400 font-bold uppercase">{ticket.metodoPago}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-zinc-500">Operador:</div>
                  <div className="text-zinc-300 truncate">{ticket.operador || 'Recepción / POS'}</div>
                </div>
              </div>

              {/* Desglose de Productos */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-white/10">
                  <span>Productos ({items.length || 1})</span>
                  <span>Importe</span>
                </div>

                {items.length > 0 ? (
                  <div className="divide-y divide-white/5 space-y-1">
                    {items.map((it, idx) => (
                      <div key={idx} className="pt-1.5 flex items-start justify-between text-xs">
                        <div className="pr-2">
                          <div className="text-white font-bold flex items-center gap-1.5">
                            <span className="text-amber-400 font-mono">{it.cantidad}x</span>
                            <span>{it.nombreProducto}</span>
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            P. Unitario: S/. {it.precioUnitario.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right font-bold text-zinc-200 font-mono">
                          S/. {it.subtotal.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-2.5 px-3 rounded-xl bg-zinc-900 border border-white/5 text-xs text-zinc-300">
                    <div className="font-bold text-white mb-0.5">Venta Directa de Mostrador</div>
                    <div className="text-[11px] text-zinc-400">
                      {ticket.concepto || 'Registro contable sin desglose por unidad.'}
                    </div>
                  </div>
                )}
              </div>

              {/* Totales y Liquidación */}
              <div className="pt-3 border-t border-dashed border-white/20 space-y-1.5 text-xs font-mono">
                {descuentoMonto > 0 && (
                  <>
                    <div className="flex justify-between text-zinc-400">
                      <span>Subtotal Productos:</span>
                      <span>S/. {calculatedSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-amber-400 font-bold">
                      <span>Descuento ({ticket.descuento?.motivo || 'Autorizado'}):</span>
                      <span>- S/. {descuentoMonto.toFixed(2)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-center text-sm font-black text-white pt-1.5 border-t border-white/10">
                  <span className="uppercase text-amber-400">TOTAL COBRADO:</span>
                  <span className="text-base text-emerald-400 font-mono font-black">
                    S/. {ticket.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Pie de Ticket */}
              <div className="pt-3 border-t border-dashed border-white/20 text-center text-[10px] text-zinc-500">
                ¡Gracias por su preferencia! · Trankilandia Gym
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs font-display uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-amber-400/20"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Ticket</span>
            </button>

            <button
              type="button"
              onClick={handleCopiarTexto}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs font-mono uppercase transition-all cursor-pointer flex items-center justify-center gap-2 border border-white/10"
            >
              {copiado ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>Copiar</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs uppercase transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
