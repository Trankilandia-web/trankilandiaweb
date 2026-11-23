import { describe, it, expect } from 'vitest';
import { prepararDatosStoryCard } from '../../lib/bioimpedanceEngine';
import { EvaluacionCorporal, MedallaLogro, ProgresoAcumulado } from '../../types/evaluacion';

function mockEval(overrides: Partial<EvaluacionCorporal> = {}): EvaluacionCorporal {
  return {
    id: 'eval-story-1',
    socio_id: 'socio-1',
    socio_dni: '70447087',
    fecha: '2026-01-15T10:00:00.000Z',
    estatura_cm: 175,
    edad: 28,
    sexo: 'Masculino',
    peso_kg: 78.5,
    imc: 25.6,
    grasa_corporal_pct: 18.2,
    grasa_corporal_kg: 14.3,
    masa_muscular_kg: 36.2,
    masa_muscular_pct: 46.1,
    grasa_visceral: 7,
    agua_pct: 56.5,
    masa_osea_kg: 3.2,
    bmr_kcal: 1780,
    edad_metabolica: 25,
    proteina_pct: 19.0,
    puntuacion_corporal: 86,
    segmental_data: {
      brazo_izq: { musculo_kg: 3.2, grasa_pct: 14 },
      brazo_der: { musculo_kg: 3.2, grasa_pct: 14 },
      tronco: { musculo_kg: 24.8, grasa_pct: 18 },
      pierna_izq: { musculo_kg: 8.8, grasa_pct: 16 },
      pierna_der: { musculo_kg: 8.8, grasa_pct: 16 },
    },
    evaluador_id: 'coach-1',
    evaluador_nombre: 'Coach Carlos',
    origen: 'bluetooth_g78',
    ...overrides,
  };
}

describe('Motor de Preparación de Datos para Story Card (prepararDatosStoryCard)', () => {
  it('destaca pérdida de grasa si la grasa quemada acumulada es significativa', () => {
    const ev = mockEval();
    const acumulado: ProgresoAcumulado = {
      delta_grasa_kg: -4.2,
      delta_musculo_kg: 0.5,
      delta_peso_kg: -3.7,
      delta_visceral: -2,
      delta_score: 8,
      dias_totales: 60,
      meta_progreso_pct: 75,
    };

    const datos = prepararDatosStoryCard(ev, [], acumulado, 'Luis Gerardo');

    expect(datos.socioNombre).toBe('Luis Gerardo');
    expect(datos.metricaDestacada.tipo).toBe('grasa_quemada');
    expect(datos.metricaDestacada.valorPrincipal).toBe('-4.2 KG');
    expect(datos.metricaDestacada.etiqueta).toBe('GRASA QUEMADA');
  });

  it('destaca ganancia de masa muscular si el socio incrementó volumen magro', () => {
    const ev = mockEval();
    const acumulado: ProgresoAcumulado = {
      delta_grasa_kg: -0.2,
      delta_musculo_kg: 2.8,
      delta_peso_kg: 2.6,
      delta_visceral: 0,
      delta_score: 6,
      dias_totales: 45,
      meta_progreso_pct: 80,
    };

    const datos = prepararDatosStoryCard(ev, [], acumulado);

    expect(datos.metricaDestacada.tipo).toBe('musculo_ganado');
    expect(datos.metricaDestacada.valorPrincipal).toBe('+2.8 KG');
    expect(datos.metricaDestacada.etiqueta).toBe('MÚSCULO GANADO');
  });

  it('selecciona la medalla desbloqueada de mayor prestigio (ej. Diamante u Oro)', () => {
    const ev = mockEval();
    const acumulado: ProgresoAcumulado = {
      delta_grasa_kg: 0,
      delta_musculo_kg: 0,
      delta_peso_kg: 0,
      delta_visceral: 0,
      delta_score: 0,
      dias_totales: 1,
      meta_progreso_pct: 10,
    };

    const medallas: MedallaLogro[] = [
      {
        id: 'primera_evaluacion',
        categoria: 'constancia',
        titulo: 'Primera Huella',
        descripcion: 'Iniciaste tu camino.',
        nivel: 'bronce',
        icono: 'Flag',
        desbloqueada: true,
        progresoActual: 1,
        metaNivel: 1,
        unidad: 'evaluación',
      },
      {
        id: 'elite_corporal',
        categoria: 'secreta',
        titulo: 'Élite Corporal',
        descripcion: 'Fit Score legendario.',
        nivel: 'diamante',
        icono: 'Trophy',
        desbloqueada: true,
        progresoActual: 86,
        metaNivel: 85,
        unidad: 'score',
      },
    ];

    const datos = prepararDatosStoryCard(ev, medallas, acumulado);

    expect(datos.medallaDestacada).toBeDefined();
    expect(datos.medallaDestacada?.titulo).toBe('Élite Corporal');
    expect(datos.medallaDestacada?.nivel).toBe('diamante');
  });

  it('incluye hashtags y fecha legible para las redes sociales', () => {
    const ev = mockEval();
    const acumulado: ProgresoAcumulado = {
      delta_grasa_kg: 0,
      delta_musculo_kg: 0,
      delta_peso_kg: 0,
      delta_visceral: 0,
      delta_score: 0,
      dias_totales: 1,
      meta_progreso_pct: 10,
    };

    const datos = prepararDatosStoryCard(ev, [], acumulado);

    expect(datos.hashtags).toContain('#TrankilandiaGym');
    expect(datos.hashtags.some((h) => h.includes('#FitScore86'))).toBe(true);
    expect(datos.fechaFormateada).toBeDefined();
  });
});
