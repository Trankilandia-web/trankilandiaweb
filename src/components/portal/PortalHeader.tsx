import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Receipt,
  User,
  LogOut,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES_CONFIG, UserRole } from '../../types/roles';
import {
  StaffUser,
  getActiveStaffSession,
  setActiveStaffSession,
} from '../../lib/staffStore';
import StaffSwitcherModal from './StaffSwitcherModal';
import GymAnnouncementsControl from './GymAnnouncementsControl';
import GymMegaphoneControl from './GymMegaphoneControl';
import AlertVolumeControl from './AlertVolumeControl';
import trankilandiaLogo from '../../assets/trankilandia-logo.png';

interface PortalHeaderProps {
  currentRole: UserRole;
  title: string;
  subtitle: string;
}

export default function PortalHeader({ currentRole, title, subtitle }: PortalHeaderProps) {
  const { isAdmin, switchRole, signOut, loginStaff } = useAuth();
  const navigate = useNavigate();
  const activeConfig = ROLES_CONFIG[currentRole];

  const [activeStaff, setActiveStaff] = useState<StaffUser | null>(getActiveStaffSession);
  const [switchError, setSwitchError] = useState('');
  const headerRef = useRef<HTMLElement>(null);
  const isStaffPortal = currentRole === 'admin' || currentRole === 'caja';

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const updateHeight = () => document.documentElement.style.setProperty('--portal-header-height', `${header.getBoundingClientRect().height}px`);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--portal-header-height'); };
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setActiveStaff(getActiveStaffSession());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleRoleChange = async (newRole: UserRole) => {
    await switchRole(newRole);
    navigate(ROLES_CONFIG[newRole].path);
  };

  const roleIcons = {
    admin: ShieldCheck,
    caja: Receipt,
    entrenador: ShieldCheck,
    cliente: User,
  };

  const ActiveIcon = roleIcons[currentRole];

  // Módulos operativos exclusivos de la app (Caja & Administración únicamente)
  const allowedRoles: UserRole[] = ['caja', 'admin'];

  return (
    <>
      <header ref={headerRef} className="bg-zinc-950/95 border-b border-white/10 sticky top-0 z-40 backdrop-blur-md">
        {/* Super Admin Module Switcher - Limpio y centrado en Caja / Admin / Cliente */}
        {isAdmin && (
          <div className="bg-zinc-900/90 border-b border-white/5 py-1.5 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-semibold text-zinc-300 text-[11px] uppercase tracking-wider">
                  Trankilandia Central Hub
                </span>
                <span className="text-zinc-600 hidden sm:inline">|</span>
                <span className="hidden sm:inline text-zinc-500 text-[11px]">Módulo:</span>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-full">
                {allowedRoles.map((r) => {
                  const cfg = ROLES_CONFIG[r];
                  const isSelected = r === currentRole;
                  const Icon = roleIcons[r];

                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleChange(r)}
                      className={`inline-flex min-h-11 items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400 text-black shadow-sm font-bold'
                          : 'bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/5'
                      }`}
                    >
                      <Icon className="w-3 h-3 flex-shrink-0" />
                      <span>{cfg.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Main Header Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Gym Brand + Role Identity */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-amber-400/30 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-400/10"
                title="Trankilandia Gym"
              >
                <img
                  src={trankilandiaLogo}
                  alt="Trankilandia Gym"
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-base sm:text-xl font-black uppercase tracking-tight text-white font-display">
                    {title}
                  </h1>
                  <span
                    className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${activeConfig.themeColor.badgeBg} ${activeConfig.themeColor.badgeText} ${activeConfig.themeColor.badgeBorder}`}
                  >
                    <ActiveIcon className="w-3 h-3" />
                    {activeConfig.badge}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{subtitle}</p>
              </div>
            </div>

            {/* User Status + Viñeta Rápida de Personal */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 max-w-full">
              {/* Botón de Mensajes y Anuncios por el Parlante Bluetooth */}
              {isStaffPortal && <GymAnnouncementsControl />}

              {/* Botón de Megáfono / Micrófono hacia el parlante Bluetooth */}
              {isStaffPortal && <GymMegaphoneControl />}

              {/* Control de volumen de alertas de escáner y accesos */}
              {isStaffPortal && <AlertVolumeControl />}

              {/* Viñeta de Personal Activo con PIN */}
              {isStaffPortal && activeStaff && (
                <button
                  type="button"
                  onClick={() => setIsSwitcherOpen(true)}
                  className="flex min-h-11 items-center gap-2.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-amber-400/40 hover:border-amber-400 hover:bg-zinc-800 transition-all cursor-pointer shadow-sm group"
                  title="Toca para cambiar de turno o bloquear la pantalla con PIN"
                >
                  <div
                    className={`w-7 h-7 rounded-lg bg-gradient-to-br ${activeStaff.avatarColor} flex items-center justify-center font-black text-xs shadow-md`}
                  >
                    {activeStaff.iniciales}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-black text-white group-hover:text-amber-400 leading-tight">
                      {activeStaff.nombre}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 leading-none">
                      {activeStaff.rol === 'admin' ? 'Admin' : 'Cajero'} · {activeStaff.turno}
                    </div>
                  </div>
                  <div className="p-1 rounded-lg bg-white/5 text-zinc-400 group-hover:text-amber-400 group-hover:bg-amber-400/10 transition-colors">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                </button>
              )}

              {/* Salir / Bloquear Turno */}
              <button
                type="button"
                onClick={async () => {
                  setActiveStaffSession(null);
                  await signOut();
                  navigate('/');
                }}
                className="inline-flex min-h-11 items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-xl text-xs font-medium border border-red-500/20 transition-colors cursor-pointer"
                title={isStaffPortal ? 'Cerrar turno y bloquear terminal' : 'Cerrar sesión'}
                aria-label={isStaffPortal ? 'Cerrar turno y bloquear terminal' : 'Cerrar sesión'}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isStaffPortal ? 'Bloquear terminal' : 'Cerrar sesión'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modal de Cambio Rápido de Personal con Viñeta y PIN */}
      {switchError && <p role="alert" className="px-4 py-3 text-sm text-red-300 bg-red-950">{switchError}</p>}
      <StaffSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        currentStaff={activeStaff}
        onStaffAuthenticated={async (newStaff) => {
          const result = await loginStaff(newStaff);
          if (!result.success) { setSwitchError(result.error || 'No se pudo cambiar el personal activo.'); return; }
          setSwitchError(''); setActiveStaff(newStaff); setIsSwitcherOpen(false);
          navigate(result.redirectPath);
        }}
      />
    </>
  );
}
