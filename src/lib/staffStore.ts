/**
 * TRANKILANDIA GYM · SISTEMA DE PERSONAL Y GESTIÓN DE TURNOS (PIN RÁPIDO)
 * Almacena los perfiles de trabajadores y administradores sincronizados con Supabase
 * y con persistencia Local-First para alta disponibilidad en mostrador.
 */

import { supabase, isSupabaseConfigured } from './supabase';

export interface StaffUser {
  id: string;
  nombre: string;
  rol: 'admin' | 'cajero';
  turno: 'manana' | 'tarde' | 'noche' | 'completo';
  pin: string; // 4 dígitos numéricos
  avatarColor: string;
  iniciales: string;
  activo: boolean;
  telefono?: string;
  createdAt: string;
}

const STORAGE_KEY_STAFF = 'trankilandia_staff_users_v2';
const STORAGE_KEY_ACTIVE_STAFF = 'trankilandia_staff_active_session_v2';

// Personal predeterminado oficial
export const DEFAULT_STAFF: StaffUser[] = [
  {
    id: 'staff-marisol',
    nombre: 'Marisol',
    rol: 'admin',
    turno: 'completo',
    pin: '1234',
    avatarColor: 'from-amber-400 to-amber-600 text-black',
    iniciales: 'M',
    activo: true,
    telefono: '999787489',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'staff-luis',
    nombre: 'Luis Lloclla',
    rol: 'admin',
    turno: 'completo',
    pin: '2026',
    avatarColor: 'from-purple-500 to-indigo-600 text-white',
    iniciales: 'LL',
    activo: true,
    telefono: '958183360',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'staff-recepcion-m',
    nombre: 'Recepción Mañana',
    rol: 'cajero',
    turno: 'manana',
    pin: '1111',
    avatarColor: 'from-emerald-400 to-teal-600 text-black',
    iniciales: 'RM',
    activo: true,
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'staff-recepcion-t',
    nombre: 'Recepción Tarde',
    rol: 'cajero',
    turno: 'tarde',
    pin: '2222',
    avatarColor: 'from-blue-400 to-indigo-600 text-white',
    iniciales: 'RT',
    activo: true,
    createdAt: '2026-11-01T00:00:00Z',
  },
];

export function getStaffList(): StaffUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STAFF);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(DEFAULT_STAFF));
      syncStaffWithSupabase();
      return DEFAULT_STAFF;
    }
    const list: StaffUser[] = JSON.parse(raw);
    syncStaffWithSupabase();
    return list.filter((u) => u.activo !== false);
  } catch {
    return DEFAULT_STAFF;
  }
}

/**
 * Sincroniza la lista de personal en segundo plano con Supabase Cloud
 */
export async function syncStaffWithSupabase(): Promise<StaffUser[]> {
  if (!isSupabaseConfigured()) return getStaffList();

  try {
    const { data, error } = await supabase
      .from('personal')
      .select('*')
      .eq('activo', true)
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
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

      localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(mapped));
      return mapped;
    }
  } catch {}

  return getStaffList();
}

export function saveStaffUser(user: Omit<StaffUser, 'id' | 'createdAt' | 'iniciales'>): StaffUser {
  const current = getStaffList();
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

  const updated = [...current, newUser];
  localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(updated));

  // Persistir en Supabase
  if (isSupabaseConfigured()) {
    supabase
      .from('personal')
      .insert({
        id: newUser.id,
        nombre: newUser.nombre,
        rol: newUser.rol,
        turno: newUser.turno,
        pin: newUser.pin,
        avatar_color: newUser.avatarColor,
        iniciales: newUser.iniciales,
        telefono: newUser.telefono,
        activo: true,
      })
      .then(() => {});
  }

  return newUser;
}

export function updateStaffPin(staffId: string, newPin: string): boolean {
  if (!/^\d{4}$/.test(newPin)) return false;
  const current = getStaffList();
  const updated = current.map((u) => (u.id === staffId ? { ...u, pin: newPin } : u));
  localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(updated));

  // Actualizar en Supabase
  if (isSupabaseConfigured()) {
    supabase
      .from('personal')
      .update({
        pin: newPin,
        updated_at: new Date().toISOString(),
      })
      .eq('id', staffId)
      .then(() => {});
  }

  return true;
}

export function deleteStaffUser(staffId: string): boolean {
  const current = getStaffList();
  if (staffId === 'staff-marisol' || staffId === 'staff-luis') return false;
  const updated = current.filter((u) => u.id !== staffId);
  localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(updated));

  if (isSupabaseConfigured()) {
    supabase
      .from('personal')
      .update({
        activo: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', staffId)
      .then(() => {});
  }

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

export function verifyStaffPin(staffId: string, enteredPin: string): { success: boolean; user?: StaffUser; error?: string } {
  const list = getStaffList();
  const user = list.find((u) => u.id === staffId);
  if (!user) {
    return { success: false, error: 'Usuario no encontrado.' };
  }
  if (user.pin !== enteredPin) {
    return { success: false, error: 'PIN incorrecto. Intenta nuevamente.' };
  }
  setActiveStaffSession(user);
  return { success: true, user };
}
