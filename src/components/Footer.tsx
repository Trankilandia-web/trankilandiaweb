import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dumbbell,
  Mail,
  Phone,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Award,
  Activity,
  Ticket,
  Smartphone,
  ChevronRight,
  Info,
  X,
} from 'lucide-react';
import { GYM_CONTACT } from '../data/gymData';

export interface FooterProps {
  onOpenTourModal?: () => void;
}

function renderSocialIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return (
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      );
    case 'youtube':
      return (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Footer({ onOpenTourModal }: FooterProps = {}): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [legalModalContent, setLegalModalContent] = useState<{ title: string; content: string } | null>(null);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setIsSubscribed(true);
  };

  const handleOpenLegal = (title: string, content: string) => {
    setLegalModalContent({ title, content });
  };

  return (
    <footer className="border-t border-white/5 bg-zinc-950 text-white relative z-20">
      {/* 1. Barra de Suscripción "Trankilandia Insider" */}
      <div className="border-b border-white/10 bg-gradient-to-b from-zinc-900/40 to-zinc-950/80 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-zinc-900/60 backdrop-blur-md p-6 sm:p-10 lg:p-12 relative overflow-hidden shadow-2xl">
            {/* Ambient gold glow decoration */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-amber-400/5 blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7">
                <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-500 block mb-2">
                  BOLETÍN EXCLUSIVO
                </span>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase text-white tracking-tight">
                  TRANKILANDIA INSIDER
                </h3>
                <p className="text-zinc-400 text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
                  Invitaciones a masterclasses privadas, planes de nutrición deportiva y novedades de membresías directamente en tu bandeja.
                </p>
              </div>

              <div className="lg:col-span-5">
                {isSubscribed ? (
                  <div className="rounded-2xl bg-amber-400/10 border border-amber-400/30 p-5 flex items-start gap-4">
                    <div className="p-2 rounded-xl bg-amber-400/20 text-amber-400 shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm sm:text-base">
                        ¡Bienvenido a Trankilandia Insider!
                      </p>
                      <p className="text-xs sm:text-sm text-zinc-300 mt-1">
                        Hemos registrado con éxito tu suscripción para{' '}
                        <span className="font-mono text-amber-400">{email}</span>. Te hemos enviado un correo de bienvenida.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSubscribed(false);
                          setEmail('');
                        }}
                        className="mt-3 text-xs text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-4"
                      >
                        Registrar otro correo
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                        <Mail className="w-5 h-5" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu.correo@ejemplo.com"
                        aria-label="Correo electrónico para suscripción"
                        className="w-full bg-zinc-950/80 border border-white/10 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-6 py-3.5 rounded-xl text-sm tracking-wide transition-all duration-200 active:scale-[0.98] shadow-lg shadow-amber-400/10 hover:shadow-amber-400/20 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                    >
                      <span>SUSCRIBIRME →</span>
                    </button>
                  </form>
                )}
                <p className="text-[11px] text-zinc-500 font-mono mt-2.5">
                  Respetamos tu privacidad. Sin spam. Cancela en cualquier momento con 1 clic.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Sitemap en 4 Columnas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
          {/* Brand Info & Vision (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-5">
            <Link
              to="/"
              className="inline-flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl"
            >
              <div className="bg-amber-400/10 border border-amber-400/20 p-2.5 rounded-xl text-amber-400 transition-transform duration-300 group-hover:scale-105 group-hover:border-amber-400/40">
                <Dumbbell className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-white font-black tracking-tight text-xl font-display leading-tight">
                  TRANKILANDIA
                </span>
                <span className="text-[10px] text-zinc-400 tracking-widest font-mono leading-none">
                  GYM &amp; FITNESS CLUB
                </span>
              </div>
            </Link>

            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
              Centro de acondicionamiento de alta gama especializado en biomecánica avanzada, sobrecarga progresiva y bienestar integral. Más que un gimnasio, una hermandad de excelencia atlética.
            </p>

            {/* Social Links */}
            <div className="pt-2">
              <div className="text-xs font-mono uppercase text-zinc-500 mb-3 tracking-wider">
                Conecta con la Comunidad
              </div>
              <div className="flex items-center gap-3">
                {GYM_CONTACT.socialLinks.map((social) => (
                  <a
                    key={social.platform}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.platform}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-amber-400 hover:border-amber-400/40 hover:bg-amber-400/10 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    {renderSocialIcon(social.platform)}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Col 1: El Club (lg:col-span-2) */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>EL CLUB</span>
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  to="/"
                  className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  <span>Inicio</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/instalaciones"
                  className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  <span>Instalaciones &amp; Zonas</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/clases"
                  className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  <span>Horarios &amp; Clases</span>
                </Link>
              </li>
              <li>
                <a
                  href="/#nosotros"
                  className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  <span>Manifiesto &amp; Filosofía</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Col 2: Disciplinas (lg:col-span-2) */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>DISCIPLINAS</span>
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  to="/clases"
                  className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  <span>Fuerza &amp; Hipertrofia</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/clases"
                  className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  <span>HIIT &amp; Quema de Grasa</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/clases"
                  className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  <span>Rendimiento Funcional</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/clases"
                  className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  <span>Yoga &amp; Movilidad Articular</span>
                </Link>
              </li>
              <li className="pt-1">
                <Link
                  to="/clases"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors uppercase font-mono tracking-wider"
                >
                  <span>Ver Horarios Completos</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Membresías (lg:col-span-2) */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>MEMBRESÍAS</span>
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  to="/planes"
                  className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  <span>Planes &amp; Tarifas</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/planes"
                  className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  <span>Comparativa Técnica</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/planes"
                  className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 group"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  <span>Preguntas Frecuentes</span>
                </Link>
              </li>
              <li className="pt-1">
                <button
                  type="button"
                  onClick={onOpenTourModal}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors uppercase font-mono tracking-wider cursor-pointer text-left"
                >
                  <Ticket className="w-3.5 h-3.5 shrink-0" />
                  <span>Solicitar Pase VIP</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Concierge & Sedes (lg:col-span-2) */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>CONCIERGE &amp; SEDES</span>
            </h4>
            <ul className="space-y-3 text-xs leading-relaxed text-zinc-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{GYM_CONTACT.address}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <a
                  href={`tel:${GYM_CONTACT.phone}`}
                  className="hover:text-white transition-colors font-mono"
                >
                  {GYM_CONTACT.phoneDisplay}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <a
                  href={`mailto:${GYM_CONTACT.email}`}
                  className="hover:text-white transition-colors truncate font-mono text-[11px]"
                >
                  {GYM_CONTACT.email}
                </a>
              </li>
              <li className="pt-2 border-t border-white/5 space-y-1">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Horarios de Atención:</span>
                </div>
                <p className="text-[11px] font-mono text-zinc-400 pl-4">
                  {GYM_CONTACT.hours.weekday}
                </p>
                <p className="text-[11px] font-mono text-zinc-400 pl-4">
                  {GYM_CONTACT.hours.sunday}
                </p>
              </li>
            </ul>
          </div>
        </div>

        {/* 3. Sellos de Certificación de Maquinaria */}
        <div className="mt-14 pt-10 border-t border-white/10">
          <div className="text-center md:text-left mb-6">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-zinc-400">
              ESTÁNDARES INTERNACIONALES DE BIOMECÁNICA &amp; VALORACIÓN
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Hammer Strength */}
            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-amber-400/30 transition-all">
              <div className="w-11 h-11 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                  OFFICIAL TRAINING CENTER
                </div>
                <div className="text-sm font-black text-white tracking-wide">
                  Hammer Strength Official
                </div>
                <div className="text-[11px] text-zinc-400">Certificación biomecánica iso-lateral</div>
              </div>
            </div>

            {/* Eleiko */}
            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-amber-400/30 transition-all">
              <div className="w-11 h-11 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                  IPF &amp; IWF CERTIFIED
                </div>
                <div className="text-sm font-black text-white tracking-wide">
                  Eleiko Certified Facility
                </div>
                <div className="text-[11px] text-zinc-400">Barras y discos olímpicos de competencia</div>
              </div>
            </div>

            {/* InBody */}
            <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-zinc-900/60 border border-white/5 hover:border-amber-400/30 transition-all">
              <div className="w-11 h-11 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                  PRECISION COMPOSITION
                </div>
                <div className="text-sm font-black text-white tracking-wide">
                  InBody Partner 770
                </div>
                <div className="text-[11px] text-zinc-400">Bioimpedancia multifrecuencia grado médico</div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Member App Download Teaser */}
        <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-zinc-900/40 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 shrink-0 hidden sm:flex">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-amber-400 uppercase tracking-widest mb-1">
                <span>TRANKILANDIA MEMBER APP</span>
              </div>
              <h5 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Control total de tu membresía en la palma de tu mano
              </h5>
              <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 max-w-xl">
                Acceso sin llave mediante NFC, reserva de clases grupales en tiempo real y registro digital de cargas.
              </p>
            </div>
          </div>

          {/* Download Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            {/* Apple Store */}
            <a
              href="#app-store"
              onClick={(e) => {
                e.preventDefault();
                alert('La aplicación de Trankilandia Gym para iOS estará disponible próximamente en el App Store.');
              }}
              className="px-4 py-2.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 hover:border-amber-400/40 text-white transition-all flex items-center gap-3 group shadow-sm"
              aria-label="Descargar en Apple App Store"
            >
              <svg className="w-6 h-6 fill-current text-white group-hover:text-amber-400 transition-colors" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.98.6-2.62 1.35-.57.65-1.07 1.71-.93 2.73 1 .08 2-.48 2.62-1.23z" />
              </svg>
              <div className="text-left">
                <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 leading-tight">
                  Descárgalo en el
                </div>
                <div className="text-xs font-bold leading-tight">App Store</div>
              </div>
            </a>

            {/* Google Play */}
            <a
              href="#google-play"
              onClick={(e) => {
                e.preventDefault();
                alert('La aplicación de Trankilandia Gym para Android estará disponible próximamente en Google Play.');
              }}
              className="px-4 py-2.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 hover:border-amber-400/40 text-white transition-all flex items-center gap-3 group shadow-sm"
              aria-label="Descargar en Google Play"
            >
              <svg className="w-5 h-5 fill-current text-white group-hover:text-amber-400 transition-colors" viewBox="0 0 24 24">
                <path d="M3.609 1.814L13.792 12 3.61 22.186c-.378-.31-.61-.785-.61-1.336V3.15c0-.551.232-1.026.609-1.336zM15.207 13.414l2.121-2.121-12.72-7.234 10.599 9.355zm0-2.828L4.608 1.23 17.328 8.465l-2.121 2.121zm1.414 1.414l3.182-1.81c.78-.443.78-1.163 0-1.606l-3.182-1.81-1.768 1.768 1.768 2.458z" />
              </svg>
              <div className="text-left">
                <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 leading-tight">
                  Disponible en
                </div>
                <div className="text-xs font-bold leading-tight">Google Play</div>
              </div>
            </a>
          </div>
        </div>

        {/* 5. Barra Legal Inferior */}
        <div className="border-t border-white/10 pt-8 mt-12 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-zinc-500 font-mono text-center md:text-left">
          <p>© {new Date().getFullYear()} Trankilandia Gym &amp; Fitness Club. Todos los derechos reservados.</p>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-sans">
            <button
              type="button"
              onClick={() =>
                handleOpenLegal(
                  'Aviso de Privacidad',
                  'En Trankilandia Gym protegemos tus datos personales conforme a las leyes vigentes de protección al consumidor y privacidad digital. Los datos recabados en formularios o registros de membresía se emplean exclusivamente para la provisión de servicios deportivos, acceso a las instalaciones y comunicaciones del club.'
                )
              }
              className="text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer"
            >
              Aviso de Privacidad
            </button>
            <span className="text-zinc-700">•</span>
            <button
              type="button"
              onClick={() =>
                handleOpenLegal(
                  'Términos del Servicio',
                  'Las membresías de Trankilandia Gym otorgan derechos de uso sobre las áreas estipuladas según cada categoría (Plata, Oro, Black VIP). Todo usuario se compromete al uso correcto y seguro de las máquinas Hammer Strength y barras Eleiko, así como a portar calzado y toalla deportiva.'
                )
              }
              className="text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer"
            >
              Términos del Servicio
            </button>
            <span className="text-zinc-700">•</span>
            <button
              type="button"
              onClick={() =>
                handleOpenLegal(
                  'Código de Conducta',
                  'Promovemos una comunidad de respeto, esfuerzo y camaradería. Es obligatorio descargar y regresar los discos a sus racks tras su uso, sanitizar equipos con las toallas antibacteriales disponibles y mantener un volumen respetuoso durante las sesiones compartidas.'
                )
              }
              className="text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer"
            >
              Código de Conducta
            </button>
          </div>

          <p className="flex items-center gap-2 text-zinc-600">
            <span>DISCIPLINA</span>
            <span className="text-amber-400/40">•</span>
            <span>FUERZA</span>
            <span className="text-amber-400/40">•</span>
            <span>COMUNIDAD</span>
          </p>
        </div>
      </div>

      {/* Modal interactivo de Términos / Aviso Legal */}
      {legalModalContent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setLegalModalContent(null)}
        >
          <div
            className="bg-zinc-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 sm:p-8 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLegalModalContent(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
                <Info className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {legalModalContent.title}
              </h3>
            </div>
            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
              {legalModalContent.content}
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModalContent(null)}
                className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
