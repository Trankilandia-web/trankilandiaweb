import { supabase, isSupabaseConfigured } from './supabase';

export interface StaffUser {
  id: string;
  nombre: string;
  rol: 'admin' | 'cajero';
  turno: 'manana' | 'tarde' | 'noche' | 'completo';
  /** @deprecated Input compatibility only. Never returned or cached. */
  pin?: string;
  avatarColor: string;
  iniciales: string;
  activo: boolean;
  telefono?: string;
  createdAt: string;
}
const CACHE_KEY = 'trankilandia_staff_profiles_v4';
let activeStaff: StaffUser | null = null;
let verifiedStaff: { profile: StaffUser; authUserId: string } | null = null;

function publicProfile(row: Record<string, any>): StaffUser {
  return {
    id: row.id, nombre: row.nombre, rol: row.rol, turno: row.turno,
    avatarColor: row.avatarColor || row.avatar_color || 'from-amber-400 to-amber-600 text-black',
    iniciales: row.iniciales || row.nombre?.slice(0, 2).toUpperCase() || '',
    activo: row.activo === true, telefono: row.telefono,
    createdAt: row.createdAt || row.created_at || '',
  };
}
export function clearLegacyStaffCache(): void {
  for (const key of ['trankilandia_staff_verified_v3', 'trankilandia_staff_active_session_v3', 'trankilandia_staff_profiles_v3', 'trankilandia_staff_active_session_v4']) {
    try { localStorage.removeItem(key); sessionStorage.removeItem(key); } catch { /* Optional storage. */ }
  }
}
clearLegacyStaffCache();
// Older v4 builds also cached cleartext PINs; discard that cache once on load.
try { localStorage.removeItem(CACHE_KEY); } catch { /* Optional storage. */ }

export async function fetchStaffFromSupabase(): Promise<{ configured: boolean; users: StaffUser[]; error?: string }> {
  if (!isSupabaseConfigured()) return { configured: false, users: [], error: 'El servicio de autenticación no está configurado.' };
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { configured: false, users: [], error: 'Inicia sesión con tu correo y contraseña de personal antes de seleccionar tu perfil.' };
    const { data, error } = await supabase.from('personal')
      .select('id, nombre, rol, turno, avatar_color, iniciales, telefono, activo, created_at')
      .eq('activo', true).order('created_at', { ascending: true });
    if (error) return { configured: false, users: [], error: 'No se pudo consultar el personal autorizado. Revisa la conexión y la configuración del servidor.' };
    const users = (data || []).map(publicProfile);
    clearLegacyStaffCache();
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(users)); } catch { /* Display cache is optional. */ }
    return { configured: true, users, error: users.length ? undefined : 'Tu cuenta aún no tiene un perfil de personal vinculado. Solicita la vinculación a gerencia.' };
  } catch {
    return { configured: false, users: [], error: 'No se pudo conectar con el servidor.' };
  }
}

/** Display cache only; it never grants permissions. */
export function getStaffList(): StaffUser[] {
  clearLegacyStaffCache();
  try {
    const rows = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
    if (!Array.isArray(rows)) return [];
    const users = rows.filter((row) => row && typeof row.id === 'string' && typeof row.nombre === 'string').map(publicProfile);
    localStorage.setItem(CACHE_KEY, JSON.stringify(users));
    return users;
  } catch { return []; }
}

export function isVerifiedStaffSession(staff: StaffUser, authUserId: string): boolean {
  return !!verifiedStaff && verifiedStaff.authUserId === authUserId && verifiedStaff.profile.id === staff.id && verifiedStaff.profile.rol === staff.rol;
}

export async function verifyStaffPin(staffId: string, enteredPin: string): Promise<{
  success: boolean; user?: StaffUser; error?: string; locked?: boolean; remainingAttempts?: number;
}> {
  if (!/^\d{4}$/.test(enteredPin)) return { success: false, error: 'El PIN debe contener exactamente 4 dígitos numéricos.' };
  if (!isSupabaseConfigured()) return { success: false, error: 'El servicio de autenticación no está configurado.' };
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return { success: false, error: 'Inicia sesión con tu correo y contraseña de personal.' };
    const { data, error } = await supabase.rpc('verificar_pin_personal', { p_id: staffId, p_pin: enteredPin });
    if (error || !data) return { success: false, error: 'No se pudo verificar el PIN en el servidor. Reintenta cuando haya conexión.' };
    if (!data.success) return { success: false, locked: data.locked === true, remainingAttempts: data.intentos_restantes, error: data.error || 'PIN incorrecto o perfil no autorizado.' };
    if (data.auth_user_id !== authData.user.id || data.user?.id !== staffId || data.user?.activo !== true || !['admin', 'cajero'].includes(data.user?.rol)) {
      return { success: false, error: 'El perfil no está vinculado a esta sesión. Inicia sesión con la cuenta de la persona que está en turno.' };
    }
    const user = publicProfile(data.user);
    verifiedStaff = { profile: { ...user }, authUserId: authData.user.id };
    setActiveStaffSession(user);
    return { success: true, user };
  } catch { return { success: false, error: 'No se pudo verificar el PIN. Revisa tu conexión.' }; }
}

