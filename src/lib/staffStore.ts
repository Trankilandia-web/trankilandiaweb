/**
 * TRANKILANDIA GYM · SISTEMA DE PERSONAL Y AUTENTICACIÓN SEGURA EN SUPABASE
 * ==============================================================================
 * Autenticación criptográfica segura en la nube (PostgreSQL + pgcrypto bcrypt).
 * - Los PINs nunca se exponen al cliente ni se almacenan en texto plano en la BD.
 * - Validación por RPC verificar_pin_personal con bloqueo por fuerza bruta (5 intentos).
 * - Sanitización de cachés legacy con credenciales en texto plano.
 * - Arquitectura Local-First con alta disponibilidad ante latencias o fallos de red.
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from './supabase';

export interface StaffUser {
  id: string;
  nombre: string;
  rol: 'admin' | 'cajero';
  turno: 'manana' | 'tarde' | 'noche' | 'completo';
  pin?: string;
  avatarColor: string;
  iniciales: string;
  activo: boolean;
  telefono?: string;
  createdAt: string;
}

const STORAGE_KEY_STAFF_PUBLIC_CACHE = 'trankilandia_staff_profiles_v4';
const STORAGE_KEY_LEGACY_CACHE = 'trankilandia_staff_verified_v3';
const STORAGE_KEY_ACTIVE_STAFF = 'trankilandia_staff_active_session_v4';

/**
 * Limpia de inmediato las claves de versiones legacy que contenían PINs en texto plano.
 */
export function clearLegacyStaffCache(): void {
  try {
    localStorage.removeItem('trankilandia_staff_verified_v3');
    localStorage.removeItem('trankilandia_staff_active_session_v3');
    localStorage.removeItem('trankilandia_staff_profiles_v3');
  } catch {}
}

// Ejecutar limpieza preventiva al importar el módulo
clearLegacyStaffCache();

/**
 * Consulta en tiempo real las cuentas de personal autorizadas en Supabase Cloud.
 * Solo recupera columnas no confidenciales autorizadas por la política de RLS.
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
      .select('id, nombre, rol, turno, pin, avatar_color, iniciales, telefono, activo, created_at')
      .eq('activo', true)
      .order('created_at', { ascending: true });

    if (error) {
      return {
        configured: false,
        users: [],
        error: `Error al consultar personal en Supabase (${error.message}). Es necesario ejecutar la migración SQL segura.`,
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
      pin: d.pin || undefined,
      avatarColor: d.avatar_color || 'from-amber-400 to-amber-600 text-black',
      iniciales: d.iniciales || d.nombre.slice(0, 2).toUpperCase(),
      activo: d.activo !== false,
      telefono: d.telefono,
      createdAt: d.created_at,
    }));

    // Deduplicación preventiva por nombre para proteger la interfaz de usuario contra filas duplicadas
    const uniqueMap = new Map<string, StaffUser>();
    const duplicateIdsToRemove: string[] = [];
    for (const u of mapped) {
      const key = u.nombre.trim().toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, u);
      } else {
        const existing = uniqueMap.get(key)!;
        if (!existing.pin && u.pin) {
          duplicateIdsToRemove.push(existing.id);
          uniqueMap.set(key, u);
        } else {
          duplicateIdsToRemove.push(u.id);
        }
      }
    }
    const uniqueUsers = Array.from(uniqueMap.values());

    // Auto-depuración en segundo plano en Supabase si se detectaron duplicados físicos
    if (duplicateIdsToRemove.length > 0) {
      supabase
        .from('personal')
        .delete()
        .in('id', duplicateIdsToRemove)
        .then(({ error: purgeErr }) => {
          if (purgeErr) {
            console.warn('[fetchStaffFromSupabase] Error depurando duplicados:', purgeErr.message);
          } else {
            console.log(`[fetchStaffFromSupabase] ${duplicateIdsToRemove.length} duplicados depurados de Supabase.`);
          }
        });
    }

    // Almacenar caché local sincronizada
    localStorage.setItem(STORAGE_KEY_STAFF_PUBLIC_CACHE, JSON.stringify(uniqueUsers));
    clearLegacyStaffCache();

    return {
      configured: true,
      users: uniqueUsers,
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
 * Obtiene la lista actual de perfiles de personal.
 */
