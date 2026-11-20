/**
 * ==============================================================================
 * TRANKILANDIA GYM · MOTOR DE BIOIMPEDANCIA Y RECOMPOSICIÓN CORPORAL (BIA)
 * ==============================================================================
 * Algoritmos de composición corporal para la balanza segmental EUROMAR® G78-BT
 * y análisis de transformaciones mes a mes.
 * ==============================================================================
 */

import {
  EvaluacionCorporal,
  DeltasEvaluacion,
  DiagnosticoRecomposicion,
  SegmentalData,
  SexoBiometrico,
} from '../types/evaluacion';

export interface EntradaMedicion {
  id?: string;
  socio_id: string;
  socio_dni: string;
  fecha?: string;
  estatura_cm: number;
  edad: number;
  sexo: SexoBiometrico;
  peso_kg: number;
  grasa_corporal_pct?: number;
  masa_muscular_kg?: number;
  grasa_visceral?: number;
  agua_pct?: number;
  masa_osea_kg?: number;
  bmr_kcal?: number;
  edad_metabolica?: number;
  proteina_pct?: number;
  puntuacion_corporal?: number;
  segmental_data?: SegmentalData;
  evaluador_id: string;
  evaluador_nombre: string;
  observaciones?: string;
  origen?: 'bluetooth_g78' | 'manual';
}

/**
 * Deriva las 5 zonas segmentales a partir de la masa muscular y grasa corporal
 * si la báscula solo transmitió valores agregados o si es captura rápida.
 */
function generarSegmentalEstimado(
  masaMuscularKg: number,
  grasaCorporalPct: number,
  sexo: SexoBiometrico
): SegmentalData {
  // Distribución antropométrica típica de masa muscular y grasa
  const factorBrazo = sexo === 'Masculino' ? 0.095 : 0.085;
  const factorPierna = sexo === 'Masculino' ? 0.26 : 0.275;
  const factorTorso = 1 - 2 * factorBrazo - 2 * factorPierna;

  const musculoBrazoIzq = Number((masaMuscularKg * factorBrazo * 0.99).toFixed(1));
  const musculoBrazoDer = Number((masaMuscularKg * factorBrazo * 1.01).toFixed(1));
  const musculoPiernaIzq = Number((masaMuscularKg * factorPierna * 0.995).toFixed(1));
  const musculoPiernaDer = Number((masaMuscularKg * factorPierna * 1.005).toFixed(1));
  const musculoTorso = Number((masaMuscularKg * factorTorso).toFixed(1));

  return {
    brazo_izq: {
      musculo_kg: musculoBrazoIzq,
      grasa_pct: Number((grasaCorporalPct * 0.9).toFixed(1)),
    },
    brazo_der: {
      musculo_kg: musculoBrazoDer,
      grasa_pct: Number((grasaCorporalPct * 0.88).toFixed(1)),
    },
    pierna_izq: {
      musculo_kg: musculoPiernaIzq,
      grasa_pct: Number((grasaCorporalPct * 0.95).toFixed(1)),
    },
    pierna_der: {
      musculo_kg: musculoPiernaDer,
      grasa_pct: Number((grasaCorporalPct * 0.94).toFixed(1)),
    },
    tronco: {
      musculo_kg: musculoTorso,
      grasa_pct: Number((grasaCorporalPct * 1.08).toFixed(1)),
    },
  };
}

/**
 * Calcula el índice de puntuación física (0 - 100) en base a % grasa y masa muscular
 */
export function calcularPuntuacionCorporal(
  pesoKg: number,
  grasaPct: number,
  musculoKg: number,
  sexo: SexoBiometrico,
  edad: number
): number {
  const musculoPct = (musculoKg / pesoKg) * 100;

  // Rangos óptimos según sexo
  const grasaOptimaMin = sexo === 'Masculino' ? 10 : 18;
  const grasaOptimaMax = sexo === 'Masculino' ? 18 : 25;
  const musculoOptimoMin = sexo === 'Masculino' ? 42 : 34;

  let baseScore = 75;

  // Bonificación / Penalización por Grasa
  if (grasaPct >= grasaOptimaMin && grasaPct <= grasaOptimaMax) {
    baseScore += 12;
  } else if (grasaPct < grasaOptimaMin && grasaPct >= 6) {
    baseScore += 10; // Definición atlética
  } else if (grasaPct > grasaOptimaMax) {
    const exceso = grasaPct - grasaOptimaMax;
    baseScore -= Math.min(25, exceso * 1.5);
  }

  // Bonificación por Músculo
  if (musculoPct >= musculoOptimoMin) {
    const sobreMasa = musculoPct - musculoOptimoMin;
    baseScore += Math.min(13, sobreMasa * 1.2);
  } else {
    const deficit = musculoOptimoMin - musculoPct;
    baseScore -= Math.min(15, deficit * 1.1);
  }

  // Ajuste por edad (mayor tolerancia en adultos mayores)
  if (edad > 40) {
    baseScore += 3;
  }

  return Math.max(35, Math.min(99, Math.round(baseScore)));
}

