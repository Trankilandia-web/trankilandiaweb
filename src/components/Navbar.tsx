import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dumbbell, Menu, X } from 'lucide-react';

export interface NavbarProps {
  onOpenTourModal?: () => void;
}

const NAV_LINKS = [
  { label: 'Inicio', href: '/' },
  { label: 'Planes & Membresías', href: '/planes' },
  { label: 'Horarios & Clases', href: '/clases' },
  { label: 'Instalaciones', href: '/instalaciones' },
];

export default function Navbar(props: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent background scroll when mobile menu is open
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

  const closeMenu = () => setIsOpen(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-20 backdrop-blur-md bg-zinc-950/85 border-b border-white/5 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl"
          onClick={closeMenu}
        >
          <div className="bg-amber-400/10 border border-amber-400/20 p-2 rounded-xl text-amber-400 transition-transform duration-300 group-hover:scale-105 group-hover:border-amber-400/40">
            <Dumbbell className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-black tracking-tight text-xl font-display leading-tight">
              TRANKILANDIA
            </span>
            <span className="text-[10px] text-zinc-400 tracking-widest font-mono leading-none">
              GYM & FITNESS
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav
          aria-label="Navegación principal"
          className="hidden md:flex items-center gap-8"
        >
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={`text-sm transition-colors duration-200 whitespace-nowrap ${
                  isActive
                    ? 'text-amber-400 font-bold border-b-2 border-amber-400 pb-0.5'
                    : 'text-zinc-300 hover:text-amber-400 font-medium'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center">
          <button
            type="button"
            onClick={() => props.onOpenTourModal?.()}
            className="bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-5 py-2.5 rounded-xl text-sm whitespace-nowrap active:scale-[0.98] shadow-lg shadow-amber-400/10 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            PASE DE CORTESÍA
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
          aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
          className="md:hidden p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 border border-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      <div
        className={`md:hidden fixed inset-0 top-20 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      {/* Mobile Drawer Menu */}
      <div
        id="mobile-menu"
        aria-hidden={!isOpen}
        className={`md:hidden fixed inset-x-0 top-20 bg-zinc-950/95 backdrop-blur-xl border-b border-white/10 shadow-2xl transition-all duration-300 ease-in-out px-6 py-6 flex flex-col gap-4 ${
          isOpen
            ? 'opacity-100 pointer-events-auto translate-y-0'
            : 'opacity-0 pointer-events-none -translate-y-2'
        }`}
      >
        <nav aria-label="Navegación móvil" className="flex flex-col gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                onClick={closeMenu}
                aria-current={isActive ? 'page' : undefined}
                className={`text-base font-medium px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between ${
                  isActive
                    ? 'text-amber-400 font-bold bg-amber-400/10 border-l-2 border-amber-400'
                    : 'text-zinc-200 hover:text-amber-400 hover:bg-white/5'
                }`}
              >
                <span>{link.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              closeMenu();
              props.onOpenTourModal?.();
            }}
            className="w-full text-center block bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-5 py-3 rounded-xl text-sm active:scale-[0.98] shadow-lg shadow-amber-400/10 transition-all cursor-pointer"
          >
            PASE DE CORTESÍA
          </button>
        </div>
      </div>
    </header>
  );
}
