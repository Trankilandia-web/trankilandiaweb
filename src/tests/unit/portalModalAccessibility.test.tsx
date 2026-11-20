import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import MemberProfileModal from '../../components/portal/MemberProfileModal';
import ReceiptModal from '../../components/portal/ReceiptModal';
import type { GymMember } from '../../data/gymStore';

vi.mock('../../data/gymStore', () => ({ getStoredCatalogPlans: () => [] }));
vi.mock('../../pages/portal/ClientePortal', () => ({ OFFICIAL_COACHES: [] }));
vi.mock('../../lib/supabaseDb', () => ({ normalizeDateToISO: (value: string) => value }));
afterEach(cleanup);

const member: GymMember = {
  id: 'unit-member', name: 'Socio de prueba', dni: '12345678', plan: 'Plan de prueba',
  planPrice: 80.5, paymentType: 'full', advancePaid: 80.5, balanceDue: 0,
  paymentMethod: 'efectivo', receiptNumber: 'TEST-001', membershipStatus: 'active',
  expiresAt: '2099-12-31', coachName: '', registeredAt: '2026-11-19',
};

describe('Portal dialog accessibility', () => {
  it('can open, close and reopen a member profile without changing hook order', () => {
    const close = vi.fn();
    const save = vi.fn();
    const view = render(<MemberProfileModal isOpen={false} member={null} onClose={close} onSave={save} />);
    view.rerender(<MemberProfileModal isOpen member={member} onClose={close} onSave={save} />);
    expect(screen.getByRole('dialog', { name: member.name })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
    view.rerender(<MemberProfileModal isOpen={false} member={member} onClose={close} onSave={save} />);
    view.rerender(<MemberProfileModal isOpen member={member} onClose={close} onSave={save} />);
    expect(screen.getByRole('button', { name: 'Cerrar perfil del socio' })).toHaveFocus();
  });

  it('shows real cents and offers no WhatsApp destination for a missing phone', () => {
    render(<ReceiptModal isOpen member={member} onClose={vi.fn()} paymentAmount={40.25} paymentTypeTitle="Abono" paymentMethod="efectivo" />);
    expect(screen.getByRole('dialog', { name: 'Constancia de pago' })).toBeInTheDocument();
    expect(screen.getByText('S/. 40.25')).toBeInTheDocument();
    expect(screen.getByText('S/. 80.50')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'ENVIAR POR WHATSAPP' })).toBeNull();
  });

  it('uses the member phone when offering a receipt message', () => {
    render(<ReceiptModal isOpen member={{ ...member, phone: '999123456' }} onClose={vi.fn()} paymentAmount={80.5} paymentTypeTitle="Pago" paymentMethod="yape" />);
    const link = screen.getByRole('link', { name: 'ENVIAR POR WHATSAPP' });
    const url = new URL(link.getAttribute('href')!);
    expect(url.pathname).toBe('/51999123456');
    expect(url.searchParams.get('text')).toContain('S/. 80.50');
  });
});
