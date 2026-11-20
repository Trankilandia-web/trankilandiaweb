import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock, Mail, MapPin, Phone } from 'lucide-react';
import { GYM_CONTACT } from '../data/gymData';
import trankilandiaLogo from '../assets/trankilandia-logo.png';

export interface FooterProps { onOpenTourModal?: () => void; }

export default function Footer({ onOpenTourModal }: FooterProps = {}): React.JSX.Element {
  return (
    <footer className="public-page border-t border-white/10 bg-zinc-950 text-white relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.2fr_0.75fr_1fr] lg:gap-16">
          <div>
            <Link to="/" className="inline-flex items-center gap-3 rounded-lg">
              <img src={trankilandiaLogo} alt="Trankilandia Gym" width={44} height={44} className="h-11 w-11 rounded-full" />
              <span><strong className="block text-xl font-extrabold tracking-tight">TRANKILANDIA</strong><span className="text-sm text-zinc-400">Gym · Ayacucho</span></span>
            </Link>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-zinc-400">Centro de entrenamiento de fuerza, musculación y escuela de boxeo en Huamanga, Ayacucho.</p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
              {GYM_CONTACT.socialLinks.map((social) => <a key={social.platform} href={social.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm text-zinc-300 hover:text-amber-400">{social.platform}<ArrowUpRight size={14} aria-hidden="true" /></a>)}
            </div>
          </div>
          <nav aria-label="Explorar el gimnasio">
            <h2 className="font-bold text-white">Explora el club</h2>
            <ul className="mt-4 space-y-1 text-base text-zinc-400">
              <li><Link to="/planes" className="inline-flex min-h-11 items-center hover:text-white">Planes y precios</Link></li>
              <li><Link to="/clases" className="inline-flex min-h-11 items-center hover:text-white">Horarios y clases</Link></li>
              <li><Link to="/instalaciones" className="inline-flex min-h-11 items-center hover:text-white">Instalaciones</Link></li>
              {onOpenTourModal && <li><button type="button" onClick={onOpenTourModal} className="min-h-11 text-left text-amber-400 hover:text-amber-300">Solicitar pase de cortesía</button></li>}
            </ul>
          </nav>
          <div className="md:col-span-2 lg:col-span-1" id="contacto">
            <h2 className="font-bold text-white">Contacto y atención</h2>
            <address className="mt-5 space-y-4 not-italic text-sm text-zinc-300">
              <p className="flex gap-3"><MapPin size={18} className="mt-0.5 shrink-0 text-amber-400" /><span>{GYM_CONTACT.address}</span></p>
              <p className="flex items-center gap-3"><Phone size={18} className="shrink-0 text-amber-400" /><a href={`tel:${GYM_CONTACT.phone}`} className="hover:text-white">{GYM_CONTACT.phoneDisplay}</a></p>
              <p className="flex gap-3"><Mail size={18} className="mt-0.5 shrink-0 text-amber-400" /><a href={`mailto:${GYM_CONTACT.email}`} className="break-all hover:text-white">{GYM_CONTACT.email}</a></p>
              <p className="flex gap-3"><Clock size={18} className="mt-0.5 shrink-0 text-amber-400" /><span>{GYM_CONTACT.hours.weekday}<br />{GYM_CONTACT.hours.sunday}</span></p>
            </address>
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 flex flex-col gap-4 sm:flex-row sm:justify-between text-sm text-zinc-400">
          <p>© {new Date().getFullYear()} Trankilandia Gym.</p>
          <a href={`mailto:${GYM_CONTACT.email}`} className="hover:text-white">Consultas sobre tus datos y tu membresía</a>
        </div>
      </div>
    </footer>
  );
}
