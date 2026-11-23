import { describe, it, expect } from 'vitest';
import {
  calcularMetricasCompletas,
  calcularDeltasMensuales,
  determinarDiagnostico,
  calcularPuntuacionCorporal,
  calcularProgresoAcumulado,
  generarSintesisSaludCotidiana,
  generarDiagnosticoRecomposicionDetallada,
  EntradaMedicion,
} from '../../lib/bioimpedanceEngine';
import { EvaluacionCorporal } from '../../types/evaluacion';

describe('Motor de Bioimpedancia y Diagnóstico de Recomposición (bioimpedanceEngine)', () => {
  const mockEntrada: EntradaMedicion = {
    socio_id: 'MEM-001',
    socio_dni: '70447087',
    peso_kg: 75.0,
    estatura_cm: 175,
    edad: 28,
    sexo: 'Masculino',
    evaluador_id: 'staff-luis',
    evaluador_nombre: 'Luis Lloclla',
    origen: 'bluetooth_g78',
    grasa_corporal_pct: 16.0,
    masa_muscular_kg: 35.5,
  };

  it('calcularMetricasCompletas debe derivar IMC, BMR, masa grasa y puntuación corporal', () => {
    const evaluacion = calcularMetricasCompletas(mockEntrada);

    expect(evaluacion.socio_dni).toBe('70447087');
    expect(evaluacion.peso_kg).toBe(75.0);
    // IMC = 75 / (1.75^2) = 24.5
    expect(evaluacion.imc).toBe(24.5);
    // Masa grasa en kg = 75 * 0.16 = 12.0 kg
    expect(evaluacion.grasa_corporal_kg).toBe(12.0);
    expect(evaluacion.bmr_kcal).toBeGreaterThan(1500);
    expect(evaluacion.agua_pct).toBeGreaterThan(50);
    expect(evaluacion.puntuacion_corporal).toBeGreaterThan(50);
    expect(evaluacion.segmental_data).toBeDefined();
    expect(evaluacion.segmental_data.brazo_der.musculo_kg).toBeGreaterThan(0);
  });

  it('calcularDeltasMensuales debe calcular correctamente las diferencias entre dos evaluaciones', () => {
    const evalAnterior: EvaluacionCorporal = {
      ...calcularMetricasCompletas(mockEntrada),
      fecha: '2026-10-15T10:00:00.000Z',
      peso_kg: 76.0,
      masa_muscular_kg: 34.0,
      grasa_corporal_pct: 18.0,
      grasa_corporal_kg: 13.68,
      grasa_visceral: 7,
      puntuacion_corporal: 72,
    };

    const evalActual: EvaluacionCorporal = {
      ...calcularMetricasCompletas(mockEntrada),
      fecha: '2026-11-15T10:00:00.000Z',
      peso_kg: 75.0, // Bajó 1.0 kg de peso
      masa_muscular_kg: 35.5, // Subió +1.5 kg de músculo
      grasa_corporal_pct: 16.0, // Bajó -2.0% de grasa
      grasa_corporal_kg: 12.0, // Bajó -1.68 kg de grasa
      grasa_visceral: 6, // Bajó 1 nivel
      puntuacion_corporal: 78,
    };

    const deltas = calcularDeltasMensuales(evalActual, evalAnterior);
    expect(deltas).not.toBeNull();
    expect(deltas?.delta_peso_kg).toBe(-1.0);
    expect(deltas?.delta_musculo_kg).toBe(1.5);
    expect(deltas?.delta_grasa_pct).toBe(-2.0);
    expect(deltas?.delta_visceral).toBe(-1);
    expect(deltas?.delta_score).toBe(6);
    expect(deltas?.dias_diferencia).toBe(31);
  });

  it('determinarDiagnostico debe clasificar Recomposición Corporal cuando sube músculo y baja grasa', () => {
    const deltas = {
      dias_diferencia: 30,
      delta_peso_kg: -0.2,
      delta_musculo_kg: 1.2,
      delta_grasa_pct: -1.8,
      delta_grasa_kg: -1.4,
      delta_visceral: -1,
      delta_agua_pct: 0.8,
      delta_bmr_kcal: 26,
      delta_score: 5,
    };

    const evalActual = calcularMetricasCompletas(mockEntrada);
    const diag = determinarDiagnostico(deltas, evalActual);

    expect(diag.tipo).toBe('recomposicion');
    expect(diag.titulo).toContain('Recomposición');
    expect(diag.descripcion).toContain('grasa');
  });

  it('determinarDiagnostico debe clasificar Hipertrofia Limpia cuando sube músculo significativamente sin ganar grasa excesiva', () => {
    const deltas = {
      dias_diferencia: 30,
      delta_peso_kg: 1.5,
      delta_musculo_kg: 1.4,
      delta_grasa_pct: 0.1,
      delta_grasa_kg: 0.1,
      delta_visceral: 0,
      delta_agua_pct: 0.2,
      delta_bmr_kcal: 30,
      delta_score: 4,
    };

    const evalActual = calcularMetricasCompletas(mockEntrada);
    const diag = determinarDiagnostico(deltas, evalActual);

    expect(diag.tipo).toBe('hipertrofia');
    expect(diag.titulo).toContain('Hipertrofia');
  });

  it('calcularPuntuacionCorporal debe generar una puntuación razonable entre 0 y 100', () => {
    const scoreHombreFit = calcularPuntuacionCorporal(75, 14, 48, 'Masculino', 25);
    expect(scoreHombreFit).toBeGreaterThanOrEqual(80);
    expect(scoreHombreFit).toBeLessThanOrEqual(100);

    const scoreHombreSedentario = calcularPuntuacionCorporal(95, 32, 33, 'Masculino', 40);
    expect(scoreHombreSedentario).toBeLessThan(70);
  });

  it('calcularProgresoAcumulado debe calcular el impacto total desde la primera evaluación', () => {
    const primera: EvaluacionCorporal = {
      ...calcularMetricasCompletas(mockEntrada),
      fecha: '2026-08-15T10:00:00.000Z',
      peso_kg: 82.0,
      masa_muscular_kg: 33.0,
      grasa_corporal_kg: 18.0,
      grasa_corporal_pct: 22.0,
      grasa_visceral: 9,
      puntuacion_corporal: 68,
    };

    const actual: EvaluacionCorporal = {
      ...calcularMetricasCompletas(mockEntrada),
      fecha: '2026-11-15T10:00:00.000Z',
      peso_kg: 75.0,
      masa_muscular_kg: 35.5,
      grasa_corporal_kg: 12.0,
      grasa_corporal_pct: 16.0,
      grasa_visceral: 6,
      puntuacion_corporal: 82,
    };

    const acumulado = calcularProgresoAcumulado(primera, actual);
    expect(acumulado.delta_grasa_kg).toBe(-6.0); // Perdió 6kg de grasa
    expect(acumulado.delta_musculo_kg).toBe(2.5); // Ganó 2.5kg de músculo
    expect(acumulado.delta_peso_kg).toBe(-7.0);
    expect(acumulado.delta_visceral).toBe(-3);
    expect(acumulado.dias_totales).toBeGreaterThanOrEqual(90);
    expect(acumulado.meta_progreso_pct).toBeGreaterThan(0);
  });

  it('generarSintesisSaludCotidiana debe producir explicaciones claras para móvil sin tecnicismos', () => {
    const evaluacion = calcularMetricasCompletas({
      ...mockEntrada,
      peso_kg: 80.0,
      grasa_visceral: 6,
      agua_pct: 54.0,
      bmr_kcal: 1750,
    });

    const sintesis = generarSintesisSaludCotidiana(evaluacion);
    expect(sintesis.visceral.estado).toBe('optimo');
    expect(sintesis.visceral.titulo).toContain('Seguro');
    expect(sintesis.visceral.queSignifica).toBeTruthy();
    expect(sintesis.visceral.accionPractica).toBeTruthy();
    expect(sintesis.metabolismo.bmr_kcal).toBe(1750);
    expect(sintesis.metabolismo.descripcion).toContain('calorías');
    expect(sintesis.metabolismo.queSignifica).toBeTruthy();
    expect(sintesis.metabolismo.accionPractica).toBeTruthy();
    expect(sintesis.hidratacion.litros_recomendados).toBeGreaterThan(2);
    expect(sintesis.proteina.gramos_sugeridos).toBeGreaterThan(50);
    expect(sintesis.proteina.ejemploComida).toContain('huevos');
    expect(sintesis.fraseImpacto).toBeTruthy();
    expect(sintesis.rangoGrasa).toBeDefined();
    expect(sintesis.rangoMusculo).toBeDefined();
    expect(sintesis.rangoPeso).toBeDefined();
    expect(sintesis.recomposicionDetallada).toBeDefined();
  });

  it('interpretarRangoGrasa, Musculo y Peso deben clasificar con rigor pedagógico y deportivo', () => {
    const evaluacion = {
      ...calcularMetricasCompletas(mockEntrada),
      id: 'eval-actual-1',
    };
    const primera: EvaluacionCorporal = {
      ...evaluacion,
      id: 'eval-primera-1',
      peso_kg: 78.0,
      masa_muscular_kg: 34.0,
      grasa_corporal_kg: 15.0,
      grasa_corporal_pct: 19.2,
    };

    const recomposicion = generarDiagnosticoRecomposicionDetallada(evaluacion, primera);
    expect(recomposicion.titulo).toContain('Recomposición');
    expect(recomposicion.resumen).toContain('grasa pura');
    expect(recomposicion.consejoCoach).toBeTruthy();
    expect(recomposicion.enfoqueSugerido).toBeTruthy();
  });
});
