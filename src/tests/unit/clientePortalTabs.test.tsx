import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClientePortal from '../../pages/portal/ClientePortal';
import { GymMember } from '../../data/gymStore';

const { mockMember } = vi.hoisted(() => {
  return {
    mockMember: {
      id: 'MEM-001',
      name: 'Carlos Ruiz',
      dni: '72345678',
      email: '72345678@socio.trankilandia.pe',
      phone: '987654321',
      plan: 'Plan Mensual Estándar',
      planPrice: 80,
      paymentType: 'full' as const,
      advancePaid: 80,
      balanceDue: 0,
      paymentMethod: 'efectivo' as const,
      receiptNumber: 'B001-000001',
      membershipStatus: 'active' as const,
      expiresAt: '2026-12-31',
      coachName: 'Coach Marcos Rivas',
      registeredAt: '2026-01-01',
      age: 26,
      gender: 'Masculino',
      shift: 'manana' as const,
    } as GymMember,
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'mock-user-1',
      email: '72345678@socio.trankilandia.pe',
      user_metadata: { dni: '72345678', full_name: 'Carlos Ruiz' },
    },
    isAdmin: false,
    switchRole: vi.fn(),
    signOut: vi.fn(),
  }),
}));

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

vi.mock('../../lib/supabaseDb', () => ({
  getMemberRoutine: vi.fn().mockResolvedValue(null),
  vincularDniCliente: vi.fn().mockResolvedValue({ success: true, member: mockMember }),
  vincularCorreoASocio: vi.fn().mockResolvedValue({ success: true, member: mockMember }),
  obtenerSocioPorUserId: vi.fn().mockResolvedValue(mockMember),
  obtenerSocioActivo: vi.fn().mockResolvedValue(mockMember),
  updateMemberProfile: vi.fn().mockResolvedValue({ success: true }),
  subscribeToGymRealtime: vi.fn().mockReturnValue(() => {}),
}));

vi.mock('../../lib/authPasswords', () => ({
  getStoredCustomPassword: vi.fn().mockReturnValue('mock-custom-password-123'),
  actualizarPasswordSocio: vi.fn().mockResolvedValue({ success: true, message: 'Contraseña actualizada' }),
}));

describe('Portal del Cliente · Pestañas Simplificadas (4 vistas)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('trankilandia_members_v6', JSON.stringify([mockMember]));
  });

  it('debe renderizar exactamente las 4 pestañas de navegación principales (Mi Carnet, Mi Rutina, Mi Evolución, Mi Perfil)', async () => {
    render(
      <MemoryRouter initialEntries={['/portal']}>
        <ClientePortal />
      </MemoryRouter>
    );

    // 1. Verificar presencia de las 4 pestañas consolidadas
    expect(await screen.findByRole('button', { name: /Mi Carnet/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Mi Rutina/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Mi Evolución/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Mi Perfil/i })).toBeDefined();

    // 2. Mi Membresía ya no debe existir como pestaña primaria independiente
    expect(screen.queryByRole('button', { name: /^Mi Membresía$/i })).toBeNull();
  });

  it('no debe mostrar Seguridad ni Mis Datos como pestañas primarias simultáneas en la barra principal', async () => {
    render(
      <MemoryRouter initialEntries={['/portal']}>
        <ClientePortal />
      </MemoryRouter>
    );

    await screen.findByRole('button', { name: /Mi Carnet/i });

    // La barra principal de navegación debe tener sólo las 4 pestañas simplificadas.
    // Ni "Seguridad" ni "Mis Datos" deben existir como pestañas superiores iniciales.
    expect(screen.queryByRole('button', { name: /^Seguridad$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Mis Datos$/i })).toBeNull();
  });

  it('al seleccionar Mi Perfil, debe mostrar los sub-selectores Mis Datos y Seguridad', async () => {
    render(
      <MemoryRouter initialEntries={['/portal']}>
        <ClientePortal />
      </MemoryRouter>
    );

    const btnPerfil = await screen.findByRole('button', { name: /Mi Perfil/i });
    fireEvent.click(btnPerfil);

    // Sub-selectores dentro de Mi Perfil
    const subBtnDatos = await screen.findByRole('button', { name: /Mis Datos/i });
    const subBtnSeguridad = screen.getByRole('button', { name: /Seguridad/i });
    expect(subBtnDatos).toBeDefined();
    expect(subBtnSeguridad).toBeDefined();

    // Por defecto en Mi Perfil debe mostrar los datos del socio
    expect(screen.getByText(/Gestión de Mis Datos Personales|Ficha Oficial del Socio/i)).toBeDefined();

    // Conmutar al sub-selector Seguridad
    fireEvent.click(subBtnSeguridad);
    expect(await screen.findByText(/Seguridad y Métodos de Ingreso|Cambio de Contraseña|Cuenta Única/i)).toBeDefined();

    // Conmutar nuevamente a Mis Datos
    fireEvent.click(subBtnDatos);
    expect(await screen.findByText(/Gestión de Mis Datos Personales|Ficha Oficial del Socio/i)).toBeDefined();
  });

  it('debe soportar el query param ?tab=seguridad abriendo Mi Perfil con la sub-pestaña de Seguridad activa', async () => {
    render(
      <MemoryRouter initialEntries={['/portal?tab=seguridad']}>
        <ClientePortal />
      </MemoryRouter>
    );

    // Debe mostrar la vista de Seguridad inmediatamente dentro de Mi Perfil
    expect(await screen.findByText(/Seguridad y Métodos de Ingreso|Cambio de Contraseña|Cuenta Única/i)).toBeDefined();
    // Y tener los sub-selectores disponibles
    expect(screen.getByRole('button', { name: /Mis Datos/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Seguridad/i })).toBeDefined();
  });

  it('debe soportar el query param ?tab=rutina abriendo la pestaña Mi Rutina', async () => {
    render(
      <MemoryRouter initialEntries={['/portal?tab=rutina']}>
        <ClientePortal />
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: /Mi Rutina/i })).toBeDefined();
    expect(await screen.findByText(/Plan de Entrenamiento|Supervisado por|Ejercicios Clave/i)).toBeDefined();
  });

  it('debe soportar el query param ?tab=evolucion abriendo la pestaña Mi Evolución', async () => {
    render(
      <MemoryRouter initialEntries={['/portal?tab=evolucion']}>
        <ClientePortal />
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: /Mi Evolución/i })).toBeDefined();
    // Debe montar EvolucionCorporalView
    expect(await screen.findByText(/Sin Evaluaciones Registradas|FIT SCORE|Silueta Anatómica/i)).toBeDefined();
  });

  it('debe redirigir ?tab=membresia hacia Mi Carnet manteniendo la información de membresía consolidada', async () => {
    render(
      <MemoryRouter initialEntries={['/portal?tab=membresia']}>
        <ClientePortal />
      </MemoryRouter>
    );

    // Debe mostrar Mi Carnet activo (con cabecera del carnet digital) y también la sección de membresía
    expect(await screen.findByRole('button', { name: /Mi Carnet/i })).toBeDefined();
    expect(await screen.findByText(/SEDE EMADI|Horario & Entrenador Asignado/i)).toBeDefined();
    expect(screen.getByText(/Estado del Plan/i)).toBeDefined();
  });
});
