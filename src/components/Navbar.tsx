import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Menu, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UserProfileDropdown from './UserProfileDropdown';
import { useModalFocus } from '../hooks/useModalFocus';
import trankilandiaLogo from '../assets/trankilandia-logo.png';

export interface NavbarProps { onOpenLoginModal?: () => void; onOpenTourModal?: () => void; }
const NAV_LINKS = [
  { label: 'Inicio', href: '/' }, { label: 'Planes y precios', href: '/planes' },
  { label: 'Horarios y clases', href: '/clases' }, { label: 'Instalaciones', href: '/instalaciones' },
];

export default function Navbar({ onOpenLoginModal, onOpenTourModal }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, getRedirectPath } = useAuth();
  const closeMenu = () => setIsOpen(false);
  const menuRef = useModalFocus(isOpen, closeMenu, { initialFocus: '#mobile-nav-close' });

  useEffect(() => { setIsOpen(false); }, [location.pathname]);
  useEffect(() => {
    const closeOnDesktop = () => { if (window.innerWidth >= 1024) setIsOpen(false); };
    window.addEventListener('resize', closeOnDesktop);
    return () => window.removeEventListener('resize', closeOnDesktop);
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-20 bg-zinc-950/95 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-5">
        <Link to="/" className="flex items-center gap-2.5 rounded-lg shrink-0" onClick={closeMenu}>
          <img src={trankilandiaLogo} alt="" width={40} height={40} className="h-10 w-10 rounded-full" />
          <span><strong className="block text-lg sm:text-xl font-black tracking-tight leading-tight text-white">TRANKILANDIA</strong><span className="block text-xs text-zinc-400">Gym · Ayacucho</span></span>
        </Link>
        <nav aria-label="Navegación principal" className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => <Link key={link.href} to={link.href} aria-current={location.pathname === link.href ? 'page' : undefined} className={`min-h-11 flex items-center px-3 rounded-lg text-sm font-semibold transition-colors ${location.pathname === link.href ? 'text-amber-400 bg-amber-400/10' : 'text-zinc-300 hover:text-white hover:bg-zinc-900'}`}>{link.label}</Link>)}
        </nav>
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          {user ? <><UserProfileDropdown /><Link to={getRedirectPath()} className="button-primary">Mi panel<ArrowRight size={17} /></Link></> : <button type="button" onClick={onOpenLoginModal} className="button-primary"><User size={17} />Iniciar sesión</button>}
        </div>
        <button type="button" onClick={() => setIsOpen(!isOpen)} aria-label="Abrir menú" aria-expanded={isOpen} aria-controls="mobile-navigation" className="lg:hidden flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/15 text-white"><Menu size={23} /></button>
      </div>
      {isOpen && (
        <div ref={menuRef} id="mobile-navigation" role="dialog" aria-modal="true" aria-labelledby="mobile-nav-title" tabIndex={-1} className="lg:hidden fixed inset-x-0 top-20 bottom-0 overflow-y-auto bg-zinc-950 px-4 sm:px-6 py-5 shadow-2xl">
          <div className="flex items-center justify-between mb-5"><h2 id="mobile-nav-title" className="text-lg font-bold">Explora Trankilandia</h2><button id="mobile-nav-close" type="button" onClick={closeMenu} aria-label="Cerrar menú" className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-900"><X size={22} /></button></div>
          <nav aria-label="Navegación móvil" className="space-y-2">
            {NAV_LINKS.map((link) => <Link key={link.href} to={link.href} onClick={closeMenu} aria-current={location.pathname === link.href ? 'page' : undefined} className={`flex min-h-12 items-center justify-between rounded-xl px-4 text-base font-semibold ${location.pathname === link.href ? 'bg-amber-400 text-black' : 'text-zinc-300 hover:bg-zinc-900'}`}>{link.label}<ArrowRight size={17} /></Link>)}
          </nav>
          <div className="mt-6 border-t border-white/10 pt-6 flex flex-col gap-3">
            {user ? <Link to={getRedirectPath()} onClick={closeMenu} className="button-primary">Ir a mi panel<ArrowRight size={17} /></Link> : <button type="button" onClick={() => { closeMenu(); onOpenLoginModal?.(); }} className="button-primary"><User size={17} />Iniciar sesión</button>}
            {onOpenTourModal && <button type="button" onClick={() => { closeMenu(); onOpenTourModal(); }} className="button-secondary">Solicitar pase de cortesía</button>}
          </div>
        </div>
      )}
    </header>
  );
}
