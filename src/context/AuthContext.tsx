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
  switchRole: (newRole: UserRole) => void;
  getRedirectPath: () => string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isConfigured: false,
  role: 'cliente',
  switchRole: () => {},
  getRedirectPath: () => '/cliente',
  signOut: async () => {},
});

const ROLE_STORAGE_KEY = 'trankilandia_active_role';

// Helper to determine initial role
function resolveDefaultRole(user: User | null): UserRole {
  // 1. Saved role in local testing storage
  const savedRole = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null;
  if (savedRole && ROLES_CONFIG[savedRole]) {
    return savedRole;
  }

  // 2. Role in Supabase user metadata
  const metaRole = user?.user_metadata?.role as UserRole | undefined;
  if (metaRole && ROLES_CONFIG[metaRole]) {
    return metaRole;
  }

  // 3. Admin emails by default
  const email = (user?.email || '').toLowerCase();
  if (
    email === 'trankilandiagymperu@gmail.com' ||
    email.startsWith('luisgerardolloccllasaune') ||
    email.startsWith('luisllocclla')
  ) {
    return 'admin';
  }

  // 4. Default for normal members
  return 'cliente';
}

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRoleState] = useState<UserRole>('cliente');
  const isConfigured = isSupabaseConfigured();

  // Load and sync role
  useEffect(() => {
    const detectedRole = resolveDefaultRole(user);
    setRoleState(detectedRole);
  }, [user]);

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
        setRoleState(resolveDefaultRole(session.user));
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
        setRoleState(resolveDefaultRole(session.user));
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  const switchRole = (newRole: UserRole) => {
    if (ROLES_CONFIG[newRole]) {
      setRoleState(newRole);
      localStorage.setItem(ROLE_STORAGE_KEY, newRole);
    }
  };

  const handleSignOut = async () => {
    await supabaseSignOut();
    setUser(null);
    setSession(null);
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
