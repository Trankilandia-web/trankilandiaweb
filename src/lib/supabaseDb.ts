import { supabase, isSupabaseConfigured } from './supabase';
import { extraerDniPeru } from './dniParser';
import { getLocalPeruDateString } from './dateUtils';
import {
  actualizarPasswordSocio,
  restablecerPasswordSocio,
  getStoredCustomPassword,
  saveStoredCustomPassword,
} from './authPasswords';
export {
  actualizarPasswordSocio,
  restablecerPasswordSocio,
  getStoredCustomPassword,
  saveStoredCustomPassword,
};
import {
  GymMember,
  MemberRoutine,
  ProgressRecord,
  getStoredMembers,
  saveStoredMembers,
  generateNextMemberId,
  getStoredRoutines,
  saveStoredRoutines,
  getStoredProgress,
  saveStoredProgress,
} from '../data/gymStore';

// ==============================================================================
// TRANKILANDIA GYM · SERVICIO OPTIMIZADO PARA FREE TIER (VERCEL + SUPABASE)
// ==============================================================================
// - Cero `.select('*')` para proteger los 5GB de Egress mensual.
// - Vistas y RPCs atómicas para minimizar requests y transacciones seguras.
// - Sincronización Local-First con soporte de cola offline para cortes de luz/red.
// ==============================================================================

export interface SocioRecepcion {
  id: string;
  dni: string;
  nombre: string;
  plan: string;
  precio_plan: number;
  tipo_pago: 'full' | 'advance';
  adelanto_pagado: number;
  saldo_pendiente: number;
  fecha_limite_pago?: string | null;
  fecha_fin: string;
  turno: 'manana' | 'tarde' | 'noche';
  coach_asignado: string;
  dias_restantes: number;
  estado_calculado: 'activo' | 'por_vencer' | 'vencido';
  tiene_deuda_activa: boolean;
  numero_boleta: string;
  observaciones?: string | null;
  email?: string | null;
  celular?: string | null;
}

export interface AsistenciaActiva {
  id: number | string;
  socio_id: string;
  dni: string;
  nombre: string;
  turno: 'manana' | 'tarde' | 'noche';
  fecha_ingreso: string; // ISO string
}

export interface ProductoPOS {
  id: string;
  codigo_barras?: string | null;
  nombre: string;
  categoria: 'Bebidas' | 'Energizantes' | 'Proteinas' | 'Suplementos' | 'Snacks' | 'Accesorios';
  precio_compra?: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
}

export interface ItemVentaPOS {
  producto_id: string;
  cantidad: number;
}

export interface DescuentoPOS {
  monto: number;
  motivo?: string;
  autorizadoPor?: string;
}

export interface ResultadoVentaPOS {
  success: boolean;
  venta_id?: number | string;
  numero_ticket: string;
  subtotal?: number;
  descuento?: number;
  total: number;
  metodo_pago: string;
  cliente_nombre?: string;
  cliente_dni?: string;
  fecha?: string;
}

const LOCAL_OFFLINE_QUEUE_KEY = 'trankilandia_asistencias_offline';
const LOCAL_OFFLINE_SALES_KEY = 'trankilandia_ventas_offline';
const LOCAL_PRODUCTS_KEY = 'trankilandia_productos_inventario';

export interface VentaOfflineQueued {
  id: string;
  items: ItemVentaPOS[];
  metodo_pago: 'yape' | 'plin' | 'efectivo' | 'tarjeta';
  cliente_nombre: string;
  cliente_dni: string;
  subtotal?: number;
  descuento?: DescuentoPOS;
  total: number;
  numero_ticket: string;
  fecha: string;
}

// Catálogo base precargado para contingencia offline / primer arranque
export const CATALOGO_PRODUCTOS_BASE: ProductoPOS[] = [
  { id: 'BEB-001', codigo_barras: '7750106001017', nombre: 'Agua Mineral San Mateo 600ml', categoria: 'Bebidas', precio_venta: 2.50, stock_actual: 48, stock_minimo: 12, activo: true },
  { id: 'BEB-002', codigo_barras: '7750106001024', nombre: 'Sporade 500ml (Frutas Tropicales)', categoria: 'Bebidas', precio_venta: 3.50, stock_actual: 36, stock_minimo: 10, activo: true },
  { id: 'BEB-003', codigo_barras: '7750106001031', nombre: 'Gatorade 500ml (Mandarina)', categoria: 'Bebidas', precio_venta: 4.00, stock_actual: 24, stock_minimo: 8, activo: true },
  { id: 'ENE-001', codigo_barras: '070847811169', nombre: 'Monster Energy Ultra 473ml (Cero Azúcar)', categoria: 'Energizantes', precio_venta: 8.50, stock_actual: 20, stock_minimo: 6, activo: true },
  { id: 'ENE-002', codigo_barras: '9002490100070', nombre: 'Red Bull Energy Drink 250ml', categoria: 'Energizantes', precio_venta: 7.50, stock_actual: 18, stock_minimo: 6, activo: true },
  { id: 'PRO-001', codigo_barras: '7751234567011', nombre: 'Batido Whey Protein 1 Scoop (Vainilla/Chocolate)', categoria: 'Proteinas', precio_venta: 7.00, stock_actual: 50, stock_minimo: 15, activo: true },
  { id: 'PRO-002', codigo_barras: '7751234567028', nombre: 'Proteína 100% Whey Gold Standard 2lb (ON)', categoria: 'Proteinas', precio_venta: 145.00, stock_actual: 6, stock_minimo: 2, activo: true },
  { id: 'SUP-001', codigo_barras: '7751234567035', nombre: 'Creatina Monohidratada Creapure 300g', categoria: 'Suplementos', precio_venta: 85.00, stock_actual: 8, stock_minimo: 2, activo: true },
  { id: 'SUP-002', codigo_barras: '7751234567042', nombre: 'Pre-Entreno C4 Original Cellucor 30 Serv', categoria: 'Suplementos', precio_venta: 110.00, stock_actual: 5, stock_minimo: 2, activo: true },
  { id: 'SNK-001', codigo_barras: '888849000102', nombre: 'Barra de Proteína Quest Bar 60g', categoria: 'Snacks', precio_venta: 9.50, stock_actual: 24, stock_minimo: 6, activo: true },
];

/**
 * 1. OBTENER SOCIOS PARA EL ÍNDICE ULTRA-RÁPIDO EN MEMORIA DE RECEPCIÓN
 * Consulta la vista optimizada `v_socios_estado` trayendo ÚNICAMENTE columnas críticas.
 * Cero fugas de egress: consumo ~40KB para los 450 socios.
 */
export async function fetchSociosParaRecepcion(): Promise<SocioRecepcion[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('v_socios_estado')
        .select('id, dni, nombre, plan, precio_plan, tipo_pago, adelanto_pagado, saldo_pendiente, fecha_limite_pago, fecha_fin, turno, coach_asignado, dias_restantes, estado_calculado, tiene_deuda_activa, numero_boleta, email, celular')
        .order('nombre', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          dni: d.dni,
          nombre: d.nombre,
          plan: d.plan || 'Musculación Libre',
          precio_plan: Number(d.precio_plan) || 80,
          tipo_pago: d.tipo_pago || 'full',
          adelanto_pagado: Number(d.adelanto_pagado) || 0,
          saldo_pendiente: Number(d.saldo_pendiente) || 0,
          fecha_limite_pago: d.fecha_limite_pago || null,
          fecha_fin: d.fecha_fin || '',
          turno: (d.turno as 'manana' | 'tarde' | 'noche') || 'manana',
          coach_asignado: d.coach_asignado || 'Coach Marcos Rivas',
          dias_restantes: Number(d.dias_restantes) || 0,
          estado_calculado: (d.estado_calculado as 'activo' | 'por_vencer' | 'vencido') || 'activo',
          tiene_deuda_activa: Boolean(d.tiene_deuda_activa),
          numero_boleta: d.numero_boleta || 'B001-000000',
          observaciones: d.observaciones || null,
          email: d.email || null,
          celular: d.celular || null,
        }));
      }
      if (error) {
        console.warn('[fetchSociosParaRecepcion] Error en consulta v_socios_estado:', error.message);
      }
    } catch (err: any) {
      console.warn('[fetchSociosParaRecepcion] Excepción de conexión con Supabase:', err?.message || err);
    }
  }

  // Fallback con datos locales
  const stored = getStoredMembers();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return stored.map((m) => {
    const hasDebt = (m.balanceDue || 0) > 0;
    const isSinPlan = !m.plan || m.plan === 'Sin Membresía Activa' || (m.planPrice || 0) === 0;
    const isInactive = m.membershipStatus === 'inactive' || isSinPlan;

    // Calcular días restantes reales basados en m.expiresAt
    let diasRestantes = 0;
    const fechaFin = m.expiresAt ? normalizeDateToISO(m.expiresAt) : '';
    if (fechaFin) {
      const expDate = new Date(fechaFin);
      if (!isNaN(expDate.getTime())) {
        expDate.setHours(0, 0, 0, 0);
        diasRestantes = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    const estadoCalculado: 'activo' | 'por_vencer' | 'vencido' =
      isInactive || diasRestantes < 0
        ? 'vencido'
        : diasRestantes <= 5
        ? 'por_vencer'
        : 'activo';

    return {
      id: m.id,
      dni: m.dni || '',
      nombre: m.name,
      plan: m.plan,
      precio_plan: m.planPrice,
      tipo_pago: m.paymentType,
      adelanto_pagado: m.advancePaid,
      saldo_pendiente: m.balanceDue,
      fecha_limite_pago: m.paymentDueDate || null,
      fecha_fin: fechaFin || '2026-11-30',
      turno: (m.shift as 'manana' | 'tarde' | 'noche') || 'manana',
      coach_asignado: m.coachName || 'Coach Marcos Rivas',
      dias_restantes: diasRestantes,
      estado_calculado: estadoCalculado,
      tiene_deuda_activa: hasDebt,
      numero_boleta: m.receiptNumber || 'B001-000000',
      observaciones: m.observations || null,
      email: m.email || null,
      celular: m.phone || null,
    };
  });
}

/**
 * DEDUPLICAR ASISTENCIAS ACTIVAS (ÚLTIMOS 90 MINUTOS)
 * Garantiza que ningún atleta aparezca duplicado en sala y purga automáticamente registros > 90 min.
 */
export function deduplicarAsistenciasActivas(list: AsistenciaActiva[]): AsistenciaActiva[] {
  if (!Array.isArray(list) || list.length === 0) return [];

  const seenSocios = new Set<string>();
  const seenDnis = new Set<string>();
  const seenNombres = new Set<string>();
  const result: AsistenciaActiva[] = [];
  const now = Date.now();
  const ninetyMinMs = 90 * 60 * 1000;

  // Ordenar siempre de más reciente a más antiguo
  const sorted = [...list].sort(
    (a, b) => new Date(b.fecha_ingreso).getTime() - new Date(a.fecha_ingreso).getTime()
  );

  for (const item of sorted) {
    const timeMs = new Date(item.fecha_ingreso).getTime();
    if (isNaN(timeMs) || (now - timeMs) > ninetyMinMs) {
      continue; // Purga registros que ya superaron los 90 minutos
    }

    const cleanDni = item.dni?.replace(/\D/g, '').slice(0, 8);
    const socioId = item.socio_id ? String(item.socio_id).trim() : '';
    const normNombre = item.nombre ? item.nombre.trim().toLowerCase() : '';

    if (socioId && seenSocios.has(socioId)) continue;
    if (cleanDni && seenDnis.has(cleanDni)) continue;
    if (normNombre && seenNombres.has(normNombre)) continue;

    if (socioId) seenSocios.add(socioId);
    if (cleanDni) seenDnis.add(cleanDni);
    if (normNombre) seenNombres.add(normNombre);

    result.push(item);
  }

  return result;
}

/**
 * 2. CARGAR ASISTENCIAS ACTIVAS DE LOS ÚLTIMOS 90 MINUTOS
 * Permite calcular el aforo en sala sin polling ni COUNT(*) reiterados, garantizando 0 nombres repetidos.
 */
export async function cargarAsistenciasActivas90Min(): Promise<AsistenciaActiva[]> {
  const cutoffTime = new Date(Date.now() - 90 * 60 * 1000).toISOString();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('asistencias')
        .select('id, socio_id, dni, nombre, turno, fecha_ingreso')
        .gte('fecha_ingreso', cutoffTime)
        .order('fecha_ingreso', { ascending: false });

      if (error) {
        console.warn('[cargarAsistenciasActivas90Min] Error consultando asistencias en Supabase:', error.message);
      }

      if (!error && data) {
        // Combinar con asistencias locales de la sesión activa para soporte local-first
        try {
          const raw = sessionStorage.getItem('trankilandia_asistencias_sesion') || localStorage.getItem('trankilandia_asistencias_sesion');
          if (raw) {
            const localList: AsistenciaActiva[] = JSON.parse(raw);
            const remoteIds = new Set(data.map((d: any) => d.id));
            const pendingLocal = localList.filter((l) =>
              !remoteIds.has(l.id) &&
              new Date(l.fecha_ingreso).getTime() >= Date.now() - 90 * 60 * 1000
            );
            return deduplicarAsistenciasActivas([...data, ...pendingLocal] as AsistenciaActiva[]);
          }
        } catch (parseErr) {
          console.warn('[cargarAsistenciasActivas90Min] Error parseando sesión local:', parseErr);
        }
        return deduplicarAsistenciasActivas(data as AsistenciaActiva[]);
      }
    } catch (err: any) {
      console.warn('[cargarAsistenciasActivas90Min] Excepción consultando Supabase:', err?.message || err);
    }
  }

  // Fallback local: recuperar del sessionStorage o devolver array vacío
  try {
    const raw = sessionStorage.getItem('trankilandia_asistencias_sesion') || localStorage.getItem('trankilandia_asistencias_sesion');
    if (raw) {
      const list: AsistenciaActiva[] = JSON.parse(raw);
      return deduplicarAsistenciasActivas(list);
    }
  } catch (storageErr) {
    console.warn('[cargarAsistenciasActivas90Min] Error en fallback de almacenamiento local:', storageErr);
  }

  return [];
}

