import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  Printer,
  Smartphone,
} from 'lucide-react';
import PortalHeader from '../../components/portal/PortalHeader';

interface Transaction {
  id: string;
  clientName: string;
  dni: string;
  concept: string;
  amount: number;
  paymentMethod: 'yape' | 'plin' | 'efectivo' | 'tarjeta';
  time: string;
  receiptNumber: string;
}

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'TRX-941',
    clientName: 'Maricielo Sulca Cárdenas',
    dni: '76541230',
    concept: 'Renovación 1 Mes Combo Boxeo',
    amount: 140,
    paymentMethod: 'yape',
    time: 'Hoy, 06:12 PM',
    receiptNumber: 'B001-000492',
  },
  {
    id: 'TRX-940',
    clientName: 'Renato Flores Bendezú',
    dni: '70192834',
    concept: 'Plan 6 Meses Musculación Libre',
    amount: 420,
    paymentMethod: 'plin',
    time: 'Hoy, 05:45 PM',
    receiptNumber: 'B001-000491',
  },
  {
    id: 'TRX-939',
    clientName: 'Kevin Quispe Medina',
    dni: '73001892',
    concept: 'Pase Diario Huamanga + Agua',
    amount: 18,
    paymentMethod: 'efectivo',
    time: 'Hoy, 04:30 PM',
    receiptNumber: 'B001-000490',
  },
  {
    id: 'TRX-938',
    clientName: 'Daniela Palomino Prado',
    dni: '74889102',
    concept: 'Plan 3 Meses Musculación',
    amount: 230,
    paymentMethod: 'tarjeta',
    time: 'Hoy, 03:15 PM',
    receiptNumber: 'B001-000489',
  },
];

const PLANS_CATALOG = [
  { name: '1 Mes · Musculación Libre', price: 90 },
  { name: '3 Meses · Musculación Libre', price: 230 },
  { name: '6 Meses · Musculación Libre', price: 420 },
  { name: '1 Año · Musculación Libre', price: 750 },
  { name: 'Pase Diario de Entrenamiento', price: 15 },
  { name: 'Add-on Boxeo Intensivo (+1 Mes)', price: 50 },
  { name: 'Agua Mineral / Bebida Rehidratante', price: 3 },
  { name: 'Proteína Whey Scoop Post-Entreno', price: 8 },
];

