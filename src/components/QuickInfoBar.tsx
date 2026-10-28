import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { GYM_CONTACT } from '../data/gymData';

export default function QuickInfoBar() {
  return (
    <section id="contacto" className="bg-zinc-950 border-t border-white/10 py-12 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* 1. Dirección */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-zinc-900/40 border border-white/5 hover:border-amber-400/20 transition-colors">
            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 shrink-0">
              <MapPin className="w-6 h-6 text-amber-400" strokeWidth={1.75} />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase block mb-1">
                DIRECCIÓN
              </span>
              <p className="text-sm font-semibold text-white leading-snug">
                {GYM_CONTACT.address}
              </p>
            </div>
          </div>

          {/* 2. Teléfono */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-zinc-900/40 border border-white/5 hover:border-amber-400/20 transition-colors">
            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 shrink-0">
              <Phone className="w-6 h-6 text-amber-400" strokeWidth={1.75} />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase block mb-1">
                TELÉFONO
              </span>
              <a
                href={`tel:${GYM_CONTACT.phone}`}
                className="text-sm font-semibold text-white hover:text-amber-400 transition-colors duration-200 block leading-snug"
              >
                {GYM_CONTACT.phoneDisplay}
              </a>
            </div>
          </div>

          {/* 3. Correo Electrónico */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-zinc-900/40 border border-white/5 hover:border-amber-400/20 transition-colors">
            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 shrink-0">
              <Mail className="w-6 h-6 text-amber-400" strokeWidth={1.75} />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase block mb-1">
                CORREO ELECTRÓNICO
              </span>
              <a
                href={`mailto:${GYM_CONTACT.email}`}
                className="text-sm font-semibold text-white hover:text-amber-400 transition-colors duration-200 block leading-snug break-all"
              >
                {GYM_CONTACT.email}
              </a>
            </div>
          </div>

          {/* 4. Horario de Atención */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-zinc-900/40 border border-white/5 hover:border-amber-400/20 transition-colors">
            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 shrink-0">
              <Clock className="w-6 h-6 text-amber-400" strokeWidth={1.75} />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase block mb-1">
                HORARIO DE ATENCIÓN
              </span>
              <p className="text-sm font-semibold text-white leading-snug">
                {GYM_CONTACT.hours.weekday}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                {GYM_CONTACT.hours.sunday}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
