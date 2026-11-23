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

import { render, screen, fireEvent } from '@testing-library/react';
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

  it('debe renderizar el diagnóstico mobile-first, síntesis cotidiana y permitir abrir el reporte técnico', async () => {
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

    // 1. Elementos clave Mobile-First en el Hero Header
    expect((await screen.findAllByText(/FIT SCORE/i, {}, { timeout: 8000 })).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText(/Tu Transformación Acumulada/i, {}, { timeout: 8000 })).toBeDefined();
    expect(await screen.findByText(/Story Card/i, {}, { timeout: 8000 })).toBeDefined();

    // 2. Pestaña Activa por defecto: Mi Silueta
    expect(await screen.findByText(/Silueta Anatómica Visual/i, {}, { timeout: 8000 })).toBeDefined();

    // 3. Navegar a pestaña Gráficos & Metas
    const tabGraficos = screen.getByRole('button', { name: /Gráficos & Metas/i });
    fireEvent.click(tabGraficos);
    expect(await screen.findByText(/Simulador de Metas/i, {}, { timeout: 8000 })).toBeDefined();
    expect((await screen.findAllByText(/Punto de Partida/i, {}, { timeout: 8000 })).length).toBeGreaterThanOrEqual(1);

    // 4. Navegar a pestaña Medallas & Salud
    const tabSalud = screen.getByRole('button', { name: /Medallas & Salud/i });
    fireEvent.click(tabSalud);
    expect(await screen.findByText(/Tus Medallas y Logros/i, {}, { timeout: 8000 })).toBeDefined();
    expect(await screen.findByText(/Tu Composición en Cristiano/i, {}, { timeout: 8000 })).toBeDefined();
    expect(await screen.findByText(/Salud del Corazón & Abdomen/i, {}, { timeout: 8000 })).toBeDefined();
    expect(await screen.findByText(/Tu Motor Metabólico/i, {}, { timeout: 8000 })).toBeDefined();

    // 5. Acordeón técnico colapsado por defecto para no saturar al usuario
    const botonAcordeon = screen.getByText(/Ver Reporte Biométrico Completo/i);
    expect(botonAcordeon).toBeDefined();

    // 6. Abrir acordeón y verificar que se revelan los datos técnicos
    fireEvent.click(botonAcordeon);
    expect(await screen.findByText(/INFORME BIOMÉTRICO FITDAYS/i, {}, { timeout: 4000 })).toBeDefined();
    expect(await screen.findByText(/Análisis Segmentario Completo/i, {}, { timeout: 4000 })).toBeDefined();
  }, 15000);
});
