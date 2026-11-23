import { describe, it, expect } from 'vitest';
import { calcularProyeccionMeta } from '../../lib/bioimpedanceEngine';
import { EvaluacionCorporal, ObjetivoSimulador } from '../../types/evaluacion';

function mockEval(overrides: Partial<EvaluacionCorporal> = {}): EvaluacionCorporal {
  return {
    id: 'eval-1',
    socio_id: 'socio-1',
    socio_dni: '70447087',
    fecha: '2026-01-01T10:00:00.000Z',
    estatura_cm: 175,
    edad: 28,
    sexo: 'Masculino',
    peso_kg: 80,
    imc: 26.1,
    grasa_corporal_pct: 25.0,
    grasa_corporal_kg: 20.0,
    masa_muscular_kg: 34.0,
    masa_muscular_pct: 42.5,
    grasa_visceral: 10,
    agua_pct: 53.0,
    masa_osea_kg: 3.2,
    bmr_kcal: 1720,
    edad_metabolica: 29,
    proteina_pct: 18.0,
    puntuacion_corporal: 74,
    segmental_data: {
      brazo_izq: { musculo_kg: 2.9, grasa_pct: 16 },
      brazo_der: { musculo_kg: 2.9, grasa_pct: 16 },
      pierna_izq: { musculo_kg: 8.2, grasa_pct: 19 },
      pierna_der: { musculo_kg: 8.2, grasa_pct: 19 },
      tronco: { musculo_kg: 23.0, grasa_pct: 22 },
    },
    evaluador_id: 'coach-1',
    evaluador_nombre: 'Coach Carlos',
    origen: 'bluetooth_g78',
    ...overrides,
  };
}

describe('Motor del Simulador de Metas (calcularProyeccionMeta)', () => {
  it('calcula proyección de grasa corporal con ritmo seguro y frecuencia semanal', () => {
    const ev1 = mockEval({ grasa_corporal_pct: 25.0 });
    const objetivo: ObjetivoSimulador = {
      tipo: 'grasa',
      valorActual: 25.0,
      valorObjetivo: 20.0, // Reducir 5% de grasa
      frecuenciaSemanal: 3,
    };

    const resultado = calcularProyeccionMeta([ev1], objetivo);

    expect(resultado.tipo).toBe('grasa');
    expect(resultado.valorActual).toBe(25.0);
    expect(resultado.valorObjetivo).toBe(20.0);
    expect(resultado.ritmoSemanalEstimado).toBeGreaterThan(0.2);
    expect(resultado.semanasRestantes).toBeGreaterThan(0);
    expect(resultado.fechaEstimada).toBeDefined();
    expect(resultado.puntosCurva.length).toBeGreaterThanOrEqual(2);
    expect(resultado.puntosCurva[resultado.puntosCurva.length - 1].valor).toBe(20.0);
    expect(resultado.estadoFactibilidad).toBe('alcanzable');
  });

  it('ajusta la velocidad según la frecuencia de entrenamiento (4x es más rápido que 2x)', () => {
    const ev1 = mockEval({ grasa_corporal_pct: 24.0 });
    const obj2x: ObjetivoSimulador = {
      tipo: 'grasa',
      valorActual: 24.0,
      valorObjetivo: 18.0,
      frecuenciaSemanal: 2,
    };
    const obj4x: ObjetivoSimulador = {
      tipo: 'grasa',
      valorActual: 24.0,
      valorObjetivo: 18.0,
      frecuenciaSemanal: 4,
    };

    const res2x = calcularProyeccionMeta([ev1], obj2x);
    const res4x = calcularProyeccionMeta([ev1], obj4x);

    expect(res4x.ritmoSemanalEstimado).toBeGreaterThan(res2x.ritmoSemanalEstimado);
    expect(res4x.semanasRestantes).toBeLessThan(res2x.semanasRestantes);
  });

  it('identifica estado de mantenimiento si el valor actual ya está en el objetivo', () => {
    const ev1 = mockEval({ grasa_corporal_pct: 18.0 });
    const obj: ObjetivoSimulador = {
      tipo: 'grasa',
      valorActual: 18.0,
      valorObjetivo: 18.0,
      frecuenciaSemanal: 3,
    };

    const res = calcularProyeccionMeta([ev1], obj);
    expect(res.estadoFactibilidad).toBe('mantenimiento');
    expect(res.semanasRestantes).toBe(0);
  });

  it('calcula proyección de ganancia de masa muscular', () => {
    const ev1 = mockEval({ masa_muscular_kg: 32.0 });
    const obj: ObjetivoSimulador = {
      tipo: 'musculo',
      valorActual: 32.0,
      valorObjetivo: 34.0, // +2 kg músculo
      frecuenciaSemanal: 4,
    };

    const res = calcularProyeccionMeta([ev1], obj);
    expect(res.tipo).toBe('musculo');
    expect(res.ritmoSemanalEstimado).toBeGreaterThan(0.04);
    expect(res.semanasRestantes).toBeGreaterThan(10);
    expect(res.puntosCurva[res.puntosCurva.length - 1].valor).toBe(34.0);
  });
});
