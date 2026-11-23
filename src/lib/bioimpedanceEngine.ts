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
  ProgresoAcumulado,
  DiagnosticoRecomposicion,
  SegmentalData,
  SexoBiometrico,
  MedallaLogro,
  NivelMedalla,
  ObjetivoSimulador,
  ProyeccionMeta,
  PuntoProyeccion,
  AnalisisSimetria,
  DetalleSimetriaPar,
  ZonaCalorSilueta,
  ModoSilueta,
  ExtremidadId,
  DatosStoryCard,
  MetricaDestacadaStory,
  MedallaDestacadaStory,
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

export type { ProgresoAcumulado };

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

// ==============================================================================
// SISTEMA DE GAMIFICACIÓN Y MEDALLAS DE LOGRO
// ==============================================================================

export function calcularMedallasSocio(evaluaciones: EvaluacionCorporal[]): MedallaLogro[] {
  if (!evaluaciones || evaluaciones.length === 0) {
    return [];
  }

  // Ordenar cronológicamente ascendente (más antigua a más reciente)
  const sorted = [...evaluaciones].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  const primera = sorted[0];
  const actual = sorted[sorted.length - 1];

  const deltaMusculo = Number((actual.masa_muscular_kg - primera.masa_muscular_kg).toFixed(1));
  const deltaGrasaKg = Number((actual.grasa_corporal_kg - primera.grasa_corporal_kg).toFixed(1));
  const grasaPerdidaKg = Math.max(0, -deltaGrasaKg);
  const visceralActual = actual.grasa_visceral;
  const aguaActual = actual.agua_pct;
  const scoreActual = actual.puntuacion_corporal;
  const pctMusculoActual = actual.masa_muscular_pct;
  const totalEvals = sorted.length;

  const medallas: MedallaLogro[] = [];

  // 1. Primera Evaluación
  medallas.push({
    id: 'primera_evaluacion',
    categoria: 'constancia',
    titulo: 'Primera Huella',
    descripcion: 'Iniciaste tu viaje biométrico con la báscula de 8 electrodos EUROMAR® G78.',
    nivel: 'bronce',
    icono: 'Flag',
    desbloqueada: true,
    fechaDesbloqueo: primera.fecha,
    progresoActual: 1,
    metaNivel: 1,
    unidad: 'evaluación',
    esSecreta: false,
  });

  // 2. Constructor de Músculo
  let nivelConstructor: NivelMedalla = 'bronce';
  let desbloqueadaConstructor = false;
  let metaConstructor = 0.5;

  if (deltaMusculo >= 5.0) {
    nivelConstructor = 'diamante';
    desbloqueadaConstructor = true;
    metaConstructor = 5.0;
  } else if (deltaMusculo >= 3.0) {
    nivelConstructor = 'oro';
    desbloqueadaConstructor = true;
    metaConstructor = 3.0;
  } else if (deltaMusculo >= 1.5) {
    nivelConstructor = 'plata';
    desbloqueadaConstructor = true;
    metaConstructor = 1.5;
  } else if (deltaMusculo >= 0.5) {
    nivelConstructor = 'bronce';
    desbloqueadaConstructor = true;
    metaConstructor = 0.5;
  }

  medallas.push({
    id: 'constructor',
    categoria: 'musculo',
    titulo: 'Constructor Muscular',
    descripcion: desbloqueadaConstructor
      ? `Has desarrollado +${deltaMusculo} kg de masa muscular pura desde tu inicio.`
      : 'Gana al menos 0.5 kg de masa muscular para desbloquear el nivel Bronce.',
    nivel: nivelConstructor,
    icono: 'Dumbbell',
    desbloqueada: desbloqueadaConstructor,
    progresoActual: Math.max(0, deltaMusculo),
    metaNivel: metaConstructor,
    unidad: 'kg músculo',
    esSecreta: false,
  });

  // 3. Quemador de Grasa
  let nivelQuemador: NivelMedalla = 'bronce';
  let desbloqueadaQuemador = false;
  let metaQuemador = 1.0;

  if (grasaPerdidaKg >= 10.0) {
    nivelQuemador = 'diamante';
    desbloqueadaQuemador = true;
    metaQuemador = 10.0;
  } else if (grasaPerdidaKg >= 5.0) {
    nivelQuemador = 'oro';
    desbloqueadaQuemador = true;
    metaQuemador = 5.0;
  } else if (grasaPerdidaKg >= 3.0) {
    nivelQuemador = 'plata';
    desbloqueadaQuemador = true;
    metaQuemador = 3.0;
  } else if (grasaPerdidaKg >= 1.0) {
    nivelQuemador = 'bronce';
    desbloqueadaQuemador = true;
    metaQuemador = 1.0;
  }

  medallas.push({
    id: 'quemador_grasa',
    categoria: 'grasa',
    titulo: 'Quemador de Grasa',
    descripcion: desbloqueadaQuemador
      ? `Has incinerado ${grasaPerdidaKg} kg de grasa neta mediante entrenamiento disciplinado.`
      : 'Reduce al menos 1 kg de grasa corporal para desbloquear el nivel Bronce.',
    nivel: nivelQuemador,
    icono: 'Flame',
    desbloqueada: desbloqueadaQuemador,
    progresoActual: grasaPerdidaKg,
    metaNivel: metaQuemador,
    unidad: 'kg grasa',
    esSecreta: false,
  });

  // 4. Corazón Sano (Grasa Visceral)
  let nivelCorazon: NivelMedalla = 'bronce';
  let desbloqueadaCorazon = false;
  let metaCorazon = 12;

  if (visceralActual <= 6) {
    nivelCorazon = 'diamante';
    desbloqueadaCorazon = true;
    metaCorazon = 6;
  } else if (visceralActual <= 8) {
    nivelCorazon = 'oro';
    desbloqueadaCorazon = true;
    metaCorazon = 8;
  } else if (visceralActual <= 10) {
    nivelCorazon = 'plata';
    desbloqueadaCorazon = true;
    metaCorazon = 10;
  } else if (visceralActual <= 12) {
    nivelCorazon = 'bronce';
    desbloqueadaCorazon = true;
    metaCorazon = 12;
  }

  medallas.push({
    id: 'corazon_sano',
    categoria: 'salud',
    titulo: 'Corazón Blindado',
    descripcion: desbloqueadaCorazon
      ? `Grasa visceral nivel ${visceralActual}. Tus órganos internos y corazón están en rango seguro.`
      : 'Lleva tu grasa visceral a nivel 12 o menos para proteger tus órganos vitales.',
    nivel: nivelCorazon,
    icono: 'Heart',
    desbloqueada: desbloqueadaCorazon,
    progresoActual: visceralActual,
    metaNivel: metaCorazon,
    unidad: 'nivel',
    esSecreta: false,
  });

  // 5. Fuente de Agua (Hidratación Celular)
  let nivelAgua: NivelMedalla = 'bronce';
  let desbloqueadaAgua = false;
  let metaAgua = 50;

  if (aguaActual >= 65) {
    nivelAgua = 'diamante';
    desbloqueadaAgua = true;
    metaAgua = 65;
  } else if (aguaActual >= 60) {
    nivelAgua = 'oro';
    desbloqueadaAgua = true;
    metaAgua = 60;
  } else if (aguaActual >= 55) {
    nivelAgua = 'plata';
    desbloqueadaAgua = true;
    metaAgua = 55;
  } else if (aguaActual >= 50) {
    nivelAgua = 'bronce';
    desbloqueadaAgua = true;
    metaAgua = 50;
  }

  medallas.push({
    id: 'fuente_agua',
    categoria: 'salud',
    titulo: 'Hidratación Óptima',
    descripcion: desbloqueadaAgua
      ? `Mantienes un ${aguaActual.toFixed(1)}% de agua corporal para máxima recuperación muscular.`
      : 'Alcanza al menos 50% de hidratación para desbloquear el nivel Bronce.',
    nivel: nivelAgua,
    icono: 'Droplets',
    desbloqueada: desbloqueadaAgua,
    progresoActual: Number(aguaActual.toFixed(1)),
    metaNivel: metaAgua,
    unidad: '% agua',
    esSecreta: false,
  });

  // 6. Disciplina y Constancia (Evaluaciones Consecutivas)
  let nivelDisciplina: NivelMedalla = 'bronce';
  let desbloqueadaDisciplina = false;
  let metaDisciplina = 2;

  if (totalEvals >= 12) {
    nivelDisciplina = 'diamante';
    desbloqueadaDisciplina = true;
    metaDisciplina = 12;
  } else if (totalEvals >= 6) {
    nivelDisciplina = 'oro';
    desbloqueadaDisciplina = true;
    metaDisciplina = 6;
  } else if (totalEvals >= 4) {
    nivelDisciplina = 'plata';
    desbloqueadaDisciplina = true;
    metaDisciplina = 4;
  } else if (totalEvals >= 2) {
    nivelDisciplina = 'bronce';
    desbloqueadaDisciplina = true;
    metaDisciplina = 2;
  }

  medallas.push({
    id: 'disciplina',
    categoria: 'constancia',
    titulo: 'Hábito de Hierro',
    descripcion: desbloqueadaDisciplina
      ? `Has completado ${totalEvals} evaluaciones de seguimiento con constancia ejemplar.`
      : 'Realiza al menos 2 evaluaciones mensuales para desbloquear este reconocimiento.',
    nivel: nivelDisciplina,
    icono: 'Calendar',
    desbloqueada: desbloqueadaDisciplina,
    progresoActual: totalEvals,
    metaNivel: metaDisciplina,
    unidad: 'evaluaciones',
    esSecreta: false,
  });

  // ==========================================================================
  // MEDALLAS SECRETAS
  // ==========================================================================

  // Secreta 1: Élite Corporal (Score >= 85)
  const esElite = scoreActual >= 85;
  medallas.push({
    id: 'elite_corporal',
    categoria: 'secreta',
    titulo: esElite ? 'Élite Corporal' : 'Misterio Oculto',
    descripcion: esElite
      ? '¡Fit Score legendario! Tu composición corporal está en el percentil superior del gimnasio.'
      : 'Alcanza una condición física de élite (Fit Score 85+) para revelar este trofeo.',
    nivel: 'diamante',
    icono: 'Trophy',
    desbloqueada: esElite,
    progresoActual: scoreActual,
    metaNivel: 85,
    unidad: 'Fit Score',
    esSecreta: !esElite,
  });

  // Secreta 2: Titán de Acero (Masa Muscular > 50% del peso)
  const esTitan = pctMusculoActual >= 50;
  medallas.push({
    id: 'titan',
    categoria: 'secreta',
    titulo: esTitan ? 'Titán de Acero' : 'Misterio Oculto',
    descripcion: esTitan
      ? 'Más del 50% de tu peso corporal es músculo activo. Una fuerza imparable.'
      : 'Desarrolla más del 50% de tu peso en masa muscular magra.',
    nivel: 'diamante',
    icono: 'Zap',
    desbloqueada: esTitan,
    progresoActual: Number(pctMusculoActual.toFixed(1)),
    metaNivel: 50,
    unidad: '% músculo',
    esSecreta: !esTitan,
  });

  // Secreta 3: Renacimiento Corporal (Músculo sube, grasa baja, visceral baja)
  const esRenacimiento =
    sorted.length >= 2 &&
    actual.masa_muscular_kg > primera.masa_muscular_kg &&
    actual.grasa_corporal_kg < primera.grasa_corporal_kg &&
    actual.grasa_visceral < primera.grasa_visceral;

  medallas.push({
    id: 'renacimiento',
    categoria: 'secreta',
    titulo: esRenacimiento ? 'Renacimiento Corporal' : 'Misterio Oculto',
    descripcion: esRenacimiento
      ? '¡Trifecta de recomposición! Subiste músculo, bajaste grasa corporal y redujiste grasa visceral a la vez.'
      : 'Logra la trifecta corporal: aumenta músculo, quema grasa y baja grasa visceral simultáneamente.',
    nivel: 'oro',
    icono: 'Sparkles',
    desbloqueada: esRenacimiento,
    progresoActual: esRenacimiento ? 1 : 0,
    metaNivel: 1,
    unidad: 'trifecta',
    esSecreta: !esRenacimiento,
  });

  // Ordenar: primero desbloqueadas (por nivel: diamante -> oro -> plata -> bronce), luego bloqueadas
  const pesoNivel: Record<NivelMedalla, number> = {
    diamante: 4,
    oro: 3,
    plata: 2,
    bronce: 1,
  };

  return medallas.sort((a, b) => {
    if (a.desbloqueada && !b.desbloqueada) return -1;
    if (!a.desbloqueada && b.desbloqueada) return 1;
    if (a.desbloqueada && b.desbloqueada) {
      return pesoNivel[b.nivel] - pesoNivel[a.nivel];
    }
    // Para bloqueadas, las secretas al final
    if (a.esSecreta && !b.esSecreta) return 1;
    if (!a.esSecreta && b.esSecreta) return -1;
    return (b.progresoActual / (b.metaNivel || 1)) - (a.progresoActual / (a.metaNivel || 1));
  });
}