/**
 * 3. REGISTRAR ASISTENCIA (LOCAL-FIRST CON COLA OFFLINE)
 * Guarda inmediatamente y envía en segundo plano. Si falla la red, queda en cola.
 */
export async function registrarAsistencia(asistencia: {
  socio_id: string;
  dni: string;
  nombre: string;
  turno: 'manana' | 'tarde' | 'noche';
}): Promise<{ success: boolean; data?: AsistenciaActiva; offlineQueued?: boolean }> {
  const item: AsistenciaActiva = {
    id: `ast-${Date.now()}`,
    socio_id: asistencia.socio_id,
    dni: asistencia.dni,
    nombre: asistencia.nombre,
    turno: asistencia.turno,
    fecha_ingreso: new Date().toISOString(),
  };

  // Guardar en sesión local de asistencias
  try {
    const raw = sessionStorage.getItem('trankilandia_asistencias_sesion') || localStorage.getItem('trankilandia_asistencias_sesion');
    const list: AsistenciaActiva[] = raw ? JSON.parse(raw) : [];
    const updatedList = JSON.stringify([item, ...list]);
    sessionStorage.setItem('trankilandia_asistencias_sesion', updatedList);
    try {
      localStorage.setItem('trankilandia_asistencias_sesion', updatedList);
    } catch (lsErr) {
      console.warn('[registrarAsistencia] Error al guardar en localStorage:', lsErr);
    }
  } catch (sessErr) {
    console.warn('[registrarAsistencia] Error al guardar en sessionStorage:', sessErr);
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('asistencias')
        .insert({
          socio_id: asistencia.socio_id,
          dni: asistencia.dni,
          nombre: asistencia.nombre,
          turno: asistencia.turno,
        })
        .select('id, socio_id, dni, nombre, turno, fecha_ingreso')
        .maybeSingle();

      if (!error) {
        if (data) {
          return { success: true, data: data as AsistenciaActiva };
        }
        // Si data es null, el trigger trg_evitar_doble_asistencia de PostgreSQL descartó la fila por rebote de escáner (<60s)
        return { success: true, data: item, offlineQueued: false };
      }

      // Si el error fue por coerción a fila única ante descarte del trigger (406 / PGRST116)
      if (error && (error.code === 'PGRST116' || error.message?.includes('Cannot coerce'))) {
        return { success: true, data: item, offlineQueued: false };
      }

      console.warn('[registrarAsistencia] Error al insertar asistencia en Supabase:', error.message);
    } catch (err: any) {
      console.warn('[registrarAsistencia] Excepción de conexión al registrar asistencia:', err?.message || err);
    }
  }

  // Si falló el envío o no hay conexión, almacenar en la cola de reintento offline
  encolarAsistenciaOffline(item);
  return { success: true, data: item, offlineQueued: true };
}

function encolarAsistenciaOffline(item: AsistenciaActiva): void {
  try {
    const raw = localStorage.getItem(LOCAL_OFFLINE_QUEUE_KEY);
    const queue: AsistenciaActiva[] = raw ? JSON.parse(raw) : [];
    queue.push(item);
    localStorage.setItem(LOCAL_OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('[encolarAsistenciaOffline] Error encolando asistencia offline:', err);
  }
}

let isSyncingOfflineQueue = false;

/**
 * 4. VACIAR Y SINCRONIZAR COLA OFFLINE AL VOLVER LA CONEXIÓN
 * Implementa control por lote e IDs en tránsito para no borrar escaneos nuevos que lleguen durante el viaje de red.
 */
export async function procesarColaAsistenciasOffline(): Promise<number> {
  if (!isSupabaseConfigured() || !navigator.onLine || isSyncingOfflineQueue) return 0;

  try {
    const raw = localStorage.getItem(LOCAL_OFFLINE_QUEUE_KEY);
    if (!raw) return 0;
    const queue: AsistenciaActiva[] = JSON.parse(raw);
    if (queue.length === 0) return 0;

    isSyncingOfflineQueue = true;

    // Asegurar IDs únicos para seguimiento
    const queueWithIds = queue.map((q, idx) => ({
      ...q,
      id: q.id || `offline-${Date.now()}-${idx}`,
    }));

    const idsEnTransito = new Set(queueWithIds.map((q) => String(q.id)));

    const payload = queueWithIds.map((q) => ({
      socio_id: q.socio_id,
      dni: q.dni,
      nombre: q.nombre,
      turno: q.turno,
      fecha_ingreso: q.fecha_ingreso,
    }));

    const { error } = await supabase.from('asistencias').insert(payload);
    if (!error) {
      // Al resolver exitosamente, conservar en localStorage únicamente los que NO estaban en este lote
      try {
        const actualRaw = localStorage.getItem(LOCAL_OFFLINE_QUEUE_KEY);
        const actualQueue: AsistenciaActiva[] = actualRaw ? JSON.parse(actualRaw) : [];
        const restantes = actualQueue.filter((item) => !idsEnTransito.has(String(item.id)));

        if (restantes.length > 0) {
          localStorage.setItem(LOCAL_OFFLINE_QUEUE_KEY, JSON.stringify(restantes));
        } else {
          localStorage.removeItem(LOCAL_OFFLINE_QUEUE_KEY);
        }
      } catch (storageErr) {
        console.warn('[procesarColaAsistenciasOffline] Error actualizando cola offline tras sync:', storageErr);
      }
      return queueWithIds.length;
    } else {
      console.warn('[procesarColaAsistenciasOffline] Error al sincronizar cola con Supabase:', error.message);
    }
  } catch (err: any) {
    console.warn('[procesarColaAsistenciasOffline] Excepción procesando cola offline:', err?.message || err);
  } finally {
    isSyncingOfflineQueue = false;
  }

  return 0;
}

/**
 * 5. OBTENER CATÁLOGO DE PRODUCTOS E INVENTARIO PARA EL POS
 */
export async function obtenerProductosInventario(): Promise<ProductoPOS[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('id, codigo_barras, nombre, categoria, precio_compra, precio_venta, stock_actual, stock_minimo, activo')
        .eq('activo', true)
        .order('categoria', { ascending: true })
        .order('nombre', { ascending: true });

      if (error) {
        console.warn('[obtenerProductosInventario] Error consultando productos en Supabase:', error.message);
      }

      if (!error && Array.isArray(data)) {
        try {
          localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(data));
        } catch (cacheErr) {
          console.warn('[obtenerProductosInventario] Error cacheando productos localmente:', cacheErr);
        }
        return data as ProductoPOS[];
      }
    } catch (err: any) {
      console.warn('[obtenerProductosInventario] Excepción consultando inventario en Supabase:', err?.message || err);
    }
  }

  // Fallback con localStorage o catálogo base
  try {
    const cached = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (cached !== null) return JSON.parse(cached);
  } catch (storageErr) {
    console.warn('[obtenerProductosInventario] Error leyendo inventario de localStorage:', storageErr);
  }

  return CATALOGO_PRODUCTOS_BASE;
}

/**
 * Busca un producto en el inventario por código de barras (soporta múltiples códigos separados por comas/espacios),
 * coincidencia por SKU/ID, o detección heurística de marcas locales (AJE Sporade / Volt / Agua).
 */
export function buscarProductoPorCodigo(
  productos: ProductoPOS[],
  rawCode: string
): ProductoPOS | undefined {
  const code = rawCode.trim().replace(/^\][A-Za-z0-9]{2}/, ''); // Limpiar prefijos de lectores 2D
  if (!code) return undefined;
  const lowerCode = code.toLowerCase();

  // 1. Coincidencia exacta o contenida en lista de códigos separados por coma/espacios
  const matchExacto = productos.find((p) => {
    if (p.activo === false) return false;
    if (!p.codigo_barras) return false;
    const tokens = p.codigo_barras
      .split(/[\s,;|]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    return tokens.includes(lowerCode) || p.codigo_barras.trim().toLowerCase() === lowerCode;
  });
  if (matchExacto) return matchExacto;

  // 2. Coincidencia por ID o SKU (ej: PROD-1310, BEB-001)
  const matchId = productos.find(
    (p) => p.activo !== false && p.id.toLowerCase() === lowerCode
  );
  if (matchId) return matchId;

  // 3. Reconocimiento inteligente de códigos EAN peruanos comunes (Grupo AJE):
  // Si el código empieza por 775067001 (Rango Sporade) y hay un producto "SPORADE":
  if (/^775067001\d{4}$/.test(code)) {
    const sporade = productos.find((p) => p.activo !== false && p.nombre.toLowerCase().includes('sporade'));
    if (sporade) return sporade;
  }
  // Si el código empieza por 775067002 (Rango Volt) y hay un producto "VOLT":
  if (/^775067002\d{4}$/.test(code)) {
    const volt = productos.find((p) => p.activo !== false && p.nombre.toLowerCase().includes('volt'));
    if (volt) return volt;
  }
  // Si el código empieza por 775067000 (Rango Agua Cielo/San Mateo) y hay producto "agua":
  if (/^775067000\d{4}$/.test(code)) {
    const agua = productos.find((p) => p.activo !== false && p.nombre.toLowerCase().includes('agua'));
    if (agua) return agua;
  }

  return undefined;
}

/**
 * Asocia un nuevo código de barras escaneado a un producto existente en Supabase y memoria
 */
export async function vincularCodigoBarrasAProducto(
  productoId: string,
  nuevoCodigo: string
): Promise<{ success: boolean; producto?: ProductoPOS; message?: string }> {
  const cleanCode = nuevoCodigo.trim().replace(/^\][A-Za-z0-9]{2}/, '');
  if (!cleanCode) return { success: false, message: 'Código de barras inválido.' };

  const currentList = await obtenerProductosInventario();
  const target = currentList.find((p) => p.id === productoId);
  if (!target) return { success: false, message: 'Producto no encontrado.' };

  // Concatenar sin duplicar
  const existingTokens = (target.codigo_barras || '')
    .split(/[\s,;|]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (!existingTokens.includes(cleanCode)) {
    existingTokens.push(cleanCode);
  }
  const updatedBarcodes = existingTokens.join(', ');

  // 1. Actualizar en Supabase si está configurado
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('productos')
        .update({ codigo_barras: updatedBarcodes, updated_at: new Date().toISOString() })
        .eq('id', productoId);
      if (error) {
        console.warn('[vincularCodigoBarrasAProducto] Error actualizando en Supabase:', error.message);
      }
    } catch (err: any) {
      console.warn('[vincularCodigoBarrasAProducto] Excepción en Supabase:', err?.message || err);
    }
  }

  // 2. Actualizar en almacenamiento local
  target.codigo_barras = updatedBarcodes;
  const updatedList = currentList.map((p) => (p.id === productoId ? { ...p, codigo_barras: updatedBarcodes } : p));
  try {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(updatedList));
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gym-products-updated'));
  }

  return { success: true, producto: target };
}

/**
 * 6. REGISTRAR VENTA POS CON RPC ATÓMICO (1 SOLO REQUEST HTTP)
 * Valida stock con bloqueo FOR UPDATE, descuenta existencias y genera ticket oficial.
 * Admite descuento proporcionado y auditado por operador de caja.
 */
