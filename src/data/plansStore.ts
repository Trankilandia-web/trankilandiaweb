/**
 * TRANKILANDIA GYM · GESTIÓN DE PLANES Y TARIFAS EN TIEMPO REAL
 * ==============================================================================
 * Módulo unificado de tarifas y planes de membresía sincronizado entre:
 * 1. Panel de Administración (Gestión y edición de precios).
 * 2. Recepción de Caja (Inscripción de socios, renovaciones y pases diarios).
 * 3. Base de Datos Supabase (Tabla public.planes con persistencia en la nube).
 * ==============================================================================
 */

import { MEMBERSHIP_PLANS } from './gymData';
import type { PlanTier } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface GymPlanTier extends PlanTier {
  isActive?: boolean;
  requiresDocument?: 'dni_escolar' | 'carnet_estudiante' | null;
}

export interface AddonRates {
  paseDiario: number;
  boxeoAddon: number;
  mesLibre2M: number;
}

export const DEFAULT_ADDON_RATES: AddonRates = {
  paseDiario: 15,
  boxeoAddon: 50,
  mesLibre2M: 130,
};

const PLANS_STORAGE_KEY = 'trankilandia_plans_v2';
const ADDONS_STORAGE_KEY = 'trankilandia_addon_rates_v1';

export const getStoredMembershipPlans = (): GymPlanTier[] => {
  try {
    const raw = localStorage.getItem(PLANS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return MEMBERSHIP_PLANS.map((p) => ({
    ...p,
    isActive: true,
    requiresDocument:
      p.id === 'escolar'
        ? 'dni_escolar'
        : p.id === 'universitario'
        ? 'carnet_estudiante'
        : null,
  }));
};

export const saveStoredMembershipPlans = async (plans: GymPlanTier[]): Promise<void> => {
  try {
    localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gym-plans-updated'));
    }

    if (isSupabaseConfigured()) {
      try {
        const payload = plans.map((p) => ({
          id: p.id,
          nombre: p.name,
          tagline: p.tagline || '',
          precio_mensual: p.monthlyPrice,
          precio_trimestral: p.quarterlyPrice || 0,
          precio_semestral: p.semiannualPrice || 0,
          precio_anual: p.annualPrice || 0,
          badge: p.badge || null,
          descripcion: p.description || '',
          requiere_documento: p.requiresDocument || null,
          activo: p.isActive !== false,
          es_popular: Boolean(p.isPopular),
          updated_at: new Date().toISOString(),
        }));

        await supabase.from('planes').upsert(payload, { onConflict: 'id' });
      } catch (err) {
        console.warn('[saveStoredMembershipPlans] Error sincronizando con Supabase:', err);
      }
    }
  } catch {}
};

export const resetMembershipPlansToDefault = (): GymPlanTier[] => {
  const defaults: GymPlanTier[] = MEMBERSHIP_PLANS.map((p) => ({
    ...p,
    isActive: true,
    requiresDocument:
      p.id === 'escolar'
        ? 'dni_escolar'
        : p.id === 'universitario'
        ? 'carnet_estudiante'
        : null,
  }));
  saveStoredMembershipPlans(defaults);
  saveStoredAddonRates(DEFAULT_ADDON_RATES);
  return defaults;
};

export const getStoredAddonRates = (): AddonRates => {
  try {
    const raw = localStorage.getItem(ADDONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.paseDiario === 'number') {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_ADDON_RATES;
};

export const saveStoredAddonRates = async (rates: AddonRates): Promise<void> => {
  try {
    localStorage.setItem(ADDONS_STORAGE_KEY, JSON.stringify(rates));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gym-plans-updated'));
    }

    if (isSupabaseConfigured()) {
      try {
        await Promise.all([
          supabase.from('planes').upsert({
            id: 'pase_diario',
            nombre: 'Pase Diario (Entrenamiento por día)',
            precio_mensual: rates.paseDiario,
            precio_trimestral: 0,
            precio_semestral: 0,
            precio_anual: 0,
            activo: true,
            updated_at: new Date().toISOString(),
          }),
          supabase.from('planes').upsert({
            id: 'taller_boxeo',
            nombre: 'Taller Independiente Boxeo (1 Mes)',
            precio_mensual: rates.boxeoAddon,
            precio_trimestral: 0,
            precio_semestral: 0,
            precio_anual: 0,
            activo: true,
            updated_at: new Date().toISOString(),
          }),
          supabase.from('planes').upsert({
            id: 'libre_2m',
            nombre: 'Plan Libre 2 Meses Promocional',
            precio_mensual: rates.mesLibre2M,
            precio_trimestral: 0,
            precio_semestral: 0,
            precio_anual: 0,
            activo: true,
            updated_at: new Date().toISOString(),
          }),
        ]);
      } catch (err) {
        console.warn('[saveStoredAddonRates] Error sincronizando tarifas en Supabase:', err);
      }
    }
  } catch {}
};

/**
 * Carga los planes y tarifas desde Supabase y sincroniza localmente
 */
export const fetchPlansFromSupabase = async (): Promise<GymPlanTier[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('planes')
        .select('*')
        .order('precio_mensual', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const specialAddons: Partial<AddonRates> = {};
        const regularPlans: GymPlanTier[] = [];

        data.forEach((p) => {
          if (p.id === 'pase_diario') {
            specialAddons.paseDiario = Number(p.precio_mensual) || DEFAULT_ADDON_RATES.paseDiario;
          } else if (p.id === 'taller_boxeo') {
            specialAddons.boxeoAddon = Number(p.precio_mensual) || DEFAULT_ADDON_RATES.boxeoAddon;
          } else if (p.id === 'libre_2m') {
            specialAddons.mesLibre2M = Number(p.precio_mensual) || DEFAULT_ADDON_RATES.mesLibre2M;
          } else {
            regularPlans.push({
              id: p.id,
              name: p.nombre,
              tagline: p.tagline || '',
              monthlyPrice: Number(p.precio_mensual) || 0,
              quarterlyPrice: Number(p.precio_trimestral) || 0,
              semiannualPrice: Number(p.precio_semestral) || 0,
              annualPrice: Number(p.precio_anual) || 0,
              badge: p.badge || undefined,
              description: p.descripcion || '',
              requiresDocument: p.requiere_documento || null,
              isActive: p.activo !== false,
              isPopular: Boolean(p.es_popular),
              highlights: [],
              ctaText: `ELEGIR ${p.nombre.toUpperCase()}`,
              includesFreeEntry: true,
              includesBoxing: p.id === 'combo_boxeo',
            });
          }
        });

        if (regularPlans.length > 0) {
          localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(regularPlans));
        }

        if (Object.keys(specialAddons).length > 0) {
          const current = getStoredAddonRates();
          const merged: AddonRates = { ...current, ...specialAddons };
          localStorage.setItem(ADDONS_STORAGE_KEY, JSON.stringify(merged));
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gym-plans-updated'));
        }

        return regularPlans.length > 0 ? regularPlans : getStoredMembershipPlans();
      }
    } catch (err) {
      console.warn('[fetchPlansFromSupabase] Error consultando planes en Supabase:', err);
    }
  }

  return getStoredMembershipPlans();
};