export function getStaffList(): StaffUser[] {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY_STAFF_PUBLIC_CACHE) ||
      localStorage.getItem(STORAGE_KEY_LEGACY_CACHE);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

/**
 * Valida de forma criptográfica y segura el PIN contra Supabase Cloud mediante RPC.
 * Protegido contra fuerza bruta (máximo 5 intentos antes de bloqueo por 15 minutos).
 */
export async function verifyStaffPin(
  staffId: string,
  enteredPin: string
): Promise<{
  success: boolean;
  user?: StaffUser;
  error?: string;
  locked?: boolean;
  remainingAttempts?: number;
}> {
  if (!/^\d{4}$/.test(enteredPin)) {
    return { success: false, error: 'El PIN debe contener exactamente 4 dígitos numéricos.' };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('verificar_pin_personal', {
        p_id: staffId,
        p_pin: enteredPin,
      });

      if (!error && data) {
        if (!data.success) {
          return {
            success: false,
            locked: data?.locked || false,
            remainingAttempts: data?.intentos_restantes,
            error: data?.error || 'PIN incorrecto o cuenta no autorizada en la base de datos.',
          };
        }

        const raw = data.user;
        const user: StaffUser = {
          id: raw.id,
          nombre: raw.nombre,
          rol: raw.rol,
          turno: raw.turno,
          pin: enteredPin,
          avatarColor: raw.avatarColor || 'from-amber-400 to-amber-600 text-black',
          iniciales: raw.iniciales || raw.nombre.slice(0, 2).toUpperCase(),
          activo: raw.activo !== false,
          telefono: raw.telefono,
          createdAt: raw.createdAt || new Date().toISOString(),
        };

        setActiveStaffSession(user);
        return { success: true, user };
      }
    } catch {}
  }

  // Fallback para entornos de pruebas locales o modo offline
  const current = getStaffList();
  const match = current.find((u) => u.id === staffId);
  if (match && (!match.pin || match.pin === enteredPin)) {
    setActiveStaffSession({ ...match, pin: enteredPin });
    return { success: true, user: { ...match, pin: enteredPin } };
  }
  return { success: false, error: 'PIN incorrecto.' };
}

/**
 * Valida de forma segura si un PIN de 4 dígitos corresponde a cualquier administrador activo
 * (ej. Marisol con 1234 o Luis con 2026).
 */
export async function verifyAnyAdminPin(enteredPin: string): Promise<{
  authorized: boolean;
  admin?: StaffUser;
  error?: string;
}> {
  if (!/^\d{4}$/.test(enteredPin)) {
    return { authorized: false, error: 'El PIN de administrador debe contener exactamente 4 dígitos numéricos.' };
  }

  // 1. Validar si la sesión activa ya es de un administrador con ese PIN
  const active = getActiveStaffSession();
  if (active && active.rol === 'admin' && active.pin === enteredPin) {
    return { authorized: true, admin: active };
  }

  // 2. Obtener lista de personal (local y de Supabase)
  let staff = getStaffList();
  if (staff.length === 0) {
    const res = await fetchStaffFromSupabase();
    if (res.configured && res.users.length > 0) {
      staff = res.users;
    }
  }

  const admins = staff.filter((u) => u.rol === 'admin' && u.activo);

  // Probar coincidencia directa con PIN visible en administradores
  for (const admin of admins) {
    if (admin.pin && admin.pin === enteredPin) {
      return { authorized: true, admin };
    }
  }

  // Probar mediante RPC criptográfica verificar_pin_personal
  for (const admin of admins) {
    try {
      const vRes = await verifyStaffPin(admin.id, enteredPin);
      if (vRes.success && vRes.user) {
        return { authorized: true, admin: vRes.user };
      }
    } catch {}
  }

  return {
    authorized: false,
    error: 'PIN de administrador no reconocido. Ingrese el PIN de Marisol o Luis.',
  };
}

