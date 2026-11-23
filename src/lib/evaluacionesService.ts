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
      if (Array.isArray(parsed)) {
        // Filtrar automáticamente cualquier residuo de pruebas unitarias o evaluaciones espurias
        const sanitizadas = parsed.filter(
          (e) => !e.id?.startsWith('eval-test-') && e.evaluador_nombre !== 'Luis Lloclla'
        );
        if (sanitizadas.length !== parsed.length) {
          try {
            localStorage.setItem(STORAGE_KEY_EVALUACIONES, JSON.stringify(sanitizadas));
          } catch {}
        }
        return sanitizadas;
      }
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

  // Actualizar biometría completa (estatura, edad y sexo) en el padrón local y en la nube
  if (evaluacion.socio_id || evaluacion.socio_dni) {
    actualizarBiometriaSocio(evaluacion.socio_id, {
      estatura_cm: evaluacion.estatura_cm,
      edad: evaluacion.edad,
      sexo: evaluacion.sexo,
      socio_dni: evaluacion.socio_dni,
    });
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

      if (!error && Array.isArray(data)) {
        // 1. Filas autoritativas desde Supabase
        const cloudEvaluaciones = data.map((d: any) => fromDbRow(d));

        // 2. Evaluaciones pendientes en cola offline no sincronizadas aún
        let offlineQueue: EvaluacionCorporal[] = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEY_OFFLINE_QUEUE);
          if (raw) offlineQueue = JSON.parse(raw);
        } catch {}
        const offlineParaSocio = offlineQueue.filter((o) => o.socio_dni === cleanDni);

        const map = new Map<string, EvaluacionCorporal>();
        cloudEvaluaciones.forEach((e) => map.set(e.id, e));
        offlineParaSocio.forEach((e) => {
          if (!map.has(e.id)) map.set(e.id, e);
        });

        // 3. Filtrar datos espurios de pruebas unitarias o lecturas de tara < 15 kg
        const limpias = Array.from(map.values())
          .filter(
            (e) =>
              !e.id?.startsWith('eval-test-') &&
              e.evaluador_nombre !== 'Luis Lloclla' &&
              e.peso_kg >= 15.0
          )
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        // 4. Deduplicación inteligente por sesión: si existen dos registros con menos de 3 minutos de diferencia
        // y peso virtualmente idéntico (variación < 0.2 kg), conservar únicamente el más reciente
        const deduplicadas: EvaluacionCorporal[] = [];
        for (const ev of limpias) {
          const yaExiste = deduplicadas.some((prev) => {
            const timeDiff = Math.abs(new Date(prev.fecha).getTime() - new Date(ev.fecha).getTime());
            const pesoDiff = Math.abs(prev.peso_kg - ev.peso_kg);
            return timeDiff < 180000 && pesoDiff < 0.2;
          });
          if (!yaExiste) {
            deduplicadas.push(ev);
          }
        }

        // 5. Sincronizar la caché local para este socio limpiando registros fantasma
        try {
          const otrasLocales = getLocalEvaluaciones().filter((e) => e.socio_dni !== cleanDni);
          saveLocalEvaluaciones([...deduplicadas, ...otrasLocales]);
        } catch {}

        return deduplicadas;
      }
    } catch (err) {
      console.warn('[obtenerHistorialEvaluaciones] Usando caché local:', err);
    }
  }

  // Fallback offline / local
  const filtradas = locales
    .filter(
      (e) =>
        !e.id?.startsWith('eval-test-') &&
        e.evaluador_nombre !== 'Luis Lloclla' &&
        e.peso_kg >= 15.0
    )
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const deduplicadasLocales: EvaluacionCorporal[] = [];
  for (const ev of filtradas) {
    const yaExiste = deduplicadasLocales.some((prev) => {
      const timeDiff = Math.abs(new Date(prev.fecha).getTime() - new Date(ev.fecha).getTime());
      const pesoDiff = Math.abs(prev.peso_kg - ev.peso_kg);
      return timeDiff < 180000 && pesoDiff < 0.2;
    });
    if (!yaExiste) {
      deduplicadasLocales.push(ev);
    }
  }

  return deduplicadasLocales;
}

/**
 * Obtiene la última evaluación registrada para un socio
 */
export async function obtenerUltimaEvaluacion(socioDni: string): Promise<EvaluacionCorporal | null> {
  const historial = await obtenerHistorialEvaluaciones(socioDni);
  return historial.length > 0 ? historial[0] : null;
}

export interface BiometriaSocioPayload {
  estatura_cm?: number | null;
  edad?: number | null;
  sexo?: 'Masculino' | 'Femenino' | string | null;
  socio_dni?: string | null;
}

/**
 * Actualiza la biometría completa de un socio (estatura, edad y sexo)
 * tanto en el padrón local (localStorage) como en Supabase para no tener que volver a preguntarlo.
 */
export async function actualizarBiometriaSocio(
  socioId: string,
  biometria: BiometriaSocioPayload
): Promise<boolean> {
  const cleanDni = biometria.socio_dni ? biometria.socio_dni.trim().replace(/\D/g, '').slice(0, 8) : null;

  // 1. Actualizar en almacenamiento local (getStoredMembers / saveStoredMembers)
  try {
    const members = getStoredMembers();
    let updated = false;

    for (const m of members) {
      const matchId = socioId && m.id === socioId;
      const matchDni = cleanDni && m.dni && m.dni.trim().replace(/\D/g, '').slice(0, 8) === cleanDni;

      if (matchId || matchDni) {
        if (biometria.estatura_cm && biometria.estatura_cm > 0) {
          (m as any).estatura_cm = biometria.estatura_cm;
        }
        if (biometria.edad && biometria.edad > 0) {
          m.age = biometria.edad;
          (m as any).edad = biometria.edad;
        }
        if (biometria.sexo) {
          m.gender = biometria.sexo;
          (m as any).sexo = biometria.sexo;
        }
        updated = true;
      }
    }

    if (updated) {
      saveStoredMembers(members);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gym-members-updated'));
      }
    }
  } catch (err) {
    console.warn('[actualizarBiometriaSocio] Error local:', err);
  }

  // 2. Actualizar en Supabase tabla socios
  if (isSupabaseConfigured()) {
    try {
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (biometria.estatura_cm && biometria.estatura_cm > 0) updates.estatura_cm = biometria.estatura_cm;
      if (biometria.edad && biometria.edad > 0) updates.edad = biometria.edad;
      if (biometria.sexo) updates.sexo = biometria.sexo;

      if (Object.keys(updates).length > 1) {
        let query = supabase.from('socios').update(updates);
        if (socioId && !socioId.startsWith('MEM-TEMP-')) {
          query = query.eq('id', socioId);
        } else if (cleanDni) {
          query = query.eq('dni', cleanDni);
        } else {
          return true;
        }

        const { error } = await query;
        if (error) {
          console.warn('[actualizarBiometriaSocio] Error en Supabase:', error.message);
          return false;
        }
      }
    } catch (err) {
      console.warn('[actualizarBiometriaSocio] Excepción sincronizando biometría:', err);
      return false;
    }
  }

  return true;
}

/**
 * Actualiza la estatura del socio (mantenido por compatibilidad)
 */
export async function actualizarEstaturaSocio(socioId: string, estaturaCm: number): Promise<boolean> {
  return actualizarBiometriaSocio(socioId, { estatura_cm: estaturaCm });
}
