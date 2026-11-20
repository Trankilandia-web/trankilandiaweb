/**
 * ==============================================================================
 * TRANKILANDIA GYM · SERVICIO DE EVALUACIONES CORPORALES (LOCAL-FIRST & CLOUD)
 * ==============================================================================
 * Gestiona el almacenamiento de evaluaciones de bioimpedancia en Supabase
 * con respaldo resiliente en almacenamiento local para operación offline.
 * ==============================================================================
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { EvaluacionCorporal } from '../types/evaluacion';
import { getStoredMembers, saveStoredMembers } from '../data/gymStore';

export const STORAGE_KEY_EVALUACIONES = 'trankilandia_evaluaciones_corporales_v1';
export const STORAGE_KEY_OFFLINE_QUEUE = 'trankilandia_evaluaciones_offline_v1';

/**
 * Lee la caché local de evaluaciones guardadas
 */
function getLocalEvaluaciones(): EvaluacionCorporal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EVALUACIONES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * Persiste la lista de evaluaciones en caché local
 */
function saveLocalEvaluaciones(evals: EvaluacionCorporal[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_EVALUACIONES, JSON.stringify(evals));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('evaluaciones-actualizadas'));
    }
  } catch {}
}

/**
 * Guarda una evaluación corporal tanto en Supabase como en LocalStorage
 */
export async function guardarEvaluacion(
  evaluacion: EvaluacionCorporal
): Promise<{ success: boolean; error?: string }> {
  // 1. Guardar de inmediato en almacenamiento local (Local-First sin latencia)
  const locales = getLocalEvaluaciones();
  const index = locales.findIndex((e) => e.id === evaluacion.id);
  if (index >= 0) {
    locales[index] = evaluacion;
  } else {
    locales.unshift(evaluacion);
  }
  saveLocalEvaluaciones(locales);

  // Actualizar estatura en el padrón local de socios
  if (evaluacion.socio_id && evaluacion.estatura_cm) {
    actualizarEstaturaLocal(evaluacion.socio_id, evaluacion.estatura_cm);
  }

  // 2. Si Supabase está disponible, sincronizar en la nube
  if (isSupabaseConfigured()) {
    try {
      const payload = {
        id: evaluacion.id,
        socio_id: evaluacion.socio_id,
        socio_dni: evaluacion.socio_dni,
        fecha: evaluacion.fecha,
        estatura_cm: evaluacion.estatura_cm,
        edad: evaluacion.edad,
        sexo: evaluacion.sexo,
        peso_kg: evaluacion.peso_kg,
        imc: evaluacion.imc,
        grasa_corporal_pct: evaluacion.grasa_corporal_pct,
        grasa_corporal_kg: evaluacion.grasa_corporal_kg,
        masa_muscular_kg: evaluacion.masa_muscular_kg,
        masa_muscular_pct: evaluacion.masa_muscular_pct,
        grasa_visceral: evaluacion.grasa_visceral,
        agua_pct: evaluacion.agua_pct,
        masa_osea_kg: evaluacion.masa_osea_kg,
        bmr_kcal: evaluacion.bmr_kcal,
        edad_metabolica: evaluacion.edad_metabolica,
        proteina_pct: evaluacion.proteina_pct,
        puntuacion_corporal: evaluacion.puntuacion_corporal,
        segmental_data: evaluacion.segmental_data,
        evaluador_id: evaluacion.evaluador_id,
        evaluador_nombre: evaluacion.evaluador_nombre,
        observaciones: evaluacion.observaciones || null,
        origen: evaluacion.origen || 'bluetooth_g78',
      };

      const { error } = await supabase
        .from('evaluaciones_corporales')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('[guardarEvaluacion] Error guardando en Supabase, encolando offline:', error.message);
        encolarEvaluacionOffline(evaluacion);
      } else {
        // Actualizar estatura en tabla socios de Supabase
        if (evaluacion.socio_id && evaluacion.estatura_cm) {
          await supabase
            .from('socios')
            .update({ estatura_cm: evaluacion.estatura_cm })
            .eq('id', evaluacion.socio_id);
        }
      }
    } catch (err: any) {
      console.warn('[guardarEvaluacion] Excepción sincronizando evaluación, encolando offline:', err);
      encolarEvaluacionOffline(evaluacion);
    }
  }

  return { success: true };
}

/**
 * Encola una evaluación para sincronización posterior si falló la red
 */
function encolarEvaluacionOffline(evaluacion: EvaluacionCorporal): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OFFLINE_QUEUE);
    const queue: EvaluacionCorporal[] = raw ? JSON.parse(raw) : [];
    if (!queue.some((e) => e.id === evaluacion.id)) {
      queue.push(evaluacion);
      localStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify(queue));
    }
  } catch {}
}

/**
 * Sincroniza evaluaciones acumuladas en la cola offline
 */
export async function sincronizarEvaluacionesOffline(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OFFLINE_QUEUE);
    if (!raw) return 0;
    const queue: EvaluacionCorporal[] = JSON.parse(raw);
    if (!queue.length) return 0;

    let sincronizados = 0;
    const restantes: EvaluacionCorporal[] = [];

    for (const ev of queue) {
      const { error } = await supabase.from('evaluaciones_corporales').upsert(ev, { onConflict: 'id' });
      if (!error) {
        sincronizados++;
      } else {
        restantes.push(ev);
      }
    }

    localStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify(restantes));
    return sincronizados;
  } catch {
    return 0;
  }
}

/**
 * Obtiene el historial de evaluaciones de un socio ordenado de más reciente a más antiguo
 */
export async function obtenerHistorialEvaluaciones(socioDni: string): Promise<EvaluacionCorporal[]> {
  const cleanDni = socioDni.trim().replace(/\D/g, '').slice(0, 8);
  if (!cleanDni) return [];

  const locales = getLocalEvaluaciones().filter((e) => e.socio_dni === cleanDni);

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('evaluaciones_corporales')
        .select('*')
        .eq('socio_dni', cleanDni)
        .order('fecha', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        // Fusionar sin duplicados
        const map = new Map<string, EvaluacionCorporal>();
        locales.forEach((l) => map.set(l.id, l));
        data.forEach((d: any) => map.set(d.id, d as EvaluacionCorporal));

        const fusion = Array.from(map.values()).sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        return fusion;
      }
    } catch (err) {
      console.warn('[obtenerHistorialEvaluaciones] Usando caché local:', err);
    }
  }

  return locales.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

/**
 * Obtiene la última evaluación registrada para un socio
 */
export async function obtenerUltimaEvaluacion(socioDni: string): Promise<EvaluacionCorporal | null> {
  const historial = await obtenerHistorialEvaluaciones(socioDni);
  return historial.length > 0 ? historial[0] : null;
}

/**
 * Actualiza la estatura de un socio en el almacenamiento local
 */
function actualizarEstaturaLocal(socioId: string, estaturaCm: number): void {
  try {
    const members = getStoredMembers();
    const match = members.find((m) => m.id === socioId);
    if (match) {
      (match as any).estatura_cm = estaturaCm;
      saveStoredMembers(members);
    }
  } catch {}
}

/**
 * Actualiza la estatura del socio tanto en local como en Supabase
 */
export async function actualizarEstaturaSocio(socioId: string, estaturaCm: number): Promise<boolean> {
  actualizarEstaturaLocal(socioId, estaturaCm);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('socios')
        .update({ estatura_cm: estaturaCm })
        .eq('id', socioId);
      return !error;
    } catch {
      return false;
    }
  }
  return true;
}