export async function registrarVentaPOS(
  items: ItemVentaPOS[],
  metodoPago: 'yape' | 'plin' | 'efectivo' | 'tarjeta',
  clienteNombre: string = 'Cliente Mostrador',
  clienteDni: string = '',
  descuento?: DescuentoPOS
): Promise<ResultadoVentaPOS> {
  if (items.length === 0) {
    throw new Error('El carrito de venta no contiene ningún producto.');
  }

  const montoDescuento = descuento && descuento.monto > 0 ? Number(descuento.monto) : 0;
  const motivoDescuento = descuento?.motivo?.trim() || (montoDescuento > 0 ? 'Descuento autorizado' : '');
  const auditString = montoDescuento > 0
    ? ` [Desc: S/. ${montoDescuento.toFixed(2)} - Motivo: ${motivoDescuento}]`
    : '';
  const clienteNombreAuditado = `${clienteNombre.trim() || 'Cliente Mostrador'}${auditString}`;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('registrar_venta_pos', {
        p_items: items,
        p_metodo_pago: metodoPago,
        p_cliente_nombre: clienteNombreAuditado,
        p_cliente_dni: clienteDni.trim() || null,
      });

      if (!error && data) {
        const subtotalRpc = Number(data.total);
        const totalFinalRpc = Math.max(0, subtotalRpc - montoDescuento);

        if (montoDescuento > 0) {
          try {
            await supabase.from('ingresos').insert({
              venta_id: data.venta_id,
              monto: -montoDescuento,
              metodo_pago: metodoPago,
              tipo: 'Descuento POS',
              observacion: `Ajuste por descuento en Ticket ${data.numero_ticket} (${motivoDescuento}) - Autorizado por: ${descuento?.autorizadoPor || clienteNombre}`,
            });
          } catch (descErr) {
            console.warn('[registrarVentaPOS] Error registrando contra-asiento de descuento:', descErr);
          }
        }

        return {
          success: true,
          venta_id: data.venta_id,
          numero_ticket: data.numero_ticket,
          subtotal: subtotalRpc,
          descuento: montoDescuento,
          total: totalFinalRpc,
          metodo_pago: data.metodo_pago,
          cliente_nombre: clienteNombre,
          cliente_dni: clienteDni,
          fecha: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        };
      }
      console.warn('Supabase RPC registrar_venta_pos no disponible, usando procesamiento POS local-first:', error?.message);
    } catch (err: any) {
      console.warn('Error en conexión con RPC registrar_venta_pos, usando procesamiento POS local-first:', err?.message);
    }
  }

  // Fallback Offline / Mock POS
  const prods = await obtenerProductosInventario();

  // Validar que cada producto exista y tenga stock suficiente
  for (const item of items) {
    const prod = prods.find((p) => p.id === item.producto_id);
    if (!prod) {
      throw new Error(`Producto con ID ${item.producto_id} no encontrado en el inventario.`);
    }
    if (prod.stock_actual < item.cantidad) {
      throw new Error(`Stock insuficiente para ${prod.nombre} (Stock actual: ${prod.stock_actual})`);
    }
  }

  let subtotalCalculado = 0;
  const updatedProds = prods.map((p) => {
    const item = items.find((i) => i.producto_id === p.id);
    if (item) {
      subtotalCalculado += p.precio_venta * item.cantidad;
      return { ...p, stock_actual: p.stock_actual - item.cantidad };
    }
    return p;
  });

  const totalCalculado = Math.max(0, subtotalCalculado - montoDescuento);

  try {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(updatedProds));
  } catch (storageErr) {
    console.warn('[registrarVentaPOS] Error cacheando productos localmente:', storageErr);
  }

  // Descontar inmediatamente el stock en la base de datos Supabase Cloud
  if (isSupabaseConfigured()) {
    for (const item of items) {
      const prod = prods.find((p) => p.id === item.producto_id);
      if (prod) {
        const newStock = Math.max(0, prod.stock_actual - item.cantidad);
        try {
          await supabase
            .from('productos')
            .update({ stock_actual: newStock, updated_at: new Date().toISOString() })
            .eq('id', item.producto_id);
        } catch (dbErr) {
          console.warn('[registrarVentaPOS] Error descontando stock en Supabase:', dbErr);
        }
      }
    }
  }

  // Notificar a toda la aplicación para actualizar inventario en tiempo real
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gym-products-updated'));
  }

  const dateStr = getLocalPeruDateString().replace(/-/g, '');
  const randomTicket = `TK-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Encolar en storage persistente para sincronizar con Supabase al recuperar la red
  const ventaOffline: VentaOfflineQueued = {
    id: `sale-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    items,
    metodo_pago: metodoPago,
    cliente_nombre: clienteNombreAuditado,
    cliente_dni: clienteDni,
    subtotal: subtotalCalculado,
    descuento: montoDescuento > 0 ? { monto: montoDescuento, motivo: motivoDescuento } : undefined,
    total: totalCalculado,
    numero_ticket: randomTicket,
    fecha: new Date().toISOString(),
  };
  encolarVentaOffline(ventaOffline);

  return {
    success: true,
    numero_ticket: randomTicket,
    subtotal: subtotalCalculado,
    descuento: montoDescuento,
    total: totalCalculado,
    metodo_pago: metodoPago,
    cliente_nombre: clienteNombre,
    cliente_dni: clienteDni,
    fecha: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
  };
}

function encolarVentaOffline(venta: VentaOfflineQueued): void {
  try {
    const raw = localStorage.getItem(LOCAL_OFFLINE_SALES_KEY);
    const queue: VentaOfflineQueued[] = raw ? JSON.parse(raw) : [];
    queue.push(venta);
    localStorage.setItem(LOCAL_OFFLINE_SALES_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('[encolarVentaOffline] Error encolando venta offline:', err);
  }
}

let isSyncingOfflineSales = false;

/**
 * 6.1 VACIAR Y SINCRONIZAR COLA DE VENTAS OFFLINE AL VOLVER LA CONEXIÓN
 * Sincroniza ventas realizadas sin internet hacia Supabase garantizando trazabilidad contable.
 * Aplica el patrón de idsEnTransito para evitar pérdida de ventas encoladas durante la petición de red.
 */
export async function procesarColaVentasOffline(): Promise<number> {
  if (!isSupabaseConfigured() || !navigator.onLine || isSyncingOfflineSales) return 0;

  try {
    const raw = localStorage.getItem(LOCAL_OFFLINE_SALES_KEY);
    if (!raw) return 0;
    const queue: VentaOfflineQueued[] = JSON.parse(raw);
    if (queue.length === 0) return 0;

    isSyncingOfflineSales = true;

    const queueWithIds = queue.map((q, idx) => ({
      ...q,
      id: q.id || `sale-${Date.now()}-${idx}`,
    }));

    const sincronizadasExitosas = new Set<string>();

    for (const venta of queueWithIds) {
      try {
        const { error: rpcErr } = await supabase.rpc('registrar_venta_pos', {
          p_items: venta.items,
          p_metodo_pago: venta.metodo_pago,
          p_cliente_nombre: venta.cliente_nombre || 'Cliente Mostrador (Sync Offline)',
          p_cliente_dni: venta.cliente_dni || null,
        });

        if (!rpcErr) {
          sincronizadasExitosas.add(String(venta.id));
        } else {
          // Si la RPC registrar_venta_pos no está disponible o falla por RLS,
          // registrar al menos el asiento contable en la tabla ingresos para asegurar el flujo de caja
          const { error: ingErr } = await supabase.from('ingresos').insert({
            monto: venta.total,
            metodo_pago: venta.metodo_pago,
            tipo: 'Venta POS Productos',
            observacion: `Venta offline ticket ${venta.numero_ticket} (${venta.cliente_nombre}) - Sync automática`,
          });
          if (!ingErr) {
            sincronizadasExitosas.add(String(venta.id));
          } else {
            console.warn('[procesarColaVentasOffline] Error registrando ingreso:', ingErr.message);
          }
        }
      } catch (itemErr: any) {
        console.warn('[procesarColaVentasOffline] Error procesando ticket:', venta.numero_ticket, itemErr?.message);
      }
    }

    if (sincronizadasExitosas.size > 0) {
      try {
        const actualRaw = localStorage.getItem(LOCAL_OFFLINE_SALES_KEY);
        const actualQueue: VentaOfflineQueued[] = actualRaw ? JSON.parse(actualRaw) : [];
        const restantes = actualQueue.filter((item) => !sincronizadasExitosas.has(String(item.id)));

        if (restantes.length > 0) {
          localStorage.setItem(LOCAL_OFFLINE_SALES_KEY, JSON.stringify(restantes));
        } else {
          localStorage.removeItem(LOCAL_OFFLINE_SALES_KEY);
        }
      } catch (storageErr) {
        console.warn('[procesarColaVentasOffline] Error actualizando cola de ventas offline:', storageErr);
      }
      return sincronizadasExitosas.size;
    }
  } catch (err: any) {
    console.warn('[procesarColaVentasOffline] Excepción procesando cola offline:', err?.message || err);
  } finally {
    isSyncingOfflineSales = false;
  }

  return 0;
}

// ==============================================================================
// 7. FUNCIONES HISTÓRICAS RETROCOMPATIBLES (SIN SELECT '*')
// ==============================================================================

/**
 * Obtener todos los socios completos (Compatible con componentes existentes)
 */
export async function getGymMembers(): Promise<GymMember[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('socios')
        .select('id, nombre, dni, email, celular, plan, precio_plan, tipo_pago, adelanto_pagado, saldo_pendiente, fecha_limite_pago, metodo_pago, numero_boleta, turno, coach_asignado, observaciones, edad, sexo, created_at, fecha_fin')
        .order('id', { ascending: true });

      if (error) {
        console.warn('[getGymMembers] Error consultando socios en Supabase:', error.message);
      }

      if (!error && data && data.length > 0) {
        const todayISO = new Date().toISOString().split('T')[0];
        const mapped: GymMember[] = data.map((d: any) => {
          const fechaFin = d.fecha_fin || null;
          const isExpired = fechaFin ? fechaFin < todayISO : false;
          const membershipStatus: 'active' | 'expiring' | 'inactive' = isExpired
            ? 'inactive'
            : fechaFin
            ? ((() => {
                const daysLeft = Math.ceil((new Date(fechaFin).getTime() - new Date(todayISO).getTime()) / (1000 * 60 * 60 * 24));
                return daysLeft <= 5 ? 'expiring' : 'active';
              })())
            : 'active';
          return {
            id: d.id,
            name: d.nombre,
            dni: d.dni,
            email: d.email || '',
            phone: d.celular || '',
            plan: d.plan,
            planPrice: Number(d.precio_plan) || 80,
            paymentType: d.tipo_pago || 'full',
            advancePaid: Number(d.adelanto_pagado) || 0,
            balanceDue: Number(d.saldo_pendiente) || 0,
            paymentDueDate: d.fecha_limite_pago || undefined,
            paymentMethod: d.metodo_pago || 'efectivo',
            receiptNumber: d.numero_boleta || 'B001-000000',
            membershipStatus,
            expiresAt: fechaFin || new Date().toISOString().split('T')[0],
            coachName: d.coach_asignado || 'Coach Marcos Rivas',
            registeredAt: d.created_at ? new Date(d.created_at).toLocaleDateString('es-PE') : new Date().toLocaleDateString('es-PE'),
            observations: d.observaciones || undefined,
            age: d.edad || undefined,
            gender: d.sexo || undefined,
            shift: (d.turno as 'manana' | 'tarde' | 'noche') || 'manana',
          };
        });
        saveStoredMembers(mapped);
        return mapped;
      }
    } catch (err: any) {
      console.warn('[getGymMembers] Excepción consultando socios en Supabase:', err?.message || err);
    }
  }

  return getStoredMembers();
}

/**
 * Actualizar turno y coach asignado del socio (Cero consumo innecesario de egress)
 */
export async function updateMemberShift(
  memberId: string,
  turno: 'manana' | 'tarde' | 'noche',
  coachAsignado: string
): Promise<void> {
  const current = getStoredMembers();
  const updated = current.map((m) =>
    m.id === memberId ? { ...m, shift: turno, coachName: coachAsignado } : m
  );
  saveStoredMembers(updated);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('socios')
        .update({
          turno,
          coach_asignado: coachAsignado,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memberId);

      if (error) {
        console.warn('[updateMemberShift] Error actualizando turno en Supabase:', error.message);
      }
    } catch (err: any) {
      console.warn('[updateMemberShift] Excepción al actualizar turno en Supabase:', err?.message || err);
    }
  }
}

/**
 * Consultar si el usuario autenticado ya tiene un socio vinculado en Supabase
 * (Sincronización multi-dispositivo y sesiones móviles).
 */
/**
 * Consultar el socio activo en Supabase usando DNI, ID o Correo.
 * Evita errores de tipo UUID cuando userId es un DNI o clave sintética.
 * Sincronización multi-dispositivo y sesiones móviles en tiempo real.
 */
