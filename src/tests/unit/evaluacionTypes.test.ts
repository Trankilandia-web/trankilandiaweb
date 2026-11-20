import { describe, it, expect } from 'vitest';
import {
  validarBiometriaBase,
  validarMetricasEvaluacion,
  crearSegmentalDataDefault,
  EvaluacionCorporal,
} from '../../types/evaluacion';

describe('Validaciones y Tipos de Evaluación Corporal (EUROMAR G78-BT)', () => {
  it('validarBiometriaBase debe aprobar estatura, edad y sexo válidos', () => {
    const res = validarBiometriaBase(175, 28, 'Masculino');
    expect(res.valido).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it('validarBiometriaBase debe rechazar estaturas fuera de rango (100 - 240 cm)', () => {
    const muyBaja = validarBiometriaBase(80, 25, 'Femenino');
    expect(muyBaja.valido).toBe(false);
    expect(muyBaja.error).toContain('estatura');

    const muyAlta = validarBiometriaBase(260, 25, 'Femenino');
    expect(muyAlta.valido).toBe(false);
    expect(muyAlta.error).toContain('estatura');
  });

  it('validarBiometriaBase debe rechazar edades fuera de rango (10 - 99 años)', () => {
    const muyJoven = validarBiometriaBase(160, 8, 'Femenino');
    expect(muyJoven.valido).toBe(false);
    expect(muyJoven.error).toContain('edad');

    const muyMayor = validarBiometriaBase(160, 110, 'Masculino');
    expect(muyMayor.valido).toBe(false);
    expect(muyMayor.error).toContain('edad');
  });

  it('crearSegmentalDataDefault debe retornar las 5 zonas anatómicas con valores iniciales', () => {
    const segmental = crearSegmentalDataDefault();
    expect(segmental.brazo_izq).toBeDefined();
    expect(segmental.brazo_der).toBeDefined();
    expect(segmental.pierna_izq).toBeDefined();
    expect(segmental.pierna_der).toBeDefined();
    expect(segmental.tronco).toBeDefined();

    expect(segmental.brazo_izq.musculo_kg).toBe(0);
    expect(segmental.brazo_izq.grasa_pct).toBe(0);
  });

  it('validarMetricasEvaluacion debe validar consistencia de peso y porcentajes', () => {
    const evaluacionValida: Partial<EvaluacionCorporal> = {
      peso_kg: 74.5,
      grasa_corporal_pct: 16.5,
      masa_muscular_kg: 35.2,
      grasa_visceral: 6,
      agua_pct: 58.2,
      estatura_cm: 175,
      edad: 28,
      sexo: 'Masculino',
    };

    const res = validarMetricasEvaluacion(evaluacionValida);
    expect(res.valido).toBe(true);
  });

  it('validarMetricasEvaluacion debe rechazar porcentajes ilógicos de grasa corporal', () => {
    const evaluacionInvalida: Partial<EvaluacionCorporal> = {
      peso_kg: 74.5,
      grasa_corporal_pct: 85, // Irrealmente alto para persona viva en gimnasio
      masa_muscular_kg: 35.2,
      estatura_cm: 175,
      edad: 28,
      sexo: 'Masculino',
    };

    const res = validarMetricasEvaluacion(evaluacionInvalida);
    expect(res.valido).toBe(false);
    expect(res.error).toContain('grasa');
  });
});
