import React, { useState, useEffect } from 'react';
import { Dumbbell, X, CheckCircle2, Calendar, Clock, Sparkles, ShieldCheck, Ticket } from 'lucide-react';

export interface TourModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: string;
}

const SHIFTS = [
  { id: 'morning', label: 'Mañana', hours: '06:00 - 12:00' },
  { id: 'afternoon', label: 'Tarde', hours: '12:00 - 18:00' },
  { id: 'evening', label: 'Noche', hours: '18:00 - 22:00' },
] as const;

type ShiftType = (typeof SHIFTS)[number]['id'];

const GOALS = [
  'Fuerza & Musculación',
  'Pérdida de Grasa & HIIT',
  'Rendimiento Funcional',
  'Salud & Movilidad',
];

const getTomorrowDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

const generatePassCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TRK-VIP-${result}`;
};

export default function TourModal({
  isOpen,
  onClose,
  initialPlan,
}: TourModalProps): React.JSX.Element | null {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [goal, setGoal] = useState(GOALS[0]);
  const [shift, setShift] = useState<ShiftType>('morning');
  const [date, setDate] = useState(getTomorrowDate());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [passCode, setPassCode] = useState('');

  // Lock body scroll while open and restore on close/unmount
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleModalClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleModalClose = () => {
    onClose();
    // Reset state after slight delay for smooth exit transition
    setTimeout(() => {
      setIsSubmitted(false);
      setName('');
      setPhone('');
      setEmail('');
      setGoal(GOALS[0]);
      setShift('morning');
      setDate(getTomorrowDate());
      setPassCode('');
    }, 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim()) return;

    setPassCode(generatePassCode());
    setIsSubmitted(true);
  };

  if (!isOpen) {
    return null;
  }

  const selectedShiftObj = SHIFTS.find((s) => s.id === shift) || SHIFTS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-modal-title"
      onClick={handleModalClose}
    >
      <div
        className="relative w-full max-w-xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleModalClose}
          aria-label="Cerrar modal"
          className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSubmitted ? (
          /* ================= ESTADO 1: FORMULARIO DE REGISTRO ================= */
          <div>
            {/* Header Badge & Title */}
            <div className="flex items-center gap-3 mb-3">
              <div className="inline-flex items-center justify-center p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
                <Dumbbell className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                Pase de Cortesía Gratuito
              </span>
            </div>

            <h2
              id="tour-modal-title"
              className="text-xl sm:text-2xl font-black text-white tracking-tight font-display uppercase leading-tight"
            >
              AGENDA TU TOUR VIP & PASE DE 1 DÍA
            </h2>

            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Acceso libre de cortesía a todas las instalaciones por 24 horas y recorrido guiado con un coach certificado.
            </p>

            {initialPlan && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-xs text-amber-400 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Interés en plan: <strong className="uppercase">{initialPlan}</strong></span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {/* Shift Selector (3 Pills) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Selecciona tu Turno Preferido
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SHIFTS.map((item) => {
                    const isSelected = shift === item.id;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setShift(item.id)}
                        className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-amber-400 border-amber-400 text-black font-bold shadow-lg shadow-amber-400/20'
                            : 'bg-zinc-800/80 border-white/5 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-sm font-bold tracking-tight">
                          {item.label}
                        </span>
                        <span
                          className={`text-[11px] font-mono mt-0.5 ${
                            isSelected ? 'text-black/80 font-semibold' : 'text-zinc-400'
                          }`}
                        >
                          {item.hours}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Selector */}
              <div>
                <label
                  htmlFor="tour-date"
                  className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
                >
                  Fecha del Tour
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    id="tour-date"
                    type="date"
                    min={getTodayDate()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-zinc-800/90 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                  />
                </div>
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="tour-name"
                    className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
                  >
                    Nombre Completo <span className="text-amber-400">*</span>
                  </label>
                  <input
                    id="tour-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Carlos Mendoza"
                    className="w-full bg-zinc-800/90 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="tour-phone"
                    className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
                  >
                    WhatsApp / Teléfono <span className="text-amber-400">*</span>
                  </label>
                  <input
                    id="tour-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. +52 55 1234 5678"
                    className="w-full bg-zinc-800/90 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="tour-email"
                  className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
                >
                  Correo Electrónico <span className="text-amber-400">*</span>
                </label>
                <input
                  id="tour-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="carlos@ejemplo.com"
                  className="w-full bg-zinc-800/90 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                />
              </div>

              {/* Goal Selector */}
              <div>
                <label
                  htmlFor="tour-goal"
                  className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5"
                >
                  Objetivo Principal
                </label>
                <select
                  id="tour-goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full bg-zinc-800/90 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-colors"
                >
                  {GOALS.map((g) => (
                    <option key={g} value={g} className="bg-zinc-900 text-white">
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full mt-2 bg-amber-400 hover:bg-amber-300 text-black font-extrabold py-3.5 rounded-xl text-sm uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-amber-400/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                CONFIRMAR PASE DE CORTESÍA →
              </button>
            </form>
          </div>
        ) : (
          /* ================= ESTADO 2: PASE VIP CONFIRMADO (TICKET DIGITAL) ================= */
          <div className="py-2 text-center">
            {/* Animated / Glowing Check Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-400/10 border-2 border-amber-400 text-amber-400 mb-4 animate-pulse">
              <CheckCircle2 className="w-9 h-9 text-amber-400" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-mono font-bold tracking-wider mb-2">
              PASE VIP GENERADO CON ÉXITO
            </div>

            <h2
              id="tour-modal-title"
              className="text-2xl font-black text-white tracking-tight font-display uppercase"
            >
              ¡TODO LISTO, {name.split(' ')[0]}!
            </h2>
            <p className="mt-1 text-sm text-zinc-400 max-w-md mx-auto">
              Tu pase de 1 día y recorrido VIP han sido registrados en recepción.
            </p>

            {/* Ticket Digital Card */}
            <div className="mt-6 text-left relative bg-zinc-950 border border-amber-400/40 rounded-2xl p-6 shadow-2xl overflow-hidden">
              {/* Decorative ticket perforations/dots */}
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-amber-400/5 rounded-full blur-xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-dashed border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-bold font-mono tracking-widest text-zinc-300 uppercase">
                    CÓDIGO DE ACCESO VIP
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                  Válido 24 hrs
                </span>
              </div>

              {/* Pass Code */}
              <div className="bg-zinc-900/90 border border-white/5 rounded-xl p-4 text-center mb-5">
                <p className="text-[11px] text-zinc-400 uppercase tracking-wider mb-1 font-mono">
                  Muestra este código al llegar
                </p>
                <p className="font-mono text-2xl sm:text-3xl font-black text-amber-400 tracking-widest">
                  {passCode}
                </p>
              </div>

              {/* Pass Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-5 border-b border-dashed border-white/10 pb-5">
                <div>
                  <span className="text-zinc-500 uppercase tracking-wider font-semibold block">
                    Titular
                  </span>
                  <span className="text-white font-bold text-sm truncate block">
                    {name}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase tracking-wider font-semibold block">
                    Objetivo
                  </span>
                  <span className="text-zinc-200 font-medium truncate block">
                    {goal}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase tracking-wider font-semibold block">
                    Fecha Reservada
                  </span>
                  <span className="text-white font-medium flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    {date}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase tracking-wider font-semibold block">
                    Turno & Horario
                  </span>
                  <span className="text-white font-medium flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {selectedShiftObj.label} ({selectedShiftObj.hours})
                  </span>
                </div>
              </div>

              {/* What to bring guide */}
              <div>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Guía: ¿Qué debes traer a tu visita?
                </p>
                <ul className="text-xs text-zinc-300 space-y-1.5 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>Ropa deportiva cómoda y calzado deportivo limpio para entrenamiento.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>Toalla individual de entrenamiento y botella de agua rellenable.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>Identificación oficial vigente (INE o Pasaporte) para validar tu pase.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Confirm & Close Button */}
            <button
              type="button"
              onClick={handleModalClose}
              className="mt-6 w-full bg-amber-400 hover:bg-amber-300 text-black font-extrabold py-3.5 rounded-xl text-sm uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-amber-400/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              ENTENDIDO, NOS VEMOS EN EL CLUB
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