export async function verifyAnyAdminPin(enteredPin: string): Promise<{ authorized: boolean; admin?: StaffUser; error?: string }> {
  const result = await fetchStaffFromSupabase();
  for (const staff of result.users.filter((user) => user.rol === 'admin')) {
    const check = await verifyStaffPin(staff.id, enteredPin);
    if (check.success && check.user?.rol === 'admin') return { authorized: true, admin: check.user };
  }
  return { authorized: false, error: 'Se requiere sesión y PIN de un administrador autorizado.' };
}

export async function saveStaffUser(
  user: Omit<StaffUser, 'id' | 'createdAt' | 'iniciales'> & { pin: string },
  adminAuth?: { adminId?: string; adminPin?: string }
): Promise<{ success: boolean; user?: StaffUser; error?: string }> {
  if (!/^\d{4}$/.test(user.pin)) return { success: false, error: 'El PIN debe contener exactamente 4 dígitos numéricos.' };
  if (!adminAuth?.adminPin) return { success: false, error: 'Se requiere autorización de administrador para registrar colaboradores.' };
  const check = await verifyAnyAdminPin(adminAuth.adminPin);
  if (!check.authorized || !check.admin) return { success: false, error: check.error };
  try {
    const { data, error } = await supabase.rpc('crear_personal_seguro', {
      p_admin_id: check.admin.id, p_admin_pin: adminAuth.adminPin,
      p_id: `staff-${crypto.randomUUID()}`, p_nombre: user.nombre.trim(), p_rol: user.rol,
      p_turno: user.turno, p_pin: user.pin, p_avatar_color: user.avatarColor, p_telefono: user.telefono || null,
    });
    if (error || !data?.success || !data.user) return { success: false, error: data?.error || 'El servidor rechazó el registro.' };
    await fetchStaffFromSupabase();
    return { success: true, user: publicProfile(data.user) };
  } catch { return { success: false, error: 'No se pudo registrar el colaborador.' }; }
}

export async function updateStaffPin(staffId: string, newPin: string, adminAuth?: { adminId?: string; adminPin?: string }): Promise<{ success: boolean; error?: string }> {
  if (!/^\d{4}$/.test(newPin)) return { success: false, error: 'El PIN debe contener exactamente 4 dígitos numéricos.' };
  if (!adminAuth?.adminPin) return { success: false, error: 'Se requiere autorización de administrador para actualizar el PIN.' };
  const check = await verifyAnyAdminPin(adminAuth.adminPin);
  if (!check.authorized || !check.admin) return { success: false, error: check.error };
  try {
    const { data, error } = await supabase.rpc('actualizar_pin_personal', { p_admin_id: check.admin.id, p_admin_pin: adminAuth.adminPin, p_target_id: staffId, p_nuevo_pin: newPin });
    return error || !data?.success ? { success: false, error: data?.error || 'El servidor rechazó el cambio de PIN.' } : { success: true };
  } catch { return { success: false, error: 'No se pudo actualizar el PIN.' }; }
}

export async function deleteStaffUser(staffId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { data, error } = await supabase.rpc('desactivar_personal_seguro', { p_id: staffId });
    if (error || !data?.success) return false;
    if (activeStaff?.id === staffId) setActiveStaffSession(null);
    await fetchStaffFromSupabase();
    return true;
  } catch { return false; }
}

export function getActiveStaffSession(): StaffUser | null {
  return activeStaff ? { ...activeStaff } : null;
}
export function setActiveStaffSession(staff: StaffUser | null): void {
  clearLegacyStaffCache();
  if (!staff) { activeStaff = null; verifiedStaff = null; return; }
  if (verifiedStaff?.profile.id === staff.id && verifiedStaff.profile.rol === staff.rol) activeStaff = publicProfile(staff);
}
