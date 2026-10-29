import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  Printer,
  Smartphone,
  AlertTriangle,
  Search,
  DollarSign,
} from 'lucide-react';
import PortalHeader from '../../components/portal/PortalHeader';
import {
  GymMember,
  getStoredMembers,
  saveStoredMembers,
} from '../../data/gymStore';

const PLANS_CATALOG = [
  { name: '1 Mes · Musculación Libre', price: 80 },
  { name: '2 Meses · Musculación Libre', price: 130 },
  { name: '3 Meses · Musculación Libre', price: 190 },
  { name: '4 Meses · Musculación Libre', price: 200 },
  { name: '6 Meses · Musculación Libre', price: 330 },
  { name: '8 Meses · Musculación Libre', price: 330 },
  { name: '1 Año · Musculación Libre', price: 430 },
  { name: '1 Mes · Combo Musculación + Boxeo', price: 130 },
  { name: 'Pase Diario de Entrenamiento', price: 15 },
];

export default function CajaDashboard() {
  const [members, setMembers] = useState<GymMember[]>(getStoredMembers());

  // Scanner / Search State
  const [scannedDni, setScannedDni] = useState('');
  const [scannedMember, setScannedMember] = useState<GymMember | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // New Registration State
  const [selectedPlan, setSelectedPlan] = useState(PLANS_CATALOG[1]);
  const [clientName, setClientName] = useState('');
  const [clientDni, setClientDni] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [isAdvancePayment, setIsAdvancePayment] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState<number>(50);
  const [dueDateDays, setDueDateDays] = useState<number>(10);
  const [paymentMethod, setPaymentMethod] = useState<'yape' | 'plin' | 'efectivo' | 'tarjeta'>('yape');

  // Modal / Liquidate Debt State
  const [liquidatingMember, setLiquidatingMember] = useState<GymMember | null>(null);
  const [liquidateMethod, setLiquidateMethod] = useState<'yape' | 'plin' | 'efectivo' | 'tarjeta'>('yape');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    saveStoredMembers(members);
  }, [members]);

  // Handle DNI Scan
  const handleScanDni = (dniToSearch?: string) => {
    const targetDni = (dniToSearch || scannedDni).trim();
    if (!targetDni) return;

    const found = members.find((m) => m.dni === targetDni);
    setScannedMember(found || null);
    setHasSearched(true);
  };

  // Quick preset test scanner
  const handleQuickTestScan = (dni: string) => {
    setScannedDni(dni);
    handleScanDni(dni);
  };

  // Process New Membership (Full or Advance)
  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientDni.trim()) {
      alert('Por favor ingresa el nombre y DNI del socio.');
      return;
    }

    const price = selectedPlan.price;
    const paid = isAdvancePayment ? Math.min(advanceAmount, price) : price;
    const balance = isAdvancePayment ? Math.max(0, price - paid) : 0;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDateDays);
    const dueDateFormatted = dueDate.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const nextNumber = members.length + 495;
    const newMember: GymMember = {
      id: `MEM-00${members.length + 1}`,
      name: clientName.trim(),
      dni: clientDni.trim(),
      email: clientEmail.trim() || `${clientDni.trim()}@cliente.trankilandia.pe`,
      plan: selectedPlan.name,
      planPrice: price,
      paymentType: isAdvancePayment ? 'advance' : 'full',
      advancePaid: paid,
      balanceDue: balance,
      paymentDueDate: isAdvancePayment ? dueDateFormatted : undefined,
      paymentMethod,
      receiptNumber: `B001-000${nextNumber}`,
      membershipStatus: 'active',
      expiresAt: '30 Días (Renovación)',
      coachName: 'Coach Marcos Rivas',
      registeredAt: 'Hoy, ' + new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = [newMember, ...members];
    setMembers(updated);
    setScannedMember(newMember);
    setHasSearched(true);

    setSuccessMessage(
      isAdvancePayment
        ? `Inscripción registrada. Cobrado adelanto de S/. ${paid}.00. Queda saldo pendiente de S/. ${balance}.00 para ${newMember.name}.`
        : `Membresía completa registrada y cancelada (S/. ${price}.00) para ${newMember.name}.`
    );

    // Reset Form
    setClientName('');
    setClientDni('');
    setClientEmail('');
    setIsAdvancePayment(false);
    setAdvanceAmount(50);

    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Liquidate Pending Balance
  const handleConfirmLiquidate = () => {
    if (!liquidatingMember) return;

    const amountPaid = liquidatingMember.balanceDue;
    const updated = members.map((m) => {
      if (m.id === liquidatingMember.id) {
        return {
          ...m,
          paymentType: 'full' as const,
          advancePaid: m.planPrice,
          balanceDue: 0,
          paymentDueDate: undefined,
          receiptNumber: `B001-000${members.length + 500} (Cancelación)`,
        };
      }
      return m;
    });

    setMembers(updated);
    const updatedScanned = updated.find((m) => m.id === liquidatingMember.id) || null;
    setScannedMember(updatedScanned);
    setSuccessMessage(
      `¡Saldo pendiente de S/. ${amountPaid}.00 cobrado con éxito! La membresía de ${liquidatingMember.name} ahora está 100% cancelada.`
    );
    setLiquidatingMember(null);

    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Stats
  const totalCollectedToday = members.reduce((sum, m) => sum + m.advancePaid, 0);
  const pendingDebtsTotal = members.reduce((sum, m) => sum + m.balanceDue, 0);
  const membersWithDebt = members.filter((m) => m.balanceDue > 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans pb-16">
      <PortalHeader
        currentRole="caja"
        title="Terminal de Caja & Cobros"
        subtitle="Control de Inscripciones, Adelantos y Escaneo de DNI · Huamanga, Ayacucho"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3 font-mono shadow-lg"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        )}

        {/* 1. MÓDULO PRINCIPAL: ESCÁNER Y CONSULTA RÁPIDA DE DNI */}
        <section className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-black border-2 border-amber-400/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-400 text-black font-black">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black uppercase text-white font-display tracking-tight flex items-center gap-2">
                  <span>Escáner de DNI & Verificación de Acceso</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h2>
                <p className="text-xs text-zinc-400 font-sans mt-0.5">
                  Ingresa o escanea el DNI del socio para detectar si tiene un <span className="text-amber-400 font-bold">adelanto pendiente</span> o si está al día.
                </p>
              </div>
            </div>

            {/* Quick Demo Test Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-mono text-zinc-500 mr-1">Probar con DNIs de Gym.xlsm:</span>
              <button
                type="button"
                onClick={() => handleQuickTestScan('73921845')}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-[11px] font-mono font-bold border border-amber-400/30 transition-colors cursor-pointer"
              >
                73921845 (Luis · Debe S/. 70)
              </button>
              <button
                type="button"
                onClick={() => handleQuickTestScan('46593520')}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-[11px] font-mono font-bold border border-amber-400/30 transition-colors cursor-pointer"
              >
                46593520 (Ana Sembrera · Debe S/. 310)
              </button>
              <button
                type="button"
                onClick={() => handleQuickTestScan('45259734')}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-[11px] font-mono font-bold border border-amber-400/30 transition-colors cursor-pointer"
              >
                45259734 (Fiorela · Debe S/. 30)
              </button>
              <button
                type="button"
                onClick={() => handleQuickTestScan('70472299')}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-[11px] font-mono font-bold border border-emerald-500/30 transition-colors cursor-pointer"
              >
                70472299 (Alfred · Al día)
              </button>
            </div>
          </div>

          {/* DNI Input Bar */}
          <div className="mt-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleScanDni();
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={8}
                  value={scannedDni}
                  onChange={(e) => setScannedDni(e.target.value.replace(/\D/g, ''))}
                  placeholder="Escribe el DNI del socio o pasa el lector de barras..."
                  className="w-full pl-12 pr-4 py-3.5 bg-zinc-950 border border-white/20 rounded-2xl text-base font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors shadow-inner"
                />
              </div>

              <button
                type="submit"
                className="bg-amber-400 hover:bg-amber-300 text-black font-black px-6 py-3.5 rounded-2xl text-sm font-display uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20"
              >
                <Search className="w-4 h-4" />
                <span>CONSULTAR ESTADO</span>
              </button>
            </form>
          </div>

          {/* RESULTADO DEL ESCANEO */}
          <AnimatePresence mode="wait">
            {hasSearched && (
              <motion.div
                key={scannedMember ? scannedMember.id : 'not-found'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6"
              >
                {scannedMember ? (
                  scannedMember.balanceDue > 0 ? (
                    /* ALERTA: SOCIO CON SALDO PENDIENTE (ADELANTO) */
                    <div className="p-6 rounded-2xl bg-amber-500/10 border-2 border-amber-500/50 relative overflow-hidden">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex items-start gap-4">
                          <div className="p-3.5 rounded-2xl bg-amber-500 text-black flex-shrink-0 shadow-lg">
                            <AlertTriangle className="w-7 h-7" />
                          </div>
                          <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                              ⚠️ INGRESO CON ADELANTO · SALDO PENDIENTE
                            </div>
                            <h3 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight mt-2">
                              {scannedMember.name}
                            </h3>
                            <p className="text-xs text-zinc-300 font-mono mt-0.5">
                              DNI: <span className="font-bold text-white">{scannedMember.dni}</span> · Plan:{' '}
                              <span className="text-amber-300 font-bold">{scannedMember.plan}</span>
                            </p>

                            <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono">
                              <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-white/10">
                                <span className="text-zinc-400 block text-[10px] uppercase">Costo Total:</span>
                                <span className="text-white font-bold text-sm">S/. {scannedMember.planPrice}.00</span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-emerald-500/30">
                                <span className="text-emerald-400 block text-[10px] uppercase">Adelanto Abonado:</span>
                                <span className="text-emerald-400 font-bold text-sm">S/. {scannedMember.advancePaid}.00</span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-red-500/40">
                                <span className="text-red-400 block text-[10px] uppercase font-black">SALDO DEUDOR:</span>
                                <span className="text-red-400 font-black text-base">S/. {scannedMember.balanceDue}.00</span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-white/10">
                                <span className="text-zinc-400 block text-[10px] uppercase">Fecha Límite:</span>
                                <span className="text-amber-400 font-bold text-sm">{scannedMember.paymentDueDate || 'En el transcurso'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Botón para Liquidar Deuda en el acto */}
                        <div className="flex-shrink-0 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => setLiquidatingMember(scannedMember)}
                            className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm font-display uppercase tracking-wider transition-all shadow-xl shadow-emerald-500/20 cursor-pointer"
                          >
                            <DollarSign className="w-5 h-5" />
                            <span>COBRAR SALDO (S/. {scannedMember.balanceDue}.00)</span>
                          </button>
                          <span className="text-[11px] font-mono text-zinc-400 text-center">
                            Liquidar el saldo pendiente y dejarlo al día
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* SOCIO 100% AL DÍA (SIN DEUDA) */
                    <div className="p-6 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3.5 rounded-2xl bg-emerald-500 text-black flex-shrink-0">
                          <CheckCircle2 className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <span>✅ ACCESO PERMITIDO · MEMBRESÍA AL DÍA</span>
                          </div>
                          <h3 className="text-xl font-black text-white font-display uppercase tracking-tight mt-1.5">
                            {scannedMember.name}
                          </h3>
                          <p className="text-xs text-zinc-400 font-mono mt-0.5">
                            DNI: {scannedMember.dni} · Plan: {scannedMember.plan} · Total Pagado: S/. {scannedMember.planPrice}.00 (Sin deudas)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => alert(`Reimprimiendo boleta ${scannedMember.receiptNumber} para ${scannedMember.name}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-400" />
                          <span>Boleta {scannedMember.receiptNumber}</span>
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  /* NO ENCONTRADO */
                  <div className="p-6 rounded-2xl bg-zinc-900 border border-white/10 text-center">
                    <p className="text-sm font-mono text-zinc-300">
                      No se encontró ningún socio registrado con el DNI <span className="font-bold text-amber-400">{scannedDni}</span>.
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Puedes inscribirlo abajo dejándole un adelanto o pago total.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* 2. STATS & RESUMEN DE COBROS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-5">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Total Recaudado Hoy</span>
            <div className="mt-2 text-3xl font-black font-display text-white">
              S/. {totalCollectedToday.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-emerald-400 font-mono mt-1">Ingresos efectivos y digitales</p>
          </div>

          <div className="bg-zinc-900/70 border border-amber-500/30 rounded-2xl p-5">
            <span className="text-xs font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Saldos por Cobrar (Adelantos)</span>
            </span>
            <div className="mt-2 text-3xl font-black font-display text-amber-400">
              S/. {pendingDebtsTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-zinc-400 font-mono mt-1">
              {membersWithDebt.length} socios deben completar su pago
            </p>
          </div>

          <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-5">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Socios Registrados</span>
            <div className="mt-2 text-3xl font-black font-display text-white">
              {members.length} Atletas
            </div>
            <p className="text-[11px] text-zinc-500 font-mono mt-1">Sede Huamanga, Ayacucho</p>
          </div>
        </div>

        {/* 3. FORMULARIO DE NUEVA INSCRIPCIÓN (PAGO TOTAL O CON ADELANTO) + LISTA DE DEUDAS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Formulario (6 cols) */}
          <div className="lg:col-span-6 bg-zinc-900/60 border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2.5 pb-4 border-b border-white/10">
              <Receipt className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-base font-bold text-white font-display uppercase tracking-wide">
                  Nueva Inscripción o Renovación
                </h3>
                <p className="text-xs text-zinc-400">Permite registrar pagos completos o con adelanto</p>
              </div>
            </div>

            <form onSubmit={handleProcessPayment} className="mt-5 space-y-4 text-xs font-mono">
              <div>
                <label className="block text-zinc-400 font-bold mb-1.5 uppercase">
                  Plan o Membresía
                </label>
                <select
                  value={selectedPlan.name}
                  onChange={(e) => {
                    const plan = PLANS_CATALOG.find((p) => p.name === e.target.value);
                    if (plan) setSelectedPlan(plan);
                  }}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2.5 text-zinc-200 focus:outline-none focus:border-amber-400 cursor-pointer"
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
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-bold mb-1.5 uppercase">
                    Precio Total
                  </label>
                  <div className="w-full bg-zinc-950 border border-white/10 text-white font-bold text-sm rounded-xl px-3 py-2 flex items-center justify-between">
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
                  placeholder="Ej: Daniel Quispe Huamán"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* OPCIÓN DE ADELANTO VS PAGO TOTAL */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-amber-400/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-200 font-bold text-xs">¿El socio deja un adelanto?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAdvancePayment(false)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        !isAdvancePayment
                          ? 'bg-emerald-500 text-black'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      PAGO COMPLETO
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAdvancePayment(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isAdvancePayment
                          ? 'bg-amber-400 text-black'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      DEJAR ADELANTO
                    </button>
                  </div>
                </div>

                {isAdvancePayment && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-3 border-t border-white/10 space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-amber-400 font-bold mb-1">
                          Adelanto que paga hoy (S/.)
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={selectedPlan.price - 5}
                          value={advanceAmount}
                          onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                          className="w-full bg-zinc-900 border border-amber-400/50 rounded-xl px-3 py-2 text-amber-400 font-black text-sm focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-red-400 font-bold mb-1">
                          Saldo que queda a deber
                        </label>
                        <div className="w-full bg-zinc-900 border border-red-500/30 rounded-xl px-3 py-2 text-red-400 font-black text-sm">
                          S/. {Math.max(0, selectedPlan.price - advanceAmount)}.00
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-zinc-400 font-bold mb-1">
                        Días de plazo para completar el saldo:
                      </label>
                      <select
                        value={dueDateDays}
                        onChange={(e) => setDueDateDays(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-zinc-200"
                      >
                        <option value={7}>7 Días (1 Semana)</option>
                        <option value={10}>10 Días</option>
                        <option value={15}>15 Días (Medio mes)</option>
                        <option value={20}>20 Días</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Selector de Método de Pago */}
              <div>
                <label className="block text-zinc-400 font-bold mb-2 uppercase">
                  Método de Cobro
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
                            ? 'bg-amber-400/15 border-amber-400 text-amber-400'
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
                className="w-full mt-4 bg-amber-400 hover:bg-amber-300 text-black font-black py-3.5 rounded-xl text-xs font-display uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isAdvancePayment
                    ? `REGISTRAR ADELANTO (S/. ${advanceAmount}.00)`
                    : `REGISTRAR PAGO TOTAL (S/. ${selectedPlan.price}.00)`}
                </span>
              </button>
            </form>
          </div>

          {/* Lista de Socios con Saldo Pendiente (6 cols) */}
          <div className="lg:col-span-6 bg-zinc-900/60 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-display uppercase tracking-wide">
                  Socios con Saldo Pendiente
                </h3>
              </div>
              <span className="text-xs font-mono text-amber-400 font-bold">
                {membersWithDebt.length} registrados
              </span>
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1">
              {membersWithDebt.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 font-mono text-xs">
                  No hay socios con saldos pendientes por cobrar hoy.
                </div>
              ) : (
                membersWithDebt.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl bg-zinc-950 border border-amber-500/30 hover:border-amber-400 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white font-sans text-sm">{m.name}</div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        DNI: <span className="text-white">{m.dni}</span> · {m.plan}
                      </div>
                      <div className="text-[11px] font-mono mt-1 flex items-center gap-2">
                        <span className="text-emerald-400">Adelantó: S/. {m.advancePaid}</span>
                        <span className="text-zinc-600">|</span>
                        <span className="text-red-400 font-bold">Debe: S/. {m.balanceDue}.00</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        Plazo límite: {m.paymentDueDate || 'Pendiente'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickTestScan(m.dni)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono border border-white/10 transition-colors cursor-pointer"
                      >
                        Ver DNI
                      </button>
                      <button
                        type="button"
                        onClick={() => setLiquidatingMember(m)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-black transition-colors cursor-pointer shadow-md"
                      >
                        Cobrar S/. {m.balanceDue}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* MODAL PARA COBRAR SALDO PENDIENTE */}
      {liquidatingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-zinc-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="p-2.5 rounded-xl bg-emerald-500 text-black font-black">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-black text-white font-display uppercase tracking-tight">
                  Liquidar Saldo Pendiente
                </h4>
                <p className="text-xs text-zinc-400 font-mono">Completar pago de membresía</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-400">Socio:</span>
                <span className="text-white font-bold">{liquidatingMember.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">DNI:</span>
                <span className="text-zinc-200">{liquidatingMember.dni}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Plan:</span>
                <span className="text-zinc-200">{liquidatingMember.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Adelanto ya abonado:</span>
                <span className="text-emerald-400 font-bold">S/. {liquidatingMember.advancePaid}.00</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between text-sm">
                <span className="text-amber-400 font-bold">MONTO A CANCELAR:</span>
                <span className="text-emerald-400 font-black text-lg">S/. {liquidatingMember.balanceDue}.00</span>
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 text-xs font-mono font-bold mb-2 uppercase">
                Método de Cobro
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {[
                  { id: 'yape', label: 'Yape' },
                  { id: 'plin', label: 'Plin' },
                  { id: 'efectivo', label: 'Efectivo' },
                  { id: 'tarjeta', label: 'Tarjeta' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setLiquidateMethod(m.id as any)}
                    className={`py-2 px-3 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                      liquidateMethod === m.id
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                        : 'bg-zinc-950 border-white/10 text-zinc-400'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setLiquidatingMember(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmLiquidate}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl text-xs font-mono font-black cursor-pointer transition-colors shadow-lg shadow-emerald-500/20"
              >
                CONFIRMAR PAGO
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
