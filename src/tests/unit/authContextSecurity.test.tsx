import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const remote = vi.hoisted(() => ({ getSession: vi.fn(), getUser: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn(), from: vi.fn(), listener: null as null | ((event: string, session: unknown) => void) }));
vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: () => true, signOut: () => remote.signOut(),
  supabase: { auth: { ...remote, onAuthStateChange: (listener: typeof remote.listener) => { remote.listener = listener; return { data: { subscription: { unsubscribe: () => {} } } }; } }, from: remote.from },
}));
import { AuthProvider, useAuth } from '../../context/AuthContext';
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear(); sessionStorage.clear();
  remote.getSession.mockResolvedValue({ data: { session: null }, error: null }); remote.getUser.mockResolvedValue({ data: { user: null }, error: null });
  remote.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'Credenciales inválidas' } });
  remote.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'cliente' }, error: null }) }) }) });
});
describe('Sesiones y roles verificados', () => {
  it('no restaura usuario ni privilegios admin desde localStorage', async () => {
    localStorage.setItem('trankilandia_auth_user', JSON.stringify({ id: 'falso', email: 'marisolflores@gmail.com' })); localStorage.setItem('trankilandia_active_role', 'admin');
    const { result } = renderHook(useAuth, { wrapper: AuthProvider }); await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull(); expect(result.current.isAdmin).toBe(false);
  });
  it('correo antes privilegiado no entra sin password válido', async () => {
    const { result } = renderHook(useAuth, { wrapper: AuthProvider }); await waitFor(() => expect(result.current.isLoading).toBe(false));
    let response; await act(async () => { response = await result.current.loginUser('marisolflores@gmail.com', undefined, 'invalida'); });
    expect(response).toMatchObject({ success: false }); expect(result.current.user).toBeNull();
  });
  it('rol desde user_metadata no concede administración', async () => {
    const user = { id: 'real', email: 'user@example.test', user_metadata: { role: 'admin' } };
    remote.signInWithPassword.mockResolvedValue({ data: { user, session: { user, access_token: 'test' } }, error: null }); remote.getUser.mockResolvedValue({ data: { user }, error: null });
    const { result } = renderHook(useAuth, { wrapper: AuthProvider }); await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.loginUser(user.email, undefined, 'valida'); }); expect(result.current.actualRole).toBe('cliente'); expect(result.current.isAdmin).toBe(false);
  });
  it('mantiene la vista durante la revalidación de la misma cuenta al renovar token', async () => {
    const user = { id: 'real', email: 'user@example.test', user_metadata: {} };
    const session = { user, access_token: 'original' };
    remote.getSession.mockResolvedValue({ data: { session }, error: null });
    remote.getUser.mockResolvedValue({ data: { user }, error: null });
    const { result } = renderHook(useAuth, { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    let finish!: (value: unknown) => void;
    remote.getUser.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    await act(async () => { remote.listener?.('TOKEN_REFRESHED', { ...session, access_token: 'renewed' }); });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.user?.id).toBe('real');
    await act(async () => { finish({ data: { user }, error: null }); });
  });
});
