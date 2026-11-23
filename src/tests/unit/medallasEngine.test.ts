import { describe, it, expect } from 'vitest';
import { calcularMedallasSocio } from '../../lib/bioimpedanceEngine';
import { EvaluacionCorporal } from '../../types/evaluacion';

function mockEval(overrides: Partial<EvaluacionCorporal> = {}): EvaluacionCorporal {
  return {
    id: 'eval-1',
    socio_id: 'socio-1',
    socio_dni: '70447087',
    fecha: '2026-01-01T10:00:00.000Z',
    estatura_cm: 175,
    edad: 28,
    sexo: 'Masculino',
    peso_kg: 80,
    imc: 26.1,
    grasa_corporal_pct: 22.0,
    grasa_corporal_kg: 17.6,
    masa_muscular_kg: 35.0,
    masa_muscular_pct: 43.7,
    grasa_visceral: 9,
    agua_pct: 54.0,
    masa_osea_kg: 3.2,
    bmr_kcal: 1750,
    edad_metabolica: 27,
    proteina_pct: 18.5,
    puntuacion_corporal: 76,
    segmental_data: {
      brazo_izq: { musculo_kg: 3.0, grasa_pct: 15 },
      brazo_der: { musculo_kg: 3.0, grasa_pct: 15 },
      pierna_izq: { musculo_kg: 8.5, grasa_pct: 18 },
      pierna_der: { musculo_kg: 8.5, grasa_pct: 18 },
      tronco: { musculo_kg: 24.0, grasa_pct: 20 },
    },
    evaluador_id: 'coach-1',
    evaluador_nombre: 'Coach Carlos',
    origen: 'bluetooth_g78',
    ...overrides,
  };
}

describe('Motor de Medallas de Logro (calcularMedallasSocio)', () => {
  it('retorna arreglo vacío si no hay evaluaciones', () => {
    const medallas = calcularMedallasSocio([]);
    expect(medallas).toEqual([]);
  });

  it('desbloquea la medalla Primera Vez en la primera evaluación', () => {
    const ev1 = mockEval();
    const medallas = calcularMedallasSocio([ev1]);

    const primeraVez = medallas.find((m) => m.id === 'primera_evaluacion');
    expect(primeraVez).toBeDefined();
    expect(primeraVez?.desbloqueada).toBe(true);
    expect(primeraVez?.titulo).toBe('Primera Huella');
  });

  it('evalúa la categoría Constructor según la ganancia de músculo acumulada', () => {
    const inicial = mockEval({ masa_muscular_kg: 30.0, fecha: '2026-01-01' });
    const actualBronce = mockEval({ masa_muscular_kg: 30.8, fecha: '2026-02-01' }); // +0.8kg

    const medallasBronce = calcularMedallasSocio([actualBronce, inicial]);
    const constructorB = medallasBronce.find((m) => m.id === 'constructor');
    expect(constructorB?.desbloqueada).toBe(true);
    expect(constructorB?.nivel).toBe('bronce'); // meta 0.5kg superada

    const actualOro = mockEval({ masa_muscular_kg: 33.5, fecha: '2026-03-01' }); // +3.5kg
    const medallasOro = calcularMedallasSocio([actualOro, inicial]);
    const constructorOro = medallasOro.find((m) => m.id === 'constructor');
    expect(constructorOro?.desbloqueada).toBe(true);
    expect(constructorOro?.nivel).toBe('oro'); // meta 3.0kg superada
  });

  it('evalúa la categoría Quemador según la pérdida de grasa acumulada', () => {
    const inicial = mockEval({ grasa_corporal_kg: 20.0, fecha: '2026-01-01' });
    const actualPlata = mockEval({ grasa_corporal_kg: 16.5, fecha: '2026-02-01' }); // -3.5kg

    const medallas = calcularMedallasSocio([actualPlata, inicial]);
    const quemador = medallas.find((m) => m.id === 'quemador_grasa');
    expect(quemador?.desbloqueada).toBe(true);
    expect(quemador?.nivel).toBe('plata'); // meta 3.0kg superada
  });

  it('evalúa la categoría Corazón Sano por nivel de grasa visceral saludable', () => {
    const evSaludable = mockEval({ grasa_visceral: 5 });
    const medallas = calcularMedallasSocio([evSaludable]);

    const corazon = medallas.find((m) => m.id === 'corazon_sano');
    expect(corazon?.desbloqueada).toBe(true);
    expect(corazon?.nivel).toBe('diamante'); // <= 6 es diamante
  });

  it('oculta detalles de medallas secretas mientras estén bloqueadas y los revela al desbloquearse', () => {
    const evNormal = mockEval({ puntuacion_corporal: 75 });
    const medallasBloqueadas = calcularMedallasSocio([evNormal]);
    const secretaBloqueada = medallasBloqueadas.find((m) => m.id === 'elite_corporal');

    expect(secretaBloqueada?.desbloqueada).toBe(false);
    expect(secretaBloqueada?.esSecreta).toBe(true);
    expect(secretaBloqueada?.titulo).toBe('Misterio Oculto');

    const evElite = mockEval({ puntuacion_corporal: 88 });
    const medallasDesbloqueadas = calcularMedallasSocio([evElite]);
    const secretaDesbloqueada = medallasDesbloqueadas.find((m) => m.id === 'elite_corporal');

    expect(secretaDesbloqueada?.desbloqueada).toBe(true);
    expect(secretaDesbloqueada?.titulo).toBe('Élite Corporal');
  });

  it('desbloquea la medalla Renacimiento si mejoran simultáneamente músculo, grasa y visceral', () => {
    const inicial = mockEval({
      fecha: '2026-01-01T10:00:00.000Z',
      masa_muscular_kg: 32.0,
      grasa_corporal_kg: 20.0,
      grasa_visceral: 10,
    });
    const actual = mockEval({
      fecha: '2026-02-01T10:00:00.000Z',
      masa_muscular_kg: 33.0, // Subió
      grasa_corporal_kg: 18.5, // Bajó
      grasa_visceral: 8, // Bajó
    });

    const medallas = calcularMedallasSocio([actual, inicial]);
    const renacimiento = medallas.find((m) => m.id === 'renacimiento');
    expect(renacimiento?.desbloqueada).toBe(true);
  });
});