// ==============================================================================
// MOTOR DEL SIMULADOR DE METAS Y PROYECCIÓN TEMPORAL
// ==============================================================================

export function calcularProyeccionMeta(
  evaluaciones: EvaluacionCorporal[],
  params: ObjetivoSimulador
): ProyeccionMeta {
  const { tipo, valorActual, valorObjetivo, frecuenciaSemanal } = params;

  // Frecuencia fisiológica entre 2 y 5 días a la semana
  const freq = Math.min(5, Math.max(2, frecuenciaSemanal || 3));

  let ritmoSemanal = 0;
  if (tipo === 'grasa') {
    // Reducción % de grasa por semana según frecuencia de entrenamiento
    const tablaGrasa: Record<number, number> = {
      2: 0.25,
      3: 0.35,
      4: 0.48,
      5: 0.58,
    };
    ritmoSemanal = tablaGrasa[freq] || 0.35;
  } else {
    // Aumento de masa muscular (kg) por semana según frecuencia de entrenamiento de fuerza
    const tablaMusculo: Record<number, number> = {
      2: 0.045,
      3: 0.065,
      4: 0.085,
      5: 0.105,
    };
    ritmoSemanal = tablaMusculo[freq] || 0.065;
  }

  const sorted =
    evaluaciones && evaluaciones.length > 0
      ? [...evaluaciones].sort(
          (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        )
      : [];

  const valorInicial =
    sorted.length > 0
      ? tipo === 'grasa'
        ? sorted[0].grasa_corporal_pct
        : sorted[0].masa_muscular_kg
      : valorActual;

  const distancia = Math.abs(valorActual - valorObjetivo);

  if (distancia < 0.1) {
    return {
      tipo,
      valorInicial,
      valorActual,
      valorObjetivo,
      ritmoSemanalEstimado: ritmoSemanal,
      semanasRestantes: 0,
      fechaEstimada: new Date().toISOString(),
      puntosCurva: [
        {
          fecha: new Date().toISOString(),
          valor: valorActual,
          esProyectado: false,
          etiqueta: 'Hoy',
        },
      ],
      mensajeMotivacional:
        '¡Estás exactamente en tu zona objetivo! Mantén tu constancia para consolidar este nivel.',
      estadoFactibilidad: 'mantenimiento',
    };
  }

  const semanasRestantes = Math.max(1, Math.round(distancia / ritmoSemanal));
  const msPorSemana = 7 * 24 * 60 * 60 * 1000;
  const hoyMs = Date.now();
  const fechaEstimada = new Date(hoyMs + semanasRestantes * msPorSemana).toISOString();

  // Generar puntos para la curva (históricos + checkpoints proyectados)
  const puntosCurva: PuntoProyeccion[] = [];

  sorted.forEach((ev, idx) => {
    puntosCurva.push({
      fecha: ev.fecha,
      valor: tipo === 'grasa' ? ev.grasa_corporal_pct : ev.masa_muscular_kg,
      esProyectado: false,
      etiqueta: idx === sorted.length - 1 ? 'Hoy' : undefined,
    });
  });

  if (puntosCurva.length === 0) {
    puntosCurva.push({
      fecha: new Date(hoyMs).toISOString(),
      valor: valorActual,
      esProyectado: false,
      etiqueta: 'Hoy',
    });
  }

  const numCheckpoints = Math.min(4, Math.max(2, Math.floor(semanasRestantes / 3)));
  const pasoSemanas = semanasRestantes / numCheckpoints;
  const pasoValor = (valorObjetivo - valorActual) / numCheckpoints;

  for (let i = 1; i < numCheckpoints; i++) {
    const sem = Math.round(i * pasoSemanas);
    const msFuturo = hoyMs + sem * msPorSemana;
    const valFuturo = Number((valorActual + i * pasoValor).toFixed(1));
    puntosCurva.push({
      fecha: new Date(msFuturo).toISOString(),
      valor: valFuturo,
      esProyectado: true,
      etiqueta: `Semana ${sem}`,
    });
  }

  puntosCurva.push({
    fecha: fechaEstimada,
    valor: valorObjetivo,
    esProyectado: true,
    etiqueta: '🎯 Meta',
  });

  const mesesAprox = (semanasRestantes / 4.3).toFixed(1);
  const estadoFactibilidad = semanasRestantes > 36 ? 'desafiante' : 'alcanzable';

  let mensajeMotivacional = '';
  if (tipo === 'grasa') {
    mensajeMotivacional = `A un ritmo constante de ${freq} sesiones semanales, alcanzarás el ${valorObjetivo}% de grasa en aprox. ${semanasRestantes} semanas (~${mesesAprox} meses). ¡Un objetivo completamente alcanzable con disciplina!`;
  } else {
    mensajeMotivacional = `Con ${freq} días de entrenamiento de fuerza por semana, alcanzarás ${valorObjetivo} kg de masa muscular en unas ${semanasRestantes} semanas (~${mesesAprox} meses). ¡Cada repetición cuenta!`;
  }

  return {
    tipo,
    valorInicial,
    valorActual,
    valorObjetivo,
    ritmoSemanalEstimado: ritmoSemanal,
    semanasRestantes,
    fechaEstimada,
    puntosCurva,
    mensajeMotivacional,
    estadoFactibilidad,
  };
}

// ==============================================================================
// MOTOR DE SIMETRÍA Y ZONAS DE CALOR PARA SILUETA ANATÓMICA
// ==============================================================================

function evaluarParSimetrico(
  nombrePar: 'Brazos' | 'Piernas',
  izqKg: number,
  derKg: number
): DetalleSimetriaPar {
  const diffKg = Number(Math.abs(izqKg - derKg).toFixed(1));
  const maxKg = Math.max(0.1, Math.max(izqKg, derKg));
  const indice = Math.min(100, Math.round((Math.min(izqKg, derKg) / maxKg) * 100));
  const diffPct = Math.round((diffKg / maxKg) * 100);

  let ladoDominante: 'izquierdo' | 'derecho' | 'equilibrado' = 'equilibrado';
  if (diffKg >= 0.1) {
    ladoDominante = izqKg > derKg ? 'izquierdo' : 'derecho';
  }

  const alerta = diffPct >= 10;
  let mensaje = `Excelente equilibrio bilateral en ${nombrePar.toLowerCase()} (${indice}% simetría).`;
  if (alerta) {
    mensaje = `Desbalance perceptible: tu lado ${ladoDominante} tiene +${diffKg} kg de músculo respecto al otro.`;
  } else if (ladoDominante !== 'equilibrado') {
    mensaje = `Simetría dentro de rango fisiológico normal con leve predominancia del lado ${ladoDominante}.`;
  }

  return {
    diferenciaKg: diffKg,
    diferenciaPct: diffPct,
    ladoDominante,
    indiceSimetriaPct: indice,
    alertaDesbalance: alerta,
    mensaje,
  };
}

export function analizarSimetriaCorporal(segmental: SegmentalData): AnalisisSimetria {
  const brazos = evaluarParSimetrico(
    'Brazos',
    segmental.brazo_izq.musculo_kg,
    segmental.brazo_der.musculo_kg
  );

  const piernas = evaluarParSimetrico(
    'Piernas',
    segmental.pierna_izq.musculo_kg,
    segmental.pierna_der.musculo_kg
  );

  let balanceGlobal: 'optimo' | 'leve_asimetria' | 'desbalance_atencion' = 'optimo';
  let resumen = 'Estructura muscular perfectamente equilibrada entre ambos hemisferios corporales.';

  if (brazos.alertaDesbalance || piernas.alertaDesbalance) {
    balanceGlobal = 'desbalance_atencion';
    resumen = 'Se detecta un desbalance muscular a corregir con ejercicios unilaterales (mancuernas y poleas).';
  } else if (brazos.ladoDominante !== 'equilibrado' || piernas.ladoDominante !== 'equilibrado') {
    balanceGlobal = 'leve_asimetria';
    resumen = 'Ligera asimetría natural cotidiana, sin riesgo lesivo.';
  }

  return {
    brazos,
    piernas,
    balanceGlobal,
    resumen,
  };
}

export function calcularZonasCalorSilueta(
  evaluacion: EvaluacionCorporal,
  modo: ModoSilueta
): Record<ExtremidadId, ZonaCalorSilueta> {
  const seg = evaluacion.segmental_data;

  const configZonas: Array<{ id: ExtremidadId; nombre: string; zona: typeof seg.tronco }> = [
    { id: 'brazo_izq', nombre: 'Brazo Izquierdo', zona: seg.brazo_izq },
    { id: 'brazo_der', nombre: 'Brazo Derecho', zona: seg.brazo_der },
    { id: 'tronco', nombre: 'Tronco / Abdomen', zona: seg.tronco },
    { id: 'pierna_izq', nombre: 'Pierna Izquierda', zona: seg.pierna_izq },
    { id: 'pierna_der', nombre: 'Pierna Derecha', zona: seg.pierna_der },
  ];

  const resultado = {} as Record<ExtremidadId, ZonaCalorSilueta>;

  configZonas.forEach(({ id, nombre, zona }) => {
    const musculoKg = zona.musculo_kg;
    const musculoPct = zona.musculo_pct || 100;
    const grasaKg = zona.grasa_kg || 0;
    const grasaPct = zona.grasa_pct || 100;

    // Clasificación Músculo: <90% Bajo, 90-110% Normal, >110% Desarrollado
    let nivelMusculo: 'bajo' | 'normal' | 'desarrollado' = 'normal';
    if (musculoPct > 110) nivelMusculo = 'desarrollado';
    else if (musculoPct < 90) nivelMusculo = 'bajo';

    // Clasificación Grasa: <80% Bajo, 80-160% Óptimo, >160% Elevado
    let nivelGrasa: 'bajo' | 'optimo' | 'elevado' = 'optimo';
    if (grasaPct > 160) nivelGrasa = 'elevado';
    else if (grasaPct < 80) nivelGrasa = 'bajo';

    let colorHex = '#10b981';
    let colorClase = 'text-emerald-400 bg-emerald-500/20 border-emerald-400/40';
    let descripcionEstado = '';

    if (modo === 'musculo') {
      if (nivelMusculo === 'desarrollado') {
        colorHex = '#38bdf8'; // Cyan deportivo brillante
        colorClase = 'text-cyan-400 bg-cyan-500/20 border-cyan-400/40';
        descripcionEstado = 'Masa muscular desarrollada y tonificada sobre el promedio.';
      } else if (nivelMusculo === 'normal') {
        colorHex = '#10b981'; // Esmeralda saludable
        colorClase = 'text-emerald-400 bg-emerald-500/20 border-emerald-400/40';
        descripcionEstado = 'Nivel de masa muscular en rango estándar óptimo.';
      } else {
        colorHex = '#71717a'; // Zinc / atenuado
        colorClase = 'text-zinc-400 bg-zinc-800/40 border-zinc-600/40';
        descripcionEstado = 'Zona con potencial para ganar mayor masa y fuerza.';
      }
    } else {
      // Modo Grasa
      if (nivelGrasa === 'elevado') {
        colorHex = '#f87171'; // Rojo / Naranja
        colorClase = 'text-red-400 bg-red-500/20 border-red-400/40';
        descripcionEstado = 'Porcentaje de grasa segmental elevado. Zona prioritaria para definición.';
      } else if (nivelGrasa === 'optimo') {
        colorHex = '#fbbf24'; // Ámbar dorado de Trankilandia
        colorClase = 'text-amber-400 bg-amber-500/20 border-amber-400/40';
        descripcionEstado = 'Nivel de grasa segmental dentro de límites saludables estándar.';
      } else {
        colorHex = '#06b6d4'; // Cyan atlético / bajo
        colorClase = 'text-cyan-400 bg-cyan-500/20 border-cyan-400/40';
        descripcionEstado = 'Bajo porcentaje de grasa en esta extremidad (condición definida).';
      }
    }

    resultado[id] = {
      id,
      nombre,
      musculoKg,
      musculoPct,
      grasaKg,
      grasaPct,
      nivelMusculo,
      nivelGrasa,
      colorHex,
      colorClase,
      descripcionEstado,
    };
  });

  return resultado;
}

// ==============================================================================
// MOTOR DE STORY CARD (DESTILACIÓN DE MÉTRICAS PUBLICITARIAS PARA REDES)
// ==============================================================================

export function prepararDatosStoryCard(
  evaluacion: EvaluacionCorporal,
  medallas: MedallaLogro[],
  acumulado: ProgresoAcumulado,
  socioNombre?: string
): DatosStoryCard {
  const fechaFormateada = new Date(evaluacion.fecha).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // 1. Determinar métrica más destacada e impactante
  let metricaDestacada: MetricaDestacadaStory = {
    tipo: 'fit_score',
    valorPrincipal: `${evaluacion.puntuacion_corporal} PTS`,
    etiqueta: 'FIT SCORE',
    colorHex: '#F59E0B',
  };

  if (acumulado.delta_grasa_kg <= -0.8) {
    metricaDestacada = {
      tipo: 'grasa_quemada',
      valorPrincipal: `${acumulado.delta_grasa_kg} KG`,
      etiqueta: 'GRASA QUEMADA',
      colorHex: '#F59E0B',
    };
  } else if (acumulado.delta_musculo_kg >= 0.8) {
    metricaDestacada = {
      tipo: 'musculo_ganado',
      valorPrincipal: `+${acumulado.delta_musculo_kg} KG`,
      etiqueta: 'MÚSCULO GANADO',
      colorHex: '#10B981',
    };
  }

  // 2. Seleccionar la medalla desbloqueada de mayor nivel
  let medallaDestacada: MedallaDestacadaStory | undefined = undefined;
  const pesoNivel: Record<string, number> = {
    diamante: 4,
    oro: 3,
    plata: 2,
    bronce: 1,
  };

  const desbloqueadas = medallas.filter((m) => m.desbloqueada);
  if (desbloqueadas.length > 0) {
    const mejor = [...desbloqueadas].sort((a, b) => {
      return (pesoNivel[b.nivel] || 1) - (pesoNivel[a.nivel] || 1);
    })[0];

    medallaDestacada = {
      titulo: mejor.titulo,
      nivel: mejor.nivel,
      categoria: mejor.categoria,
    };
  }

  const hashtags = [
    '#TrankilandiaGym',
    '#MiEvolución',
    `#FitScore${evaluacion.puntuacion_corporal}`,
    '#Bioimpedancia8Electrodos',
  ];

  return {
    socioNombre,
    fechaFormateada,
    fitScore: evaluacion.puntuacion_corporal,
    metricaDestacada,
    pesoKg: Number(evaluacion.peso_kg.toFixed(1)),
    musculoKg: Number(evaluacion.masa_muscular_kg.toFixed(1)),
    grasaPct: Number(evaluacion.grasa_corporal_pct.toFixed(1)),
    grasaVisceral: evaluacion.grasa_visceral,
    medallaDestacada,
    hashtags,
  };
}




