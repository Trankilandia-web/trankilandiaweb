import { Link, useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  ShieldCheck,
  Receipt,
  Activity,
  User,
  LogOut,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES_CONFIG, UserRole } from '../../types/roles';

interface PortalHeaderProps {
  currentRole: UserRole;
  title: string;
  subtitle: string;
}

export default function PortalHeader({ currentRole, title, subtitle }: PortalHeaderProps) {
  const { user, switchRole, signOut } = useAuth();
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
    <header className="bg-zinc-950 border-b border-white/10 sticky top-0 z-40 backdrop-blur-md bg-zinc-950/90">
      {/* Top Testing Switcher Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-900 border-b border-white/5 py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-zinc-400 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-zinc-300">Modo de Pruebas de Roles:</span>
            <span className="hidden sm:inline text-zinc-500">Haz clic para simular cada perfil:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {(Object.keys(ROLES_CONFIG) as UserRole[]).map((r) => {
              const cfg = ROLES_CONFIG[r];
              const isSelected = r === currentRole;
              const Icon = roleIcons[r];

              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleChange(r)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer ${
                    isSelected
                      ? `${cfg.themeColor.badgeBg} ${cfg.themeColor.badgeText} border ${cfg.themeColor.badgeBorder} shadow-sm`
                      : 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{cfg.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Gym Brand + Role Identity */}
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="bg-amber-400/10 border border-amber-400/20 p-2.5 rounded-xl text-amber-400 hover:border-amber-400/40 transition-colors flex-shrink-0"
              title="Volver a la página principal"
            >
              <Dumbbell className="w-6 h-6" />
            </Link>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white font-display">
                  {title}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${activeConfig.themeColor.badgeBg} ${activeConfig.themeColor.badgeText} ${activeConfig.themeColor.badgeBorder}`}
                >
                  <ActiveIcon className="w-3 h-3" />
                  {activeConfig.badge}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">{subtitle}</p>
            </div>
          </div>

          {/* User Status + Navigation Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* User Avatar Chip */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-xl text-xs font-mono">
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
              <span className="text-zinc-200 font-medium max-w-[140px] truncate">
                {user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuario'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>

            {/* Back to Website */}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-mono border border-white/10 transition-colors"
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
              className="inline-flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-xl text-xs font-mono border border-red-500/20 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