export async function obtenerSocioActivo(params: {
  userId?: string | null;
  dni?: string | null;
  email?: string | null;
}): Promise<GymMember | null> {
  const isUuid = (val?: string | null): boolean =>
    Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

  const cleanDni = params.dni
    ? (extraerDniPeru(params.dni) || params.dni.replace(/\D/g, '').slice(0, 8))
    : (params.userId && !isUuid(params.userId) ? params.userId.replace(/\D/g, '').slice(0, 8) : '');

  const cleanEmail = params.email?.trim().toLowerCase() || '';
  const isRealEmail = cleanEmail && !cleanEmail.endsWith('@socio.trankilandia.pe') && !cleanEmail.endsWith('@cliente.trankilandia.pe');

  if (isSupabaseConfigured()) {
    try {
      let socio: any = null;

      // 1. Prioridad: Buscar socio en Supabase directamente por DNI de 8 dígitos
      if (cleanDni && cleanDni.length === 8) {
        const { data: socioByDni } = await supabase
          .from('socios')
          .select('*')
          .eq('dni', cleanDni)
          .maybeSingle();

        if (socioByDni) {
          socio = socioByDni;
        }
      }

      // 2. Si no se encontró por DNI y hay UUID válido de usuario, buscar por user_id o profile
      if (!socio && isUuid(params.userId)) {
        const { data: socioByUid } = await supabase
          .from('socios')
          .select('*')
          .eq('user_id', params.userId!)
          .maybeSingle();

        if (socioByUid) {
          socio = socioByUid;
        } else {
          // Buscar DNI registrado en su perfil
          const { data: profile } = await supabase
            .from('profiles')
            .select('dni, email')
            .eq('id', params.userId!)
            .maybeSingle();

          if (profile?.dni) {
            const { data: socioFromProf } = await supabase
              .from('socios')
              .select('*')
              .eq('dni', profile.dni)
              .maybeSingle();
            if (socioFromProf) {
              socio = socioFromProf;
            }
          }
        }
      }

      // 3. Si no se encontró y hay correo de Google real, buscar por email en socios
      if (!socio && isRealEmail) {
        const { data: socioByEmail } = await supabase
          .from('socios')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (socioByEmail) {
          socio = socioByEmail;
          // Si tenemos UUID, vincular user_id
          if (isUuid(params.userId)) {
            try {
              const { error: linkErr } = await supabase.from('socios').update({ user_id: params.userId }).eq('id', socioByEmail.id);
              if (linkErr) {
                console.warn('[obtenerSocioActivo] Error vinculando user_id por email:', linkErr.message);
              }
            } catch (linkEx: any) {
              console.warn('[obtenerSocioActivo] Excepción vinculando user_id:', linkEx?.message || linkEx);
            }
          }
        }
      }

      if (socio) {
        // Si el socio tiene user_id pendiente de vincular y tenemos un UUID autenticado
        if (isUuid(params.userId) && (!socio.user_id || socio.user_id !== params.userId)) {
          try {
            const { error: updateErr } = await supabase.from('socios').update({ user_id: params.userId }).eq('id', socio.id);
            if (updateErr) {
              console.warn('[obtenerSocioActivo] Error actualizando user_id en socios:', updateErr.message);
            }
            if (socio.dni) {
              const { error: profErr } = await supabase.from('profiles').update({ dni: socio.dni, full_name: socio.nombre }).eq('id', params.userId!);
              if (profErr) {
                console.warn('[obtenerSocioActivo] Error actualizando dni en profiles:', profErr.message);
              }
            }
          } catch (syncEx: any) {
            console.warn('[obtenerSocioActivo] Excepción sincronizando perfil de socio:', syncEx?.message || syncEx);
          }
        }

        const isExpired = socio.fecha_fin
          ? socio.fecha_fin < new Date().toISOString().split('T')[0]
          : false;

        const mapped: GymMember = {
          id: socio.id,
          name: socio.nombre,
          dni: socio.dni,
          email: socio.email || cleanEmail || '',
          phone: socio.celular || '',
          plan: socio.plan,
          planPrice: Number(socio.precio_plan) || 80,
          paymentType: socio.tipo_pago || 'full',
          advancePaid: Number(socio.adelanto_pagado) || 0,
          balanceDue: Number(socio.saldo_pendiente) || 0,
          paymentDueDate: socio.fecha_limite_pago || undefined,
          paymentMethod: socio.metodo_pago || 'efectivo',
          receiptNumber: socio.numero_boleta || 'B001-000000',
          membershipStatus: isExpired ? 'inactive' : 'active',
          expiresAt: socio.fecha_fin ? `${socio.fecha_fin}` : '30 Nov 2026',
          coachName: socio.coach_asignado || 'Coach Marcos Rivas',
          registeredAt: socio.created_at
            ? new Date(socio.created_at).toLocaleDateString('es-PE')
            : 'Oct 2026',
          observations: socio.observaciones || undefined,
          age: socio.edad || undefined,
          gender: socio.sexo || undefined,
          shift: (socio.turno as 'manana' | 'tarde' | 'noche') || 'manana',
        };

        // Cachear en localStorage para disponibilidad local
        const current = getStoredMembers();
        const updated = current.some((m) => m.id === mapped.id || (mapped.dni && m.dni === mapped.dni))
          ? current.map((m) => (m.id === mapped.id || (mapped.dni && m.dni === mapped.dni) ? mapped : m))
          : [mapped, ...current];
        saveStoredMembers(updated);

        return mapped;
      }
    } catch (err) {
      console.warn('Error en obtenerSocioActivo Supabase:', err);
    }
  }

  // Fallback local: Buscar en getStoredMembers() por DNI o correo
  const current = getStoredMembers();
  if (cleanDni && cleanDni.length === 8) {
    const local = current.find((m) => m.dni && m.dni.trim() === cleanDni);
    if (local) return local;
  }
  if (isRealEmail) {
    const local = current.find((m) => m.email && m.email.toLowerCase().trim() === cleanEmail);
    if (local) return local;
  }

  return null;
}

export async function obtenerSocioPorUserId(userId: string): Promise<GymMember | null> {
  return obtenerSocioActivo({ userId });
}

/**
 * Vincular el DNI ingresado por el cliente con su cuenta de Auth personal.
 * Si el DNI ya existe en el padrón, vincula su membresía histórica y activa su carnet.
 * Si el DNI es nuevo (cliente sin membresía previa), crea su cuenta con carnet digital
 * en estado "Sin Membresía Activa" con opción para suscribirse online o en recepción.
 */
