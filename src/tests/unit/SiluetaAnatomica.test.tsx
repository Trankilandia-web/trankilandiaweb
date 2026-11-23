import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SiluetaAnatomica from '../../components/portal/SiluetaAnatomica';
import { EvaluacionCorporal } from '../../types/evaluacion';

function mockEval(): EvaluacionCorporal {
  return {
    id: 'eval-silueta-test',
    socio_id: 'socio-1',
    socio_dni: '70447087',
    fecha: '2026-01-01T10:00:00.000Z',
    estatura_cm: 175,
    edad: 28,
    sexo: 'Masculino',
    peso_kg: 80,
    imc: 26.1,
    grasa_corporal_pct: 21.0,
    grasa_corporal_kg: 16.8,
    masa_muscular_kg: 35.5,
    masa_muscular_pct: 44.3,
    grasa_visceral: 8,
    agua_pct: 55.0,
    masa_osea_kg: 3.2,
    bmr_kcal: 1750,
    edad_metabolica: 26,
    proteina_pct: 18.5,
    puntuacion_corporal: 78,
    segmental_data: {
      brazo_izq: { musculo_kg: 3.1, musculo_pct: 104, grasa_kg: 1.1, grasa_pct: 110 },
      brazo_der: { musculo_kg: 3.1, musculo_pct: 104, grasa_kg: 1.1, grasa_pct: 110 },
      tronco: { musculo_kg: 24.5, musculo_pct: 106, grasa_kg: 9.0, grasa_pct: 125 },
      pierna_izq: { musculo_kg: 8.6, musculo_pct: 108, grasa_kg: 2.5, grasa_pct: 105 },
      pierna_der: { musculo_kg: 8.6, musculo_pct: 108, grasa_kg: 2.5, grasa_pct: 105 },
    },
    evaluador_id: 'coach-1',
    evaluador_nombre: 'Coach Carlos',
    origen: 'bluetooth_g78',
  };
}

describe('Componente SiluetaAnatomica', () => {
  it('renderiza la silueta anatómica con su título y switch de modos', () => {
    const ev = mockEval();
    render(<SiluetaAnatomica evaluacion={ev} />);

    expect(screen.getByText(/Silueta Anatómica/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /ver músculo/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /ver grasa/i })).toBeDefined();
  });

  it('permite alternar entre modo Músculo y modo Grasa', () => {
    const ev = mockEval();
    render(<SiluetaAnatomica evaluacion={ev} />);

    const botonGrasa = screen.getByRole('button', { name: /ver grasa/i });
    fireEvent.click(botonGrasa);

    expect(screen.getByText(/Distribución de Grasa Segmental/i)).toBeDefined();
  });

  it('muestra datos detallados de la zona seleccionada al interactuar', () => {
    const ev = mockEval();
    render(<SiluetaAnatomica evaluacion={ev} />);

    // Por defecto muestra Tronco / Abdomen
    expect(screen.getByText(/Tronco \/ Abdomen/i)).toBeDefined();

    // Seleccionar Brazo Izquierdo
    const botonBrazoIzq = screen.getByRole('button', { name: /seleccionar brazo izquierdo/i });
    fireEvent.click(botonBrazoIzq);

    expect(screen.getByText(/Brazo Izquierdo/i)).toBeDefined();
    expect(screen.getByText('3.1')).toBeDefined();
  });

  it('muestra la sección de análisis de simetría bilateral', () => {
    const ev = mockEval();
    render(<SiluetaAnatomica evaluacion={ev} />);

    expect(screen.getByText(/Simetría y Equilibrio Bilateral/i)).toBeDefined();
  });
});
