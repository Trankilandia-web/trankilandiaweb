import { describe, it, expect } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HubReceptionSimple from '../../pages/portal/HubReceptionSimple';
import { AuthProvider } from '../../context/AuthContext';

describe('HubReceptionSimple Full Render Test', () => {
  it('renders HubReceptionSimple after loading data without crashing', async () => {
    localStorage.setItem(
      'trankilandia_staff_active_session_v4',
      JSON.stringify({
        id: 'staff-mwbbbeur',
        nombre: 'Recepcion',
        rol: 'cajero',
        turno: 'completo',
        activo: true,
      })
    );

    render(
      <MemoryRouter initialEntries={['/caja']}>
        <AuthProvider>
          <HubReceptionSimple />
        </AuthProvider>
      </MemoryRouter>
    );

    // Esperar a que termine de cargar y aparezca la barra de navegación de Recepción
    await waitFor(
      () => {
        expect(screen.getByText('1. MARCAR INGRESO')).toBeDefined();
      },
      { timeout: 8000 }
    );
  });
});
