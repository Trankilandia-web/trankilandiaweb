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
/**
 * Deriva las 5 zonas segmentales a partir de la masa muscular y grasa corporal
 * según las proporciones biométricas del estándar Fitdays / Lefu (8 electrodos).
 */
function generarSegmentalEstimado(
  masaMuscularKg: number,
  grasaCorporalKg: number,
  grasaCorporalPct: number,
  sexo: SexoBiometrico
): SegmentalData {
  const factorBrazoMusculo = sexo === 'Masculino' ? 0.062 : 0.058;
  const factorPiernaMusculo = sexo === 'Masculino' ? 0.177 : 0.185;
  const factorTorsoMusculo = 1 - 2 * factorBrazoMusculo - 2 * factorPiernaMusculo;

  const factorBrazoGrasa = 0.067;
  const factorPiernaGrasa = 0.147;
  const factorTorsoGrasa = 1 - 2 * factorBrazoGrasa - 2 * factorPiernaGrasa;

  const musculoBrazoIzq = Number((masaMuscularKg * factorBrazoMusculo).toFixed(1));
  const musculoBrazoDer = Number((masaMuscularKg * factorBrazoMusculo).toFixed(1));
  const musculoPiernaIzq = Number((masaMuscularKg * factorPiernaMusculo).toFixed(1));
  const musculoPiernaDer = Number((masaMuscularKg * factorPiernaMusculo).toFixed(1));
  const musculoTorso = Number((masaMuscularKg * factorTorsoMusculo).toFixed(1));

  const grasaBrazoIzqKg = Number((grasaCorporalKg * factorBrazoGrasa).toFixed(1));
  const grasaBrazoDerKg = Number((grasaCorporalKg * factorBrazoGrasa).toFixed(1));
  const grasaPiernaIzqKg = Number((grasaCorporalKg * factorPiernaGrasa).toFixed(1));
  const grasaPiernaDerKg = Number((grasaCorporalKg * factorPiernaGrasa).toFixed(1));
  const grasaTorsoKg = Number((grasaCorporalKg * factorTorsoGrasa).toFixed(1));

  return {
    brazo_izq: {
      musculo_kg: musculoBrazoIzq,
      musculo_pct: 105,
      grasa_kg: grasaBrazoIzqKg,
      grasa_pct: Number((grasaCorporalPct * 0.9).toFixed(1)),
    },
    brazo_der: {
      musculo_kg: musculoBrazoDer,
      musculo_pct: 105,
      grasa_kg: grasaBrazoDerKg,
      grasa_pct: Number((grasaCorporalPct * 0.9).toFixed(1)),
    },
    pierna_izq: {
      musculo_kg: musculoPiernaIzq,
      musculo_pct: 108,
      grasa_kg: grasaPiernaIzqKg,
      grasa_pct: Number((grasaCorporalPct * 0.95).toFixed(1)),
    },
    pierna_der: {
      musculo_kg: musculoPiernaDer,
      musculo_pct: 108,
      grasa_kg: grasaPiernaDerKg,
      grasa_pct: Number((grasaCorporalPct * 0.95).toFixed(1)),
    },
    tronco: {
      musculo_kg: musculoTorso,
      musculo_pct: 100,
      grasa_kg: grasaTorsoKg,
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
  const proteinaKg = Number(((peso * proteinaPct) / 100).toFixed(1));
  const aguaKg = Number(((peso * (aguaPct / 100))).toFixed(1));
  const musculoEsqueleticoPct = Number((musculoPct * (entrada.sexo === 'Masculino' ? 0.61 : 0.58)).toFixed(1));
  const grasaSubcutaneaPct = Number((grasaPct * (entrada.sexo === 'Masculino' ? 0.71 : 0.74)).toFixed(1));
  const whr = entrada.sexo === 'Masculino'
    ? Number((0.82 + Math.max(0, imc - 22) * 0.013).toFixed(2))
    : Number((0.74 + Math.max(0, imc - 22) * 0.014).toFixed(2));
  const pesoEstandar = Number((22.0 * Math.pow(estaturaM, 2)).toFixed(1));
  const grasaOptimaRatio = entrada.sexo === 'Masculino' ? 0.15 : 0.22;
  const pesoObjetivo = Number((masaLibreGrasa / (1 - grasaOptimaRatio)).toFixed(1));
  const controlPeso = Number((pesoObjetivo - peso).toFixed(1));
  const controlGrasa = Number((grasaKg - (pesoObjetivo * grasaOptimaRatio)).toFixed(1));
  const controlMuscular = 0.0;

  // 9. Puntuación Corporal
  const puntuacion = entrada.puntuacion_corporal || calcularPuntuacionCorporal(
    peso,
    grasaPct,
    musculoKg,
    entrada.sexo,
    entrada.edad
  );

  // 10. Datos segmentales
  const segmental = entrada.segmental_data || generarSegmentalEstimado(musculoKg, grasaKg, grasaPct, entrada.sexo);

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
    masa_libre_grasa_kg: masaLibreGrasa,
    masa_muscular_kg: Number(musculoKg.toFixed(2)),
    masa_muscular_pct: musculoPct,
    musculo_esqueletico_pct: musculoEsqueleticoPct,
    grasa_visceral: visceral,
    grasa_subcutanea_pct: grasaSubcutaneaPct,
    agua_pct: Number(aguaPct.toFixed(1)),
    agua_kg: aguaKg,
    masa_osea_kg: masaOsea,
    bmr_kcal: bmr,
    edad_metabolica: edadMeta,
    proteina_pct: proteinaPct,
    proteina_kg: proteinaKg,
    whr,
    peso_estandar_kg: pesoEstandar,
    peso_objetivo_kg: pesoObjetivo,
    control_peso_kg: controlPeso,
    control_grasa_kg: controlGrasa,
    control_muscular_kg: controlMuscular,
    puntuacion_corporal: puntuacion,
    segmental_data: segmental,
    evaluador_id: entrada.evaluador_id,
    evaluador_nombre: entrada.evaluador_nombre,
    observaciones: entrada.observaciones,
    origen: entrada.origen || 'bluetooth_g78',
    created_at: new Date().toISOString(),
  };
}

export type NivelEstandarFitdays = 'Excelente' | 'Estándar' | 'Alto' | 'Demasiado alto' | 'Bajo';

export interface EstandarMetricaInfo {
  nivel: NivelEstandarFitdays;
  colorClass: string;
}

export function obtenerEstandarFitdays(
  metrica: string,
  valor: number,
  sexo: SexoBiometrico,
  imc: number
): EstandarMetricaInfo {
  let nivel: NivelEstandarFitdays = 'Estándar';

  switch (metrica) {
    case 'peso':
    case 'imc':
      if (imc < 18.5) nivel = 'Bajo';
      else if (imc <= 24.9) nivel = 'Estándar';
      else if (imc <= 29.9) nivel = 'Alto';
      else nivel = 'Demasiado alto';
      break;

    case 'grasa':
      const maxGrasaStd = sexo === 'Masculino' ? 20 : 28;
      const maxGrasaAlta = sexo === 'Masculino' ? 25 : 34;
      const minGrasaStd = sexo === 'Masculino' ? 10 : 18;
      if (valor < minGrasaStd) nivel = 'Bajo';
      else if (valor <= maxGrasaStd) nivel = 'Estándar';
      else if (valor <= maxGrasaAlta) nivel = 'Alto';
      else nivel = 'Demasiado alto';
      break;

    case 'musculo':
    case 'frecuencia_muscular':
      const minMusculoExc = sexo === 'Masculino' ? 64 : 52;
      const minMusculoStd = sexo === 'Masculino' ? 55 : 45;
      if (valor >= minMusculoExc) nivel = 'Excelente';
      else if (valor >= minMusculoStd) nivel = 'Estándar';
      else nivel = 'Bajo';
      break;

    case 'musculo_esqueletico':
      const minEsqExc = sexo === 'Masculino' ? 38 : 30;
      const minEsqStd = sexo === 'Masculino' ? 32 : 25;
      if (valor >= minEsqExc) nivel = 'Excelente';
      else if (valor >= minEsqStd) nivel = 'Estándar';
      else nivel = 'Bajo';
      break;

    case 'proteina':
      if (valor >= 13.0) nivel = 'Excelente';
      else if (valor >= 11.0) nivel = 'Estándar';
      else nivel = 'Bajo';
      break;

    case 'agua':
      const minAguaExc = sexo === 'Masculino' ? 55 : 50;
      const minAguaStd = sexo === 'Masculino' ? 45 : 40;
      if (valor >= minAguaExc) nivel = 'Excelente';
      else if (valor >= minAguaStd) nivel = 'Estándar';
      else nivel = 'Bajo';
      break;

    case 'visceral':
      if (valor <= 9) nivel = 'Estándar';
      else if (valor <= 14) nivel = 'Alto';
      else nivel = 'Demasiado alto';
      break;

    case 'subcutanea':
      const maxSubStd = sexo === 'Masculino' ? 18 : 25;
      if (valor <= maxSubStd) nivel = 'Estándar';
      else nivel = 'Alto';
      break;

    case 'whr':
      const maxWhrStd = sexo === 'Masculino' ? 0.90 : 0.85;
      if (valor <= maxWhrStd) nivel = 'Estándar';
      else nivel = 'Alto';
      break;

    case 'edad':
      if (valor <= 0) nivel = 'Excelente';
      else if (valor <= 3) nivel = 'Estándar';
      else nivel = 'Alto';
      break;

    default:
      nivel = 'Estándar';
  }

  let colorClass = 'text-emerald-400';
  if (nivel === 'Excelente' || nivel === 'Estándar') colorClass = 'text-emerald-400';
  else if (nivel === 'Alto') colorClass = 'text-amber-400';
  else if (nivel === 'Demasiado alto') colorClass = 'text-rose-400 font-bold';
  else if (nivel === 'Bajo') colorClass = 'text-blue-400';

  return { nivel, colorClass };
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

export interface ProgresoAcumulado {
  delta_grasa_kg: number;
  delta_musculo_kg: number;
  delta_peso_kg: number;
  delta_visceral: number;
  delta_score: number;
  dias_totales: number;
  meta_progreso_pct: number;
}

export function calcularProgresoAcumulado(
  primera: EvaluacionCorporal,
  actual: EvaluacionCorporal
): ProgresoAcumulado {
  const dGrasa = Number((actual.grasa_corporal_kg - primera.grasa_corporal_kg).toFixed(1));
  const dMusculo = Number((actual.masa_muscular_kg - primera.masa_muscular_kg).toFixed(1));
  const dPeso = Number((actual.peso_kg - primera.peso_kg).toFixed(1));
  const dVisceral = actual.grasa_visceral - primera.grasa_visceral;
  const dScore = actual.puntuacion_corporal - primera.puntuacion_corporal;

  const ms = Math.abs(new Date(actual.fecha).getTime() - new Date(primera.fecha).getTime());
  const dias = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));

  const pesoInicial = primera.peso_kg;
  const pesoActual = actual.peso_kg;
  const pesoObjetivo = actual.peso_objetivo_kg || (22.0 * Math.pow(actual.estatura_cm / 100, 2));
  const distanciaTotal = Math.abs(pesoInicial - pesoObjetivo);
  let metaPct = 50;
  if (distanciaTotal > 0.5) {
    const recorrido = Math.abs(pesoInicial - pesoActual);
    metaPct = Math.min(100, Math.max(10, Math.round((recorrido / distanciaTotal) * 100)));
  }

  return {
    delta_grasa_kg: dGrasa,
    delta_musculo_kg: dMusculo,
    delta_peso_kg: dPeso,
    delta_visceral: dVisceral,
    delta_score: dScore,
    dias_totales: dias,
    meta_progreso_pct: metaPct,
  };
}

