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

import { render, screen } from '@testing-library/react';
import EvolucionCorporalView from '../../components/portal/EvolucionCorporalView';
import { guardarEvaluacion } from '../../lib/evaluacionesService';
import { calcularMetricasCompletas } from '../../lib/bioimpedanceEngine';

describe('Componente EvolucionCorporalView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('debe mostrar estado vacío amigable si el socio aún no tiene evaluaciones', async () => {
    render(<EvolucionCorporalView socioDni="99999999" />);

    expect(await screen.findByText(/Sin Evaluaciones Registradas/i, {}, { timeout: 4000 })).toBeDefined();
    expect(await screen.findByText(/Acércate a recepción/i, {}, { timeout: 4000 })).toBeDefined();
  });

  it('debe renderizar el diagnóstico y métricas cuando existen evaluaciones', async () => {
    const evaluacion = calcularMetricasCompletas({
      id: 'eval-mock-unit-1',
      socio_id: 'MEM-TEST-001',
      socio_dni: '99990001',
      peso_kg: 75.0,
      estatura_cm: 175,
      edad: 28,
      sexo: 'Masculino',
      grasa_corporal_pct: 16.0,
      masa_muscular_kg: 35.5,
      evaluador_id: 'staff-test',
      evaluador_nombre: 'Coach Test',
    });

    await guardarEvaluacion(evaluacion);

    render(<EvolucionCorporalView socioDni="99990001" />);

    // Esperar a que se cargue la evaluación
    expect(await screen.findByText(/FIT SCORE/i, {}, { timeout: 8000 })).toBeDefined();
    expect(await screen.findAllByText(/75.00/, {}, { timeout: 8000 })).toBeDefined();
    expect(await screen.findAllByText(/35.5/, {}, { timeout: 8000 })).toBeDefined();
    expect(await screen.findAllByText(/Análisis Segmentario/i, {}, { timeout: 8000 })).toBeDefined();
  }, 15000);
});
