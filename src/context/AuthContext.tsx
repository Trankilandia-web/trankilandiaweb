import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, signOut as supabaseSignOut } from '../lib/supabase';
import { UserRole, ROLES_CONFIG, getRoleRedirectPath } from '../types/roles';
import { StaffUser, isVerifiedStaffSession, setActiveStaffSession } from '../lib/staffStore';

export interface LoginUserResult { success: boolean; role: UserRole; redirectPath: string; error?: string; }
interface AuthContextType {
  user: User | null; session: Session | null; isLoading: boolean; isConfigured: boolean;
  role: UserRole; actualRole: UserRole; isAdmin: boolean;
  switchRole: (newRole: UserRole) => Promise<void>; getRedirectPath: () => string;
  loginUser: (identifier: string, name?: string, password?: string) => Promise<LoginUserResult>;
  loginStaff: (staff: StaffUser) => Promise<LoginUserResult>;
  logoutStaff: () => Promise<void>; signOut: () => Promise<void>;
}
const rejected = (error: string): LoginUserResult => ({ success: false, role: 'cliente', redirectPath: '/', error });
const AuthContext = createContext<AuthContextType>({
  user: null, session: null, isLoading: true, isConfigured: false, role: 'cliente', actualRole: 'cliente', isAdmin: false,
  switchRole: async () => {}, getRedirectPath: () => '/cliente', loginUser: async () => rejected('Inicia sesión.'), loginStaff: async () => rejected('Inicia sesión.'), logoutStaff: async () => {}, signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const isConfigured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isConfigured);
  const [actualRole, setActualRole] = useState<UserRole>('cliente');
  const [role, setRoleState] = useState<UserRole>('cliente');
  const authVersion = useRef(0);
  const signingIn = useRef(false);
  const authIdentity = useRef<{ id: string; role: UserRole } | null>(null);

  const readServerRole = async (id: string): Promise<UserRole | null> => {
    const { data, error } = await supabase.from('profiles').select('role').eq('id', id).maybeSingle();
    return !error && data?.role && Object.prototype.hasOwnProperty.call(ROLES_CONFIG, data.role) ? data.role as UserRole : null;
  };

  const clearAuth = () => {
    authIdentity.current = null;
    setUser(null); setSession(null); setActualRole('cliente'); setRoleState('cliente'); setActiveStaffSession(null);
    try {
      for (const key of ['trankilandia_auth_user', 'trankilandia_active_role', 'trankilandia_members_v6', 'trankilandia_staff_profiles_v4']) localStorage.removeItem(key);
    } catch { /* Browser storage is optional. */ }
  };

  const applySession = async (candidate: Session | null): Promise<UserRole | null> => {
    const version = ++authVersion.current;
    if (!candidate?.access_token) { clearAuth(); return null; }
    const { data, error } = await supabase.auth.getUser();
    if (version !== authVersion.current) return null;
    if (error || !data.user || data.user.id !== candidate.user.id) { clearAuth(); return null; }
    const serverRole = await readServerRole(data.user.id);
    if (version !== authVersion.current) return null;
    if (!serverRole) { clearAuth(); return null; }
    if (authIdentity.current && (authIdentity.current.id !== data.user.id || authIdentity.current.role !== serverRole)) {
      setActiveStaffSession(null);
      try { localStorage.removeItem('trankilandia_staff_profiles_v4'); localStorage.removeItem('trankilandia_members_v6'); } catch { /* Optional storage. */ }
    }
    authIdentity.current = { id: data.user.id, role: serverRole };
    setUser(data.user); setSession({ ...candidate, user: data.user }); setActualRole(serverRole); setRoleState(serverRole);
    return serverRole;
  };

  useEffect(() => {
    try { localStorage.removeItem('trankilandia_auth_user'); localStorage.removeItem('trankilandia_active_role'); } catch { /* Optional storage. */ }
    if (!isConfigured) { clearAuth(); setIsLoading(false); return; }
    let mounted = true;
    const restore = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (mounted) await applySession(error ? null : data.session);
      } catch { if (mounted) clearAuth(); }
      finally { if (mounted) setIsLoading(false); }
    };
    void restore();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Do not await Auth methods from inside Supabase's auth event lock.
      if (!nextSession) { ++authVersion.current; clearAuth(); setIsLoading(false); return; }
      if (signingIn.current) return;
      if (authIdentity.current?.id !== nextSession.user.id) setIsLoading(true);
      void Promise.resolve().then(async () => {
        if (!mounted) return;
        try { await applySession(nextSession); } catch { clearAuth(); }
        finally { if (mounted) setIsLoading(false); }
      });
    });
    return () => { mounted = false; ++authVersion.current; subscription.unsubscribe(); };
  }, [isConfigured]);

  const loginUser = async (identifier: string, _name?: string, password?: string): Promise<LoginUserResult> => {
    const value = identifier.trim();
    const email = /^\d{8}$/.test(value) ? `${value}@socio.trankilandia.pe` : value.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return rejected('Ingresa un DNI de 8 dígitos o un correo válido.');
    if (!password) return rejected('Ingresa tu contraseña.');
    if (!isConfigured) return rejected('El servicio de autenticación no está configurado.');
    setIsLoading(true);
    signingIn.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session || !data.user) return rejected('No se pudo iniciar sesión. Revisa tu usuario y contraseña.');
      const serverRole = await applySession(data.session);
      if (!serverRole) return rejected('No se pudo verificar tu perfil y permisos en el servidor.');
      return { success: true, role: serverRole, redirectPath: getRoleRedirectPath(serverRole) };
    } catch { return rejected('No se pudo conectar con el servicio de autenticación.'); }
    finally { signingIn.current = false; setIsLoading(false); }
  };

  const loginStaff = async (staff: StaffUser): Promise<LoginUserResult> => {
    if (!session || !user || !isVerifiedStaffSession(staff, user.id)) return rejected('Inicia sesión y verifica tu PIN con el servidor.');
    const serverRole = await applySession(session);
    const staffRole = staff.rol === 'admin' ? 'admin' : 'caja';
    if (serverRole !== staffRole) return rejected('El rol del perfil no coincide con los permisos de esta cuenta. Solicita la revisión a gerencia.');
    setActiveStaffSession(staff);
    return { success: true, role: serverRole, redirectPath: getRoleRedirectPath(serverRole) };
  };
  const switchRole = async (newRole: UserRole) => {
    if (!session || !user || !Object.prototype.hasOwnProperty.call(ROLES_CONFIG, newRole)) return;
    const serverRole = await applySession(session);
    if (serverRole === 'admin') setRoleState(newRole);
  };
  const handleSignOut = async () => {
    ++authVersion.current; clearAuth();
    if (isConfigured) await supabaseSignOut();
  };
  return <AuthContext.Provider value={{ user, session, isLoading, isConfigured, role, actualRole, isAdmin: !!session && actualRole === 'admin', switchRole, getRedirectPath: () => getRoleRedirectPath(role), loginUser, loginStaff, logoutStaff: handleSignOut, signOut: handleSignOut }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
