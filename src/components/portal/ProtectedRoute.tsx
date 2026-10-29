import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole, ROLES_CONFIG } from '../../types/roles';
import { ShieldAlert, ArrowLeft, MessageCircle } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

/**
 * Route Guard para proteger rutas de administración, caja, entrenador y cliente.
 * - Si no está autenticado, redirige a la página de inicio.
 * - Si es Super Administrador (actualRole === 'admin'), tiene acceso maestro a todos los módulos.
 * - Si el rol del usuario no tiene permisos, muestra una pantalla de Acceso Restringido 403
 *   y un botón para volver a su portal autorizado.
 */
export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, actualRole, isLoading, getRedirectPath } = useAuth();

  // 1. Estado de carga de sesión
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
        <div className="text-center space-y-3 font-mono">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-400">Verificando credenciales de acceso...</p>
        </div>
      </div>
    );
  }

  // 2. Si no hay usuario autenticado, redirigir a inicio
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 3. El Super Administrador (actualRole === 'admin') cuenta con permiso maestro en toda la plataforma
  if (actualRole === 'admin') {
    return <>{children}</>;
  }

  // 4. Verificación de rol autorizado
  const hasAccess = allowedRoles.includes(actualRole);

  if (!hasAccess) {
    const userRoleConfig = ROLES_CONFIG[actualRole] || { name: 'Cliente' };
    const requiredRoleNames = allowedRoles
      .map((r) => ROLES_CONFIG[r]?.name || r)
      .join(' o ');

    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-red-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black font-display uppercase tracking-tight text-white">
              Acceso Restringido
            </h2>
            <p className="text-xs font-mono text-zinc-400 leading-relaxed">
              Has iniciado sesión con el rol de{' '}
              <strong className="text-amber-400">{userRoleConfig.name}</strong>. Este módulo requiere privilegios de{' '}
              <strong className="text-red-400">{requiredRoleNames}</strong>.
            </p>
          </div>

          <div className="pt-2 space-y-2.5">
            <a
              href={getRedirectPath()}
              className="w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-400/20"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ir a Mi Portal Autorizado</span>
            </a>

            <a
              href={`https://wa.me/51999787489?text=Hola%20Trankilandia%20Gym,%20tengo%20una%20cuenta%20con%20correo%20${encodeURIComponent(
                user.email || ''
              )}%20y%20necesito%20solicitar%20acceso%20administrativo.`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Contactar a Recepción / Gerencia</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
