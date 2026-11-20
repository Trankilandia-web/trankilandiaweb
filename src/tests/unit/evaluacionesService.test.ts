import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  guardarEvaluacion,
  obtenerHistorialEvaluaciones,
  obtenerUltimaEvaluacion,
  actualizarEstaturaSocio,
  STORAGE_KEY_EVALUACIONES,
} from '../../lib/evaluacionesService';
import { EvaluacionCorporal, crearSegmentalDataDefault } from '../../types/evaluacion';

describe('Servicio de Persistencia y Caché Local-First (evaluacionesService)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockEval: EvaluacionCorporal = {
    id: 'eval-test-1',
    socio_id: 'MEM-001',
    socio_dni: '70447087',
    fecha: '2026-11-20T10:00:00.000Z',
    estatura_cm: 175,
    edad: 28,
    sexo: 'Masculino',
    peso_kg: 75.0,
    imc: 24.5,
    grasa_corporal_pct: 16.0,
    grasa_corporal_kg: 12.0,
    masa_muscular_kg: 35.5,
    masa_muscular_pct: 47.3,
    grasa_visceral: 6,
    agua_pct: 58.2,
    masa_osea_kg: 3.45,
    bmr_kcal: 1730,
    edad_metabolica: 25,
    proteina_pct: 18.5,
    puntuacion_corporal: 82,
    segmental_data: crearSegmentalDataDefault(),
    evaluador_id: 'staff-luis',
    evaluador_nombre: 'Luis Lloclla',
    origen: 'bluetooth_g78',
  };

  it('guardarEvaluacion debe persistir en localStorage de forma local-first', async () => {
    const res = await guardarEvaluacion(mockEval);
    expect(res.success).toBe(true);

    const guardadas = JSON.parse(localStorage.getItem(STORAGE_KEY_EVALUACIONES) || '[]');
    expect(guardadas.length).toBe(1);
    expect(guardadas[0].socio_dni).toBe('70447087');
  });

  it('obtenerHistorialEvaluaciones debe filtrar por DNI y ordenar de más reciente a más antigua', async () => {
    const evalAntigua: EvaluacionCorporal = {
      ...mockEval,
      id: 'eval-test-0',
      fecha: '2026-10-20T10:00:00.000Z',
      peso_kg: 76.5,
    };

    const evalOtroSocio: EvaluacionCorporal = {
      ...mockEval,
      id: 'eval-test-otro',
      socio_dni: '12345678',
      fecha: '2026-11-19T10:00:00.000Z',
    };

    await guardarEvaluacion(evalAntigua);
    await guardarEvaluacion(mockEval);
    await guardarEvaluacion(evalOtroSocio);

    const historial = await obtenerHistorialEvaluaciones('70447087');
    expect(historial.length).toBe(2);
    // El más reciente primero
    expect(historial[0].id).toBe('eval-test-1');
    expect(historial[1].id).toBe('eval-test-0');
  });

  it('obtenerUltimaEvaluacion debe retornar la medición más reciente del socio o null', async () => {
    const inexistente = await obtenerUltimaEvaluacion('99999999');
    expect(inexistente).toBeNull();

    await guardarEvaluacion(mockEval);
    const ultima = await obtenerUltimaEvaluacion('70447087');
    expect(ultima).not.toBeNull();
    expect(ultima?.peso_kg).toBe(75.0);
  });
});