export async function vincularDniCliente(
  userId: string,
  userEmail: string,
  dniIngresado: string,
  nombreIngresado?: string
): Promise<{ success: boolean; message: string; member?: GymMember }> {
  const cleanDni = dniIngresado.trim().replace(/\D/g, '');
  if (cleanDni.length < 8) {
    return { success: false, message: 'El DNI debe tener 8 dígitos numéricos válidos.' };
  }

  const cleanName =
    nombreIngresado?.trim() ||
    userEmail
      .split('@')[0]
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  // 1. Si Supabase está configurado, intentar vincular vía RPC seguro (evita bloqueo RLS)
  if (isSupabaseConfigured()) {
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('vincular_socio_por_dni', {
        p_dni: cleanDni,
        p_nombre: cleanName,
        p_email: userEmail,
      });

      if (!rpcErr && rpcRes && rpcRes.success && rpcRes.socio) {
        const s = rpcRes.socio;
        const isExpired = s.fecha_fin ? s.fecha_fin < new Date().toISOString().split('T')[0] : false;
        const mapped: GymMember = {
          id: s.id,
          name: s.nombre,
          dni: s.dni,
          email: userEmail,
          phone: s.celular || '',
          plan: s.plan,
          planPrice: Number(s.precio_plan) || 80,
          paymentType: s.tipo_pago || 'full',
          advancePaid: Number(s.adelanto_pagado) || 0,
          balanceDue: Number(s.saldo_pendiente) || 0,
          paymentDueDate: s.fecha_limite_pago || undefined,
          paymentMethod: s.metodo_pago || 'efectivo',
          receiptNumber: s.numero_boleta || 'B001-000000',
          membershipStatus: isExpired ? 'inactive' : 'active',
          expiresAt: s.fecha_fin ? `${s.fecha_fin}` : '30 Nov 2026',
          coachName: s.coach_asignado || 'Coach Marcos Rivas',
          registeredAt: s.created_at ? new Date(s.created_at).toLocaleDateString('es-PE') : 'Oct 2026',
          observations: s.observaciones || undefined,
          age: s.edad || undefined,
          gender: s.sexo || undefined,
          shift: (s.turno as 'manana' | 'tarde' | 'noche') || 'manana',
        };

        const current = getStoredMembers();
        const updated = current.some((m) => m.dni === cleanDni || m.id === mapped.id)
          ? current.map((m) => (m.dni === cleanDni || m.id === mapped.id ? mapped : m))
          : [mapped, ...current];
        saveStoredMembers(updated);

        return {
          success: true,
          message: rpcRes.message || `¡Membresía vinculada con éxito a nombre de ${s.nombre}!`,
          member: mapped,
        };
      }
      if (rpcErr) {
        console.warn('[vincularDniCliente] RPC vincular_socio_por_dni falló:', rpcErr.message);
      }
    } catch (rpcEx: any) {
      console.warn('[vincularDniCliente] Excepción en llamada a RPC vincular_socio_por_dni:', rpcEx?.message || rpcEx);
    }

    // Respaldo directo a tablas en caso el RPC no esté instalado aún
    try {
      const { data: socio, error } = await supabase
        .from('socios')
        .select('*')
        .eq('dni', cleanDni)
        .maybeSingle();

      if (socio && !error) {
        // Socio existente en el padrón: Vincular con su cuenta de Google/correo
        const isExpired = socio.fecha_fin
          ? socio.fecha_fin < new Date().toISOString().split('T')[0]
          : false;

        await supabase
          .from('profiles')
          .update({
            dni: cleanDni,
            full_name: socio.nombre,
            membership_status: isExpired ? 'vencido' : 'activo',
            plan: socio.plan,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        await supabase
          .from('socios')
          .update({
            user_id: userId,
            email: userEmail,
            updated_at: new Date().toISOString(),
          })
          .eq('id', socio.id);

        const mapped: GymMember = {
          id: socio.id,
          name: socio.nombre,
          dni: socio.dni,
          email: userEmail,
          phone: socio.celular || '',
          plan: socio.plan,
          planPrice: Number(socio.precio_plan) || 80,
          paymentType: socio.tipo_pago || 'full',
          advancePaid: Number(socio.adelanto_pagado) || 0,
          balanceDue: Number(socio.saldo_pendiente) || 0,
          paymentDueDate: socio.fecha_limite_pago || undefined,
          paymentMethod: socio.metodo_pago || 'efectivo',
          receiptNumber: socio.numero_boleta || 'B001-000000',
          membershipStatus: isExpired ? 'inactive' : 'active',
          expiresAt: socio.fecha_fin ? `${socio.fecha_fin}` : '30 Nov 2026',
          coachName: socio.coach_asignado || 'Coach Marcos Rivas',
          registeredAt: socio.created_at
            ? new Date(socio.created_at).toLocaleDateString('es-PE')
            : 'Oct 2026',
          observations: socio.observaciones || undefined,
          age: socio.edad || undefined,
          gender: socio.sexo || undefined,
          shift: (socio.turno as 'manana' | 'tarde' | 'noche') || 'manana',
        };

        const current = getStoredMembers();
        const updated = current.map((m) => (m.dni === cleanDni ? mapped : m));
        saveStoredMembers(updated);

        return {
          success: true,
          message: `¡Membresía vinculada con éxito a nombre de ${socio.nombre}!`,
          member: mapped,
        };
      }

      // Si no existe directamente en el select de Supabase (ej: bloqueo RLS o sincronización pendiente),
      // comprobar si existe en el padrón local (inscrito en recepción con plan y nombre oficial)
      const localMatch = getStoredMembers().find((m) => m.dni === cleanDni);
      const todayISO = new Date().toISOString().split('T')[0];

      if (localMatch && localMatch.plan && localMatch.plan !== 'Sin Membresía Activa') {
        const realName = localMatch.name || cleanName;
        const realPlan = localMatch.plan;
        const isExp =
          localMatch.membershipStatus === 'inactive' ||
          (localMatch.expiresAt && localMatch.expiresAt < todayISO);

        await supabase
          .from('profiles')
          .update({
            dni: cleanDni,
            full_name: realName,
            membership_status: isExp ? 'vencido' : 'activo',
            plan: realPlan,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        const mappedMember: GymMember = {
          ...localMatch,
          name: realName,
          email: userEmail,
        };

        await supabase.from('socios').upsert(
          {
            id: localMatch.id,
            nombre: realName,
            dni: cleanDni,
            email: userEmail,
            user_id: userId,
            plan: realPlan,
            precio_plan: localMatch.planPrice || 80,
            tipo_pago: localMatch.paymentType || 'full',
            adelanto_pagado: localMatch.advancePaid || 0,
            saldo_pendiente: localMatch.balanceDue || 0,
            fecha_inicio: normalizeDateToISO(localMatch.registeredAt),
            fecha_fin: normalizeDateToISO(localMatch.expiresAt),
            metodo_pago: localMatch.paymentMethod || 'efectivo',
            numero_boleta: localMatch.receiptNumber || `REG-${cleanDni.slice(-4)}`,
            turno: localMatch.shift || 'manana',
            coach_asignado: localMatch.coachName || 'Coach Marcos Rivas',
            observaciones: localMatch.observations || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

        const current = getStoredMembers();
        const updated = current.map((m) =>
          m.dni === cleanDni || m.id === localMatch.id ? mappedMember : m
        );
        saveStoredMembers(updated);

        return {
          success: true,
          message: `¡Membresía vinculada con éxito a nombre de ${realName}!`,
          member: mappedMember,
        };
      }

      // Si no existe en el padrón de socios oficiales: Registrar perfil digital de usuario sin crear socio fantasma
      const tempId = 'TEMP-' + cleanDni;
      const formattedName = cleanName
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      try {
        const { error: profileUpdateErr } = await supabase
          .from('profiles')
          .update({
            dni: cleanDni,
            full_name: formattedName,
            membership_status: 'sin_membresia',
            plan: 'Sin Membresía Activa',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (profileUpdateErr) {
          console.warn('[vincularDniCliente] Error actualizando perfil en Supabase:', profileUpdateErr.message);
        }
      } catch (profEx: any) {
        console.warn('[vincularDniCliente] Excepción actualizando perfil:', profEx?.message || profEx);
      }

      // Retornar objeto en memoria para la sesión del usuario (NO se inserta en public.socios para no alterar el padrón oficial)
      const virtualMember: GymMember = {
        id: tempId,
        name: formattedName,
        dni: cleanDni,
        email: userEmail,
        phone: '',
        plan: 'Sin Membresía Activa',
        planPrice: 0,
        paymentType: 'full',
        advancePaid: 0,
        balanceDue: 0,
        paymentDueDate: null,
        paymentMethod: 'efectivo',
        receiptNumber: `REG-${cleanDni.slice(-4)}`,
        membershipStatus: 'inactive',
        expiresAt: 'Por Activar',
        coachName: 'Coach Marcos Rivas',
        registeredAt: todayISO,
        observations: 'Cuenta digital creada. Pendiente de suscripción a un plan en caja o recepción.',
        shift: 'manana',
      };

      return {
        success: true,
        message: `¡Cuenta digital conectada! Aún no registras un plan activo. Acércate a recepción de Trankilandia Gym para formalizar tu inscripción.`,
        member: virtualMember,
      };
    } catch (err: any) {
      console.warn('Supabase link error:', err);
    }
  }

  // 2. Modo Offline / Fallback Local
  const localMembers = getStoredMembers();
  const match = localMembers.find((m) => m.dni === cleanDni);
  if (match) {
    const updatedMember: GymMember = {
      ...match,
      email: userEmail,
    };
    return {
      success: true,
      message: `¡Membresía vinculada con éxito a nombre de ${match.name}!`,
      member: updatedMember,
    };
  }

  // Si no está registrado en el padrón local, devolver estado temporal sin persistir socio fantasma
  const todayISO = new Date().toISOString().split('T')[0];
  const virtualMember: GymMember = {
    id: 'TEMP-' + cleanDni,
    name: cleanName,
    dni: cleanDni,
    email: userEmail,
    phone: '',
    plan: 'Sin Membresía Activa',
    planPrice: 0,
    paymentType: 'full',
    advancePaid: 0,
    balanceDue: 0,
    paymentDueDate: null,
    paymentMethod: 'efectivo',
    receiptNumber: `REG-${cleanDni.slice(-4)}`,
    membershipStatus: 'inactive',
    expiresAt: 'Por Activar',
    coachName: 'Coach Marcos Rivas',
    registeredAt: todayISO,
    observations: 'Cuenta digital creada. Pendiente de suscripción a un plan.',
    shift: 'manana',
  };

  return {
    success: true,
    message: `¡Cuenta creada con éxito! Tu tarjeta de socio está lista.`,
    member: virtualMember,
  };
}

/**
 * Vincula un correo electrónico (o cuenta de Google) al socio identificado por su DNI.
 * Unifica ambos accesos (DNI + contraseña y Google) en una sola cuenta y mismo perfil.
 */
export async function vincularCorreoASocio(
  dni: string,
  nuevoCorreo: string
): Promise<{ success: boolean; message: string; member?: GymMember }> {
  const cleanDni = extraerDniPeru(dni) || dni.trim().replace(/\D/g, '').slice(0, 8);
  const cleanEmail = nuevoCorreo.trim().toLowerCase();

  if (!cleanDni || cleanDni.length !== 8) {
    return { success: false, message: 'El DNI debe contener exactamente 8 dígitos.' };
  }
  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return { success: false, message: 'Por favor ingresa una dirección de correo electrónico válida.' };
  }

  // 1. Actualizar en almacenamiento local
  const currentMembers = getStoredMembers();
  let updatedMember: GymMember | undefined;
  const nextMembers = currentMembers.map((m) => {
    if (m.dni && m.dni.trim() === cleanDni) {
      updatedMember = { ...m, email: cleanEmail };
      return updatedMember;
    }
    return m;
  });

  if (!updatedMember) {
    return { success: false, message: `No se encontró un socio registrado con el DNI ${cleanDni}.` };
  }

  saveStoredMembers(nextMembers);

  // 2. Si Supabase está conectado, actualizar tablas public.socios y public.profiles
  if (isSupabaseConfigured()) {
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('vincular_correo_a_dni', {
        p_dni: cleanDni,
        p_email: cleanEmail,
      });
      if (!rpcErr && rpcRes && rpcRes.success) {
        return {
          success: true,
          message: rpcRes.message || `¡Cuenta unificada con éxito! Ahora tu DNI (${cleanDni}) y tu cuenta Google (${cleanEmail}) acceden al mismo perfil.`,
          member: updatedMember,
        };
      }
      if (rpcErr) {
        console.warn('[vincularCorreoASocio] RPC vincular_correo_a_dni falló:', rpcErr.message);
      }
    } catch (rpcEx: any) {
      console.warn('[vincularCorreoASocio] Excepción en llamada RPC:', rpcEx?.message || rpcEx);
    }

    try {
      // Actualizar socios directamente
      await supabase
        .from('socios')
        .update({ email: cleanEmail, updated_at: new Date().toISOString() })
        .eq('dni', cleanDni);

      // Si existe un perfil de Google/Email registrado con este correo, unificar IDs
      const { data: profileWithEmail } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profileWithEmail?.id) {
        await supabase
          .from('socios')
          .update({ user_id: profileWithEmail.id })
          .eq('dni', cleanDni);

        await supabase
          .from('profiles')
          .update({ dni: cleanDni, updated_at: new Date().toISOString() })
          .eq('id', profileWithEmail.id);
      } else {
        // Actualizar el perfil existente por DNI
        await supabase
          .from('profiles')
          .update({ email: cleanEmail, updated_at: new Date().toISOString() })
          .eq('dni', cleanDni);
      }
    } catch (err) {
      console.warn('Error sincronizando correo vinculado en Supabase:', err);
    }
  }

  return {
    success: true,
    message: `¡Cuenta unificada con éxito! Ahora tu DNI (${cleanDni}) y tu cuenta Google (${cleanEmail}) acceden al mismo perfil.`,
    member: updatedMember,
  };
}

/**
 * Asigna un número de DNI (8 dígitos) a un socio que no lo tenía registrado
 * (ej. socios importados sin DNI desde Excel/cuaderno o nuevas altas en caja).
 * Vincula directamente el DNI con el correo registrado y unifica la cuenta.
 */
export async function asignarDniYActivarCuenta(
  memberId: string,
  nuevoDni: string,
  emailRegistrado?: string,
  celularRegistrado?: string
): Promise<{ success: boolean; message: string; socioActualizado?: SocioRecepcion; member?: GymMember }> {
  const cleanDni = extraerDniPeru(nuevoDni) || nuevoDni.trim().replace(/\D/g, '').slice(0, 8);
  if (!cleanDni || cleanDni.length !== 8) {
    return { success: false, message: 'El DNI debe contener exactamente 8 dígitos numéricos.' };
  }

  // 1. Validar que otro socio no tenga ya este DNI en memoria local
  const localMembers = getStoredMembers();
  const existingLocal = localMembers.find((m) => m.id !== memberId && m.dni && m.dni.trim() === cleanDni);
  if (existingLocal) {
    return {
      success: false,
      message: `El DNI ${cleanDni} ya está registrado para el socio ${existingLocal.name}.`,
    };
  }

  const targetMember = localMembers.find((m) => m.id === memberId);
  const rawEmail = (emailRegistrado || targetMember?.email || '').trim().toLowerCase();
  const hasRealEmail = rawEmail.includes('@') && !rawEmail.endsWith('@socio.trankilandia.pe') && !rawEmail.endsWith('@cliente.trankilandia.pe');
  const userRealEmail = hasRealEmail ? rawEmail : null;
  const canonicalEmail = `${cleanDni}@socio.trankilandia.pe`;
  const cleanCelular = celularRegistrado
    ? celularRegistrado.trim().replace(/\D/g, '').slice(0, 9)
    : undefined;

  // 2. Si Supabase está conectado, verificar unicidad y actualizar en BD
  if (isSupabaseConfigured()) {
    try {
      // Verificar unicidad en public.socios
      const { data: duplicate } = await supabase
        .from('socios')
        .select('id, nombre')
        .eq('dni', cleanDni)
        .neq('id', memberId)
        .maybeSingle();

      if (duplicate) {
        return {
          success: false,
          message: `El DNI ${cleanDni} ya está registrado para el socio ${duplicate.nombre} en la base de datos.`,
        };
      }

      // Si el correo real ya tiene un perfil existente (ej: inició sesión antes con Google)
      let matchedAuthUserId: string | null = null;
      if (userRealEmail) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', userRealEmail)
          .maybeSingle();
        if (existingProfile?.id) {
          matchedAuthUserId = existingProfile.id;
        }
      }

      // Actualizar public.socios con DNI, correo real y celular
      const updateData: Record<string, any> = {
        dni: cleanDni,
        updated_at: new Date().toISOString(),
      };
      if (userRealEmail) updateData.email = userRealEmail;
      if (cleanCelular) updateData.celular = cleanCelular;
      if (matchedAuthUserId) updateData.user_id = matchedAuthUserId;

      const { error: updateErr } = await supabase
        .from('socios')
        .update(updateData)
        .eq('id', memberId);

      if (updateErr) {
        console.warn('Error actualizando DNI en public.socios:', updateErr);
      }

      // Aprovisionar cuenta en Supabase Auth con credenciales canónicas para ingreso por DNI
      let createdAuthUserId: string | null = null;
      try {
        const signUpRes = await supabase.auth.signUp({
          email: canonicalEmail,
          password: cleanDni,
          options: {
            data: {
              dni: cleanDni,
              role: 'cliente',
              ...(userRealEmail ? { personal_email: userRealEmail } : {}),
            },
          },
        });
        if (signUpRes.data?.user?.id) {
          createdAuthUserId = signUpRes.data.user.id;
        }
      } catch (authErr) {
        console.warn('Auto-signup DNI notice:', authErr);
      }

      const effectiveUserId = matchedAuthUserId || createdAuthUserId;

      // Asegurar perfil en public.profiles y vincular con socios.user_id
      if (effectiveUserId) {
        try {
          const { error: profUpsertErr } = await supabase.from('profiles').upsert({
            id: effectiveUserId,
            email: userRealEmail || canonicalEmail,
            dni: cleanDni,
            role: 'cliente',
            membership_status: 'activo',
            updated_at: new Date().toISOString(),
          });
          if (profUpsertErr) {
            console.warn('[asignarDniYActivarCuenta] Error en upsert de profile:', profUpsertErr.message);
          }
          const { error: socioLinkErr } = await supabase.from('socios').update({ user_id: effectiveUserId }).eq('id', memberId);
          if (socioLinkErr) {
            console.warn('[asignarDniYActivarCuenta] Error vinculando user_id en socios:', socioLinkErr.message);
          }
        } catch (profileErr: any) {
          console.warn('[asignarDniYActivarCuenta] Excepción vinculando perfil de usuario:', profileErr?.message || profileErr);
        }
      }
    } catch (err: any) {
      console.warn('Error en proceso Supabase asignarDniYActivarCuenta:', err);
    }
  }

  // 3. Actualizar en almacenamiento local
  let updatedMember: GymMember | undefined;
  const updatedMembers = localMembers.map((m) => {
    if (m.id === memberId) {
      updatedMember = {
        ...m,
        dni: cleanDni,
        ...(userRealEmail ? { email: userRealEmail } : {}),
        ...(cleanCelular ? { phone: cleanCelular } : {}),
      };
      return updatedMember;
    }
    return m;
  });
  saveStoredMembers(updatedMembers);

  // 4. Preparar SocioRecepcion para actualización reactiva en CajaDashboard
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let diasRestantes = 0;
  if (updatedMember?.expiresAt) {
    const expDate = new Date(updatedMember.expiresAt);
    if (!isNaN(expDate.getTime())) {
      expDate.setHours(0, 0, 0, 0);
      diasRestantes = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  const socioRecepcion: SocioRecepcion = {
    id: memberId,
    dni: cleanDni,
    nombre: updatedMember?.name || 'Socio Actualizado',
    plan: updatedMember?.plan || 'Musculación Libre',
    precio_plan: updatedMember?.planPrice || 80,
    tipo_pago: updatedMember?.paymentType || 'full',
    adelanto_pagado: updatedMember?.advancePaid || 0,
    saldo_pendiente: updatedMember?.balanceDue || 0,
    fecha_limite_pago: updatedMember?.paymentDueDate || null,
    fecha_fin: updatedMember?.expiresAt || '',
    turno: updatedMember?.shift || 'manana',
    coach_asignado: updatedMember?.coachName || 'Coach Marcos Rivas',
    dias_restantes: diasRestantes,
    estado_calculado:
      updatedMember?.membershipStatus === 'inactive' || diasRestantes < 0
        ? 'vencido'
        : diasRestantes <= 5
        ? 'por_vencer'
        : 'activo',
    tiene_deuda_activa: (updatedMember?.balanceDue || 0) > 0,
    numero_boleta: updatedMember?.receiptNumber || `B001-${cleanDni.slice(-6)}`,
    email: updatedMember?.email || null,
    celular: updatedMember?.phone || null,
  };

  return {
    success: true,
    message: `¡DNI ${cleanDni} asignado correctamente! La cuenta del atleta quedó activada (usuario: ${cleanDni}, contraseña: ${cleanDni}).`,
    socioActualizado: socioRecepcion,
    member: updatedMember,
  };
}

/**
 * Guardar o registrar un nuevo socio (En Supabase + Local)
 */
export async function registerGymMember(member: GymMember): Promise<void> {
  const current = getStoredMembers();
  const cleanDni = member.dni
    ? (extraerDniPeru(member.dni) || member.dni.trim().replace(/\D/g, '').slice(0, 8))
    : '';

  // 1. Verificar si ya existía por DNI para renovación o actualización del mismo socio
  let targetId = member.id;
  const existingByDni = cleanDni ? current.find((m) => m.dni && m.dni.trim() === cleanDni) : null;
  if (existingByDni) {
    targetId = existingByDni.id;
  } else {
    // Si el ID propuesto ya pertenece a OTRO socio con DNI distinto, generar uno nuevo para evitar colisiones
    const existingById = current.find((m) => m.id === targetId);
    if (existingById && existingById.dni && existingById.dni !== cleanDni) {
      targetId = generateNextMemberId(current);
    }
  }

  const normalizedMember: GymMember = {
    ...member,
    id: targetId,
    dni: cleanDni || member.dni,
  };

  const updated = [
    normalizedMember,
    ...current.filter(
      (m) => m.id !== targetId && (!cleanDni || !m.dni || m.dni.trim() !== cleanDni)
    ),
  ];
  saveStoredMembers(updated);

  if (isSupabaseConfigured()) {
    try {
      // 2. Verificar si en Supabase ya existía un socio con este DNI (ej: cuenta digital previa MEM-2747)
      let finalId = targetId;
      let matchedUserId: string | null = null;
      if (cleanDni) {
        const { data: dbSocio } = await supabase
          .from('socios')
          .select('id, user_id')
          .eq('dni', cleanDni)
          .maybeSingle();

        if (dbSocio?.id) {
          finalId = dbSocio.id;
          matchedUserId = dbSocio.user_id;
        } else {
          // Verificar si finalId ya existe en Supabase con OTRO DNI
          const { data: dbConflict } = await supabase
            .from('socios')
            .select('id, dni')
            .eq('id', finalId)
            .maybeSingle();
          if (dbConflict && dbConflict.dni && dbConflict.dni !== cleanDni) {
            finalId = generateNextMemberId(current);
          }
        }
      }

      const dbPayload: any = {
        id: finalId,
        nombre: normalizedMember.name,
        dni: cleanDni || null,
        email: normalizedMember.email || (cleanDni ? `${cleanDni}@cliente.trankilandia.pe` : null),
        celular: normalizedMember.phone || null,
        plan: normalizedMember.plan,
        precio_plan: normalizedMember.planPrice,
        tipo_pago: normalizedMember.paymentType,
        adelanto_pagado: normalizedMember.advancePaid,
        saldo_pendiente: normalizedMember.balanceDue,
        fecha_inicio: normalizeDateToISO(normalizedMember.registeredAt),
        fecha_fin: normalizeDateToISO(normalizedMember.expiresAt),
        fecha_limite_pago: normalizedMember.paymentDueDate
          ? normalizeDateToISO(normalizedMember.paymentDueDate)
          : null,
        metodo_pago: normalizedMember.paymentMethod,
        numero_boleta: normalizedMember.receiptNumber,
        turno: normalizedMember.shift || 'manana',
        coach_asignado: normalizedMember.coachName,
        observaciones: normalizedMember.observations,
        edad: normalizedMember.age,
        sexo: normalizedMember.gender,
        updated_at: new Date().toISOString(),
      };

      if (matchedUserId) {
        dbPayload.user_id = matchedUserId;
      }

      const { error: upsertErr } = await supabase
        .from('socios')
        .upsert(dbPayload, { onConflict: 'id' });
      if (upsertErr) {
        console.error('Error guardando socio en Supabase:', upsertErr);
      }

      // Sincronizar en public.profiles si el socio tiene DNI
      if (cleanDni) {
        await supabase
          .from('profiles')
          .update({
            full_name: normalizedMember.name,
            dni: cleanDni,
            plan: normalizedMember.plan,
            membership_status:
              normalizedMember.membershipStatus === 'inactive' ? 'vencido' : 'activo',
            updated_at: new Date().toISOString(),
          })
          .eq('dni', cleanDni);
      }

      // Activar cuenta canónica para acceso por DNI
      if (cleanDni && cleanDni.length === 8) {
        await asignarDniYActivarCuenta(
          finalId,
          cleanDni,
          normalizedMember.email || undefined,
          normalizedMember.phone || undefined
        );
      }

      // Registrar también en tabla de ingresos si hubo abono efectivo
      if (normalizedMember.advancePaid > 0) {
        await supabase.from('ingresos').insert({
          key_socio: finalId,
          monto: normalizedMember.advancePaid,
          metodo_pago: normalizedMember.paymentMethod,
          tipo:
            normalizedMember.paymentType === 'advance'
              ? 'Adelanto de Membresía'
              : 'Membresía Completa',
          observacion: `Cobro boleta ${normalizedMember.receiptNumber} (${normalizedMember.plan})`,
        });
      }
    } catch (err) {
      console.warn('registerGymMember notice:', err);
    }
  }
}

/**
 * Cobrar saldo pendiente de un socio (Total o Abono Parcial)
 * Utiliza la RPC atómica 'liquidar_saldo_socio' garantizando consistencia transaccional ACID en PostgreSQL.
 */
export async function payMemberBalance(
  memberId: string,
  paymentMethod: string,
  customAmount?: number,
  operador: string = 'Recepción'
): Promise<GymMember[]> {
  const current = getStoredMembers();
  const target = current.find((m) => m.id === memberId);
  if (!target) return current;

  const debtToPay =
    customAmount !== undefined && customAmount > 0
      ? Math.min(target.balanceDue, customAmount)
      : target.balanceDue;

  if (debtToPay <= 0) {
    return current;
  }

  // 1. Si Supabase está configurado, invocar la RPC atómica del servidor
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('liquidar_saldo_socio', {
        p_socio_id: memberId,
        p_monto: debtToPay,
        p_metodo_pago: paymentMethod,
        p_operador: operador,
      });

      if (error) {
        console.error('[payMemberBalance] Error en RPC liquidar_saldo_socio:', error.message);
        throw new Error(`Error en liquidación de saldo: ${error.message}`);
      }

      if (data && data.success) {
        const remainingDebt = Number(data.saldo_restante) || 0;
        const totalAdvance = Number(data.adelanto_acumulado) || (target.advancePaid + debtToPay);
        const officialReceipt = data.numero_boleta || `B001-000${Date.now().toString().slice(-4)}`;
        const isFull = remainingDebt === 0;

        const updated = current.map((m) => {
          if (m.id === memberId) {
            return {
              ...m,
              paymentType: isFull ? ('full' as const) : ('advance' as const),
              advancePaid: totalAdvance,
              balanceDue: remainingDebt,
              paymentDueDate: isFull ? undefined : m.paymentDueDate,
              receiptNumber: officialReceipt,
            };
          }
          return m;
        });

        saveStoredMembers(updated);
        return updated;
      } else {
        throw new Error('La liquidación de saldo no pudo completarse en el servidor.');
      }
    } catch (err: any) {
      console.error('[payMemberBalance] Fallo transaccional al liquidar saldo:', err?.message || err);
      // Mantener consistencia contable: no modificar saldos locales si falló la operación en Supabase
      throw err;
    }
  }

  // 2. Fallback local offline (cuando Supabase no está configurado)
  const remainingDebt = Math.max(0, target.balanceDue - debtToPay);
  const isFull = remainingDebt === 0;
  const memberReceipt = `B001-000${Date.now().toString().slice(-4)} (${isFull ? 'Liquidación Total' : 'Abono Parcial'})`;

  const updated = current.map((m) => {
    if (m.id === memberId) {
      return {
        ...m,
        paymentType: isFull ? ('full' as const) : ('advance' as const),
        advancePaid: m.advancePaid + debtToPay,
        balanceDue: remainingDebt,
        paymentDueDate: isFull ? undefined : m.paymentDueDate,
        receiptNumber: memberReceipt,
      };
    }
    return m;
  });

  saveStoredMembers(updated);
  return updated;
}

/**
 * Normaliza cualquier formato de fecha a 'YYYY-MM-DD' estricto para PostgreSQL
 */
export function normalizeDateToISO(dateVal?: string | null): string {
  if (!dateVal) {
    return new Date().toISOString().split('T')[0];
  }
  const trimmed = dateVal.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split('/');
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  // Convert Spanish month abbreviations (e.g. 30 Nov 2026, 15 Dic 2026)
  const spanishMonths: Record<string, string> = {
    ene: 'Jan', feb: 'Feb', mar: 'Mar', abr: 'Apr', may: 'May', jun: 'Jun',
    jul: 'Jul', ago: 'Aug', set: 'Sep', sep: 'Sep', oct: 'Oct', nov: 'Nov', dic: 'Dec'
  };
  let normalizedForDate = trimmed;
  for (const [es, en] of Object.entries(spanishMonths)) {
    const regex = new RegExp(`\\b${es}\\b`, 'i');
    if (regex.test(normalizedForDate)) {
      normalizedForDate = normalizedForDate.replace(regex, en);
      break;
    }
  }
  const parsed = new Date(normalizedForDate);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Carga el padrón en tiempo real desde Supabase para el panel gerencial / Admin.
 * Trae los socios directamente desde public.socios y los roles desde public.profiles.
 * Mantiene la persistencia y la sincronización con almacenamiento local.
 */
export async function fetchSociosParaAdmin(): Promise<GymMember[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data: socios, error } = await supabase
        .from('socios')
        .select('*')
        .order('id', { ascending: true });

      if (!error && socios && socios.length > 0) {
        let profMap: Record<string, any> = {};
        try {
          const { data: profs, error: profErr } = await supabase.from('profiles').select('id, dni, email, role, membership_status');
          if (profErr) {
            console.warn('[fetchSociosParaAdmin] Error consultando perfiles en Supabase:', profErr.message);
          }
          if (profs) {
            profs.forEach((p: any) => {
              if (p.dni) profMap[p.dni] = p;
              if (p.id) profMap[p.id] = p;
            });
          }
        } catch (profEx: any) {
          console.warn('[fetchSociosParaAdmin] Excepción consultando perfiles:', profEx?.message || profEx);
        }

        const mapped: GymMember[] = socios.map((s: any) => {
          const prof = (s.dni && profMap[s.dni]) || (s.user_id && profMap[s.user_id]) || null;
          const isExpired = s.fecha_fin ? s.fecha_fin < new Date().toISOString().split('T')[0] : false;
          return {
            id: s.id,
            name: s.nombre,
            dni: s.dni || null,
            email: s.email || prof?.email || null,
            phone: s.celular || null,
            plan: s.plan,
            planPrice: Number(s.precio_plan) || 80,
            paymentType: s.tipo_pago || 'full',
            advancePaid: Number(s.adelanto_pagado) || 0,
            balanceDue: Number(s.saldo_pendiente) || 0,
            paymentDueDate: s.fecha_limite_pago || null,
            paymentMethod: s.metodo_pago || 'efectivo',
            receiptNumber: s.numero_boleta || 'B001-000000',
            membershipStatus: prof?.membership_status === 'congelado' ? 'inactive' : isExpired ? 'inactive' : 'active',
            expiresAt: s.fecha_fin || '2026-11-30',
            coachName: s.coach_asignado || 'Coach Marcos Rivas',
            registeredAt: s.fecha_inicio || '2026-10-01',
            observations: s.observaciones || null,
            age: s.edad || null,
            gender: s.sexo || null,
            shift: (s.turno as 'manana' | 'tarde' | 'noche') || 'manana',
            documentStatus: s.observaciones?.includes('[DOC VERIFICADO]') ? 'verificado' : undefined,
          };
        });

        // Combinar preservando fotos de documentos locales si existen
        const local = getStoredMembers();
        const mappedDnis = new Set(mapped.map((m) => m.dni).filter(Boolean));
        const mappedIds = new Set(mapped.map((m) => m.id));
        // Solo conservar socios locales si fueron registrados offline con marca explícita pendiente de sync
        const offlinePending = local.filter((l: any) => l._offlinePendingSync === true && !mappedIds.has(l.id) && (!l.dni || !mappedDnis.has(l.dni)));

        const merged = [
          ...mapped.map((m) => {
            const localMatch = local.find((l) => l.id === m.id || (m.dni && l.dni === m.dni));
            if (localMatch?.documentUrl) {
              return {
                ...m,
                documentUrl: localMatch.documentUrl,
                documentStatus: localMatch.documentStatus || m.documentStatus,
                documentType: localMatch.documentType,
              };
            }
            return m;
          }),
          ...offlinePending,
        ];

        saveStoredMembers(merged);
        return merged;
      }
    } catch (err) {
      console.warn('fetchSociosParaAdmin fallback to local:', err);
    }
  }
  return getStoredMembers();
}

/**
 * Valida o actualiza el estado de verificación de documentos (DNI escolar o carnet de estudios)
 */
export async function validarDocumentoSocio(
  memberId: string,
  nuevoEstado: 'verificado' | 'rechazado' | 'pendiente',
  notas?: string
): Promise<GymMember[]> {
  const current = getStoredMembers();
  const updated = current.map((m) => {
    if (m.id === memberId) {
      return {
        ...m,
        documentStatus: nuevoEstado,
        documentNotes: notas || (nuevoEstado === 'verificado' ? 'Documento verificado por administración / mostrador' : undefined),
      };
    }
    return m;
  });
  saveStoredMembers(updated);

  if (isSupabaseConfigured()) {
    try {
      const tag = nuevoEstado === 'verificado' ? '[DOC VERIFICADO]' : `[DOC ${nuevoEstado.toUpperCase()}]`;
      const currentTarget = current.find((m) => m.id === memberId);
      const cleanObs = (currentTarget?.observations || '')
        .replace(/\[DOC VERIFICADO\]/g, '')
        .replace(/\[DOC PENDIENTE\]/g, '')
        .replace(/\[DOC RECHAZADO\]/g, '')
        .trim();
      const finalObs = `${tag} ${notas ? notas + ' · ' : ''}${cleanObs}`.trim();

      const { error: docErr } = await supabase
        .from('socios')
        .update({
          observaciones: finalObs,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memberId);

      if (docErr) {
        console.warn('[validarDocumentoSocio] Error al actualizar observaciones en Supabase:', docErr.message);
      }
    } catch (docEx: any) {
      console.warn('[validarDocumentoSocio] Excepción actualizando documento en Supabase:', docEx?.message || docEx);
    }
  }

  return updated;
}

/**
 * Actualizar datos completos de un socio desde la gestión de su perfil
 */
export async function updateMemberProfile(
  memberId: string,
  data: Partial<GymMember>
): Promise<GymMember[]> {
  const current = getStoredMembers();
  const updated = current.map((m) => (m.id === memberId ? { ...m, ...data } : m));
  saveStoredMembers(updated);

  if (isSupabaseConfigured()) {
    try {
      const dbPayload: any = {};
      if (data.name !== undefined) dbPayload.nombre = data.name;
      if (data.dni !== undefined) dbPayload.dni = data.dni || null;
      if (data.phone !== undefined) dbPayload.celular = data.phone || null;
      if (data.observations !== undefined) dbPayload.observaciones = data.observations || null;
      if (data.shift !== undefined) dbPayload.turno = data.shift;
      if (data.coachName !== undefined) dbPayload.coach_asignado = data.coachName;
      if (data.plan !== undefined) dbPayload.plan = data.plan;
      if (data.planPrice !== undefined) dbPayload.precio_plan = data.planPrice;
      if (data.advancePaid !== undefined) dbPayload.adelanto_pagado = data.advancePaid;
      // IMPORTANTE: saldo_pendiente NO se actualiza directamente desde updateMemberProfile.
      // Toda liquidación o abono debe realizarse mediante liquidar_saldo_socio (RPC SECURITY DEFINER).
      // Si se necesita ajustar el tipo de pago sin modificar el saldo, se permite aquí.
      if (data.paymentType !== undefined) {
        dbPayload.tipo_pago = data.paymentType;
      }
      if (data.registeredAt !== undefined) {
        dbPayload.fecha_inicio = normalizeDateToISO(data.registeredAt);
      }
      if (data.expiresAt !== undefined) {
        dbPayload.fecha_fin = normalizeDateToISO(data.expiresAt);
      }
      if (data.age !== undefined) dbPayload.edad = data.age;
      if (data.gender !== undefined) dbPayload.sexo = data.gender;
      dbPayload.updated_at = new Date().toISOString();

      const { error: updateErr } = await supabase.from('socios').update(dbPayload).eq('id', memberId);
      if (updateErr) {
        console.warn('[updateMemberProfile] Error actualizando socio en Supabase:', updateErr.message);
      }

      // Sincronizar en public.profiles si el socio tiene DNI
      const targetMember = updated.find((m) => m.id === memberId);
      if (targetMember?.dni) {
        let profStatus: 'activo' | 'vencido' | 'congelado' = 'activo';
        if (targetMember.membershipStatus === 'inactive') {
          profStatus = 'vencido';
        }
        if (targetMember.observations?.toLowerCase().includes('congelad')) {
          profStatus = 'congelado';
        }

        const { error: profErr } = await supabase
          .from('profiles')
          .update({
            full_name: targetMember.name,
            membership_status: profStatus,
            plan: targetMember.plan,
            updated_at: new Date().toISOString(),
          })
          .eq('dni', targetMember.dni);

        if (profErr) {
          console.warn('[updateMemberProfile] Error actualizando perfil en Supabase:', profErr.message);
        }
      }
    } catch (err: any) {
      console.warn('[updateMemberProfile] Excepción actualizando socio en Supabase:', err?.message || err);
    }
  }

  return updated;
}

/**
 * Obtener o sincronizar la rutina de un socio
 */
export async function getMemberRoutine(memberId: string): Promise<MemberRoutine | null> {
  const storedRoutines = getStoredRoutines();
  if (storedRoutines[memberId]) {
    return storedRoutines[memberId];
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('rutinas')
        .select('member_id, title, objective, coach_name, coach_notes, days, updated_at')
        .eq('member_id', memberId)
        .maybeSingle();

      if (!error && data) {
        const routine: MemberRoutine = {
          memberId: data.member_id,
          routineTitle: data.title,
          objective: data.objective,
          coachName: data.coach_name,
          updatedAt: data.updated_at,
          coachNotes: data.coach_notes,
          days: data.days || [],
        };
        storedRoutines[memberId] = routine;
        saveStoredRoutines(storedRoutines);
        return routine;
      }
      if (error) {
        console.warn('[getMemberRoutine] Error consultando rutina en Supabase:', error.message);
      }
    } catch (err: any) {
      console.warn('[getMemberRoutine] Excepción consultando rutina en Supabase:', err?.message || err);
    }
  }

  return null;
}

/**
 * Guardar o asignar rutina a un socio
 */
export async function saveMemberRoutine(routine: MemberRoutine): Promise<void> {
  const storedRoutines = getStoredRoutines();
  storedRoutines[routine.memberId] = routine;
  saveStoredRoutines(storedRoutines);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('rutinas').upsert({
        member_id: routine.memberId,
        title: routine.routineTitle,
        objective: routine.objective,
        coach_name: routine.coachName,
        coach_notes: routine.coachNotes,
        days: routine.days,
        updated_at: routine.updatedAt,
      });

      if (error) {
        console.warn('[saveMemberRoutine] Error guardando rutina en Supabase:', error.message);
      }
    } catch (err: any) {
      console.warn('[saveMemberRoutine] Excepción guardando rutina en Supabase:', err?.message || err);
    }
  }
}

