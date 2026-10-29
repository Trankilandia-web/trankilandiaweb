import { motion, AnimatePresence } from 'motion/react';
import {
  Printer,
  MessageCircle,
  X,
  Dumbbell,
} from 'lucide-react';
import { GymMember } from '../../data/gymStore';

export interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: GymMember | null;
  paymentAmount: number;
  paymentTypeTitle: string; // e.g. "Pago de Adelanto" or "Cancelación Total"
  paymentMethod: string;
}

export default function ReceiptModal({
  isOpen,
  onClose,
  member,
  paymentAmount,
  paymentTypeTitle,
  paymentMethod,
}: ReceiptModalProps) {
  if (!isOpen || !member) return null;

  const receiptDate = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const receiptTime = new Date().toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handlePrint = () => {
    window.print();
  };

  const cleanPhone = (member.phone || '').replace(/\D/g, '');
  const targetPhone = cleanPhone.length >= 9 ? cleanPhone : '51999999999';

  const whatsappMessage = encodeURIComponent(
    `🥊 *TRANKILANDIA GYM · COMPROBANTE DE PAGO*\n\n` +
      `¡Hola ${member.name}!\n` +
      `Te enviamos la constancia de tu membresía:\n\n` +
      `📄 *Boleta:* ${member.receiptNumber}\n` +
      `📅 *Fecha:* ${receiptDate} ${receiptTime}\n` +
      `🏋️ *Plan:* ${member.plan}\n` +
      `💵 *Monto Abonado:* S/. ${paymentAmount}.00 (${paymentMethod.toUpperCase()})\n` +
      (member.balanceDue > 0
        ? `⚠️ *Saldo Pendiente:* S/. ${member.balanceDue}.00 (Fecha límite: ${member.paymentDueDate})\n`
        : `✅ *Estado:* Membresía cancelada al 100%\n`) +
      `📍 *Sede:* Huamanga, Ayacucho\n\n` +
      `¡A darle con todo al entrenamiento!`
  );

  const whatsappUrl = `https://wa.me/51${targetPhone.replace(/^51/, '')}?text=${whatsappMessage}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-zinc-900 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-white"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Printable Ticket Box */}
          <div
            id="printable-receipt"
            className="p-6 rounded-2xl bg-zinc-950 border border-white/15 text-zinc-300 font-mono text-xs space-y-4 print:text-black print:bg-white print:border-black"
          >
            {/* Header */}
            <div className="text-center pb-4 border-b border-dashed border-white/20">
              <div className="flex items-center justify-center gap-2 text-amber-400 mb-1">
                <Dumbbell className="w-5 h-5" />
                <span className="font-black font-display tracking-tight text-lg text-white">
                  TRANKILANDIA CLUB
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">CENTRO DEPORTIVO & ESCUELA DE BOXEO</p>
              <p className="text-[10px] text-zinc-500">Huamanga, Ayacucho, Perú</p>
              <div className="mt-2 inline-block px-3 py-1 bg-zinc-900 rounded-lg text-white font-bold text-xs border border-white/10">
                COMPROBANTE DE INGRESO · {member.receiptNumber}
              </div>
            </div>

            {/* Info Table */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Fecha y Hora:</span>
                <span className="text-zinc-200">
                  {receiptDate} · {receiptTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Socio:</span>
                <span className="text-white font-bold">{member.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">DNI:</span>
                <span className="text-zinc-200">{member.dni}</span>
              </div>
              {member.phone && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Celular:</span>
                  <span className="text-zinc-200">{member.phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500">Concepto / Plan:</span>
                <span className="text-amber-400 font-bold">{member.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Método de Cobro:</span>
                <span className="text-zinc-200 uppercase">{paymentMethod}</span>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="pt-3 border-t border-dashed border-white/20 space-y-1.5">
              <div className="flex justify-between">
                <span>Costo Total del Plan:</span>
                <span className="font-bold">S/. {member.planPrice}.00</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold">
                <span>Monto Abonado Hoy ({paymentTypeTitle}):</span>
                <span>S/. {paymentAmount}.00</span>
              </div>

              {member.balanceDue > 0 ? (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex justify-between text-amber-300 font-bold">
                  <span>SALDO PENDIENTE:</span>
                  <span>S/. {member.balanceDue}.00 (Límite: {member.paymentDueDate})</span>
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center font-bold">
                  MEMBRESÍA CANCELADA AL 100% (SIN DEUDAS)
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-dashed border-white/20 text-center text-[10px] text-zinc-500">
              <p>¡Gracias por ser parte de la familia Trankilandia Gym!</p>
              <p className="mt-0.5">Soporte y dudas: trankilandiagymperu@gmail.com</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3.5 rounded-2xl text-xs font-mono border border-white/10 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>IMPRIMIR / PDF</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3.5 rounded-2xl text-xs font-mono uppercase tracking-wider transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>ENVIAR POR WHATSAPP</span>
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
