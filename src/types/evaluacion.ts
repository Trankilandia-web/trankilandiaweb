/**
 * ==============================================================================
 * TRANKILANDIA GYM · MODELO DE DATOS Y TIPOS DE EVALUACIÓN CORPORAL (BIA)
 * ==============================================================================
 * Define interfaces, esquemas y validaciones para la báscula segmental de 8
 * electrodos EUROMAR® G78-BT y el módulo de seguimiento de clientes.
 * ==============================================================================
 */

export type SexoBiometrico = 'Masculino' | 'Femenino';

export interface SegmentalZone {
  musculo_kg: number;
  grasa_pct: number;
}

export interface SegmentalData {
  brazo_izq: SegmentalZone;
  brazo_der: SegmentalZone;
  pierna_izq: SegmentalZone;
  pierna_der: SegmentalZone;
  tronco: SegmentalZone;
}

export interface EvaluacionCorporal {
  id: string;
  socio_id: string;
  socio_dni: string;
  fecha: string; // ISO 8601 string
  
  // Datos Biométricos de Entrada
  estatura_cm: number;
  edad: number;
  sexo: SexoBiometrico;
  
  // Métricas Corporales Globales
  peso_kg: number;
  imc: number;
  grasa_corporal_pct: number;
  grasa_corporal_kg: number;
  masa_muscular_kg: number;
  masa_muscular_pct: number;
  grasa_visceral: number; // 1 - 50
  agua_pct: number;
  masa_osea_kg: number;
  bmr_kcal: number;
  edad_metabolica: number;
  proteina_pct: number;
  puntuacion_corporal: number; // 0 - 100
  
  // Desglose Segmental (8 electrodos)
  segmental_data: SegmentalData;
  
  // Metadatos de Auditoría
  evaluador_id: string;
  evaluador_nombre: string;
  observaciones?: string;
  origen: 'bluetooth_g78' | 'manual';
  created_at?: string;
}

export interface DeltasEvaluacion {
  dias_diferencia: number;
  delta_peso_kg: number;
  delta_musculo_kg: number;
  delta_grasa_pct: number;
  delta_grasa_kg: number;
  delta_visceral: number;
  delta_agua_pct: number;
  delta_bmr_kcal: number;
  delta_score: number;
}

export type TipoRecomposicion = 'recomposicion' | 'hipertrofia' | 'definicion' | 'mantenimiento';

export interface DiagnosticoRecomposicion {
  fase: string;
  titulo: string;
  descripcion: string;
  tipo: TipoRecomposicion;
}

/**
 * Genera la estructura inicial de datos segmentales
 */
export function crearSegmentalDataDefault(): SegmentalData {
  return {
    brazo_izq: { musculo_kg: 0, grasa_pct: 0 },
    brazo_der: { musculo_kg: 0, grasa_pct: 0 },
    pierna_izq: { musculo_kg: 0, grasa_pct: 0 },
    pierna_der: { musculo_kg: 0, grasa_pct: 0 },
    tronco: { musculo_kg: 0, grasa_pct: 0 },
  };
}

/**
 * Valida los parámetros biométricos esenciales antes de realizar la medición
 */
export function validarBiometriaBase(
  estaturaCm: number,
  edad: number,
  sexo: string
): { valido: boolean; error?: string } {
  if (typeof estaturaCm !== 'number' || isNaN(estaturaCm) || estaturaCm < 100 || estaturaCm > 240) {
    return {
      valido: false,
      error: 'La estatura debe estar entre 100 cm y 240 cm.',
    };
  }

  if (typeof edad !== 'number' || isNaN(edad) || edad < 10 || edad > 99) {
    return {
      valido: false,
      error: 'La edad debe estar comprendida entre 10 y 99 años.',
    };
  }

  if (sexo !== 'Masculino' && sexo !== 'Femenino') {
    return {
      valido: false,
      error: 'El sexo debe ser Masculino o Femenino para las fórmulas de bioimpedancia.',
    };
  }

  return { valido: true };
}

/**
 * Valida coherencia física de las métricas obtenidas
 */
export function validarMetricasEvaluacion(
  evaluacion: Partial<EvaluacionCorporal>
): { valido: boolean; error?: string } {
  const { peso_kg, grasa_corporal_pct, masa_muscular_kg, estatura_cm, edad, sexo } = evaluacion;

  if (estatura_cm && edad && sexo) {
    const bioCheck = validarBiometriaBase(estatura_cm, edad, sexo);
    if (!bioCheck.valido) return bioCheck;
  }

  if (typeof peso_kg !== 'number' || isNaN(peso_kg) || peso_kg < 20 || peso_kg > 250) {
    return { valido: false, error: 'El peso registrado debe estar entre 20 kg y 250 kg.' };
  }

  if (
    typeof grasa_corporal_pct === 'number' &&
    (grasa_corporal_pct < 3 || grasa_corporal_pct > 75)
  ) {
    return {
      valido: false,
      error: 'El porcentaje de grasa corporal debe estar entre 3% y 75%.',
    };
  }

  if (
    typeof masa_muscular_kg === 'number' &&
    (masa_muscular_kg <= 0 || masa_muscular_kg > peso_kg)
  ) {
    return {
      valido: false,
      error: 'La masa muscular no puede ser mayor al peso corporal total.',
    };
  }

  return { valido: true };
}
