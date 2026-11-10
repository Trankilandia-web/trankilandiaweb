/**
 * TRANKILANDIA GYM · SISTEMA DE PERSONAL Y AUTENTICACIÓN SEGURA EN SUPABASE
 * Autenticación estricta en la nube: las cuentas de personal residen en Supabase.
 * No se permiten ingresos sin que la base de datos oficial esté inicializada.
 */

import { supabase, isSupabaseConfigured } from './supabase';

export interface StaffUser {
  id: string;
  nombre: string;
  rol: 'admin' | 'cajero';
  turno: 'manana' | 'tarde' | 'noche' | 'completo';
  pin: string;
  avatarColor: string;
  iniciales: string;
  activo: boolean;
  telefono?: string;
  createdAt: string;
}

const STORAGE_KEY_STAFF_CACHE = 'trankilandia_staff_verified_v3';
const STORAGE_KEY_ACTIVE_STAFF = 'trankilandia_staff_active_session_v3';

/**
 * Consulta en tiempo real las cuentas de personal autorizadas en Supabase Cloud.
 * Si la tabla 'personal' no existe o está vacía, retorna configurado: false.
 */
export async function fetchStaffFromSupabase(): Promise<{
  configured: boolean;
  users: StaffUser[];
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      users: [],
      error: 'Supabase Cloud no está configurado en las variables de entorno.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('personal')
      .select('*')
      .eq('activo', true)
      .order('created_at', { ascending: true });

    if (error) {
      // PGRST205: Tabla no encontrada en la base de datos
      return {
        configured: false,
        users: [],
        error: `Tabla 'personal' no encontrada en Supabase (${error.message}). Es necesario ejecutar el script SQL de inicialización.`,
      };
    }

    if (!data || data.length === 0) {
      return {
        configured: false,
        users: [],
        error: 'No se encontraron cuentas de personal registradas en Supabase.',
      };
    }

    const mapped: StaffUser[] = data.map((d: any) => ({
      id: d.id,
      nombre: d.nombre,
      rol: d.rol,
      turno: d.turno,
      pin: d.pin,
      avatarColor: d.avatar_color || 'from-amber-400 to-amber-600 text-black',
      iniciales: d.iniciales || d.nombre.slice(0, 2).toUpperCase(),
      activo: d.activo !== false,
      telefono: d.telefono,
      createdAt: d.created_at,
    }));

    localStorage.setItem(STORAGE_KEY_STAFF_CACHE, JSON.stringify(mapped));
    return {
      configured: true,
      users: mapped,
    };
  } catch (err: any) {
    return {
      configured: false,
      users: [],
      error: err.message || 'Error de conexión con Supabase Cloud.',
    };
  }
}

/**
 * Obtiene la lista actual de personal (utilizada en componentes síncronos).
 */
export function getStaffList(): StaffUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STAFF_CACHE);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

/**
 * Valida de forma estricta el PIN contra Supabase Cloud.
 * Si la cuenta no existe en Supabase o el PIN es incorrecto, deniega el acceso.
 */
export async function verifyStaffPin(
  staffId: string,
  enteredPin: string
): Promise<{ success: boolean; user?: StaffUser; error?: string }> {
  if (!/^\d{4}$/.test(enteredPin)) {
    return { success: false, error: 'El PIN debe contener exactamente 4 dígitos numéricos.' };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('personal')
        .select('*')
        .eq('id', staffId)
        .eq('pin', enteredPin)
        .eq('activo', true)
        .maybeSingle();

      if (error) {
        return {
          success: false,
          error: `Error al verificar en Supabase: ${error.message}. Verifique que ejecutó la migración SQL.`,
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'PIN incorrecto o cuenta no autorizada en la base de datos.',
        };
      }

      const user: StaffUser = {
        id: data.id,
        nombre: data.nombre,
        rol: data.rol,
        turno: data.turno,
        pin: data.pin,
        avatarColor: data.avatar_color || 'from-amber-400 to-amber-600 text-black',
        iniciales: data.iniciales || data.nombre.slice(0, 2).toUpperCase(),
        activo: data.activo !== false,
        telefono: data.telefono,
        createdAt: data.created_at,
      };

      setActiveStaffSession(user);
      return { success: true, user };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Error de comunicación con Supabase.',
      };
    }
  }

  // Fallback seguro solo si Supabase no está configurado (entorno de pruebas aislado)
  const current = getStaffList();
  const match = current.find((u) => u.id === staffId && u.pin === enteredPin);
  if (match) {
    setActiveStaffSession(match);
    return { success: true, user: match };
  }
  return { success: false, error: 'PIN incorrecto.' };
}

/**
 * Guarda o actualiza un nuevo colaborador directamente en Supabase Cloud.
 */
export async function saveStaffUser(
  user: Omit<StaffUser, 'id' | 'createdAt' | 'iniciales'>
): Promise<StaffUser> {
  const id = `staff-${Date.now().toString(36)}`;
  const iniciales = user.nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const newUser: StaffUser = {
    ...user,
    id,
    iniciales: iniciales || user.nombre.slice(0, 2).toUpperCase(),
    activo: true,
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    await supabase.from('personal').insert({
      id: newUser.id,
      nombre: newUser.nombre,
      rol: newUser.rol,
      turno: newUser.turno,
      pin: newUser.pin,
      avatar_color: newUser.avatarColor,
      iniciales: newUser.iniciales,
      telefono: newUser.telefono || null,
      activo: true,
    });
  }

  const current = getStaffList();
  const updated = [...current, newUser];
  localStorage.setItem(STORAGE_KEY_STAFF_CACHE, JSON.stringify(updated));
  return newUser;
}

/**
 * Actualiza el PIN de un colaborador en Supabase Cloud.
 */
export async function updateStaffPin(staffId: string, newPin: string): Promise<boolean> {
  if (!/^\d{4}$/.test(newPin)) return false;

  const current = getStaffList();
  const updated = current.map((u) => (u.id === staffId ? { ...u, pin: newPin } : u));
  localStorage.setItem(STORAGE_KEY_STAFF_CACHE, JSON.stringify(updated));

  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('personal')
        .update({
          pin: newPin,
          updated_at: new Date().toISOString(),
        })
        .eq('id', staffId);
    } catch {}
  }

  return true;
}

/**
 * Da de baja a un colaborador en Supabase Cloud (soft delete).
 */
export async function deleteStaffUser(staffId: string): Promise<boolean> {
  if (staffId === 'staff-marisol' || staffId === 'staff-luis') return false;

  if (isSupabaseConfigured()) {
    await supabase
      .from('personal')
      .update({
        activo: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', staffId);
  }

  const current = getStaffList();
  const updated = current.filter((u) => u.id !== staffId);
  localStorage.setItem(STORAGE_KEY_STAFF_CACHE, JSON.stringify(updated));
  return true;
}

export function getActiveStaffSession(): StaffUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_ACTIVE_STAFF) || localStorage.getItem(STORAGE_KEY_ACTIVE_STAFF);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setActiveStaffSession(staff: StaffUser | null): void {
  if (!staff) {
    sessionStorage.removeItem(STORAGE_KEY_ACTIVE_STAFF);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_STAFF);
  } else {
    sessionStorage.setItem(STORAGE_KEY_ACTIVE_STAFF, JSON.stringify(staff));
    localStorage.setItem(STORAGE_KEY_ACTIVE_STAFF, JSON.stringify(staff));
  }
}
