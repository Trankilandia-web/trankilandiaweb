/**
 * ==============================================================================
 * TRANKILANDIA GYM · GESTIÓN DE CONTRASEÑAS VINCULADAS AL DNI (LOCAL-FIRST & CLOUD)
 * ==============================================================================
 * Permite que cada socio cambie su contraseña vinculada al DNI en cualquier momento.
 * La contraseña inicial es su mismo número de DNI (8 dígitos).
 * Funciona de forma resiliente en localStorage y sincroniza con Supabase Auth si está conectado.
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { extraerDniPeru } from './dniParser';

const PASSWORDS_STORAGE_KEY = 'trankilandia_member_passwords_v1';

/**
 * Obtiene la contraseña personalizada de un socio si la ha modificado.
 * Si nunca la ha cambiado, retorna null (indicando que su contraseña es su DNI).
 */
export function getStoredCustomPassword(dni: string): string | null {
  try {
    const clean = extraerDniPeru(dni) || dni.trim().replace(/\D/g, '').slice(0, 8);
    if (!clean) return null;
    const raw = localStorage.getItem(PASSWORDS_STORAGE_KEY);
    if (raw) {
      const map = JSON.parse(raw);
      return typeof map[clean] === 'string' ? map[clean] : null;
    }
  } catch {}
  return null;
}

/**
 * Guarda o actualiza la contraseña personalizada de un DNI en almacenamiento local.
 */
export function saveStoredCustomPassword(dni: string, newPassword: string): void {
  try {
    const clean = extraerDniPeru(dni) || dni.trim().replace(/\D/g, '').slice(0, 8);
    if (!clean) return;
    const raw = localStorage.getItem(PASSWORDS_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[clean] = newPassword;
    localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(map));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gym-password-updated', { detail: { dni: clean } }));
    }
  } catch {}
}

/**
 * Cambia la contraseña de acceso vinculada al DNI.
 * Valida la contraseña anterior (o que sea su DNI si es el primer cambio).
 */
export async function actualizarPasswordSocio(
  dni: string,
  nuevoPassword: string,
  passwordActual?: string
): Promise<{ success: boolean; message: string }> {
  const cleanDni = extraerDniPeru(dni) || dni.trim().replace(/\D/g, '').slice(0, 8);
  if (!cleanDni || cleanDni.length !== 8) {
    return { success: false, message: 'DNI inválido. Debe tener exactamente 8 dígitos.' };
  }

  const cleanNewPw = nuevoPassword.trim();
  if (cleanNewPw.length < 6) {
    return { success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' };
  }

  // Verificar la contraseña anterior si se especificó
  const savedPw = getStoredCustomPassword(cleanDni);
  const expectedCurrent = savedPw || cleanDni;

  if (passwordActual && passwordActual.trim() !== expectedCurrent) {
    return {
      success: false,
      message: 'La contraseña actual no es correcta. Recuerda que si es tu primer cambio, tu clave inicial es tu DNI.',
    };
  }

  // 1. Guardar de inmediato en local-first
  saveStoredCustomPassword(cleanDni, cleanNewPw);

  // 2. Si Supabase está conectado, actualizar la contraseña en Supabase Auth
  if (isSupabaseConfigured()) {
    try {
      // Si el usuario actual está logueado en Supabase
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        const { error: updateErr } = await supabase.auth.updateUser({ password: cleanNewPw });
        if (updateErr) {
          console.warn('Nota Supabase Auth updateUser:', updateErr.message);
        }
      }
    } catch (err) {
      console.warn('Error sincronizando contraseña remota:', err);
    }
  }

  return {
    success: true,
    message: '¡Contraseña actualizada con éxito! Ahora puedes ingresar con tu DNI y tu nueva clave.',
  };
}

/**
 * Restablece la contraseña de un socio de forma rápida (autorrecuperación o soporte recepción).
 */
export async function restablecerPasswordSocio(
  dni: string,
  nuevoPassword: string
): Promise<{ success: boolean; message: string }> {
  return actualizarPasswordSocio(dni, nuevoPassword);
}