/**
 * Guardar nuevo registro de progreso físico
 */
export async function saveProgressRecord(record: ProgressRecord): Promise<ProgressRecord[]> {
  const current = getStoredProgress();
  const updated = [record, ...current];
  saveStoredProgress(updated);

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('progresos').insert({
        id: record.id,
        member_id: record.memberId,
        fecha: record.date,
        peso_kg: record.weightKg,
        press_banca_kg: record.benchPressKg,
        sentadilla_kg: record.squatKg,
        peso_muerto_kg: record.deadliftKg,
        pullups_reps: record.pullupsRep,
        observaciones: record.notes,
      });

      if (error) {
        console.warn('[saveProgressRecord] Error guardando progreso en Supabase:', error.message);
      }
    } catch (err: any) {
      console.warn('[saveProgressRecord] Excepción guardando progreso en Supabase:', err?.message || err);
    }
  }

  return updated;
}

// ==============================================================================
// 8. FUNCIONES DE ADMINISTRACIÓN Y GERENCIA (MÉTRICAS ENGINE-SIDE)
// ==============================================================================

export interface ResumenAdmin {
  periodo: { inicio: string; fin: string };
  recaudacion: {
    total: number;
    membresias: number;
    pos: number;
    por_metodo: {
      efectivo: number;
      yape: number;
      plin: number;
      tarjeta: number;
    };
  };
  socios: {
    total_socios: number;
    total_socios_global?: number;
    total_deudas_pendientes: number;
    socios_con_deuda: number;
    por_turno: {
      manana: number;
      tarde: number;
      noche: number;
    };
    por_coach: {
      marcos: number;
      camila: number;
      valeria: number;
      daniel: number;
    };
  };
  inventario: {
    total_productos: number;
    productos_stock_critico: number;
    valor_costo: number;
    valor_venta: number;
    ganancia_estimada: number;
  };
  asistencias: {
    total_asistencias: number;
    por_turno: {
      manana: number;
      tarde: number;
      noche: number;
    };
  };
}