export interface SintesisSaludCotidiana {
  visceral: {
    nivel: number;
    estado: 'optimo' | 'atencion' | 'alerta';
    titulo: string;
    descripcion: string;
  };
  metabolismo: {
    bmr_kcal: number;
    calorias_diarias_estimadas: number;
    descripcion: string;
  };
  hidratacion: {
    pct: number;
    estado: 'excelente' | 'adecuado' | 'bajo';
    consejo: string;
    litros_recomendados: number;
  };
  proteina: {
    gramos_sugeridos: number;
    consejo: string;
  };
  fraseImpacto: string;
}

export function generarSintesisSaludCotidiana(
  actual: EvaluacionCorporal
): SintesisSaludCotidiana {
  let estadoVisceral: 'optimo' | 'atencion' | 'alerta' = 'optimo';
  let tituloVisceral = 'Rango Seguro';
  let descVisceral = 'Tus órganos vitales y corazón están protegidos con un nivel de grasa interna saludable.';
  if (actual.grasa_visceral > 14) {
    estadoVisceral = 'alerta';
    tituloVisceral = 'Riesgo Cardiovascular Elevado';
    descVisceral = 'La grasa que rodea tus órganos está elevada. Prioriza el cardio y reduce azúcares ultraprocesados.';
  } else if (actual.grasa_visceral >= 10) {
    estadoVisceral = 'atencion';
    tituloVisceral = 'Atención Abdominal';
    descVisceral = 'Nivel ligeramente elevado. Con entrenamiento de fuerza constante y déficit calórico descenderá rápido.';
  }

  const bmr = actual.bmr_kcal;
  const caloriasActivas = Math.round(bmr * 1.45);
  const descMetabolismo = `Tu masa muscular quema ${bmr} calorías al día solo existiendo. En un día normal de gym quemas aprox. ${caloriasActivas} kcal.`;

  const minAgua = actual.sexo === 'Masculino' ? 55 : 50;
  let estadoAgua: 'excelente' | 'adecuado' | 'bajo' = 'adecuado';
  let consejoAgua = 'Buen nivel de hidratación para la recuperación muscular.';
  if (actual.agua_pct >= minAgua) {
    estadoAgua = 'excelente';
    consejoAgua = '¡Excelente hidratación celular! Tus músculos se recuperan al máximo.';
  } else if (actual.agua_pct < minAgua - 5) {
    estadoAgua = 'bajo';
    consejoAgua = 'Toma 1 o 2 vasos más de agua al día para evitar fatiga en tus entrenamientos.';
  }
  const litrosRecomendados = Number((actual.peso_kg * 0.035).toFixed(1));

  const gramosProteina = Math.round(Math.max(60, (actual.masa_muscular_kg || actual.peso_kg * 0.7) * 1.8));
  const consejoProteina = `Apunta a ingerir aprox. ${gramosProteina}g de proteína al día repartidos en tus comidas para tonificar.`;

  let fraseImpacto = '¡Excelente constancia! Tu cuerpo se sigue fortaleciendo.';
  if (actual.puntuacion_corporal >= 80) {
    fraseImpacto = '¡Composición atlética superior! Mantén la intensidad y disciplina.';
  } else if (actual.grasa_visceral <= 9 && actual.masa_muscular_pct >= 55) {
    fraseImpacto = '¡Base muscular sólida y corazón saludable! Estás en el camino correcto.';
  } else if (actual.grasa_corporal_pct > 28) {
    fraseImpacto = '¡Cada sesión en el gym cuenta! Estás activando tu quema de grasa.';
  }

  return {
    visceral: {
      nivel: actual.grasa_visceral,
      estado: estadoVisceral,
      titulo: tituloVisceral,
      descripcion: descVisceral,
    },
    metabolismo: {
      bmr_kcal: bmr,
      calorias_diarias_estimadas: caloriasActivas,
      descripcion: descMetabolismo,
    },
    hidratacion: {
      pct: actual.agua_pct,
      estado: estadoAgua,
      consejo: consejoAgua,
      litros_recomendados: litrosRecomendados,
    },
    proteina: {
      gramos_sugeridos: gramosProteina,
      consejo: consejoProteina,
    },
    fraseImpacto,
  };
}