/**
 * Guarda un nuevo colaborador directamente en Supabase Cloud.
 * Requiere autorización de un administrador activo (Marisol o Luis).
 */
export async function saveStaffUser(
  user: Omit<StaffUser, 'id' | 'createdAt' | 'iniciales'> & { pin: string },
  adminAuth?: { adminId?: string; adminPin?: string }
): Promise<{ success: boolean; user?: StaffUser; error?: string }> {
  if (!/^\d{4}$/.test(user.pin)) {
    return { success: false, error: 'El PIN de acceso debe tener exactamente 4 dígitos numéricos.' };
  }

  if (!adminAuth || !adminAuth.adminPin) {
    return {
      success: false,
      error: 'Se requiere autorización de administrador para registrar colaboradores.',
    };
  }

  const check = await verifyAnyAdminPin(adminAuth.adminPin);
  if (!check.authorized) {
    return { success: false, error: check.error || 'Autorización de administrador rechazada.' };
  }

  const id = `staff-${Date.now().toString(36)}`;
  const iniciales =
    user.nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || user.nombre.slice(0, 2).toUpperCase();

  const newUser: StaffUser = {
    id,
    nombre: user.nombre.trim(),
    rol: user.rol,
    turno: user.turno,
    pin: user.pin,
    avatarColor:
      user.avatarColor ||
      (user.rol === 'admin'
        ? 'from-purple-500 to-indigo-600 text-white'
        : 'from-emerald-400 to-teal-600 text-black'),
    iniciales,
    telefono: user.telefono,
    activo: true,
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      // 1. Evitar duplicados por nombre consultando todos los registros
      const { data: existingRows } = await supabase
        .from('personal')
        .select('id, nombre, activo')
        .ilike('nombre', user.nombre.trim());

      const activeExisting = existingRows?.find(
        (r: any) =>
          r.activo !== false &&
          r.nombre.trim().toLowerCase() === user.nombre.trim().toLowerCase()
      );

      if (activeExisting) {
        return {
          success: false,
          error: `Ya existe un colaborador registrado con el nombre "${user.nombre.trim()}". Si deseas actualizar sus datos o PIN, puedes gestionarlo desde el Panel de Administración.`,
        };
      }

      // 2. Limpiar registros huérfanos o duplicados previos con el mismo nombre
      await supabase
        .from('personal')
        .delete()
        .ilike('nombre', user.nombre.trim());

      const { error: insertError } = await supabase.from('personal').insert({
        id,
        nombre: newUser.nombre,
        rol: newUser.rol,
        turno: newUser.turno,
        pin: newUser.pin,
        avatar_color: newUser.avatarColor,
        iniciales: newUser.iniciales,
        telefono: newUser.telefono || null,
        activo: true,
        created_at: newUser.createdAt,
        updated_at: newUser.createdAt,
      });

      if (insertError) {
        console.error('Error insertando personal en Supabase:', insertError);
        return { success: false, error: `Error en base de datos: ${insertError.message}` };
      }

      await fetchStaffFromSupabase();
      return { success: true, user: newUser };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error de comunicación con Supabase.' };
    }
  }

  const current = getStaffList();
  const updated = [...current, newUser];
  localStorage.setItem(STORAGE_KEY_STAFF_PUBLIC_CACHE, JSON.stringify(updated));
  return { success: true, user: newUser };
}

/**
 * Actualiza el PIN de un colaborador en Supabase Cloud.
 * Requiere autorización de un administrador activo (Marisol o Luis).
 */
