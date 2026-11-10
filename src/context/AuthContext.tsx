import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, signOut as supabaseSignOut } from '../lib/supabase';
import { UserRole, ROLES_CONFIG, getRoleRedirectPath } from '../types/roles';
import { extraerDniPeru } from '../lib/dniParser';
import { getStoredMembers, GymMember } from '../data/gymStore';
import { StaffUser, setActiveStaffSession } from '../lib/staffStore';
import { getStoredCustomPassword } from '../lib/authPasswords';

export interface LoginUserResult {
  success: boolean;
  role: UserRole;
  redirectPath: string;
  error?: string;
}

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
  loginUser: (
    identifier: string,
    name?: string,
    password?: string
  ) => Promise<LoginUserResult>;
  loginStaff: (staff: StaffUser) => { success: boolean; role: UserRole; redirectPath: string };
  logoutStaff: () => Promise<void>;
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
  loginStaff: () => ({ success: false, role: 'cliente', redirectPath: '/' }),
  logoutStaff: async () => {},
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
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUserRaw = localStorage.getItem(USER_STORAGE_KEY);
      if (storedUserRaw) {
        return JSON.parse(storedUserRaw) as User;
      }
    } catch {}
    return null;
  });

  const [session, setSession] = useState<Session | null>(null);
  const isConfigured = isSupabaseConfigured();
  const [isLoading, setIsLoading] = useState(!user && isConfigured);

  const [actualRole, setActualRole] = useState<UserRole>(() => {
    try {
      const storedUserRaw = localStorage.getItem(USER_STORAGE_KEY);
      const savedRole = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null;
      if (savedRole && ROLES_CONFIG[savedRole]) return savedRole;
      if (storedUserRaw) {
        const parsed = JSON.parse(storedUserRaw) as User;
        return resolveDefaultRole(parsed);
      }
    } catch {}
    return 'cliente';
  });

  const [role, setRoleState] = useState<UserRole>(() => {
    try {
      const storedUserRaw = localStorage.getItem(USER_STORAGE_KEY);
      const savedRole = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null;
      if (savedRole && ROLES_CONFIG[savedRole]) return savedRole;
      if (storedUserRaw) {
        const parsed = JSON.parse(storedUserRaw) as User;
        return resolveDefaultRole(parsed);
      }
    } catch {}
    return 'cliente';
  });

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
   * Inicio de sesión de socios y administradores
   * - Administradores maestros acceden directamente.
   * - Los socios DEBEN estar registrados previamente en el padrón del club (no se permite auto-creación).
   * - Su DNI es su usuario y su contraseña inicial (a menos que la hayan modificado).
   */
  const loginUser = async (
    identifier: string,
    name?: string,
    password?: string
  ): Promise<LoginUserResult> => {
    const rawInput = identifier.trim();
    const isEmail = rawInput.includes('@');
    const parsedDni = isEmail ? null : (extraerDniPeru(rawInput) || rawInput.replace(/\D/g, '').slice(0, 8));
    const cleanDni = parsedDni || '';
    const isDni = cleanDni.length === 8;
    const userEmail = isEmail ? rawInput.toLowerCase() : `${cleanDni}@socio.trankilandia.pe`;

    const isMasterAdmin = SUPER_ADMIN_EMAILS.some((admin) => admin.toLowerCase() === userEmail);

    // 1. Administrador Maestro
    if (isMasterAdmin) {
      const displayName =
        name ||
        (userEmail.includes('marisol') ? 'Marisol Flores' : 'Luis Gerardo Lloclla');

      const authUserObj = {
        id: `admin-${cleanDni || 'master'}`,
        email: userEmail,
        app_metadata: {},
        user_metadata: {
          full_name: displayName,
          dni: isDni ? cleanDni : undefined,
          role: 'admin',
        },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as unknown as User;

      setUser(authUserObj);
      setActualRole('admin');
      setRoleState('admin');
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUserObj));
        localStorage.setItem(ROLE_STORAGE_KEY, 'admin');
      } catch {}

      return { success: true, role: 'admin', redirectPath: '/admin' };
    }

    // 2. Validación de formato para clientes
    if (!isDni && !isEmail) {
      return {
        success: false,
        role: 'cliente',
        redirectPath: '',
        error: 'Por favor ingresa un número de DNI válido de 8 dígitos.',
      };
    }

    // 3. Buscar socio en caché local (padrón oficial de 417 socios)
    const stored = getStoredMembers();
    let matchedMember: GymMember | undefined = isDni
      ? stored.find((m) => m.dni && m.dni.trim() === cleanDni)
      : stored.find((m) => m.email && m.email.toLowerCase().trim() === userEmail);

    // 4. Si no se encontró en local y Supabase está configurado, consultar en tiempo real
    if (!matchedMember && isSupabaseConfigured() && isDni) {
      try {
        const { data: dbSocio } = await supabase
          .from('socios')
          .select('*')
          .eq('dni', cleanDni)
          .maybeSingle();

        if (dbSocio) {
          matchedMember = {
            id: dbSocio.id,
            dni: dbSocio.dni,
            name: dbSocio.nombre,
            phone: dbSocio.celular || '',
            email: dbSocio.email || `${cleanDni}@socio.trankilandia.pe`,
            plan: dbSocio.plan,
            planPrice: dbSocio.precio_plan,
            paymentType: dbSocio.tipo_pago,
            advancePaid: dbSocio.adelanto_pagado,
            balanceDue: dbSocio.saldo_pendiente,
            paymentDueDate: dbSocio.fecha_limite_pago,
            paymentMethod: 'efectivo',
            receiptNumber: dbSocio.numero_boleta,
            membershipStatus: dbSocio.estado_calculado === 'vencido' ? 'inactive' : 'active',
            expiresAt: dbSocio.fecha_fin,
            coachName: dbSocio.coach_asignado,
            shift: dbSocio.turno,
            registeredAt: dbSocio.fecha_inicio || new Date().toISOString().slice(0, 10),
          };
        }
      } catch {}
    }

    // REGLA ESTRICTA: Solo los socios inscritos en el sistema pueden ingresar
    if (!matchedMember) {
      return {
        success: false,
        role: 'cliente',
        redirectPath: '',
        error: `El DNI ${cleanDni || rawInput} no pertenece a ningún cliente registrado en Trankilandia Gym. No es posible crear cuentas directamente desde la web; las inscripciones se realizan en recepción.`,
      };
    }

    // 5. VALIDACIÓN DE CONTRASEÑA:
    // DNI sirve como usuario y primera contraseña. Si el socio la cambió, se valida la personalizada.
    const expectedPassword = getStoredCustomPassword(cleanDni) || cleanDni;
    if (password !== undefined && password !== null && password !== '') {
      const cleanEnteredPassword = password.trim();
      if (cleanEnteredPassword !== expectedPassword) {
        return {
          success: false,
          role: 'cliente',
          redirectPath: '',
          error: 'Contraseña incorrecta. Recuerda que si es tu primer ingreso, tu contraseña inicial es tu mismo número de DNI.',
        };
      }
    }

    const resolvedDni = matchedMember.dni || cleanDni;
    const resolvedEmail = matchedMember.email || `${resolvedDni}@socio.trankilandia.pe`;
    const displayName = matchedMember.name || name || `Socio ${resolvedDni}`;

    const authUserObj = {
      id: matchedMember.id || `socio-${resolvedDni}`,
      email: resolvedEmail,
      app_metadata: {},
      user_metadata: {
        full_name: displayName,
        dni: resolvedDni,
        personal_email: matchedMember.email,
        role: 'cliente',
      },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as unknown as User;

    // Persistir localmente
    setUser(authUserObj);
    setActualRole('cliente');
    setRoleState('cliente');
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUserObj));
      localStorage.setItem(ROLE_STORAGE_KEY, 'cliente');
    } catch {}

    return { success: true, role: 'cliente', redirectPath: '/cliente' };
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

  const loginStaff = (staff: StaffUser): { success: boolean; role: UserRole; redirectPath: string } => {
    setActiveStaffSession(staff);
    const assignedRole: UserRole = staff.rol === 'admin' ? 'admin' : 'caja';
    const email =
      staff.rol === 'admin'
        ? staff.id === 'staff-marisol'
          ? 'marisolflores@gmail.com'
          : 'luisgerardolloccllasaune@gmail.com'
        : `${staff.id}@caja.trankilandia.pe`;

    const authUserObj = {
      id: staff.id,
      email,
      app_metadata: {},
      user_metadata: {
        full_name: staff.nombre,
        role: assignedRole,
      },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as unknown as User;

    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUserObj));
      localStorage.setItem(ROLE_STORAGE_KEY, assignedRole);
    } catch {}

    setUser(authUserObj);
    setActualRole(assignedRole);
    setRoleState(assignedRole);

    return {
      success: true,
      role: assignedRole,
      redirectPath: assignedRole === 'admin' ? '/admin' : '/caja',
    };
  };

  const handleSignOut = async () => {
    setActiveStaffSession(null);
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

  const logoutStaff = async () => {
    await handleSignOut();
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
        loginStaff,
        logoutStaff,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
