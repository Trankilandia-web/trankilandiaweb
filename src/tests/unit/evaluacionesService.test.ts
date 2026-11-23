import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
  isSupabaseConfigured: () => false,
}));

import {
  guardarEvaluacion,
  obtenerHistorialEvaluaciones,
  obtenerUltimaEvaluacion,
  actualizarEstaturaSocio,
  actualizarBiometriaSocio,
  STORAGE_KEY_EVALUACIONES,
} from '../../lib/evaluacionesService';
import { EvaluacionCorporal, crearSegmentalDataDefault } from '../../types/evaluacion';

describe('Servicio de Persistencia y Caché Local-First (evaluacionesService)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockEval: EvaluacionCorporal = {
    id: 'eval-mock-1',
    socio_id: 'MEM-TEST-001',
    socio_dni: '99990001',
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
    evaluador_id: 'staff-test',
    evaluador_nombre: 'Coach Test',
    origen: 'bluetooth_g78',
  };

  it('guardarEvaluacion debe persistir en localStorage de forma local-first', async () => {
    const res = await guardarEvaluacion(mockEval);
    expect(res.success).toBe(true);

    const guardadas = JSON.parse(localStorage.getItem(STORAGE_KEY_EVALUACIONES) || '[]');
    expect(guardadas.length).toBe(1);
    expect(guardadas[0].socio_dni).toBe('99990001');
  });

  it('obtenerHistorialEvaluaciones debe filtrar por DNI y ordenar de más reciente a más antigua', async () => {
    const evalAntigua: EvaluacionCorporal = {
      ...mockEval,
      id: 'eval-mock-0',
      fecha: '2026-10-20T10:00:00.000Z',
      peso_kg: 76.5,
    };

    const evalOtroSocio: EvaluacionCorporal = {
      ...mockEval,
      id: 'eval-mock-otro',
      socio_dni: '88880002',
      fecha: '2026-11-19T10:00:00.000Z',
    };

    await guardarEvaluacion(evalAntigua);
    await guardarEvaluacion(mockEval);
    await guardarEvaluacion(evalOtroSocio);

    const historial = await obtenerHistorialEvaluaciones('99990001');
    expect(historial.length).toBe(2);
    // El más reciente primero
    expect(historial[0].id).toBe('eval-mock-1');
    expect(historial[1].id).toBe('eval-mock-0');
  });

  it('obtenerUltimaEvaluacion debe retornar la medición más reciente del socio o null', async () => {
    const inexistente = await obtenerUltimaEvaluacion('00000000');
    expect(inexistente).toBeNull();

    await guardarEvaluacion(mockEval);
    const ultima = await obtenerUltimaEvaluacion('99990001');
    expect(ultima).not.toBeNull();
    expect(ultima?.peso_kg).toBe(75.0);
  });

  it('actualizarEstaturaSocio debe actualizar la estatura sin lanzar excepciones', async () => {
    await expect(actualizarEstaturaSocio('MEM-TEST-001', 175)).resolves.not.toThrow();
  });

  it('actualizarBiometriaSocio debe actualizar estatura, edad y sexo localmente y persistir', async () => {
    const ok = await actualizarBiometriaSocio('MEM-TEST-001', {
      estatura_cm: 168,
      edad: 32,
      sexo: 'Femenino',
      socio_dni: '99990001',
    });
    expect(ok).toBe(true);
  });
});
