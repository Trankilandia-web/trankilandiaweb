import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GymAnnouncementsControl from '../../components/portal/GymAnnouncementsControl';
import * as announcementsService from '../../lib/announcementsService';

describe('Pruebas Unitarias · Componente GymAnnouncementsControl', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza el botón de Mensajes en estado inactivo', () => {
    render(<GymAnnouncementsControl />);
    expect(screen.getByText(/Mensajes/i)).toBeInTheDocument();
  });

  it('al hacer clic en Mensajes abre el popover con los 3 mensajes oficiales', () => {
    render(<GymAnnouncementsControl />);
    const triggerBtn = screen.getByRole('button', { name: /Mensajes/i });
    fireEvent.click(triggerBtn);

    expect(screen.getByText(/Mensajes de Sala/i)).toBeInTheDocument();
    expect(screen.getByText(/Salida: Parlante Bluetooth/i)).toBeInTheDocument();

    expect(screen.getByText(/Aviso de Cierre \(10 min\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Orden y Cuidado de Accesorios/i)).toBeInTheDocument();
    expect(screen.getByText(/Inicio de Clases Grupales/i)).toBeInTheDocument();
  });

  it('al hacer clic en Reproducir ejecuta playAnnouncement con el ID correspondiente', () => {
    const playSpy = vi.spyOn(announcementsService, 'playAnnouncement').mockImplementation(async () => {});

    render(<GymAnnouncementsControl />);
    const triggerBtn = screen.getByRole('button', { name: /Mensajes/i });
    fireEvent.click(triggerBtn);

    const playButtons = screen.getAllByRole('button', { name: /Reproducir en Parlante/i });
    expect(playButtons).toHaveLength(3);

    fireEvent.click(playButtons[0]);
    expect(playSpy).toHaveBeenCalledWith('cierre-10min');
  });
});