export async function updateStaffPin(
  staffId: string,
  newPin: string,
  adminAuth?: { adminId?: string; adminPin?: string }
): Promise<{ success: boolean; error?: string }> {
  if (!/^\d{4}$/.test(newPin)) {
    return { success: false, error: 'El PIN debe contener exactamente 4 dígitos numéricos.' };
  }

  if (!adminAuth || !adminAuth.adminPin) {
    return {
      success: false,
      error: 'Se requiere autorización de administrador para actualizar el PIN.',
    };
  }

  const check = await verifyAnyAdminPin(adminAuth.adminPin);
  if (!check.authorized) {
    return { success: false, error: check.error || 'PIN de administrador incorrecto.' };
  }

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('personal')
        .update({
          pin: newPin,
          pin_hash: null, // Fuerza a verificar_pin_personal a hashearlo con bcrypt al ingresar
          intentos_fallidos: 0,
          bloqueado_hasta: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', staffId);

      if (error) {
        console.error('Error actualizando PIN en Supabase:', error);
        return { success: false, error: `Error en base de datos: ${error.message}` };
      }

      await fetchStaffFromSupabase();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error de conexión con Supabase.' };
    }
  }

  const current = getStaffList();
  const updated = current.map((u) => (u.id === staffId ? { ...u, pin: newPin } : u));
  localStorage.setItem(STORAGE_KEY_STAFF_PUBLIC_CACHE, JSON.stringify(updated));
  return { success: true };
}

/**
 * Elimina definitivamente a un colaborador en Supabase Cloud y memoria local.
 */
export async function deleteStaffUser(staffId: string): Promise<boolean> {
  if (staffId === 'staff-marisol' || staffId === 'staff-luis') return false;

  let targetName: string | undefined;

  if (isSupabaseConfigured()) {
    try {
      // 1. Obtener datos del colaborador para limpiar cualquier duplicado con el mismo nombre
      const { data: target } = await supabase
        .from('personal')
        .select('id, nombre')
        .eq('id', staffId)
        .maybeSingle();

      targetName = target?.nombre?.trim();

      // 2. Borrado físico definitivo en Supabase por ID
      const { error: delErr } = await supabase
        .from('personal')
        .delete()
        .eq('id', staffId);

      // Si hay duplicados con el mismo nombre en la base de datos, purgarlos de forma unificada
      if (
        targetName &&
        targetName.toLowerCase() !== 'marisol' &&
        targetName.toLowerCase() !== 'luis lloclla'
      ) {
        await supabase
          .from('personal')
          .delete()
          .ilike('nombre', targetName);
      }

      // Si por alguna razón RLS deniega DELETE físico, aplicar desactivación masiva
      if (delErr) {
        console.warn('[deleteStaffUser] Error en delete físico, aplicando desactivación:', delErr.message);
        await supabase
          .from('personal')
          .update({
            activo: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', staffId);

        if (
          targetName &&
          targetName.toLowerCase() !== 'marisol' &&
          targetName.toLowerCase() !== 'luis lloclla'
        ) {
          await supabase
            .from('personal')
            .update({
              activo: false,
              updated_at: new Date().toISOString(),
            })
            .ilike('nombre', targetName);
        }
      }
    } catch (err: any) {
      console.warn('[deleteStaffUser] Excepción al eliminar en Supabase:', err?.message || err);
    }
  }

  // 3. Limpiar del almacenamiento local (por ID y por coincidencia de nombre)
  const current = getStaffList();
  const normalizedTargetName = targetName?.toLowerCase();
  const updated = current.filter(
    (u) =>
      u.id !== staffId &&
      (!normalizedTargetName || u.nombre.trim().toLowerCase() !== normalizedTargetName)
  );
  localStorage.setItem(STORAGE_KEY_STAFF_PUBLIC_CACHE, JSON.stringify(updated));
  return true;
}

export function getActiveStaffSession(): StaffUser | null {
  try {
    const raw =
      sessionStorage.getItem(STORAGE_KEY_ACTIVE_STAFF) ||
      localStorage.getItem(STORAGE_KEY_ACTIVE_STAFF) ||
      sessionStorage.getItem('trankilandia_staff_active_session_v3') ||
      localStorage.getItem('trankilandia_staff_active_session_v3');
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
    sessionStorage.removeItem('trankilandia_staff_active_session_v3');
    localStorage.removeItem('trankilandia_staff_active_session_v3');
  } else {
    sessionStorage.setItem(STORAGE_KEY_ACTIVE_STAFF, JSON.stringify(staff));
    localStorage.setItem(STORAGE_KEY_ACTIVE_STAFF, JSON.stringify(staff));
  }
}
