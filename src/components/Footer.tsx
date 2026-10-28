import { Dumbbell } from 'lucide-react';
import { NAV_ITEMS, GYM_CONTACT } from '../data/gymData';

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

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-zinc-950/90 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logotipo de Trankilandia Gym con isotipo de mancuerna estilizada */}
          <a
            href="#inicio"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl"
          >
            <div className="bg-amber-400/10 border border-amber-400/20 p-2 rounded-xl text-amber-400 transition-transform duration-300 group-hover:scale-105 group-hover:border-amber-400/40">
              <Dumbbell className="w-6 h-6" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-white font-black tracking-tight text-xl font-display leading-tight">
                TRANKILANDIA
              </span>
              <span className="text-[10px] text-zinc-400 tracking-widest font-mono leading-none">
                GYM & FITNESS
              </span>
            </div>
          </a>

          {/* Navegación rápida con los links de NAV_ITEMS */}
          <nav
            aria-label="Navegación del pie de página"
            className="flex flex-wrap items-center justify-center gap-6 sm:gap-8"
          >
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-zinc-400 hover:text-amber-400 transition-colors duration-200"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Enlaces a redes sociales de GYM_CONTACT.socialLinks con hover en ámbar */}
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

        {/* Texto legal y copyright en text-zinc-500 text-xs font-mono */}
        <div className="border-t border-white/5 pt-8 mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500 text-center sm:text-left">
          <p>© {new Date().getFullYear()} Trankilandia Gym. Todos los derechos reservados.</p>
          <p className="flex items-center gap-2">
            <span>DISCIPLINA</span>
            <span className="text-amber-400/40">•</span>
            <span>FUERZA</span>
            <span className="text-amber-400/40">•</span>
            <span>COMUNIDAD</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
