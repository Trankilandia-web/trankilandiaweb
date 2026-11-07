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
  loginUser: (identifier: string, name?: string) => Promise<{ success: boolean; role: UserRole; redirectPath: string }>;
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
  loginUser: async () => ({ success: false, role: 'cliente', redirectPath: '/' }),
  signOut: async () => {},
});

const ROLE_STORAGE_KEY = 'trankilandia_active_role';
const USER_STORAGE_KEY = 'trankilandia_auth_user';

export const SUPER_ADMIN_EMAILS = [
  'luisgerardolloccllasaune@gmail.com',
  'marisolflores@gmail.com',
  'marisolflores15@gmail.com',
  'trankilandiagymperu@gmail.com',
];

// Helper to determine initial role fallback: EVERY user is 'cliente' by default
function resolveDefaultRole(user: User | null): UserRole {
  const userEmail = (user?.email || '').toLowerCase().trim();
  if (SUPER_ADMIN_EMAILS.some((admin) => admin.toLowerCase() === userEmail)) {
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

  // Sincronizar roles y validar permisos
  const syncRole = async (currentUser: User | null) => {
    if (!currentUser) {
      setActualRole('cliente');
      setRoleState('cliente');
      return;
    }

    let dbRole: UserRole = 'cliente';
    const userEmail = (currentUser.email || '').toLowerCase().trim();
    const isMasterAdminEmail = SUPER_ADMIN_EMAILS.some((admin) => admin.toLowerCase() === userEmail);
    const savedRole = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null;

    if (isMasterAdminEmail) {
      dbRole = 'admin';
      if (isConfigured) {
        supabase
          .from('profiles')
          .upsert({
            id: currentUser.id,
            email: currentUser.email,
            role: 'admin',
            full_name:
              currentUser.user_metadata?.full_name ||
              (userEmail.includes('marisol') ? 'Marisol Flores' : 'Luis Gerardo Lloclla Sauñe'),
            updated_at: new Date().toISOString(),
          })
          .then(() => {});
      }
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

    // Si es administrador, permitir conmutar vista mediante savedRole previamente seleccionado
    if (dbRole === 'admin' && savedRole && ROLES_CONFIG[savedRole]) {
      setRoleState(savedRole);
    } else {
      setRoleState(dbRole);
      localStorage.setItem(ROLE_STORAGE_KEY, dbRole);
    }
  };

  // 1. Restaurar sesión local de inmediato (Local-First sin bloqueos)
  useEffect(() => {
    try {
      const storedUserRaw = localStorage.getItem(USER_STORAGE_KEY);
      if (storedUserRaw) {
        const parsedUser = JSON.parse(storedUserRaw) as User;
        setUser(parsedUser);
        syncRole(parsedUser);
      }
    } catch {}

    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    // 2. Si Supabase está configurado, sincronizar sesión remota
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        syncRole(session.user);
        try {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user));
        } catch {}
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        syncRole(session.user);
        try {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user));
        } catch {}
      } else if (!localStorage.getItem(USER_STORAGE_KEY)) {
        setUser(null);
        setActualRole('cliente');
        setRoleState('cliente');
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured]);

  /**
   * Inicio de sesión universal (DNI o Correo de Administrador)
   * Garantiza autenticación persistente inmediata en móvil y escritorio
   */
  const loginUser = async (
    identifier: string,
    name?: string
  ): Promise<{ success: boolean; role: UserRole; redirectPath: string }> => {
    const rawInput = identifier.trim();
    const cleanDni = rawInput.replace(/\D/g, '');
    const isDni = cleanDni.length === 8;
    const isEmail = rawInput.includes('@');
    const userEmail = isEmail ? rawInput.toLowerCase() : `${cleanDni}@socio.trankilandia.pe`;

    const isMasterAdmin = SUPER_ADMIN_EMAILS.some((admin) => admin.toLowerCase() === userEmail);
    const assignedRole: UserRole = isMasterAdmin ? 'admin' : 'cliente';

    const displayName =
      name ||
      (isMasterAdmin
        ? userEmail.includes('marisol')
          ? 'Marisol Flores'
          : 'Luis Gerardo Lloclla'
        : `Socio ${cleanDni || rawInput}`);

    const authUserObj = {
      id: isMasterAdmin ? `admin-${cleanDni || 'master'}` : `socio-${cleanDni}`,
      email: userEmail,
      app_metadata: {},
      user_metadata: {
        full_name: displayName,
        dni: isDni ? cleanDni : undefined,
        role: assignedRole,
      },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as unknown as User;

    // Persistir localmente
    setUser(authUserObj);
    setActualRole(assignedRole);
    setRoleState(assignedRole);
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUserObj));
      localStorage.setItem(ROLE_STORAGE_KEY, assignedRole);
    } catch {}

    const redirectPath = getRoleRedirectPath(assignedRole);
    return { success: true, role: assignedRole, redirectPath };
  };

  const switchRole = async (newRole: UserRole) => {
    if (!ROLES_CONFIG[newRole]) return;

    if (actualRole !== 'admin') {
      console.warn('Acceso denegado: solo usuarios con rol admin pueden conmutar de módulo.');
      return;
    }

    setRoleState(newRole);
    localStorage.setItem(ROLE_STORAGE_KEY, newRole);
  };

  const handleSignOut = async () => {
    if (isConfigured) {
      await supabaseSignOut();
    }
    setUser(null);
    setSession(null);
    setActualRole('cliente');
    setRoleState('cliente');
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(ROLE_STORAGE_KEY);
    } catch {}
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
        loginUser,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