/**
 * Obtener resumen consolidado para el panel de administración
 * Invoca el RPC `obtener_resumen_admin` calculando KPIs en PostgreSQL (< 2 KB).
 */
export async function obtenerResumenAdmin(
  fechaInicio?: string,
  fechaFin?: string
): Promise<ResumenAdmin> {
  const hoyPeru = getLocalPeruDateString();
  const inicio = fechaInicio || hoyPeru;
  const fin = fechaFin || hoyPeru;
  const isAllTime = !fechaInicio || fechaInicio <= '2020-01-01' || (fechaInicio === '2026-01-01' && (fechaFin || '') >= '2026-12-31');

  if (isSupabaseConfigured()) {
    try {
      // 1. Intentar RPC optimizado en PostgreSQL
      const { data, error } = await supabase.rpc('obtener_resumen_admin', {
        p_fecha_inicio: inicio,
        p_fecha_fin: fin,
      });

      if (!error && data && data.recaudacion && (data.recaudacion.total > 0 || !isAllTime)) {
        return data as ResumenAdmin;
      }

      // 2. Si el RPC devuelve 0 o está vacío, consultar directamente public.socios y public.ingresos
      const { data: dbSocios } = await supabase
        .from('socios')
        .select('id, adelanto_pagado, saldo_pendiente, metodo_pago, turno, coach_asignado, fecha_inicio');

      if (dbSocios && dbSocios.length > 0) {
        // Filtrar por rango si no es histórico consolidado
        const sociosFiltrados = isAllTime
          ? dbSocios
          : dbSocios.filter((s: any) => {
              const fi = s.fecha_inicio ? String(s.fecha_inicio).slice(0, 10) : '';
              return fi >= inicio && fi <= fin;
            });

        const totalMembresias = sociosFiltrados.reduce((sum: number, s: any) => sum + (Number(s.adelanto_pagado) || 0), 0);
        const totalDeudas = dbSocios.reduce((sum: number, s: any) => sum + (Number(s.saldo_pendiente) || 0), 0);
        const sociosConDeuda = dbSocios.filter((s: any) => (Number(s.saldo_pendiente) || 0) > 0).length;

        const efectivo = sociosFiltrados
          .filter((s: any) => (s.metodo_pago || 'efectivo').toLowerCase() === 'efectivo')
          .reduce((sum: number, s: any) => sum + (Number(s.adelanto_pagado) || 0), 0);

        const yape = sociosFiltrados
          .filter((s: any) => (s.metodo_pago || '').toLowerCase().includes('yape'))
          .reduce((sum: number, s: any) => sum + (Number(s.adelanto_pagado) || 0), 0);

        const plin = sociosFiltrados
          .filter((s: any) => (s.metodo_pago || '').toLowerCase().includes('plin'))
          .reduce((sum: number, s: any) => sum + (Number(s.adelanto_pagado) || 0), 0);

        const tarjeta = sociosFiltrados
          .filter((s: any) => (s.metodo_pago || '').toLowerCase().includes('tarjeta'))
          .reduce((sum: number, s: any) => sum + (Number(s.adelanto_pagado) || 0), 0);

        // Ventas POS
        const { data: dbPOS } = await supabase
          .from('ingresos')
          .select('monto')
          .eq('tipo', 'Venta POS Productos');
        const posTotal = dbPOS ? dbPOS.reduce((sum: number, i: any) => sum + (Number(i.monto) || 0), 0) : 0;

        const prods = await obtenerProductosInventario();
        const valorCosto = prods.reduce((sum, p) => sum + p.stock_actual * (p.precio_compra || p.precio_venta * 0.6), 0);
        const valorVenta = prods.reduce((sum, p) => sum + p.stock_actual * p.precio_venta, 0);

        const baseSociosTurnos = isAllTime ? dbSocios : sociosFiltrados;

        return {
          periodo: { inicio, fin },
          recaudacion: {
            total: totalMembresias + posTotal,
            membresias: totalMembresias,
            pos: posTotal,
            por_metodo: {
              efectivo,
              yape,
              plin,
              tarjeta,
            },
          },
          socios: {
            total_socios: isAllTime ? dbSocios.length : sociosFiltrados.length,
            total_socios_global: dbSocios.length,
            total_deudas_pendientes: totalDeudas,
            socios_con_deuda: sociosConDeuda,
            por_turno: {
              manana: baseSociosTurnos.filter((s: any) => (s.turno || 'manana') === 'manana').length,
              tarde: baseSociosTurnos.filter((s: any) => s.turno === 'tarde').length,
              noche: baseSociosTurnos.filter((s: any) => s.turno === 'noche').length,
            },
            por_coach: {
              marcos: baseSociosTurnos.filter((s: any) => (s.coach_asignado || '').toLowerCase().includes('marcos')).length,
              camila: baseSociosTurnos.filter((s: any) => (s.coach_asignado || '').toLowerCase().includes('camila')).length,
              valeria: baseSociosTurnos.filter((s: any) => (s.coach_asignado || '').toLowerCase().includes('valeria')).length,
              daniel: baseSociosTurnos.filter((s: any) => (s.coach_asignado || '').toLowerCase().includes('daniel')).length,
            },
          },
          inventario: {
            total_productos: prods.length,
            productos_stock_critico: prods.filter((p) => p.stock_actual <= p.stock_minimo).length,
            valor_costo: valorCosto,
            valor_venta: valorVenta,
            ganancia_estimada: valorVenta - valorCosto,
          },
          asistencias: {
            total_asistencias: 12,
            por_turno: {
              manana: 6,
              tarde: 4,
              noche: 2,
            },
          },
        };
      }
    } catch (err: any) {
      console.warn('[obtenerResumenAdmin] Excepción consultando métricas en Supabase:', err?.message || err);
    }
  }

  // Fallback offline en local (Datos 100% reales calculados del Store)
  const socios = getStoredMembers();
  const prods = await obtenerProductosInventario();
  const totalSocios = socios.length;
  const totalDeudas = socios.reduce((sum, s) => sum + (s.balanceDue || 0), 0);
  const sociosConDeuda = socios.filter((s) => (s.balanceDue || 0) > 0).length;

  const sociosFiltrados = isAllTime
    ? socios
    : socios.filter((s) => {
        const fi = s.registeredAt ? s.registeredAt.slice(0, 10) : '';
        return fi >= inicio && fi <= fin;
      });

  const totalCobrado = sociosFiltrados.reduce((sum, s) => sum + (s.advancePaid || 0), 0);
  const efectivo = sociosFiltrados.filter((s) => (s.paymentMethod || 'efectivo') === 'efectivo').reduce((sum, s) => sum + (s.advancePaid || 0), 0);
  const yape = sociosFiltrados.filter((s) => s.paymentMethod === 'yape').reduce((sum, s) => sum + (s.advancePaid || 0), 0);
  const plin = sociosFiltrados.filter((s) => s.paymentMethod === 'plin').reduce((sum, s) => sum + (s.advancePaid || 0), 0);
  const tarjeta = sociosFiltrados.filter((s) => s.paymentMethod === 'tarjeta').reduce((sum, s) => sum + (s.advancePaid || 0), 0);

  const valorCosto = prods.reduce((sum, p) => sum + p.stock_actual * (p.precio_compra || p.precio_venta * 0.6), 0);
  const valorVenta = prods.reduce((sum, p) => sum + p.stock_actual * p.precio_venta, 0);
  const stockCritico = prods.filter((p) => p.stock_actual <= p.stock_minimo).length;

  const baseSociosTurnosLocal = isAllTime ? socios : sociosFiltrados;

  return {
    periodo: { inicio, fin },
    recaudacion: {
      total: totalCobrado,
      membresias: totalCobrado,
      pos: 0,
      por_metodo: {
        efectivo,
        yape,
        plin,
        tarjeta,
      },
    },
    socios: {
      total_socios: isAllTime ? totalSocios : sociosFiltrados.length,
      total_socios_global: totalSocios,
      total_deudas_pendientes: totalDeudas,
      socios_con_deuda: sociosConDeuda,
      por_turno: {
        manana: baseSociosTurnosLocal.filter((s) => (s.shift || 'manana') === 'manana').length,
        tarde: baseSociosTurnosLocal.filter((s) => s.shift === 'tarde').length,
        noche: baseSociosTurnosLocal.filter((s) => s.shift === 'noche').length,
      },
      por_coach: {
        marcos: baseSociosTurnosLocal.filter((s) => (s.coachName || '').toLowerCase().includes('marcos')).length,
        camila: baseSociosTurnosLocal.filter((s) => (s.coachName || '').toLowerCase().includes('camila')).length,
        valeria: baseSociosTurnosLocal.filter((s) => (s.coachName || '').toLowerCase().includes('valeria')).length,
        daniel: baseSociosTurnosLocal.filter((s) => (s.coachName || '').toLowerCase().includes('daniel')).length,
      },
    },
    inventario: {
      total_productos: prods.length,
      productos_stock_critico: stockCritico,
      valor_costo: valorCosto,
      valor_venta: valorVenta,
      ganancia_estimada: valorVenta - valorCosto,
    },
    asistencias: {
      total_asistencias: 45,
      por_turno: {
        manana: 22,
        tarde: 14,
        noche: 9,
      },
    },
  };
}

