import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, MessageCircle, X } from 'lucide-react';
import { GYM_CONTACT } from '../data/gymData';
import { useModalFocus } from '../hooks/useModalFocus';

export interface TourModalProps { isOpen: boolean; onClose: () => void; initialPlan?: string; }

const SHIFTS = [
  { id: 'morning', label: 'Mañana', hours: '06:00 - 12:00' },
  { id: 'afternoon', label: 'Tarde', hours: '12:00 - 18:00' },
  { id: 'evening', label: 'Noche', hours: '18:00 - 22:00' },
] as const;
type Shift = (typeof SHIFTS)[number]['id'];
const GOALS = ['Musculación & Peso Libre (Ingreso Libre)', 'Clases de Boxeo (Actividad Adicional)', 'Acondicionamiento Funcional & HIIT', 'Salud, Resistencia & Tonificación'];
function localDate(offset = 0) {
  const date = new Date(); date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function TourModal({ isOpen, onClose, initialPlan }: TourModalProps): React.JSX.Element | null {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [goal, setGoal] = useState(GOALS[0]);
  const [shift, setShift] = useState<Shift>('morning');
  const [date, setDate] = useState(() => localDate(1));
  const [prepared, setPrepared] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useModalFocus(isOpen, onClose, { initialFocus: '#tour-name' });

  useEffect(() => {
    if (isOpen) return;
    setPrepared(false); setName(''); setPhone(''); setEmail(''); setGoal(GOALS[0]);
    setShift('morning'); setDate(localDate(1)); setError('');
  }, [isOpen]);

  useEffect(() => {
    if (prepared) dialogRef.current?.querySelector<HTMLElement>('#tour-request-summary')?.focus();
  }, [prepared, dialogRef]);

  const selectedShift = SHIFTS.find((item) => item.id === shift)!;
  const message = [
    'Hola Trankilandia Gym, quisiera solicitar un pase de cortesía y coordinar mi visita.',
    `Nombre: ${name.trim()}`, `Teléfono: ${phone.trim()}`, `Correo: ${email.trim()}`,
    `Fecha preferida: ${date}`, `Turno: ${selectedShift.label} (${selectedShift.hours})`,
    `Objetivo: ${goal}`, initialPlan ? `Plan de interés: ${initialPlan}` : '',
    'Quedo pendiente de la confirmación de recepción.',
  ].filter(Boolean).join('\n');
  const whatsappUrl = `https://wa.me/${GYM_CONTACT.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) { setError('Escribe tu nombre completo.'); return; }
    if (phone.replace(/\D/g, '').length < 9) { setError('Ingresa un teléfono válido con al menos 9 dígitos.'); return; }
    if (!date || date < localDate()) { setError('Selecciona hoy o una fecha futura para tu visita.'); return; }
    setError(''); setPrepared(true);
  };

  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="tour-modal-title" aria-describedby="tour-modal-description" tabIndex={-1} className="modal-panel max-w-xl">
        <button type="button" onClick={onClose} aria-label="Cerrar solicitud de visita" className="modal-close"><X size={20} /></button>
        {!prepared ? (
          <>
            <h2 id="tour-modal-title" className="modal-title">Solicita tu pase de cortesía</h2>
            <p id="tour-modal-description" className="modal-description">Cuéntanos cuándo quieres visitarnos. Al finalizar, envía la solicitud por WhatsApp para que recepción confirme tu visita.</p>
            {initialPlan && <p className="mt-4 text-sm text-amber-300 break-words">Plan de interés: <strong>{initialPlan}</strong></p>}
            {error && <p role="alert" className="form-message form-message-error">{error}</p>}
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div><label htmlFor="tour-name" className="field-label">Nombre completo</label><input id="tour-name" type="text" autoComplete="name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="field-input" placeholder="¿Cómo te llamas?" /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label htmlFor="tour-phone" className="field-label">WhatsApp o teléfono</label><input id="tour-phone" type="tel" autoComplete="tel" required maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} className="field-input" placeholder="999 123 456" /></div>
                <div><label htmlFor="tour-date" className="field-label">Fecha preferida</label><input id="tour-date" type="date" required min={localDate()} value={date} onChange={(event) => setDate(event.target.value)} className="field-input" /></div>
              </div>
              <fieldset><legend className="field-label">Turno preferido</legend><div className="grid grid-cols-3 gap-2">{SHIFTS.map((item) => <label key={item.id} className={`shift-option ${shift === item.id ? 'shift-option-selected' : ''}`}><input type="radio" name="tour-shift" value={item.id} checked={shift === item.id} onChange={() => setShift(item.id)} className="sr-only" /><span className="font-semibold">{item.label}</span><span className="mt-1 text-xs tabular-nums">{item.hours}</span></label>)}</div></fieldset>
              <div><label htmlFor="tour-email" className="field-label">Correo electrónico</label><input id="tour-email" type="email" autoComplete="email" required maxLength={160} value={email} onChange={(event) => setEmail(event.target.value)} className="field-input" placeholder="tu@correo.com" /></div>
              <div><label htmlFor="tour-goal" className="field-label">Objetivo de entrenamiento</label><select id="tour-goal" value={goal} onChange={(event) => setGoal(event.target.value)} className="field-input">{GOALS.map((item) => <option key={item}>{item}</option>)}</select></div>
              <button type="submit" className="button-primary w-full">Revisar solicitud<ArrowRight size={18} /></button>
            </form>
          </>
        ) : (
          <>
            <h2 id="tour-modal-title" className="modal-title">Tu solicitud está preparada</h2>
            <p id="tour-modal-description" className="modal-description">Aún no está registrada ni confirmada. Envía estos datos a recepción por WhatsApp y espera su respuesta para coordinar el pase.</p>
            <dl id="tour-request-summary" tabIndex={-1} className="mt-6 space-y-4 border-y border-white/10 py-5 text-sm outline-none">
              <div><dt className="text-zinc-400">Nombre</dt><dd className="mt-1 break-words text-white">{name}</dd></div>
              <div><dt className="text-zinc-400">Fecha y turno preferidos</dt><dd className="mt-1 text-white">{date} · {selectedShift.label} ({selectedShift.hours})</dd></div>
              <div><dt className="text-zinc-400">Objetivo</dt><dd className="mt-1 text-white">{goal}</dd></div>
              <div><dt className="text-zinc-400">Contacto</dt><dd className="mt-1 break-words text-white">{phone}<br />{email}</dd></div>
            </dl>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="button-primary mt-6 w-full"><MessageCircle size={18} />Enviar por WhatsApp</a>
            <p className="field-hint mt-3">Se abrirá WhatsApp con el mensaje preparado. Debes enviarlo allí; cerrar esta ventana no guarda una reserva.</p>
            <button type="button" onClick={() => setPrepared(false)} className="button-secondary mt-4 w-full"><ArrowLeft size={17} />Editar solicitud</button>
          </>
        )}
      </div>
    </div>
  );
}
