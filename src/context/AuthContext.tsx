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

// Helper to determine initial role fallback: EVERY user is 'cliente' by default
function resolveDefaultRole(user: User | null): UserRole {
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

  const isAdmin = actualRole === 'admin' || (!isConfigured && role === 'admin');

  // Try fetching role from Supabase 'profiles' table with local fallback
  const syncRole = async (currentUser: User | null) => {
    if (!currentUser) {
      setActualRole('cliente');
      setRoleState('cliente');
      return;
    }

    let dbRole: UserRole = 'cliente';

    if (isConfigured) {
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

    // Si el usuario es administrador, puede alternar entre las 4 vistas.
    // Restauramos la vista guardada en localStorage si existe, o usamos su rol real.
    if (dbRole === 'admin') {
      const savedRole = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null;
      if (savedRole && ROLES_CONFIG[savedRole]) {
        setRoleState(savedRole);
      } else {
        setRoleState('admin');
      }
    } else {
      // Los usuarios regulares operan estrictamente bajo su rol asignado
      setRoleState(dbRole);
      localStorage.setItem(ROLE_STORAGE_KEY, dbRole);
    }
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

    // Solo el Administrador o en modo local tiene permitido conmutar entre los 4 roles
    if (actualRole === 'admin' || !isConfigured) {
      setRoleState(newRole);
      localStorage.setItem(ROLE_STORAGE_KEY, newRole);
      // PRESERVACIÓN DE SEGURIDAD: NO sobrescribimos profiles.role en Supabase.
      // El administrador conserva sus privilegios plenos en la base de datos (RLS)
      // mientras inspecciona y opera cualquier módulo.
    }
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
