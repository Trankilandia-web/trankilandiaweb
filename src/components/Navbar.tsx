import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dumbbell, Menu, X, MapPin, User, Ticket, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { ROLES_CONFIG } from '../types/roles';
import UserProfileDropdown from './UserProfileDropdown';

export interface NavbarProps {
  onOpenLoginModal?: () => void;
  onOpenTourModal?: () => void;
}

const NAV_LINKS = [
  { label: 'Inicio', href: '/' },
  { label: 'Planes & Membresías', href: '/planes' },
  { label: 'Horarios & Clases', href: '/clases' },
  { label: 'Instalaciones', href: '/instalaciones' },
];

export default function Navbar({ onOpenLoginModal, onOpenTourModal }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, role, getRedirectPath } = useAuth();

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
        {/* Brand Logo with responsive spring hover */}
        <Link
          to="/"
          className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl"
          onClick={closeMenu}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-amber-400/10 border border-amber-400/20 p-2 rounded-xl text-amber-400 transition-colors group-hover:border-amber-400/40"
          >
            <Dumbbell className="w-6 h-6" strokeWidth={1.75} />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-white font-black tracking-tight text-xl font-display leading-tight">
              TRANKILANDIA
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-400 tracking-widest font-mono leading-none">
                GYM · AYACUCHO
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            </div>
          </div>
        </Link>

        {/* Desktop Navigation with Emil Kowalski sliding active indicator */}
        <nav
          aria-label="Navegación principal"
          className="hidden md:flex items-center gap-1 p-1.5 bg-zinc-900/60 border border-white/5 rounded-2xl"
        >
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative px-4 py-2 text-sm font-semibold rounded-xl transition-colors duration-200 whitespace-nowrap ${
                  isActive ? 'text-black' : 'text-zinc-300 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="navbar-active-pill"
                    transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
                    className="absolute inset-0 bg-amber-400 rounded-xl z-0"
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop Login / Profile Button */}
        <div className="hidden md:flex items-center gap-2.5">
          {user ? (
            <>
              <UserProfileDropdown />

              <Link
                to={getRedirectPath()}
                className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-3.5 py-2 rounded-xl text-xs font-mono shadow-md shadow-amber-400/20 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap cursor-pointer uppercase tracking-wider font-display"
              >
                <span>MI PANEL</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          ) : (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
              onClick={() => onOpenLoginModal?.()}
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-5 py-2.5 rounded-xl text-sm whitespace-nowrap shadow-lg shadow-amber-400/10 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <User className="w-4 h-4" />
              <span>INICIAR SESIÓN</span>
            </motion.button>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={isOpen}
          className="md:hidden text-zinc-300 hover:text-white p-2.5 rounded-xl border border-white/10 bg-zinc-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
        >
          {isOpen ? <X className="w-6 h-6 text-amber-400" /> : <Menu className="w-6 h-6" />}
        </motion.button>
      </div>

      {/* Mobile Drawer with Emil Kowalski spring transition */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="md:hidden fixed inset-x-0 top-20 bg-zinc-950/95 backdrop-blur-2xl border-b border-white/10 px-6 py-8 shadow-2xl z-40 max-h-[calc(100vh-5rem)] overflow-y-auto"
          >
            <nav className="flex flex-col gap-2">
              {NAV_LINKS.map((link) => {
                const isActive = location.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={closeMenu}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-base font-bold transition-colors ${
                      isActive
                        ? 'bg-amber-400 text-black'
                        : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                    }`}
                  >
                    <span>{link.label}</span>
                    {isActive && <span className="w-2 h-2 rounded-full bg-black" />}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-6 pt-6 border-t border-white/10 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>Huamanga, Ayacucho, Perú</span>
              </div>
              {user ? (
                <>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      closeMenu();
                      onOpenLoginModal?.();
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl bg-zinc-900 border border-amber-400/40 text-white font-bold text-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {user.user_metadata?.avatar_url ? (
                        <img
                          src={user.user_metadata.avatar_url}
                          alt="Usuario"
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-amber-400 text-black font-extrabold flex items-center justify-center text-xs">
                          {(user.email?.[0] || 'S').toUpperCase()}
                        </div>
                      )}
                      <span className="truncate max-w-[150px]">
                        {user.user_metadata?.full_name || user.email}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${ROLES_CONFIG[role].themeColor.badgeBg} ${ROLES_CONFIG[role].themeColor.badgeText} border ${ROLES_CONFIG[role].themeColor.badgeBorder}`}
                    >
                      {ROLES_CONFIG[role].name}
                    </span>
                  </motion.button>

                  <Link
                    to={getRedirectPath()}
                    onClick={closeMenu}
                    className="w-full flex items-center justify-center gap-2 bg-amber-400 text-black font-extrabold py-3.5 rounded-xl text-sm shadow-lg shadow-amber-400/10 cursor-pointer font-display uppercase tracking-wide"
                  >
                    <span>IR A MI PANEL ({ROLES_CONFIG[role].name.toUpperCase()})</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              ) : (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    closeMenu();
                    onOpenLoginModal?.();
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-amber-400 text-black font-extrabold py-3.5 rounded-xl text-sm shadow-lg shadow-amber-400/10 cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span>INICIAR SESIÓN</span>
                </motion.button>
              )}
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  onOpenTourModal?.();
                }}
                className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-zinc-300 py-3 rounded-xl text-xs font-mono transition-colors cursor-pointer border border-white/5"
              >
                <Ticket className="w-3.5 h-3.5 text-amber-400" />
                <span>Solicitar Pase de Cortesía Gratis</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
