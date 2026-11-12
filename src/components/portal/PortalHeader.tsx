import { useState, useEffect } from 'react';
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
  getStaffList,
} from '../../lib/staffStore';
import StaffSwitcherModal from './StaffSwitcherModal';
import GymMegaphoneControl from './GymMegaphoneControl';
import AlertVolumeControl from './AlertVolumeControl';
import trankilandiaLogo from '../../assets/trankilandia-logo.png';

interface PortalHeaderProps {
  currentRole: UserRole;
  title: string;
  subtitle: string;
}

export default function PortalHeader({ currentRole, title, subtitle }: PortalHeaderProps) {
  const { isAdmin, switchRole, signOut } = useAuth();
  const navigate = useNavigate();
  const activeConfig = ROLES_CONFIG[currentRole];

  // Estado del personal activo con PIN
  const [activeStaff, setActiveStaff] = useState<StaffUser | null>(() => {
    const existing = getActiveStaffSession();
    if (existing) return existing;
    const defaultList = getStaffList();
    const marisol = defaultList.find((u) => u.id === 'staff-marisol') || defaultList[0];
    if (marisol) {
      setActiveStaffSession(marisol);
      return marisol;
    }
    return null;
  });

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      setActiveStaff(getActiveStaffSession());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleRoleChange = (newRole: UserRole) => {
    switchRole(newRole);
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
      <header className="bg-zinc-950/95 border-b border-white/10 sticky top-0 z-40 backdrop-blur-md">
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
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all cursor-pointer ${
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
            <div className="flex items-center gap-3.5">
              <div
                className="w-10 h-10 rounded-full overflow-hidden border border-amber-400/30 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-400/10"
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
                  <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white font-display">
                    {title}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${activeConfig.themeColor.badgeBg} ${activeConfig.themeColor.badgeText} ${activeConfig.themeColor.badgeBorder}`}
                  >
                    <ActiveIcon className="w-3 h-3" />
                    {activeConfig.badge}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{subtitle}</p>
              </div>
            </div>

            {/* User Status + Viñeta Rápida de Personal */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Botón de Megáfono / Micrófono hacia el parlante Bluetooth */}
              <GymMegaphoneControl />

              {/* Control de volumen de alertas de escáner y accesos */}
              <AlertVolumeControl />

              {/* Viñeta de Personal Activo con PIN */}
              {activeStaff && (
                <button
                  type="button"
                  onClick={() => setIsSwitcherOpen(true)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-amber-400/40 hover:border-amber-400 hover:bg-zinc-800 transition-all cursor-pointer shadow-sm group"
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
                className="inline-flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-xl text-xs font-medium border border-red-500/20 transition-colors cursor-pointer"
                title="Cerrar turno y bloquear terminal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Bloquear Terminal</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modal de Cambio Rápido de Personal con Viñeta y PIN */}
      <StaffSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        currentStaff={activeStaff}
        onStaffAuthenticated={(newStaff) => {
          setActiveStaff(newStaff);
          setActiveStaffSession(newStaff);
          setIsSwitcherOpen(false);
        }}
      />
    </>
  );
}
