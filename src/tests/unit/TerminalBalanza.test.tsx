import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
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
        membershipStatus: 'active',
        paymentStatus: 'paid',
        registeredAt: '2026-01-01',
        shift: 'completo',
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
});