export interface CatalogPlanOption {
  name: string;
  price: number;
  months: number;
  category: string;
  requiresDocument?: 'dni_escolar' | 'carnet_estudiante' | null;
}

export const getStoredCatalogPlans = (): CatalogPlanOption[] => {
  const plans = getStoredMembershipPlans().filter((p) => p.isActive !== false);
  const addons = getStoredAddonRates();
  const catalog: CatalogPlanOption[] = [];

  // 1. Desglose de Planes Oficiales Base y Personalizados
  plans.forEach((p) => {
    const isEscolar = p.id === 'escolar';
    const isUniversitario = p.id === 'universitario';
    const isGeneral = p.id === 'general' || p.id === 'adulto';
    const isCombo = p.id === 'combo_boxeo' || p.id === 'combo';

    if (isEscolar) {
      if (p.monthlyPrice > 0) {
        catalog.push({
          name: 'Plan Escolar (14 a 17 años)',
          price: p.monthlyPrice,
          months: 1,
          category: 'escolar',
          requiresDocument: 'dni_escolar',
        });
      }
      if (p.quarterlyPrice > 0) {
        catalog.push({
          name: 'Plan Escolar (Trimestral - 3 Meses)',
          price: p.quarterlyPrice,
          months: 3,
          category: 'escolar',
          requiresDocument: 'dni_escolar',
        });
      }
      if (p.semiannualPrice > 0) {
        catalog.push({
          name: 'Plan Escolar (Semestral - 6 Meses)',
          price: p.semiannualPrice,
          months: 6,
          category: 'escolar',
          requiresDocument: 'dni_escolar',
        });
      }
      if (p.annualPrice > 0) {
        catalog.push({
          name: 'Plan Escolar (Anual - 12 Meses)',
          price: p.annualPrice,
          months: 12,
          category: 'escolar',
          requiresDocument: 'dni_escolar',
        });
      }
    } else if (isUniversitario) {
      if (p.monthlyPrice > 0) {
        catalog.push({
          name: 'Plan Universitario / Instituto (1 Mes)',
          price: p.monthlyPrice,
          months: 1,
          category: 'universitario',
          requiresDocument: 'carnet_estudiante',
        });
      }
      if (p.quarterlyPrice > 0) {
        catalog.push({
          name: 'Plan Universitario / Instituto (Trimestral)',
          price: p.quarterlyPrice,
          months: 3,
          category: 'universitario',
          requiresDocument: 'carnet_estudiante',
        });
      }
      if (p.semiannualPrice > 0) {
        catalog.push({
          name: 'Plan Universitario (Semestral - 6 Meses)',
          price: p.semiannualPrice,
          months: 6,
          category: 'universitario',
          requiresDocument: 'carnet_estudiante',
        });
      }
      if (p.annualPrice > 0) {
        catalog.push({
          name: 'Plan Universitario (Anual - 12 Meses)',
          price: p.annualPrice,
          months: 12,
          category: 'universitario',
          requiresDocument: 'carnet_estudiante',
        });
      }
    } else if (isGeneral) {
      if (p.monthlyPrice > 0) {
        catalog.push({
          name: 'Plan Libre Mensual (Adulto)',
          price: p.monthlyPrice,
          months: 1,
          category: 'adulto',
        });
      }
      if (addons.mesLibre2M > 0) {
        catalog.push({
          name: 'Plan Libre 2 Meses Promocional',
          price: addons.mesLibre2M,
          months: 2,
          category: 'adulto',
        });
      }
      if (p.quarterlyPrice > 0) {
        catalog.push({
          name: 'Plan Libre Trimestral (3 Meses)',
          price: p.quarterlyPrice,
          months: 3,
          category: 'adulto',
        });
      }
      if (p.semiannualPrice > 0) {
        catalog.push({
          name: 'Plan Libre Semestral (6 Meses)',
          price: p.semiannualPrice,
          months: 6,
          category: 'adulto',
        });
      }
      if (p.annualPrice > 0) {
        catalog.push({
          name: 'Plan Libre Anual (12 Meses)',
          price: p.annualPrice,
          months: 12,
          category: 'adulto',
        });
      }
    } else if (isCombo) {
      if (p.monthlyPrice > 0) {
        catalog.push({
          name: 'Plan Gym + Escuela de Boxeo (1 Mes)',
          price: p.monthlyPrice,
          months: 1,
          category: 'combo',
        });
      }
      if (p.quarterlyPrice > 0) {
        catalog.push({
          name: 'Plan Gym + Escuela de Boxeo (Trimestral)',
          price: p.quarterlyPrice,
          months: 3,
          category: 'combo',
        });
      }
      if (p.semiannualPrice > 0) {
        catalog.push({
          name: 'Plan Gym + Escuela de Boxeo (Semestral)',
          price: p.semiannualPrice,
          months: 6,
          category: 'combo',
        });
      }
      if (p.annualPrice > 0) {
        catalog.push({
          name: 'Plan Gym + Escuela de Boxeo (Anual)',
          price: p.annualPrice,
          months: 12,
          category: 'combo',
        });
      }
    } else {
      // Planes personalizados agregados por el administrador
      if (p.monthlyPrice > 0) {
        catalog.push({
          name: `${p.name} (1 Mes)`,
          price: p.monthlyPrice,
          months: 1,
          category: 'personalizado',
        });
      }
      if (p.quarterlyPrice > 0) {
        catalog.push({
          name: `${p.name} (3 Meses)`,
          price: p.quarterlyPrice,
          months: 3,
          category: 'personalizado',
        });
      }
      if (p.semiannualPrice > 0) {
        catalog.push({
          name: `${p.name} (6 Meses)`,
          price: p.semiannualPrice,
          months: 6,
          category: 'personalizado',
        });
      }
      if (p.annualPrice > 0) {
        catalog.push({
          name: `${p.name} (12 Meses)`,
          price: p.annualPrice,
          months: 12,
          category: 'personalizado',
        });
      }
    }
  });

  // 2. AGREGAR PASE DIARIO Y TARIFAS ESPECIALES GESTIONADAS EN ADMINISTRACIÓN
  if (addons.paseDiario > 0) {
    catalog.push({
      name: 'Pase Diario (Entrenamiento por día)',
      price: addons.paseDiario,
      months: 0,
      category: 'diario',
    });
  }

  if (addons.boxeoAddon > 0) {
    catalog.push({
      name: 'Taller Independiente Boxeo (1 Mes)',
      price: addons.boxeoAddon,
      months: 1,
      category: 'boxeo',
    });
  }

  return catalog;
};
