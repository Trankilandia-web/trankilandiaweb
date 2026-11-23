import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MedallasLogro from '../../components/portal/MedallasLogro';
import { MedallaLogro } from '../../types/evaluacion';

const mockMedallas: MedallaLogro[] = [
  {
    id: 'primera_evaluacion',
    categoria: 'constancia',
    titulo: 'Primera Huella',
    descripcion: 'Iniciaste tu viaje biométrico con la báscula de 8 electrodos.',
    nivel: 'bronce',
    icono: 'Flag',
    desbloqueada: true,
    fechaDesbloqueo: '2026-01-01',
    progresoActual: 1,
    metaNivel: 1,
    unidad: 'evaluación',
    esSecreta: false,
  },
  {
    id: 'constructor',
    categoria: 'musculo',
    titulo: 'Constructor Muscular',
    descripcion: 'Has desarrollado +1.8 kg de masa muscular pura.',
    nivel: 'plata',
    icono: 'Dumbbell',
    desbloqueada: true,
    progresoActual: 1.8,
    metaNivel: 1.5,
    unidad: 'kg músculo',
    esSecreta: false,
  },
  {
    id: 'quemador_grasa',
    categoria: 'grasa',
    titulo: 'Quemador de Grasa',
    descripcion: 'Reduce al menos 1 kg de grasa corporal para nivel Bronce.',
    nivel: 'bronce',
    icono: 'Flame',
    desbloqueada: false,
    progresoActual: 0.4,
    metaNivel: 1.0,
    unidad: 'kg grasa',
    esSecreta: false,
  },
  {
    id: 'elite_corporal',
    categoria: 'secreta',
    titulo: 'Misterio Oculto',
    descripcion: 'Alcanza una condición física de élite (Fit Score 85+) para revelar.',
    nivel: 'diamante',
    icono: 'Trophy',
    desbloqueada: false,
    progresoActual: 72,
    metaNivel: 85,
    unidad: 'Fit Score',
    esSecreta: true,
  },
];

describe('Componente MedallasLogro', () => {
  it('renderiza el contador global de medallas desbloqueadas', () => {
    render(<MedallasLogro medallas={mockMedallas} socioNombre="Luis García" />);

    expect(screen.getByText(/2 de 4 Desbloqueadas/i)).toBeDefined();
    expect(screen.getByText('Primera Huella')).toBeDefined();
    expect(screen.getByText('Constructor Muscular')).toBeDefined();
  });

  it('permite filtrar por categorías', () => {
    render(<MedallasLogro medallas={mockMedallas} />);

    // Click en filtro Músculo
    const tabMusculo = screen.getByRole('button', { name: /músculo/i });
    fireEvent.click(tabMusculo);

    // Debe mostrar Constructor y no Primera Huella
    expect(screen.getByText('Constructor Muscular')).toBeDefined();
    expect(screen.queryByText('Primera Huella')).toBeNull();
  });

  it('muestra medallas bloqueadas con candado y progreso', () => {
    render(<MedallasLogro medallas={mockMedallas} />);

    expect(screen.getByText('Quemador de Grasa')).toBeDefined();
    expect(screen.getByText(/0.4 \/ 1 kg grasa/i)).toBeDefined();
  });

  it('abre enlace de compartir al hacer clic en compartir medalla', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<MedallasLogro medallas={mockMedallas} socioNombre="Luis" />);

    const shareButtons = screen.getAllByTitle(/compartir medalla en whatsapp/i);
    expect(shareButtons.length).toBeGreaterThan(0);
    fireEvent.click(shareButtons[0]);

    expect(openSpy).toHaveBeenCalled();
    openSpy.mockRestore();
  });
});
