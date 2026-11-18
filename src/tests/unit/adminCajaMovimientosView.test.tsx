import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminDashboard from '../../pages/portal/AdminDashboard';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', email: 'admin@trankilandia.com', role: 'admin' },
    role: 'admin',
    logout: vi.fn(),
  }),
}));

describe('AdminDashboard · Pestaña Caja & Movimientos del Día', () => {
  it('renderiza la pestaña Caja & Movimientos por defecto y muestra los controles de arqueo', async () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminDashboard />
      </MemoryRouter>
    );

    // Debe mostrar los elementos de la pestaña destacada inicial
    const elements = await screen.findAllByText(/Caja & Movimientos/i);
    expect(elements.length).toBeGreaterThanOrEqual(1);
    // Debe mostrar los filtros de fecha del arqueo
    expect(screen.getByText('Hoy')).toBeTruthy();
  });
});
