import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TerminalBalanza from '../../pages/portal/TerminalBalanza';
import { saveStoredMembers } from '../../data/gymStore';

describe('Terminal Móvil de Pesaje (TerminalBalanza)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    saveStoredMembers([
      {
        id: 'MEM-001',
        dni: '70447087',
        name: 'Luis Gerardo Llocclla',
        phone: '958183360',
        plan: 'Membresía Anual',
        planPrice: 100,
        paymentType: 'full',
        advancePaid: 100,
        balanceDue: 0,
        paymentMethod: 'efectivo',
        receiptNumber: 'REC-001',
        membershipStatus: 'active',
        expiresAt: '2026-12-31',
        coachName: 'Luis',
        registeredAt: '2026-01-01',
        shift: 'manana',
      },
    ]);
  });

  it('debe solicitar PIN de personal si no hay sesión activa', () => {
    render(
      <MemoryRouter>
        <TerminalBalanza />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/Terminal de Pesaje/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Ingrese su PIN de 4 dígitos/i)).toBeDefined();
  });

  it('debe permitir desbloquear con PIN de administrador o sesión previa', () => {
    // Simular sesión de staff previa
    sessionStorage.setItem('trankilandia_active_staff_id', 'staff-luis');
    sessionStorage.setItem('trankilandia_active_staff_name', 'Luis Lloclla');

    render(
      <MemoryRouter>
        <TerminalBalanza />
      </MemoryRouter>
    );

    // Debe mostrar el buscador de socio
    expect(screen.getByPlaceholderText(/Buscar por DNI o Nombre/i)).toBeDefined();
  });

  it('debe encontrar al socio al tipear su DNI en el buscador', async () => {
    sessionStorage.setItem('trankilandia_active_staff_id', 'staff-luis');
    sessionStorage.setItem('trankilandia_active_staff_name', 'Luis Lloclla');

    render(
      <MemoryRouter>
        <TerminalBalanza />
      </MemoryRouter>
    );

    const inputSearch = screen.getByPlaceholderText(/Buscar por DNI o Nombre/i);
    fireEvent.change(inputSearch, { target: { value: '70447087' } });

    expect(screen.getByText(/Luis Gerardo Llocclla/i)).toBeDefined();
  });

  it('debe permitir buscar y encontrar a otros socios distintos por DNI o nombre', async () => {
    sessionStorage.setItem('trankilandia_active_staff_id', 'staff-marisol');
    sessionStorage.setItem('trankilandia_active_staff_name', 'Marisol Flores');

    saveStoredMembers([
      {
        id: 'MEM-001',
        dni: '70447087',
        name: 'Luis Gerardo Llocclla',
        phone: '958183360',
        plan: 'Membresía Anual',
        planPrice: 100,
        paymentType: 'full',
        advancePaid: 100,
        balanceDue: 0,
        paymentMethod: 'efectivo',
        receiptNumber: 'REC-001',
        membershipStatus: 'active',
        expiresAt: '2026-12-31',
        coachName: 'Luis',
        registeredAt: '2026-01-01',
        shift: 'manana',
      },
      {
        id: 'MEM-932',
        dni: '28289226',
        name: 'Maximo Cardenas Huaman',
        phone: '999888777',
        plan: '6 MESES · Musculación Libre',
        planPrice: 200,
        paymentType: 'full',
        advancePaid: 200,
        balanceDue: 0,
        paymentMethod: 'efectivo',
        receiptNumber: 'REC-002',
        membershipStatus: 'active',
        expiresAt: '2027-05-01',
        coachName: 'Marcos',
        registeredAt: '2026-01-01',
        shift: 'tarde',
      },
    ]);

    render(
      <MemoryRouter>
        <TerminalBalanza />
      </MemoryRouter>
    );

    const inputSearch = screen.getByPlaceholderText(/Buscar por DNI o Nombre/i);
    fireEvent.change(inputSearch, { target: { value: '28289226' } });

    expect(await screen.findByText(/Maximo Cardenas Huaman/i)).toBeDefined();
  });

  it('debe permitir seleccionar un socio y alternar entre pestañas Bluetooth y Captura de Display', async () => {
    sessionStorage.setItem('trankilandia_active_staff_id', 'staff-luis');
    sessionStorage.setItem('trankilandia_active_staff_name', 'Luis Lloclla');

    render(
      <MemoryRouter>
        <TerminalBalanza />
      </MemoryRouter>
    );

    const inputSearch = screen.getByPlaceholderText(/Buscar por DNI o Nombre/i);
    fireEvent.change(inputSearch, { target: { value: '70447087' } });

    const memberButton = await screen.findByText(/Luis Gerardo Llocclla/i);
    fireEvent.click(memberButton);

    // Debe mostrar los tabs de modo
    expect(await screen.findByText(/Bluetooth Inalámbrico/i)).toBeDefined();
    expect(await screen.findByText(/Captura de Display/i)).toBeDefined();

    // Cambiar a Captura de Display
    fireEvent.click(screen.getByText(/Captura de Display/i));
    expect(screen.getByPlaceholderText(/Ej: 74.50/i)).toBeDefined();
    expect(screen.getByText(/CALCULAR Y REVISAR RESULTADOS →/i)).toBeDefined();
  });
});
