import { describe, it, expect } from 'vitest';
import { GymMember } from '../../data/gymStore';

// Función pura de ordenamiento que replica la lógica usada en componentes
export function sortGymMembers(
  members: GymMember[],
  order: 'recientes' | 'alfabetico' | 'por_vencer' | 'vencidos' | 'deuda',
  todayISO: string = '2026-11-17'
): GymMember[] {
  return [...members].sort((a, b) => {
    if (order === 'recientes') {
      const timeA = (a as any).updated_at || (a as any).updatedAt || a.registeredAt || '';
      const timeB = (b as any).updated_at || (b as any).updatedAt || b.registeredAt || '';
      if (timeA && timeB && timeA !== timeB) {
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      }
      const numA = parseInt(a.id?.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.id?.replace(/\D/g, '') || '0', 10);
      return numB - numA;
    }
    if (order === 'alfabetico') {
      return (a.name || '').localeCompare(b.name || '');
    }
    if (order === 'deuda') {
      return (b.balanceDue || 0) - (a.balanceDue || 0);
    }
    if (order === 'por_vencer' || order === 'vencidos') {
      const expA = a.expiresAt || todayISO;
      const expB = b.expiresAt || todayISO;
      return expA.localeCompare(expB);
    }
    return 0;
  });
}

describe('Pruebas Unitarias · Ordenamiento Inteligente de Socios', () => {
  const mockSocios: GymMember[] = [
    {
      id: 'MEM-001',
      name: 'Alberto Casas',
      dni: '11111111',
      plan: '1 MES',
      planPrice: 80,
      paymentType: 'full',
      advancePaid: 80,
      balanceDue: 0,
      paymentMethod: 'efectivo',
      receiptNumber: 'B001-001',
      membershipStatus: 'active',
      expiresAt: '2026-12-01',
      coachName: 'Marcos Rivas',
      registeredAt: '2026-01-10T10:00:00Z',
    },
    {
      id: 'MEM-188',
      name: 'Brigit Quispe Ramos',
      dni: '70223415',
      plan: '8 MESES',
      planPrice: 300,
      paymentType: 'partial',
      advancePaid: 150,
      balanceDue: 150,
      paymentMethod: 'yape',
      receiptNumber: 'B001-188',
      membershipStatus: 'active',
      expiresAt: '2027-07-17',
      coachName: 'Valeria Rivas',
      registeredAt: '2026-05-15T10:00:00Z',
      ...({ updated_at: '2026-11-17T18:30:00Z' } as any),
    },
    {
      id: 'MEM-676',
      name: 'Jesús Anaya Romero',
      dni: '61509957',
      plan: '1 MES',
      planPrice: 80,
      paymentType: 'full',
      advancePaid: 80,
      balanceDue: 0,
      paymentMethod: 'efectivo',
      receiptNumber: 'B001-676',
      membershipStatus: 'active',
      expiresAt: '2026-12-10',
      coachName: 'Marcos Rivas',
      registeredAt: '2026-09-10T10:00:00Z',
      ...({ updated_at: '2026-11-17T18:45:00Z' } as any),
    },
  ];

  it('coloca primero por defecto a los socios renovados o recién inscritos en orden "recientes"', () => {
    const ordenados = sortGymMembers(mockSocios, 'recientes');
    expect(ordenados[0].id).toBe('MEM-676'); // Renovado más recientemente (18:45)
    expect(ordenados[1].id).toBe('MEM-188'); // Renovada a las 18:30
    expect(ordenados[2].id).toBe('MEM-001'); // Antiguo
  });

  it('ordena correctamente en modo alfabetico', () => {
    const ordenados = sortGymMembers(mockSocios, 'alfabetico');
    expect(ordenados[0].name).toBe('Alberto Casas');
    expect(ordenados[1].name).toBe('Brigit Quispe Ramos');
    expect(ordenados[2].name).toBe('Jesús Anaya Romero');
  });

  it('ordena por mayor deuda primero', () => {
    const ordenados = sortGymMembers(mockSocios, 'deuda');
    expect(ordenados[0].id).toBe('MEM-188'); // Deuda 150
    expect(ordenados[0].balanceDue).toBe(150);
  });
});