export default function CajaDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [selectedPlan, setSelectedPlan] = useState(PLANS_CATALOG[0]);
  const [clientName, setClientName] = useState('');
  const [clientDni, setClientDni] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'yape' | 'plin' | 'efectivo' | 'tarjeta'>('yape');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const totalToday = transactions.reduce((acc, curr) => acc + curr.amount, 0);
  const cashTotal = transactions
    .filter((t) => t.paymentMethod === 'efectivo')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const digitalTotal = totalToday - cashTotal;

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientDni.trim()) {
      alert('Ingresa el nombre y DNI del socio.');
      return;
    }

    const nextNumber = transactions.length + 493;
    const newTx: Transaction = {
      id: `TRX-${Date.now().toString().slice(-3)}`,
      clientName: clientName.trim(),
      dni: clientDni.trim(),
      concept: selectedPlan.name,
      amount: selectedPlan.price,
      paymentMethod,
      time: 'Hoy, justo ahora',
      receiptNumber: `B001-000${nextNumber}`,
    };

    setTransactions([newTx, ...transactions]);
    setSuccessMessage(`Cobro de S/. ${selectedPlan.price}.00 procesado con éxito para ${clientName}. Boleta ${newTx.receiptNumber} generada.`);
    setClientName('');
    setClientDni('');

    setTimeout(() => setSuccessMessage(null), 4000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      <PortalHeader
        currentRole="caja"
        title="Terminal de Caja & Ventas"
        subtitle="Recepción y Cobros en Tiempo Real · Trankilandia Gym Huamanga"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3 font-mono"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        )}

        {/* Resumen de Caja Chica */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-5">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Total Recaudado Hoy</span>
            <div className="mt-2 text-3xl font-black font-display text-white">
              S/. {totalToday.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-emerald-400 font-mono mt-1">{transactions.length} transacciones registradas</p>
          </div>

          <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-5">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Efectivo en Cajón</span>
            <div className="mt-2 text-3xl font-black font-display text-emerald-400">
              S/. {(cashTotal + 150).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-zinc-500 font-mono mt-1">Incluye S/. 150.00 de apertura</p>
          </div>

          <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-5">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Digital (Yape / Plin)</span>
            <div className="mt-2 text-3xl font-black font-display text-purple-400">
              S/. {digitalTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-zinc-500 font-mono mt-1">Verificado en cuenta bancaria</p>
          </div>

          <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-5">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Estado de Caja</span>
            <div className="mt-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-2xl font-black font-display text-white">ABIERTA</span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono mt-1">Turno Mañana/Tarde · Huamanga</p>
          </div>
        </div>

        {/* POS Panel + Transaction History */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Quick POS Charging Form (5 cols) */}
          <div className="lg:col-span-5 bg-zinc-900/60 border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
              <Receipt className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="text-base font-bold text-white font-display uppercase tracking-wide">
                  Punto de Cobro Rápido
                </h2>
                <p className="text-xs text-zinc-400">Membresías y pases de entrenamiento</p>
              </div>
            </div>

            <form onSubmit={handleProcessPayment} className="mt-5 space-y-4 text-xs font-mono">
              <div>
                <label className="block text-zinc-400 font-bold mb-1.5 uppercase">
                  Plan o Concepto
                </label>
                <select
                  value={selectedPlan.name}
                  onChange={(e) => {
                    const plan = PLANS_CATALOG.find((p) => p.name === e.target.value);
                    if (plan) setSelectedPlan(plan);
                  }}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {PLANS_CATALOG.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} — S/. {p.price}.00
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-bold mb-1.5 uppercase">
                    DNI del Socio
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    required
                    value={clientDni}
                    onChange={(e) => setClientDni(e.target.value.replace(/\D/g, ''))}
                    placeholder="73921845"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-bold mb-1.5 uppercase">
                    Monto a Cobrar
                  </label>
                  <div className="w-full bg-zinc-950 border border-emerald-500/30 text-emerald-400 font-extrabold text-sm rounded-xl px-3 py-2 flex items-center justify-between">
                    <span>PEN</span>
                    <span>S/. {selectedPlan.price}.00</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-bold mb-1.5 uppercase">
                  Nombre Completo del Atleta
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej: Juan Carlos Pérez"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-bold mb-2 uppercase">
                  Método de Pago
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'yape', label: 'YAPE (QR / Móvil)', icon: Smartphone },
                    { id: 'plin', label: 'PLIN', icon: QrCode },
                    { id: 'efectivo', label: 'EFECTIVO', icon: Banknote },
                    { id: 'tarjeta', label: 'TARJETA (POS)', icon: CreditCard },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                            : 'bg-zinc-950 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3 rounded-xl text-xs font-mono shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>CONFIRMAR COBRO (S/. {selectedPlan.price}.00)</span>
              </button>
            </form>
          </div>

          {/* Transactions List (7 cols) */}
          <div className="lg:col-span-7 bg-zinc-900/60 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h2 className="text-base font-bold text-white font-display uppercase tracking-wide">
                  Movimientos de Hoy
                </h2>
                <p className="text-xs text-zinc-400">Comprobantes y boletas emitidas</p>
              </div>
              <span className="text-xs font-mono text-zinc-500">Sede Huamanga</span>
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto max-h-[460px] pr-1">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/5 hover:border-white/15 transition-colors flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white font-sans">{tx.clientName}</div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        {tx.concept} · DNI: {tx.dni}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {tx.receiptNumber} · {tx.time} · Método: <span className="uppercase text-zinc-300 font-bold">{tx.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-mono font-black text-sm text-emerald-400">
                      S/. {tx.amount}.00
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        alert(`Reimprimiendo comprobante ${tx.receiptNumber} para ${tx.clientName}`);
                      }}
                      className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <Printer className="w-3 h-3 text-amber-400" />
                      <span>Imprimir</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
