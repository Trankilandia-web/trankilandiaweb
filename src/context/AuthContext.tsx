import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, signOut as supabaseSignOut } from '../lib/supabase';
import { UserRole, ROLES_CONFIG, getRoleRedirectPath } from '../types/roles';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  role: UserRole;
  actualRole: UserRole;
  isAdmin: boolean;
  switchRole: (newRole: UserRole) => Promise<void>;
  getRedirectPath: () => string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isConfigured: false,
  role: 'cliente',
  actualRole: 'cliente',
  isAdmin: false,
  switchRole: async () => {},
  getRedirectPath: () => '/cliente',
  signOut: async () => {},
});

const ROLE_STORAGE_KEY = 'trankilandia_active_role';

export const SUPER_ADMIN_EMAILS = [
  'luisgerardolloccllasaune@gmail.com',
  'trankilandiagymperu@gmail.com',
];

// Helper to determine initial role fallback: EVERY user is 'cliente' by default
function resolveDefaultRole(user: User | null): UserRole {
  const userEmail = (user?.email || '').toLowerCase().trim();
  if (SUPER_ADMIN_EMAILS.includes(userEmail)) {
    return 'admin';
  }

  // 1. Saved role in local testing storage (only if explicitly set by role switcher)
  const savedRole = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null;
  if (savedRole && ROLES_CONFIG[savedRole]) {
    return savedRole;
  }

  // 2. Role in Supabase user metadata
  const metaRole = user?.user_metadata?.role as UserRole | undefined;
  if (metaRole && ROLES_CONFIG[metaRole]) {
    return metaRole;
  }

  // 3. Default for ALL users is strictly 'cliente'
  return 'cliente';
}

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actualRole, setActualRole] = useState<UserRole>('cliente');
  const [role, setRoleState] = useState<UserRole>('cliente');
  const isConfigured = isSupabaseConfigured();

  const isAdmin = (actualRole as string) === 'admin' || (role as string) === 'admin';

  // Try fetching role from Supabase 'profiles' table with local fallback
  const syncRole = async (currentUser: User | null) => {
    if (!currentUser) {
      setActualRole('cliente');
      setRoleState('cliente');
      return;
    }

    let dbRole: UserRole = 'cliente';

    const userEmail = (currentUser.email || '').toLowerCase().trim();
    const isMasterAdminEmail = SUPER_ADMIN_EMAILS.includes(userEmail);

    // 1. Verificar si hay un rol activo guardado en localStorage (modo presentación / switch previo)
    const savedRole = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null;

    if (isMasterAdminEmail) {
      dbRole = 'admin';
      // Asegurar rol en la tabla profiles de Supabase
      if (isConfigured) {
        supabase
          .from('profiles')
          .upsert({
            id: currentUser.id,
            email: currentUser.email,
            role: 'admin',
            full_name: currentUser.user_metadata?.full_name || 'Luis Gerardo Lloclla Sauñe',
            updated_at: new Date().toISOString(),
          })
          .then(() => {});
      }
    } else if (savedRole && ROLES_CONFIG[savedRole]) {
      // Priorizar selección explícita del usuario para demostración o sesión administrativa
      dbRole = savedRole;
    } else if (isConfigured) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (!error && data?.role && ROLES_CONFIG[data.role as UserRole]) {
          dbRole = data.role as UserRole;
        }
      } catch {
        // Table may not be created yet in Supabase
      }
    } else {
      dbRole = resolveDefaultRole(currentUser);
    }

    setActualRole(dbRole);
    setRoleState(dbRole);
    localStorage.setItem(ROLE_STORAGE_KEY, dbRole);
  };

  useEffect(() => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    // 1. Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        syncRole(session.user);
      }
      setIsLoading(false);
    });

    // 2. Listen to state changes (OAuth redirect, sign in, sign out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        syncRole(session.user);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  const switchRole = async (newRole: UserRole) => {
    if (!ROLES_CONFIG[newRole]) return;

    // Permite al usuario/presentador alternar dinámicamente entre los 4 módulos
    setRoleState(newRole);
    setActualRole(newRole);
    localStorage.setItem(ROLE_STORAGE_KEY, newRole);
  };

  const handleSignOut = async () => {
    await supabaseSignOut();
    setUser(null);
    setSession(null);
    setActualRole('cliente');
    setRoleState('cliente');
    localStorage.removeItem(ROLE_STORAGE_KEY);
  };

  const getRedirectPath = () => {
    return getRoleRedirectPath(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isConfigured,
        role,
        actualRole,
        isAdmin,
        switchRole,
        getRedirectPath,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
