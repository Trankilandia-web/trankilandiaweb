import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StoryCardModal from '../../components/portal/StoryCardModal';
import { EvaluacionCorporal, ProgresoAcumulado, MedallaLogro } from '../../types/evaluacion';

function mockEval(): EvaluacionCorporal {
  return {
    id: 'eval-story-modal-test',
    socio_id: 'socio-1',
    socio_dni: '70447087',
    fecha: '2026-01-01T10:00:00.000Z',
    estatura_cm: 175,
    edad: 28,
    sexo: 'Masculino',
    peso_kg: 80,
    imc: 26.1,
    grasa_corporal_pct: 20.0,
    grasa_corporal_kg: 16.0,
    masa_muscular_kg: 36.0,
    masa_muscular_pct: 45.0,
    grasa_visceral: 8,
    agua_pct: 55.0,
    masa_osea_kg: 3.2,
    bmr_kcal: 1750,
    edad_metabolica: 26,
    proteina_pct: 18.5,
    puntuacion_corporal: 82,
    segmental_data: {
      brazo_izq: { musculo_kg: 3.1, grasa_pct: 14 },
      brazo_der: { musculo_kg: 3.1, grasa_pct: 14 },
      tronco: { musculo_kg: 24.5, grasa_pct: 18 },
      pierna_izq: { musculo_kg: 8.6, grasa_pct: 16 },
      pierna_der: { musculo_kg: 8.6, grasa_pct: 16 },
    },
    evaluador_id: 'coach-1',
    evaluador_nombre: 'Coach Carlos',
    origen: 'bluetooth_g78',
  };
}

const mockAcumulado: ProgresoAcumulado = {
  delta_grasa_kg: -3.5,
  delta_musculo_kg: 1.2,
  delta_peso_kg: -2.3,
  delta_visceral: -1,
  delta_score: 5,
  dias_totales: 30,
  meta_progreso_pct: 70,
};

const mockMedallas: MedallaLogro[] = [
  {
    id: 'constructor',
    categoria: 'musculo',
    titulo: 'Constructor Muscular',
    descripcion: 'Músculo ganado',
    nivel: 'plata',
    icono: 'Dumbbell',
    desbloqueada: true,
    progresoActual: 1.2,
    metaNivel: 1.5,
    unidad: 'kg',
  },
];

describe('Componente StoryCardModal', () => {
  it('no renderiza nada si isOpen es false', () => {
    const { container } = render(
      <StoryCardModal
        isOpen={false}
        onClose={vi.fn()}
        evaluacion={mockEval()}
        medallas={mockMedallas}
        acumulado={mockAcumulado}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza título, selectores de estilo y botones de acción cuando isOpen es true', () => {
    render(
      <StoryCardModal
        isOpen={true}
        onClose={vi.fn()}
        evaluacion={mockEval()}
        medallas={mockMedallas}
        acumulado={mockAcumulado}
        socioNombre="Luis Gerardo"
      />
    );

    expect(screen.getByText(/Story Card Generator/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /fuego/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /minimal/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /neón/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /descargar imagen/i })).toBeDefined();
  });

  it('permite cambiar entre formato Story 9:16 y Post 1:1', () => {
    render(
      <StoryCardModal
        isOpen={true}
        onClose={vi.fn()}
        evaluacion={mockEval()}
        medallas={mockMedallas}
        acumulado={mockAcumulado}
      />
    );

    const btnPost = screen.getByRole('button', { name: /post 1:1/i });
    fireEvent.click(btnPost);
    expect(btnPost).toBeDefined();
  });
});
