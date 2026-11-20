import { supabase, isSupabaseConfigured } from './supabase';

const LEGACY_PASSWORDS_KEY = 'trankilandia_member_passwords_v1';
function clearLegacyPasswords(): void {
  try { localStorage.removeItem(LEGACY_PASSWORDS_KEY); } catch { /* Storage can be unavailable. */ }
}
clearLegacyPasswords();

/** @deprecated Passwords are managed exclusively by Supabase Auth. */
export function getStoredCustomPassword(_dni: string): null {
  clearLegacyPasswords();
  return null;
}
/** @deprecated Never persist credentials in browser storage. */
export function saveStoredCustomPassword(_dni: string, _newPassword: string): void {
  clearLegacyPasswords();
}

export async function actualizarPasswordSocio(
  dni: string,
  nuevoPassword: string,
  passwordActual?: string
): Promise<{ success: boolean; message: string }> {
  clearLegacyPasswords();
  const cleanDni = dni.trim();
  if (!/^\d{8}$/.test(cleanDni)) return { success: false, message: 'DNI inválido. Debe tener exactamente 8 dígitos.' };
  if (nuevoPassword.length < 6) return { success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' };
  if (!passwordActual) return { success: false, message: 'Ingresa tu contraseña actual para confirmar tu identidad. Si la olvidaste, solicita ayuda en recepción.' };
  if (!isSupabaseConfigured()) return { success: false, message: 'El servicio de autenticación no está configurado.' };

  try {
    const canonicalEmail = `${cleanDni}@socio.trankilandia.pe`;
    const { data: currentData } = await supabase.auth.getUser();
    const current = currentData?.user;
    if (current && current.email?.toLowerCase() !== canonicalEmail) {
      // An OAuth account must already be linked by the server to this member.
      const { data: member, error } = await supabase.from('socios').select('id').eq('user_id', current.id).eq('dni', cleanDni).maybeSingle();
      if (error || !member) return { success: false, message: 'El DNI no corresponde a la cuenta de la sesión actual.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: current?.email || canonicalEmail,
      password: passwordActual,
    });
    if (error || !data.user || !data.session || (current && data.user.id !== current.id) || (!current && data.user.email?.toLowerCase() !== canonicalEmail)) {
      return { success: false, message: 'La contraseña actual no es correcta o no se pudo verificar tu cuenta.' };
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: nuevoPassword });
    if (updateError) return { success: false, message: 'No se pudo actualizar la contraseña. Inténtalo de nuevo.' };
    window.dispatchEvent(new CustomEvent('gym-password-updated', { detail: { dni: cleanDni } }));
    return { success: true, message: 'Contraseña actualizada. Usa tu nueva clave en el próximo ingreso.' };
  } catch {
    return { success: false, message: 'No se pudo verificar la cuenta o guardar la contraseña. Revisa tu conexión.' };
  }
}

export async function restablecerPasswordSocio(dni: string, nuevoPassword: string, passwordActual?: string): Promise<{ success: boolean; message: string }> {
  return actualizarPasswordSocio(dni, nuevoPassword, passwordActual);
}
