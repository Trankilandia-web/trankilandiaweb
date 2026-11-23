import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SimuladorMetas from '../../components/portal/SimuladorMetas';
import { EvaluacionCorporal } from '../../types/evaluacion';

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
    grasa_corporal_pct: 24.0,
    grasa_corporal_kg: 19.2,
    masa_muscular_kg: 33.0,
    masa_muscular_pct: 41.25,
    grasa_visceral: 9,
    agua_pct: 54.0,
    masa_osea_kg: 3.2,
    bmr_kcal: 1730,
    edad_metabolica: 28,
    proteina_pct: 18.0,
    puntuacion_corporal: 75,
    segmental_data: {
      brazo_izq: { musculo_kg: 2.9, grasa_pct: 15 },
      brazo_der: { musculo_kg: 2.9, grasa_pct: 15 },
      pierna_izq: { musculo_kg: 8.3, grasa_pct: 18 },
      pierna_der: { musculo_kg: 8.3, grasa_pct: 18 },
      tronco: { musculo_kg: 23.5, grasa_pct: 21 },
    },
    evaluador_id: 'coach-1',
    evaluador_nombre: 'Coach Carlos',
    origen: 'bluetooth_g78',
    ...overrides,
  };
}

describe('Componente SimuladorMetas', () => {
  it('renderiza controles de tipo de objetivo y frecuencia', () => {
    const ev = mockEval();
    render(<SimuladorMetas evaluaciones={[ev]} currentEval={ev} />);

    expect(screen.getByText(/Simulador de Metas/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /grasa corporal/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /masa muscular/i })).toBeDefined();
  });

  it('permite cambiar entre meta de grasa y masa muscular', () => {
    const ev = mockEval();
    render(<SimuladorMetas evaluaciones={[ev]} currentEval={ev} />);

    const tabMusculo = screen.getByRole('button', { name: /masa muscular/i });
    fireEvent.click(tabMusculo);

    expect(screen.getByText(/Meta de Músculo/i)).toBeDefined();
  });

  it('actualiza la proyección al seleccionar una frecuencia de entrenamiento diferente', () => {
    const ev = mockEval();
    render(<SimuladorMetas evaluaciones={[ev]} currentEval={ev} />);

    const freq5x = screen.getByRole('button', { name: '5x' });
    fireEvent.click(freq5x);

    expect(screen.getByText(/5 sesiones semanales/i)).toBeDefined();
  });

  it('renderiza la curva SVG con el punto de meta', () => {
    const ev = mockEval();
    const { container } = render(<SimuladorMetas evaluaciones={[ev]} currentEval={ev} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
    expect(screen.getByText(/🎯 Meta/i)).toBeDefined();
  });
});