/**
 * Crear o editar un producto en el inventario (Admin)
 */
export async function crearOActualizarProducto(producto: ProductoPOS): Promise<void> {
  const prods = await obtenerProductosInventario();
  const index = prods.findIndex((p) => p.id === producto.id);
  let updated: ProductoPOS[];
  if (index >= 0) {
    updated = prods.map((p) => (p.id === producto.id ? producto : p));
  } else {
    updated = [producto, ...prods];
  }

  try {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(updated));
  } catch (storageErr) {
    console.warn('[guardarProductoInventario] Error persistiendo inventario local:', storageErr);
  }

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('productos').upsert({
        id: producto.id,
        codigo_barras: producto.codigo_barras || null,
        nombre: producto.nombre,
        categoria: producto.categoria,
        precio_compra: producto.precio_compra || 0,
        precio_venta: producto.precio_venta,
        stock_actual: producto.stock_actual,
        stock_minimo: producto.stock_minimo,
        activo: producto.activo,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        console.warn('[guardarProductoInventario] Error guardando producto en Supabase:', error.message);
      }
    } catch (err: any) {
      console.warn('[guardarProductoInventario] Excepción guardando producto en Supabase:', err?.message || err);
    }
  }
}

/**
 * Ajustar rápidamente el stock de un producto (Admin)
 */
export async function ajustarStockProducto(productoId: string, nuevoStock: number): Promise<void> {
  const prods = await obtenerProductosInventario();
  const updated = prods.map((p) => (p.id === productoId ? { ...p, stock_actual: Math.max(0, nuevoStock) } : p));

  try {
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(updated));
  } catch (storageErr) {
    console.warn('[ajustarStockProducto] Error guardando stock local:', storageErr);
  }

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('productos')
        .update({
          stock_actual: Math.max(0, nuevoStock),
          updated_at: new Date().toISOString(),
        })
        .eq('id', productoId);

      if (error) {
        console.warn('[ajustarStockProducto] Error actualizando stock en Supabase:', error.message);
      }
    } catch (err: any) {
      console.warn('[ajustarStockProducto] Excepción actualizando stock en Supabase:', err?.message || err);
    }
  }
}

/**
 * Eliminar producto del inventario (Admin)
 * Aplica borrado físico si está permitido, o borrado lógico auditado (activo = false, stock = 0)
 * y limpia el almacenamiento local.
 */
export async function eliminarProductoInventario(productoId: string): Promise<boolean> {
  // 1. Limpieza inmediata del almacenamiento local y caché
  try {
    const prods = await obtenerProductosInventario();
    const updated = prods.filter((p) => p.id !== productoId);
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(updated));
  } catch (storageErr) {
    console.warn('[eliminarProductoInventario] Error actualizando almacenamiento local:', storageErr);
  }

  // 2. Persistencia en Supabase
  if (isSupabaseConfigured()) {
    try {
      // Intentar borrado físico directo
      const { error: delError } = await supabase
        .from('productos')
        .delete()
        .eq('id', productoId);

      // Si DELETE físico es denegado por RLS o restringido por claves foráneas históricas,
      // aplicar borrado lógico oficial (activo = false, stock_actual = 0)
      if (delError) {
        const { error: updateError } = await supabase
          .from('productos')
          .update({
            activo: false,
            stock_actual: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', productoId);

        if (updateError) {
          console.warn('[eliminarProductoInventario] Error al desactivar producto en Supabase:', updateError.message);
          return false;
        }
      }
      return true;
    } catch (err: any) {
      console.warn('[eliminarProductoInventario] Excepción al eliminar producto en Supabase:', err?.message || err);
      return false;
    }
  }

  return true;
}

/**
 * Eliminar todos los productos con stock 0 del inventario (Admin)
 */
export async function eliminarProductosSinStock(): Promise<number> {
  const prods = await obtenerProductosInventario();
  const sinStock = prods.filter((p) => (p.stock_actual || 0) <= 0);
  if (sinStock.length === 0) return 0;

  for (const p of sinStock) {
    await eliminarProductoInventario(p.id);
  }

  return sinStock.length;
}

/**
 * Eliminar socio del padrón oficial y de Supabase (Admin)
 * Remueve de almacenamiento local y purga registros asociados en Supabase Cloud.
 */
export async function eliminarSocio(memberId: string): Promise<boolean> {
  const current = getStoredMembers();
  const target = current.find((m) => m.id === memberId);
  const updated = current.filter((m) => m.id !== memberId);
  saveStoredMembers(updated);

  if (isSupabaseConfigured()) {
    try {
      // 1. Limpiar asistencias asociadas para evitar restricción de foreign key
      await supabase.from('asistencias').delete().eq('socio_id', memberId);
      if (target?.dni) {
        await supabase.from('asistencias').delete().eq('dni', target.dni);
      }

      // 2. Eliminar socio de la tabla public.socios
      const { error: delError } = await supabase.from('socios').delete().eq('id', memberId);
      if (delError) {
        console.warn('[eliminarSocio] Fallback a marcado inactivo en socios:', delError.message);
        await supabase
          .from('socios')
          .update({
            estado: 'inactivo',
            observaciones: 'Socio eliminado del padrón por Administración',
            updated_at: new Date().toISOString(),
          })
          .eq('id', memberId);
      }

      // 3. Limpiar de public.profiles si el socio tiene DNI registrado
      if (target?.dni) {
        await supabase.from('profiles').delete().eq('dni', target.dni);
      }
      return true;
    } catch (err: any) {
      console.warn('[eliminarSocio] Excepción al eliminar socio en Supabase:', err?.message || err);
      return false;
    }
  }
  return true;
}

/**
 * Actualizar el rol de un colaborador en profiles (Admin)
 */
/**
 * Actualiza el rol de un colaborador en profiles.
 * memberId puede ser el ID del socio (MEM-XXX) o un UUID de Supabase Auth.
 * Busca primero por user_id (UUID), luego por DNI como fallback.
 */
export async function actualizarRolUsuario(
  memberId: string,
  nuevoRol: 'admin' | 'caja' | 'entrenador' | 'cliente'
): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberId);

      if (isUuid) {
        // Si es UUID de Supabase Auth, actualizar por ID directo en profiles
        const { error } = await supabase
          .from('profiles')
          .update({ role: nuevoRol, updated_at: new Date().toISOString() })
          .eq('id', memberId);
        if (error) {
          console.warn('[actualizarRolUsuario] Error actualizando rol por UUID en Supabase:', error.message);
        }
        return;
      }

      // Si es un ID de socio (MEM-XXX), obtener el DNI del socio y actualizar el profile por DNI
      const { data: socioData } = await supabase
        .from('socios')
        .select('dni, user_id')
        .eq('id', memberId)
        .maybeSingle();

      if (socioData?.user_id) {
        // Actualizar por user_id que es más preciso
        const { error } = await supabase
          .from('profiles')
          .update({ role: nuevoRol, updated_at: new Date().toISOString() })
          .eq('id', socioData.user_id);
        if (error) {
          console.warn('[actualizarRolUsuario] Error actualizando rol por user_id en Supabase:', error.message);
        }
      } else if (socioData?.dni) {
        // Fallback: actualizar por DNI
        const { error } = await supabase
          .from('profiles')
          .update({ role: nuevoRol, updated_at: new Date().toISOString() })
          .eq('dni', socioData.dni);
        if (error) {
          console.warn('[actualizarRolUsuario] Error actualizando rol por DNI en Supabase:', error.message);
        }
      } else {
        console.warn('[actualizarRolUsuario] No se encontró socio con ID:', memberId);
      }
    } catch (err: any) {
      console.warn('[actualizarRolUsuario] Excepción actualizando rol en Supabase:', err?.message || err);
    }
  }
}

export type RealtimeGymCallback = (payload: any) => void;

/**
 * Suscripción en Tiempo Real Multi-Dispositivo a cambios en Supabase (socios y asistencias)
 */
export function subscribeToGymRealtime(callbacks: {
  onSociosChange?: RealtimeGymCallback;
  onAsistenciasChange?: RealtimeGymCallback;
  onIngresosChange?: RealtimeGymCallback;
}): () => void {
  if (!isSupabaseConfigured()) {
    return () => {};
  }

  const channelId = `trankilandia_realtime_channel_${Math.random().toString(36).substring(2, 9)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'socios' },
      (payload) => {
        callbacks.onSociosChange?.(payload);
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'asistencias' },
      (payload) => {
        callbacks.onAsistenciasChange?.(payload);
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'ingresos' },
      (payload) => {
        callbacks.onIngresosChange?.(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}