/**
 * Procesa la entrada bruta y calcula todas las métricas de bioimpedancia
 */
export function calcularMetricasCompletas(entrada: EntradaMedicion): EvaluacionCorporal {
  const peso = entrada.peso_kg;
  const estaturaM = entrada.estatura_cm / 100;
  const imc = Number((peso / Math.pow(estaturaM, 2)).toFixed(1));

  // 1. Grasa Corporal
  let grasaPct = entrada.grasa_corporal_pct;
  if (grasaPct === undefined || grasaPct <= 0) {
    // Estimación por fórmula Deurenberg si no vino por BLE
    const factorSexo = entrada.sexo === 'Masculino' ? 1 : 0;
    grasaPct = Number(
      (1.2 * imc + 0.23 * entrada.edad - 10.8 * factorSexo - 5.4).toFixed(1)
    );
  }
  const grasaKg = Number(((peso * grasaPct) / 100).toFixed(2));
  const masaLibreGrasa = peso - grasaKg;

  // 2. Masa Muscular
  let musculoKg = entrada.masa_muscular_kg;
  if (musculoKg === undefined || musculoKg <= 0) {
    const ratio = entrada.sexo === 'Masculino' ? 0.72 : 0.65;
    musculoKg = Number((masaLibreGrasa * ratio).toFixed(2));
  }
  const musculoPct = Number(((musculoKg / peso) * 100).toFixed(1));

  // 3. Grasa Visceral (escala 1 a 50)
  let visceral = entrada.grasa_visceral;
  if (!visceral) {
    const baseVisceral = entrada.sexo === 'Masculino' ? (grasaPct / 3) : (grasaPct / 3.8);
    const edadFactor = entrada.edad > 30 ? (entrada.edad - 30) * 0.1 : 0;
    visceral = Math.max(1, Math.min(25, Math.round(baseVisceral + edadFactor)));
  }

  // 4. Agua Corporal Total (%)
  const aguaPct = entrada.agua_pct || Number(((masaLibreGrasa * 0.732 / peso) * 100).toFixed(1));

  // 5. Masa Ósea (kg)
  const masaOsea = entrada.masa_osea_kg || Number((peso * (entrada.sexo === 'Masculino' ? 0.046 : 0.039)).toFixed(2));

  // 6. Metabolismo Basal (BMR en Kcal) - Fórmula Katch-McArdle basada en masa libre de grasa
  const bmr = entrada.bmr_kcal || Math.round(370 + 21.6 * masaLibreGrasa);

  // 7. Edad Metabólica
  let edadMeta = entrada.edad_metabolica;
  if (!edadMeta) {
    const deltaGrasa = grasaPct - (entrada.sexo === 'Masculino' ? 16 : 23);
    edadMeta = Math.max(16, Math.round(entrada.edad + deltaGrasa * 0.5));
  }

  // 8. Proteína (%)
  const proteinaPct = entrada.proteina_pct || Number(((musculoKg * 0.22 / peso) * 100).toFixed(1));

  // 9. Puntuación Corporal
  const puntuacion = entrada.puntuacion_corporal || calcularPuntuacionCorporal(
    peso,
    grasaPct,
    musculoKg,
    entrada.sexo,
    entrada.edad
  );

  // 10. Datos segmentales
  const segmental = entrada.segmental_data || generarSegmentalEstimado(musculoKg, grasaPct, entrada.sexo);

  return {
    id: entrada.id || `eval-${entrada.socio_dni}-${Date.now()}`,
    socio_id: entrada.socio_id,
    socio_dni: entrada.socio_dni,
    fecha: entrada.fecha || new Date().toISOString(),
    estatura_cm: entrada.estatura_cm,
    edad: entrada.edad,
    sexo: entrada.sexo,
    peso_kg: Number(peso.toFixed(2)),
    imc,
    grasa_corporal_pct: Number(grasaPct.toFixed(1)),
    grasa_corporal_kg: grasaKg,
    masa_muscular_kg: Number(musculoKg.toFixed(2)),
    masa_muscular_pct: musculoPct,
    grasa_visceral: visceral,
    agua_pct: Number(aguaPct.toFixed(1)),
    masa_osea_kg: masaOsea,
    bmr_kcal: bmr,
    edad_metabolica: edadMeta,
    proteina_pct: proteinaPct,
    puntuacion_corporal: puntuacion,
    segmental_data: segmental,
    evaluador_id: entrada.evaluador_id,
    evaluador_nombre: entrada.evaluador_nombre,
    observaciones: entrada.observaciones,
    origen: entrada.origen || 'bluetooth_g78',
    created_at: new Date().toISOString(),
  };
}

