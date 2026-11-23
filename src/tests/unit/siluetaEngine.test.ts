import { describe, it, expect } from 'vitest';
import {
  analizarSimetriaCorporal,
  calcularZonasCalorSilueta,
} from '../../lib/bioimpedanceEngine';
import { EvaluacionCorporal, SegmentalData } from '../../types/evaluacion';

function mockSegmental(overrides: Partial<SegmentalData> = {}): SegmentalData {
  return {
    brazo_izq: { musculo_kg: 3.0, musculo_pct: 100, grasa_kg: 1.0, grasa_pct: 110 },
    brazo_der: { musculo_kg: 3.0, musculo_pct: 100, grasa_kg: 1.0, grasa_pct: 110 },
    tronco: { musculo_kg: 24.0, musculo_pct: 100, grasa_kg: 9.0, grasa_pct: 120 },
    pierna_izq: { musculo_kg: 8.5, musculo_pct: 105, grasa_kg: 2.5, grasa_pct: 105 },
    pierna_der: { musculo_kg: 8.5, musculo_pct: 105, grasa_kg: 2.5, grasa_pct: 105 },
    ...overrides,
  };
}

function mockEval(segmentalOverrides: Partial<SegmentalData> = {}): EvaluacionCorporal {
  return {
    id: 'eval-silueta-1',
    socio_id: 'socio-1',
    socio_dni: '70447087',
    fecha: '2026-01-01T10:00:00.000Z',
    estatura_cm: 175,
    edad: 28,
    sexo: 'Masculino',
    peso_kg: 80,
    imc: 26.1,
    grasa_corporal_pct: 20.0,
    grasa_corporal_kg: 16.0,
    masa_muscular_kg: 36.0,
    masa_muscular_pct: 45.0,
    grasa_visceral: 8,
    agua_pct: 55.0,
    masa_osea_kg: 3.2,
    bmr_kcal: 1750,
    edad_metabolica: 26,
    proteina_pct: 18.5,
    puntuacion_corporal: 80,
    segmental_data: mockSegmental(segmentalOverrides),
    evaluador_id: 'coach-1',
    evaluador_nombre: 'Coach Carlos',
    origen: 'bluetooth_g78',
  };
}

describe('Motor de Simetría Corporal (analizarSimetriaCorporal)', () => {
  it('identifica equilibrio simétrico perfecto cuando ambos lados coinciden', () => {
    const seg = mockSegmental();
    const simetria = analizarSimetriaCorporal(seg);

    expect(simetria.brazos.ladoDominante).toBe('equilibrado');
    expect(simetria.brazos.diferenciaKg).toBe(0);
    expect(simetria.brazos.indiceSimetriaPct).toBe(100);
    expect(simetria.brazos.alertaDesbalance).toBe(false);

    expect(simetria.piernas.ladoDominante).toBe('equilibrado');
    expect(simetria.piernas.alertaDesbalance).toBe(false);

    expect(simetria.balanceGlobal).toBe('optimo');
  });

  it('detecta desbalance notorio cuando un brazo o pierna tiene más del 10% de diferencia', () => {
    const seg = mockSegmental({
      brazo_izq: { musculo_kg: 2.6, musculo_pct: 90, grasa_kg: 1.0, grasa_pct: 110 },
      brazo_der: { musculo_kg: 3.2, musculo_pct: 110, grasa_kg: 1.0, grasa_pct: 110 },
    });
    const simetria = analizarSimetriaCorporal(seg);

    expect(simetria.brazos.ladoDominante).toBe('derecho');
    expect(simetria.brazos.diferenciaKg).toBe(0.6);
    expect(simetria.brazos.alertaDesbalance).toBe(true);
    expect(simetria.balanceGlobal).toBe('desbalance_atencion');
  });
});

describe('Motor de Clasificación de Zonas de Calor (calcularZonasCalorSilueta)', () => {
  it('clasifica las 5 zonas en modo músculo con colores y niveles fisiológicos', () => {
    const ev = mockEval({
      tronco: { musculo_kg: 25.0, musculo_pct: 115, grasa_kg: 8.0, grasa_pct: 110 }, // Desarrollado
      brazo_izq: { musculo_kg: 2.4, musculo_pct: 85, grasa_kg: 1.0, grasa_pct: 110 }, // Bajo
    });

    const zonas = calcularZonasCalorSilueta(ev, 'musculo');

    expect(Object.keys(zonas)).toHaveLength(5);
    expect(zonas.tronco.nivelMusculo).toBe('desarrollado');
    expect(zonas.brazo_izq.nivelMusculo).toBe('bajo');
    expect(zonas.brazo_der.nivelMusculo).toBe('normal');
    expect(zonas.tronco.colorHex).toBeDefined();
  });

  it('clasifica las zonas en modo grasa detectando zonas con exceso', () => {
    const ev = mockEval({
      tronco: { musculo_kg: 24.0, musculo_pct: 100, grasa_kg: 12.0, grasa_pct: 175 }, // Grasa elevada
    });

    const zonas = calcularZonasCalorSilueta(ev, 'grasa');

    expect(zonas.tronco.nivelGrasa).toBe('elevado');
    expect(zonas.tronco.colorClase).toContain('red');
  });
});
