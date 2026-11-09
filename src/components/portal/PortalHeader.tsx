import { Link, useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  ShieldCheck,
  Receipt,
  Activity,
  User,
  LogOut,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES_CONFIG, UserRole } from '../../types/roles';

interface PortalHeaderProps {
  currentRole: UserRole;
  title: string;
  subtitle: string;
}

export default function PortalHeader({ currentRole, title, subtitle }: PortalHeaderProps) {
  const { user, isAdmin, switchRole, signOut } = useAuth();
  const navigate = useNavigate();
  const activeConfig = ROLES_CONFIG[currentRole];

  const handleRoleChange = (newRole: UserRole) => {
    switchRole(newRole);
    navigate(ROLES_CONFIG[newRole].path);
  };

  const roleIcons = {
    admin: ShieldCheck,
    caja: Receipt,
    entrenador: Activity,
    cliente: User,
  };

  const ActiveIcon = roleIcons[currentRole];

  return (
    <header className="bg-zinc-950/95 border-b border-white/10 sticky top-0 z-40 backdrop-blur-md">
      {/* Super Admin Module Switcher - Clean & Refined */}
      {isAdmin && (
        <div className="bg-zinc-900/90 border-b border-white/5 py-1.5 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="font-semibold text-zinc-300 text-[11px] uppercase tracking-wider">Super Admin</span>
              <span className="text-zinc-600 hidden sm:inline">|</span>
              <span className="hidden sm:inline text-zinc-500 text-[11px]">Cambiar módulo:</span>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-full">
              {(Object.keys(ROLES_CONFIG) as UserRole[]).map((r) => {
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
                        ? 'bg-amber-400 text-black shadow-sm'
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
            <Link
              to="/"
              className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 hover:bg-amber-400/20 transition-colors flex-shrink-0"
              title="Volver a la página principal"
            >
              <Dumbbell className="w-5 h-5" />
            </Link>

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

          {/* User Status + Navigation Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* User Avatar Chip */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-xl text-xs">
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt={user.user_metadata.full_name || 'Usuario'}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-amber-400 text-black font-extrabold flex items-center justify-center text-[10px]">
                  {(user?.email?.[0] || 'U').toUpperCase()}
                </div>
              )}
              <span className="text-zinc-200 font-medium max-w-[120px] truncate">
                {user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuario'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>

            {/* Back to Website */}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-medium border border-white/10 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Web Principal</span>
            </Link>

            {/* Sign Out */}
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
              className="inline-flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-xl text-xs font-medium border border-red-500/20 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
