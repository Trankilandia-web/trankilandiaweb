import { describe, it, expect } from 'vitest';
import {
  getLocalPeruDateString,
  calculateDaysRemaining,
  addDaysToLocalPeruDate,
} from '../../lib/dateUtils';
import { deduplicarAsistenciasActivas, AsistenciaActiva } from '../../lib/supabaseDb';

describe('Pruebas Unitarias · Utilidades de Fecha Local Perú (UTC-5)', () => {
  it('getLocalPeruDateString debe retornar una fecha con formato YYYY-MM-DD', () => {
    const todayStr = getLocalPeruDateString();
    expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('calculateDaysRemaining debe calcular correctamente días positivos, cero y negativos', () => {
    const base = '2026-11-10';

    // 5 días en el futuro
    expect(calculateDaysRemaining('2026-11-15', base)).toBe(5);

    // Mismo día (vence hoy)
    expect(calculateDaysRemaining('2026-11-10', base)).toBe(0);

    // Venció hace 3 días
    expect(calculateDaysRemaining('2026-11-07', base)).toBe(-3);
  });

  it('addDaysToLocalPeruDate debe sumar 30 días para renovación de membresía', () => {
    const base = '2026-11-10';
    const nextMonth = addDaysToLocalPeruDate(30, base);
    expect(nextMonth).toBe('2026-12-10');
  });

  it('no debe verse afectado por el cruce horario de las 19:00 horas locales (medianoche UTC)', () => {
    // 2026-11-10T23:30:00Z en UTC equivale a las 18:30 horas en Perú (mismo día 10)
    const dateAt1830Pet = new Date('2026-11-10T23:30:00Z');
    expect(getLocalPeruDateString(dateAt1830Pet)).toBe('2026-11-10');

    // 2026-11-11T01:30:00Z en UTC equivale a las 20:30 horas en Perú del día 10
    const dateAt2030Pet = new Date('2026-11-11T01:30:00Z');
    expect(getLocalPeruDateString(dateAt2030Pet)).toBe('2026-11-10');
  });

  it('deduplicarAsistenciasActivas debe purgar registros mayores a 90 min y eliminar nombres repetidos', () => {
    const now = Date.now();
    const listaEntrada: AsistenciaActiva[] = [
      {
        id: 'ast-1',
        socio_id: 'MEM-001',
        dni: '70447001',
        nombre: 'Carlos Mendoza',
        turno: 'manana',
        fecha_ingreso: new Date(now - 10 * 60 * 1000).toISOString(), // hace 10 min (más reciente)
      },
      {
        id: 'ast-2',
        socio_id: 'MEM-001',
        dni: '70447001',
        nombre: 'Carlos Mendoza',
        turno: 'manana',
        fecha_ingreso: new Date(now - 30 * 60 * 1000).toISOString(), // hace 30 min (duplicado)
      },
      {
        id: 'ast-3',
        socio_id: 'MEM-002',
        dni: '70447002',
        nombre: 'Maria Gomez',
        turno: 'tarde',
        fecha_ingreso: new Date(now - 120 * 60 * 1000).toISOString(), // hace 120 min (vencido >90m)
      },
      {
        id: 'ast-4',
        socio_id: 'MEM-003',
        dni: '70447003',
        nombre: 'Pedro Alva',
        turno: 'noche',
        fecha_ingreso: new Date(now - 45 * 60 * 1000).toISOString(), // hace 45 min
      },
    ];

    const deduplicado = deduplicarAsistenciasActivas(listaEntrada);

    // Debe contener exactamente 2 atletas (Carlos y Pedro); Maria venció (>90m) y ast-2 es duplicado
    expect(deduplicado.length).toBe(2);
    expect(deduplicado.map((a) => a.nombre)).toEqual(['Carlos Mendoza', 'Pedro Alva']);
    expect(deduplicado[0].id).toBe('ast-1'); // conservó el más reciente
  });
});
