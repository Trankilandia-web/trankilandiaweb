import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginModal from '../../components/LoginModal';
import TourModal from '../../components/TourModal';

const { loginUser, updatePassword } = vi.hoisted(() => ({ loginUser: vi.fn(), updatePassword: vi.fn() }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: null, role: 'cliente', signOut: vi.fn(), getRedirectPath: () => '/cliente', loginUser }) }));
vi.mock('../../lib/authPasswords', () => ({ actualizarPasswordSocio: updatePassword }));

afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); });

describe('Public modal boundaries', () => {
  it('focuses login, traps both Tab directions, prevents background focus and closes on Escape', () => {
    const close = vi.fn();
    render(<MemoryRouter><button data-testid="background">Background</button><LoginModal isOpen onClose={close} onOpenTourModal={vi.fn()} /></MemoryRouter>);
    const dialog = screen.getByRole('dialog');
    const first = within(dialog).getByRole('button', { name: 'Cerrar inicio de sesión' });
    const last = within(dialog).getByRole('button', { name: 'Solicitar pase de cortesía' });
    expect(screen.getByLabelText('DNI o correo registrado')).toHaveFocus();
    last.focus(); fireEvent.keyDown(document, { key: 'Tab' }); expect(first).toHaveFocus();
    first.focus(); fireEvent.keyDown(document, { key: 'Tab', shiftKey: true }); expect(last).toHaveFocus();
    screen.getByTestId('background').focus(); expect(screen.getByLabelText('DNI o correo registrado')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' }); expect(close).toHaveBeenCalledOnce();
  });

  it('preserves entered credentials on rejected login and passes the password exactly', async () => {
    loginUser.mockResolvedValue({ success: false, error: 'Contraseña incorrecta.' });
    render(<MemoryRouter><LoginModal isOpen onClose={vi.fn()} /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('DNI o correo registrado'), { target: { value: '12345678' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: ' secret ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar al portal' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Contraseña incorrecta.');
    expect(loginUser).toHaveBeenCalledWith('12345678', undefined, ' secret ');
    expect(screen.getByLabelText('DNI o correo registrado')).toHaveValue('12345678');
    expect(screen.getByLabelText('Contraseña')).toHaveValue(' secret ');
  });

  it('requires the current password before a change and supplies all verified fields', async () => {
    updatePassword.mockResolvedValue({ success: true, message: 'Contraseña actualizada.' });
    render(<MemoryRouter><LoginModal isOpen onClose={vi.fn()} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    fireEvent.change(screen.getByLabelText('DNI'), { target: { value: '12345678' } });
    fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: 'new-secret' } });
    fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: 'new-secret' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Guardar contraseña' }).closest('form')!);
    expect(updatePassword).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('contraseña actual');
    fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: 'old-secret' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Guardar contraseña' }).closest('form')!);
    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith('12345678', 'new-secret', 'old-secret'));
    expect(await screen.findByRole('status')).toHaveTextContent('Contraseña actualizada.');
  });

  it('prepares an honest courtesy request and opens no transport before the user sends it', () => {
    const open = vi.spyOn(window, 'open');
    render(<TourModal isOpen onClose={vi.fn()} initialPlan="Plan General" />);
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'María López' } });
    fireEvent.change(screen.getByLabelText('WhatsApp o teléfono'), { target: { value: '999123456' } });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'maria@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Revisar solicitud' }));
    expect(screen.getByRole('heading', { name: 'Tu solicitud está preparada' })).toBeInTheDocument();
    expect(screen.getByText(/Aún no está registrada ni confirmada/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Enviar por WhatsApp' });
    const url = new URL(link.getAttribute('href')!);
    expect(url.hostname).toBe('wa.me');
    expect(url.searchParams.get('text')).toContain('María López');
    expect(url.searchParams.get('text')).toContain('Plan General');
    expect(url.searchParams.get('text')).toContain('pendiente de la confirmación');
    expect(open).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Editar solicitud' }));
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('María López');
    open.mockRestore();
  });
});
