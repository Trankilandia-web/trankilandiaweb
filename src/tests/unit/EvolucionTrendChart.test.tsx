import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EvolucionTrendChart from '../../components/portal/EvolucionTrendChart';
import { calcularMetricasCompletas } from '../../lib/bioimpedanceEngine';
import { EvaluacionCorporal } from '../../types/evaluacion';

describe('Componente EvolucionTrendChart (Mobile-First)', () => {
  const mockBase = {
    socio_id: 'MEM-001',
    socio_dni: '70447087',
    estatura_cm: 175,
    edad: 28,
    sexo: 'Masculino' as const,
    evaluador_id: 'staff-1',
    evaluador_nombre: 'Coach',
  };

  const eval1: EvaluacionCorporal = {
    ...calcularMetricasCompletas({
      ...mockBase,
      peso_kg: 80.0,
      masa_muscular_kg: 33.0,
      grasa_corporal_pct: 22.0,
    }),
    fecha: '2026-09-15T10:00:00.000Z',
  };

  const eval2: EvaluacionCorporal = {
    ...calcularMetricasCompletas({
      ...mockBase,
      peso_kg: 78.0,
      masa_muscular_kg: 34.5,
      grasa_corporal_pct: 19.0,
    }),
    fecha: '2026-10-15T10:00:00.000Z',
  };

  const eval3: EvaluacionCorporal = {
    ...calcularMetricasCompletas({
      ...mockBase,
      peso_kg: 76.0,
      masa_muscular_kg: 36.0,
      grasa_corporal_pct: 16.0,
    }),
    fecha: '2026-11-15T10:00:00.000Z',
  };

  it('debe mostrar estado de punto de partida cuando solo hay 1 evaluación', () => {
    render(<EvolucionTrendChart evaluaciones={[eval1]} />);

    expect(screen.getByText(/Punto de Partida/i)).toBeDefined();
    expect(screen.getByText(/segunda evaluación mensual/i)).toBeDefined();
    expect(screen.getByText(/Músculo/i)).toBeDefined();
    expect(screen.getByText(/Grasa/i)).toBeDefined();
    expect(screen.getByText(/Peso/i)).toBeDefined();
  });

  it('debe renderizar la curva SVG y permitir alternar pestañas entre Músculo, Grasa y Peso', () => {
    const onTabChange = vi.fn();
    render(
      <EvolucionTrendChart
        evaluaciones={[eval1, eval2, eval3]}
        onTabChange={onTabChange}
      />
    );

    // Inicialmente pestaña Músculo
    expect(screen.getByText(/Músculo Firme/i)).toBeDefined();

    // Cambiar a pestaña Grasa
    const tabGrasa = screen.getByText(/Grasa/i);
    fireEvent.click(tabGrasa);
    expect(onTabChange).toHaveBeenCalledWith('grasa');
    expect(screen.getByText(/Quema de Grasa/i)).toBeDefined();

    // Cambiar a pestaña Peso
    const tabPeso = screen.getByText(/Peso/i);
    fireEvent.click(tabPeso);
    expect(onTabChange).toHaveBeenCalledWith('peso');
    expect(screen.getByText(/Báscula Total/i)).toBeDefined();
  });
});
