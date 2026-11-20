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
 * Convierte un objeto EvaluacionCorporal al formato de la tabla Supabase
 */
function toDbPayload(evaluacion: EvaluacionCorporal): Record<string, any> {
  return {
    id: evaluacion.id,
    socio_id: evaluacion.socio_id,
    socio_dni: evaluacion.socio_dni,
    fecha: evaluacion.fecha,
    estatura_cm: evaluacion.estatura_cm,
    edad: evaluacion.edad,
    sexo: evaluacion.sexo,
    peso_kg: evaluacion.peso_kg,
    grasa_corporal_pct: evaluacion.grasa_corporal_pct,
    masa_muscular_kg: evaluacion.masa_muscular_kg,
    grasa_visceral: evaluacion.grasa_visceral,
    agua_corporal_pct: evaluacion.agua_pct,
    masa_osea_kg: evaluacion.masa_osea_kg,
    tasa_metabolica_basal_kcal: evaluacion.bmr_kcal,
    gasto_energetico_total_kcal: Math.round(evaluacion.bmr_kcal * 1.375),
    edad_metabolica: evaluacion.edad_metabolica,
    puntaje_corporal: evaluacion.puntuacion_corporal,
    segmental: evaluacion.segmental_data || {},
    evaluador_id: evaluacion.evaluador_id,
    evaluador_nombre: evaluacion.evaluador_nombre,
    origen: evaluacion.origen || 'bluetooth_g78',
  };
}

/**
 * Mapea una fila de Supabase a EvaluacionCorporal
 */
function fromDbRow(d: any): EvaluacionCorporal {
  const peso = Number(d.peso_kg);
  const estatura = Number(d.estatura_cm);
  const grasaPct = Number(d.grasa_corporal_pct);
  const musculoKg = Number(d.masa_muscular_kg);
  const bmr = Number(d.tasa_metabolica_basal_kcal || d.bmr_kcal || 1600);
  const puntaje = Number(d.puntaje_corporal || d.puntuacion_corporal || 75);
  const segmental = d.segmental || d.segmental_data || {};

  return {
    id: d.id,
    socio_id: d.socio_id,
    socio_dni: d.socio_dni,
    fecha: d.fecha,
    estatura_cm: estatura,
    edad: Number(d.edad),
    sexo: d.sexo,
    peso_kg: peso,
    imc: d.imc ? Number(d.imc) : Number((peso / Math.pow(estatura / 100, 2)).toFixed(1)),
    grasa_corporal_pct: grasaPct,
    grasa_corporal_kg: d.grasa_corporal_kg ? Number(d.grasa_corporal_kg) : Number(((peso * grasaPct) / 100).toFixed(2)),
    masa_muscular_kg: musculoKg,
    masa_muscular_pct: d.masa_muscular_pct ? Number(d.masa_muscular_pct) : Number(((musculoKg / peso) * 100).toFixed(1)),
    grasa_visceral: Number(d.grasa_visceral),
    agua_pct: Number(d.agua_corporal_pct || d.agua_pct || 55),
    masa_osea_kg: Number(d.masa_osea_kg),
    bmr_kcal: bmr,
    edad_metabolica: Number(d.edad_metabolica),
    proteina_pct: d.proteina_pct ? Number(d.proteina_pct) : 18.0,
    puntuacion_corporal: puntaje,
    segmental_data: segmental,
    evaluador_id: d.evaluador_id,
    evaluador_nombre: d.evaluador_nombre,
    observaciones: d.observaciones || undefined,
    origen: d.origen || 'bluetooth_g78',
  };
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
      const payload = toDbPayload(evaluacion);

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
      const payload = toDbPayload(ev);
      const { error } = await supabase.from('evaluaciones_corporales').upsert(payload, { onConflict: 'id' });
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
        data.forEach((d: any) => map.set(d.id, fromDbRow(d)));

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
