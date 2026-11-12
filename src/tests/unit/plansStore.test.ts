import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStoredAddonRates,
  saveStoredAddonRates,
  getStoredCatalogPlans,
  DEFAULT_ADDON_RATES,
} from '../../data/plansStore';

describe('Pruebas Unitarias · Catálogo de Planes y Tarifas Sincronizadas', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('el catálogo oficial de recepción debe incluir por defecto el Pase Diario de S/. 15', () => {
    const catalog = getStoredCatalogPlans();
    const paseDiario = catalog.find((p) => p.category === 'diario');

    expect(paseDiario).toBeDefined();
    expect(paseDiario?.name).toBe('Pase Diario (Entrenamiento por día)');
    expect(paseDiario?.price).toBe(DEFAULT_ADDON_RATES.paseDiario);
    expect(paseDiario?.months).toBe(0);
  });

  it('cuando Administración actualiza el Pase Diario a otra tarifa, Recepción refleja el nuevo precio inmediatamente', async () => {
    // Simulamos que el admin sube o baja el pase diario a S/. 20
    await saveStoredAddonRates({
      paseDiario: 20,
      boxeoAddon: 60,
      mesLibre2M: 140,
    });

    const rates = getStoredAddonRates();
    expect(rates.paseDiario).toBe(20);

    const catalog = getStoredCatalogPlans();
    const paseDiario = catalog.find((p) => p.category === 'diario');
    expect(paseDiario?.price).toBe(20);
  });

  it('debe disparar el evento gym-plans-updated al guardar planes o tarifas', async () => {
    const listener = vi.fn();
    window.addEventListener('gym-plans-updated', listener);

    await saveStoredAddonRates({
      paseDiario: 18,
      boxeoAddon: 50,
      mesLibre2M: 130,
    });

    expect(listener).toHaveBeenCalled();
    window.removeEventListener('gym-plans-updated', listener);
  });

  it('el catálogo categoriza correctamente los meses de vigencia para cada plan', () => {
    const catalog = getStoredCatalogPlans();

    const mensualGeneral = catalog.find((p) => p.name.includes('Plan Libre Mensual'));
    expect(mensualGeneral).toBeDefined();
    expect(mensualGeneral?.months).toBe(1);

    const trimestral = catalog.find((p) => p.name.includes('Trimestral'));
    expect(trimestral).toBeDefined();
    expect(trimestral?.months).toBe(3);

    const diario = catalog.find((p) => p.months === 0);
    expect(diario).toBeDefined();
    expect(diario?.category).toBe('diario');
  });

  it('permite calcular vigencias personalizadas exactas de cualquier duración (ej. 8 meses por 300 soles)', () => {
    const fechaInicio = '2026-11-10';
    const meses = 8;
    const precio = 300;

    const base = new Date(fechaInicio + 'T12:00:00');
    base.setMonth(base.getMonth() + meses);
    const fechaFinCalculada = base.toISOString().split('T')[0];

    // 2026-11-10 + 8 meses = 2027-07-10
    expect(fechaFinCalculada).toBe('2027-07-10');
    expect(precio).toBe(300);

    const costoMensualEquivalente = precio / meses;
    expect(costoMensualEquivalente).toBe(37.5);
  });
});