/**
 * Calcula las variaciones (deltas) entre la medición actual y la anterior
 */
export function calcularDeltasMensuales(
  actual: EvaluacionCorporal,
  anterior?: EvaluacionCorporal | null
): DeltasEvaluacion | null {
  if (!anterior) return null;

  const fechaActual = new Date(actual.fecha).getTime();
  const fechaAnt = new Date(anterior.fecha).getTime();
  const diffMs = Math.abs(fechaActual - fechaAnt);
  const diasDiferencia = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  return {
    dias_diferencia: diasDiferencia,
    delta_peso_kg: Number((actual.peso_kg - anterior.peso_kg).toFixed(2)),
    delta_musculo_kg: Number((actual.masa_muscular_kg - anterior.masa_muscular_kg).toFixed(2)),
    delta_grasa_pct: Number((actual.grasa_corporal_pct - anterior.grasa_corporal_pct).toFixed(1)),
    delta_grasa_kg: Number((actual.grasa_corporal_kg - anterior.grasa_corporal_kg).toFixed(2)),
    delta_visceral: actual.grasa_visceral - anterior.grasa_visceral,
    delta_agua_pct: Number((actual.agua_pct - anterior.agua_pct).toFixed(1)),
    delta_bmr_kcal: actual.bmr_kcal - anterior.bmr_kcal,
    delta_score: actual.puntuacion_corporal - anterior.puntuacion_corporal,
  };
}

/**
 * Genera el diagnóstico y análisis en lenguaje natural para motivar al socio
 */
export function determinarDiagnostico(
  delta: DeltasEvaluacion | null,
  actual: EvaluacionCorporal
): DiagnosticoRecomposicion {
  if (!delta) {
    return {
      fase: 'Punto de Partida',
      titulo: 'Primera Evaluación Registrada',
      descripcion: `Tu peso inicial es de ${actual.peso_kg} kg con ${actual.grasa_corporal_pct}% de grasa y ${actual.masa_muscular_kg} kg de masa muscular. En tu próxima evaluación mensual compararemos tus mejoras.`,
      tipo: 'mantenimiento',
    };
  }

  const { delta_musculo_kg, delta_grasa_kg } = delta;

  // 1. Recomposición Corporal (Gana músculo y pierde grasa)
  if (delta_musculo_kg >= 0.3 && delta_grasa_kg <= -0.3) {
    return {
      fase: 'Recomposición Corporal Activa',
      titulo: '¡Recomposición Corporal Exitosa!',
      descripcion: `Aumentaste +${delta_musculo_kg} kg de masa muscular pura y eliminaste ${Math.abs(delta_grasa_kg)} kg de tejido graso. Tu cuerpo está quemando grasa mientras tonificas.`,
      tipo: 'recomposicion',
    };
  }

  // 2. Hipertrofia Limpia (Gana músculo con grasa controlada)
  if (delta_musculo_kg >= 0.5 && delta_grasa_kg < 0.8) {
    return {
      fase: 'Fase de Hipertrofia',
      titulo: 'Hipertrofia y Ganancia Muscular',
      descripcion: `Ganaste +${delta_musculo_kg} kg de masa muscular. El estímulo de entrenamiento y nutrición está construyendo tejido magro de forma sólida.`,
      tipo: 'hipertrofia',
    };
  }

  // 3. Definición y Quema Grasa (Pierde grasa cuidando el músculo)
  if (delta_grasa_kg <= -0.6 && delta_musculo_kg >= -0.3) {
    return {
      fase: 'Definición Muscular',
      titulo: 'Quema de Grasa Efectiva',
      descripcion: `Bajaste ${Math.abs(delta_grasa_kg)} kg de grasa preservando al máximo tu musculatura. Tu porcentaje de grasa se redujo a ${actual.grasa_corporal_pct}%.`,
      tipo: 'definicion',
    };
  }

  // 4. Mantenimiento / Ajuste
  return {
    fase: 'Fase de Consolidación',
    titulo: 'Progreso Estable',
    descripcion: `Mantienes tu composición corporal en rangos controlados (${actual.peso_kg} kg, ${actual.grasa_corporal_pct}% grasa). Consulta con tu entrenador para ajustar la intensidad del mes.`,
    tipo: 'mantenimiento',
  };
}
