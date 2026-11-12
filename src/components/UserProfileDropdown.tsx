import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  LogOut,
  ArrowRight,
  MessageCircle,
  QrCode,
  Dumbbell,
  ChevronDown,
  MapPin,
  Tag,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GYM_CONTACT } from '../data/gymData';
import { getStoredMembers } from '../data/gymStore';

export interface UserProfileDropdownProps {
  onClose?: () => void;
}

export default function UserProfileDropdown() {
  const { user, role, signOut, getRedirectPath } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!user) return null;

  const isCanonicalDni = Boolean(user.email?.endsWith('@socio.trankilandia.pe'));
  const userDni = isCanonicalDni ? user.email?.split('@')[0] : (user.user_metadata?.dni || '');
  const localMember = userDni ? getStoredMembers().find((m) => m.dni === userDni) : null;

  const displayName =
    user.user_metadata?.full_name ||
    localMember?.name ||
    (isCanonicalDni ? `Atleta DNI ${userDni}` : user.email?.split('@')[0]) ||
    'Socio';
  const displayEmail = isCanonicalDni
    ? `DNI: ${userDni} · Carnet Digital`
    : user.email || 'socio@trankilandia.pe';

  const handleNavigateToPortal = () => {
    setIsOpen(false);
    navigate(getRedirectPath());
  };

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
    navigate('/');
  };

  const handleOpenWhatsApp = () => {
    setIsOpen(false);
    const text = encodeURIComponent(
      `Hola Trankilandia Gym, soy ${displayName} (${displayEmail}), necesito asistencia con mi cuenta.`
    );
    window.open(`https://wa.me/${GYM_CONTACT.phone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button in Navbar */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`flex items-center gap-2.5 bg-zinc-900 border px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer shadow-md ${
          isOpen
            ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-amber-400/10'
            : 'border-amber-400/30 hover:border-amber-400/70 shadow-black/40'
        }`}
      >
        {/* Avatar */}
        {user.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt={displayName}
            className="w-6 h-6 rounded-full object-cover border border-amber-400/50"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-amber-400 text-black font-extrabold flex items-center justify-center text-[11px] shadow-sm">
            {(displayName[0] || 'S').toUpperCase()}
          </div>
        )}

        {/* User Name */}
        <div className="flex flex-col text-left">
          <span className="text-white font-bold max-w-[105px] truncate leading-tight text-[11px]">
            {displayName.split(' ')[0]}
          </span>
          <span className="text-[9px] text-zinc-400 font-normal leading-none truncate max-w-[105px]">
            Socio
          </span>
        </div>

        {/* Active Role Mini Dot & Chevron */}
        <div className="flex items-center gap-1 pl-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <ChevronDown
            className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-amber-400' : ''
            }`}
          />
        </div>
      </motion.button>

      {/* Popover / Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 mt-2 w-80 sm:w-88 bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl z-50 overflow-hidden text-white"
          >
            {/* Top Amber Accent Glow */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

            {/* Profile Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt={displayName}
                  className="w-11 h-11 rounded-xl object-cover border-2 border-amber-400/60"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-black font-black text-base flex items-center justify-center shadow-md">
                  {(displayName[0] || 'S').toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm text-white truncate">{displayName}</h4>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono truncate">{displayEmail}</p>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  <span>Sede Emadi · Huamanga</span>
                </div>
              </div>
            </div>

            {/* Active Role Status Banner */}
            <div className="mt-3 p-2.5 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">Estado de cuenta:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                <User className="w-3 h-3" />
                <span>Socio Trankilandia</span>
              </span>
            </div>

            {/* Primary Action Button: Ir a mi Panel */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNavigateToPortal}
              className="mt-3 w-full bg-amber-400 hover:bg-amber-300 text-black font-extrabold py-3 px-4 rounded-xl text-xs font-display tracking-wide uppercase flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer transition-all"
            >
              <span>ENTRAR A MI CARNET DIGITAL</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>

            {/* Role Shortcuts */}
            <div className="mt-3.5 space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold px-1 mb-1">
                Accesos directos de tu perfil:
              </div>

              <button
                type="button"
                onClick={handleNavigateToPortal}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors text-left cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span>Mi Carnet Digital &amp; QR Torniquete</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">ACTIVO</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/cliente?tab=rutina');
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors text-left cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-amber-400" />
                  <span>Mi Rutina del Coach &amp; PRs</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Día 1</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/cliente?tab=seguridad');
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors text-left cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Seguridad &amp; Cambiar Clave</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400 font-bold">DNI / Clave</span>
              </button>

              {role === 'admin' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/admin?tab=planes');
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans text-purple-300 hover:text-white hover:bg-purple-950/40 transition-colors text-left cursor-pointer font-bold border border-purple-500/20 mt-1"
                >
                  <span className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-purple-400" />
                    <span>Gestionar Planes &amp; Tarifas</span>
                  </span>
                  <span className="text-[10px] font-mono uppercase bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                    Admin
                  </span>
                </button>
              )}
            </div>

            {/* Footer Actions */}
            <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer text-[11px]"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp Gym</span>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors cursor-pointer text-[11px]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
