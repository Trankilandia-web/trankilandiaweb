import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  CreditCard,
  Clock,
  CheckCircle2,
  Save,
  MessageCircle,
  DollarSign,
} from 'lucide-react';
import { GymMember } from '../../data/gymStore';
import { OFFICIAL_COACHES } from '../../pages/portal/ClientePortal';

interface MemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: GymMember | null;
  onSave: (updatedMember: GymMember) => Promise<void>;
  onOpenPaymentModal?: (member: GymMember) => void;
}

const GYM_PLANS = [
  { name: '1 mes · Musculación Libre', price: 80, months: 1 },
  { name: '2 MESES · Musculación Libre', price: 130, months: 2 },
  { name: '3 MESES · Musculación Libre', price: 180, months: 3 },
  { name: '4 mes · Musculación Libre', price: 230, months: 4 },
  { name: '6 MESES · Musculación Libre', price: 330, months: 6 },
  { name: '8 MESES · Musculación Libre', price: 300, months: 8 },
  { name: '1 AÑO · Musculación Libre', price: 450, months: 12 },
  { name: 'Combo Musculación + Escuela de Boxeo', price: 140, months: 1 },
];

export default function MemberProfileModal({
  isOpen,
  onClose,
  member,
  onSave,
  onOpenPaymentModal,
}: MemberProfileModalProps) {
  if (!isOpen || !member) return null;

  const [formData, setFormData] = useState<GymMember>({ ...member });
  const [activeTab, setActiveTab] = useState<'personal' | 'membership' | 'shift'>('personal');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setFormData({ ...member });
    setSuccessMsg(null);
  }, [member]);

  const handleInputChange = (field: keyof GymMember, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      // Recalcular saldo si cambia precio o adelanto
      if (field === 'planPrice' || field === 'advancePaid') {
        const price = Number(field === 'planPrice' ? value : next.planPrice) || 0;
        const paid = Number(field === 'advancePaid' ? value : next.advancePaid) || 0;
        next.balanceDue = Math.max(0, price - paid);
        next.paymentType = next.balanceDue === 0 ? 'full' : 'advance';
      }

      // Si cambia el turno, auto-asignar el primer coach de ese turno oficial
      if (field === 'shift') {
        const coachOfShift = OFFICIAL_COACHES.find((c) => c.shift === value);
        if (coachOfShift) {
          next.coachName = coachOfShift.name;
        }
      }

      return next;
    });
  };

  const handlePlanSelect = (planName: string) => {
    const found = GYM_PLANS.find((p) => p.name === planName);
    if (found) {
      setFormData((prev) => {
        const newPrice = found.price;
        const balance = Math.max(0, newPrice - prev.advancePaid);
        const expDate = new Date();
        expDate.setMonth(expDate.getMonth() + (found.months || 1));
        const newExpiresAt = expDate.toISOString().split('T')[0];
        return {
          ...prev,
          plan: found.name,
          planPrice: newPrice,
          balanceDue: balance,
          paymentType: balance === 0 ? 'full' : 'advance',
          membershipStatus: 'active',
          expiresAt: prev.expiresAt && prev.membershipStatus === 'active' ? prev.expiresAt : newExpiresAt,
        };
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      setSuccessMsg('¡Perfil del socio actualizado correctamente!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      alert('Error al guardar cambios.');
    }
    setIsSaving(false);
  };

  const hasDebt = formData.balanceDue > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 bg-zinc-950/80 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold font-mono text-lg shrink-0">
              {formData.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-white font-display uppercase tracking-tight">
                  {formData.name}
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400">
                  {formData.id}
                </span>
                {hasDebt ? (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    Debe S/. {formData.balanceDue.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                    100% Al Día
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                DNI: {formData.dni || 'Sin registrar'} · Tel: {formData.phone || 'Sin número'} · Turno:{' '}
                <span className="uppercase text-white font-bold">{formData.shift}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-zinc-950/40 px-4 sm:px-6 gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`py-3 px-3 border-b-2 font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'personal'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Datos Personales</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('membership')}
            className={`py-3 px-3 border-b-2 font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'membership'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Membresía & Pagos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shift')}
            className={`py-3 px-3 border-b-2 font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'shift'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Turno & Entrenador</span>
          </button>
        </div>

        {/* Tab Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {successMsg && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: DATOS PERSONALES */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-zinc-400 mb-1.5">
                  Nombre Completo del Socio
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-zinc-400 mb-1.5">
                    DNI / Documento (8 dígitos)
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    value={formData.dni || ''}
                    onChange={(e) => handleInputChange('dni', e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej. 87654321"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-zinc-400 mb-1.5">
                    Teléfono Celular
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={12}
                      value={formData.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Ej. 958183360"
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono pr-10"
                    />
                    {formData.phone && (
                      <a
                        href={`https://wa.me/51${formData.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-emerald-300"
                        title="Contactar por WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-zinc-400 mb-1.5">
                    Edad
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={95}
                    value={formData.age || ''}
                    onChange={(e) => handleInputChange('age', Number(e.target.value) || null)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-zinc-400 mb-1.5">
                    Género / Sexo
                  </label>
                  <select
                    value={formData.gender || 'Masculino'}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-zinc-400 mb-1.5">
                  Observaciones Médicas / Físicas / Administrativas
                </label>
                <textarea
                  rows={3}
                  value={formData.observations || ''}
                  onChange={(e) => handleInputChange('observations', e.target.value)}
                  placeholder="Ej. Tuvo lumbalgia, rotura de ligamento, autorización de ingreso libre..."
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-sans"
                />
              </div>
            </div>
          )}

          {/* TAB 2: MEMBRESÍA & FINANZAS */}
          {activeTab === 'membership' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-zinc-400 mb-1.5">
                  Plan de Entrenamiento
                </label>
                <select
                  value={formData.plan}
                  onChange={(e) => handlePlanSelect(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-sans"
                >
                  {(formData.plan === 'Sin Membresía Activa' || !GYM_PLANS.some((p) => p.name === formData.plan)) && (
                    <option value={formData.plan}>
                      {formData.plan === 'Sin Membresía Activa' ? '⚪ Sin Membresía Activa (Seleccionar Plan)' : formData.plan}
                    </option>
                  )}
                  {GYM_PLANS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} — S/. {p.price}.00 ({p.months} {p.months === 1 ? 'mes' : 'meses'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Bloque Financiero */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-bold">COSTO TOTAL DEL PLAN:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-bold">S/.</span>
                    <input
                      type="number"
                      min={0}
                      value={formData.planPrice}
                      onChange={(e) => handleInputChange('planPrice', Number(e.target.value))}
                      className="w-24 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-sm font-bold text-white text-right focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-bold">MONTO ABONADO:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-bold">S/.</span>
                    <input
                      type="number"
                      min={0}
                      value={formData.advancePaid}
                      onChange={(e) => handleInputChange('advancePaid', Number(e.target.value))}
                      className="w-24 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-sm font-bold text-emerald-400 text-right focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm">
                  <span className="text-zinc-300 font-bold">SALDO DEUDOR CALCULADO:</span>
                  <span
                    className={`text-base font-black ${
                      hasDebt ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    S/. {formData.balanceDue.toFixed(2)}
                  </span>
                </div>

                {hasDebt && onOpenPaymentModal && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onOpenPaymentModal(formData)}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>COBRAR / REGISTRAR ABONO PARCIAL</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-zinc-400 mb-1.5">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={formData.registeredAt}
                    onChange={(e) => handleInputChange('registeredAt', e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-zinc-400 mb-1.5">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => handleInputChange('expiresAt', e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-zinc-400 mb-1.5">
                  Estado de Membresía
                </label>
                <select
                  value={formData.membershipStatus}
                  onChange={(e) => handleInputChange('membershipStatus', e.target.value as any)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                >
                  <option value="active">Activa (Vigente)</option>
                  <option value="expiring">Por Vencer (Próxima)</option>
                  <option value="inactive">Inactiva (Vencida/Pausa)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 3: TURNO & ENTRENADOR */}
          {activeTab === 'shift' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-zinc-400 mb-1.5">
                  Turno Oficial
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'manana', label: 'Mañana', hours: '6:00 AM - 2:00 PM' },
                    { id: 'tarde', label: 'Tarde', hours: '2:00 PM - 6:00 PM' },
                    { id: 'noche', label: 'Noche', hours: '6:00 PM - 10:00 PM' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleInputChange('shift', s.id)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        formData.shift === s.id
                          ? 'bg-amber-400/15 border-amber-400 text-amber-300'
                          : 'bg-zinc-950 border-white/5 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="font-bold text-sm text-white">{s.label}</div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{s.hours}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-zinc-400 mb-1.5">
                  Coach / Entrenador Asignado
                </label>
                <select
                  value={formData.coachName || 'Coach Marcos Rivas'}
                  onChange={(e) => handleInputChange('coachName', e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-sans"
                >
                  <optgroup label="Entrenadores del Turno Seleccionado">
                    {OFFICIAL_COACHES.filter((c) => c.shift === formData.shift).map((c) => (
                      <option key={c.id} value={c.name}>
                        ★ {c.name} — {c.specialty} ({c.gender === 'mujer' ? 'Coach Mujer' : 'Coach Varón'})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Entrenadores de Otros Turnos">
                    {OFFICIAL_COACHES.filter((c) => c.shift !== formData.shift).map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} — {c.specialty} ({c.shiftLabel})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3 font-mono text-xs">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-400/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
