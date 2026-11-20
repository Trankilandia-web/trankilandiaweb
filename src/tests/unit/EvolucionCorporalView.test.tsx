import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import EvolucionCorporalView from '../../components/portal/EvolucionCorporalView';
import { guardarEvaluacion } from '../../lib/evaluacionesService';
import { calcularMetricasCompletas } from '../../lib/bioimpedanceEngine';

describe('Componente EvolucionCorporalView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('debe mostrar estado vacío amigable si el socio aún no tiene evaluaciones', async () => {
    render(<EvolucionCorporalView socioDni="70447087" />);

    expect(await screen.findByText(/Sin Evaluaciones Registradas/i)).toBeDefined();
    expect(await screen.findByText(/Acércate a recepción/i)).toBeDefined();
  });

  it('debe renderizar el diagnóstico y métricas cuando existen evaluaciones', async () => {
    const evaluacion = calcularMetricasCompletas({
      socio_id: 'MEM-001',
      socio_dni: '70447087',
      peso_kg: 75.0,
      estatura_cm: 175,
      edad: 28,
      sexo: 'Masculino',
      grasa_corporal_pct: 16.0,
      masa_muscular_kg: 35.5,
      evaluador_id: 'staff-luis',
      evaluador_nombre: 'Luis Lloclla',
    });

    await guardarEvaluacion(evaluacion);

    render(<EvolucionCorporalView socioDni="70447087" />);

    // Esperar a que se cargue la evaluación
    expect(await screen.findByText(/FIT SCORE/i)).toBeDefined();
    expect(await screen.findByText('75.00')).toBeDefined();
    expect(await screen.findByText('35.50')).toBeDefined();
    expect(await screen.findByText(/Análisis Segmental por Zonas/i)).toBeDefined();
  });
});
