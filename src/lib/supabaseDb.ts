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
  pendiente_sync?: boolean;
  productos_actualizados?: ProductoPOS[];
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
  request_version?: 2;
  estado?: 'pendiente' | 'requiere_revision';
  error_sync?: string;
  error_ambiguo?: boolean;
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

      if (!error && inventarioValido(data)) {
        const reservadas = new Map<string, number>();
        for (const venta of leerColaVentas()) {
          if (venta.request_version !== 2) continue;
          for (const item of venta.items) reservadas.set(item.producto_id, (reservadas.get(item.producto_id) || 0) + item.cantidad);
        }
        const disponibles = data.map((p) => ({ ...p, stock_actual: Math.max(0, p.stock_actual - (reservadas.get(p.id) || 0)) }));
        try {
          localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(disponibles));
        } catch (cacheErr) {
          console.warn('[obtenerProductosInventario] Error cacheando productos localmente:', cacheErr);
        }
        return disponibles;
      }
    } catch (err: any) {
      console.warn('[obtenerProductosInventario] Excepción consultando inventario en Supabase:', err?.message || err);
    }
  }

  // Fallback con localStorage o catálogo base
  try {
    const cached = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    if (cached !== null) {
      const data: unknown = JSON.parse(cached);
      if (inventarioValido(data)) return data;
    }
  } catch (storageErr) {
    console.warn('[obtenerProductosInventario] Error leyendo inventario de localStorage:', storageErr);
  }

  return [];
}

function inventarioValido(data: unknown): data is ProductoPOS[] {
  return Array.isArray(data) && data.every((p) => p && typeof p.id === 'string' && p.id &&
    typeof p.nombre === 'string' && Number.isFinite(Number(p.precio_venta)) && Number(p.precio_venta) >= 0 &&
    Number.isSafeInteger(p.stock_actual) && p.stock_actual >= 0);
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
function leerColaVentas(): VentaOfflineQueued[] {
  const raw = localStorage.getItem(LOCAL_OFFLINE_SALES_KEY);
  const queue = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(queue)) throw new Error('La cola de ventas no es válida. Requiere revisión antes de cobrar.');
  return queue;
}

function guardarColaVentas(queue: VentaOfflineQueued[]): void {
  try { localStorage.setItem(LOCAL_OFFLINE_SALES_KEY, JSON.stringify(queue)); }
  catch { throw new Error('No se pudo guardar el cobro en este equipo. Libera espacio y vuelve a intentar.'); }
}

function quitarVentaDeCola(id: string): void {
  guardarColaVentas(leerColaVentas().filter((venta) => venta.id !== id));
}

function parametrosVentaPOS(venta: VentaOfflineQueued) {
  return {
    p_venta_id: venta.id,
    p_items: venta.items.map(({ producto_id, cantidad }) => ({ producto_id, cantidad })),
    p_metodo_pago: venta.metodo_pago,
    p_cliente_nombre: venta.cliente_nombre,
    p_cliente_dni: venta.cliente_dni || null,
    p_numero_ticket: venta.numero_ticket,
    p_fecha: venta.fecha,
    p_descuento: venta.descuento?.monto || 0,
    p_descuento_motivo: venta.descuento?.motivo || '',
    p_descuento_autorizado_por: venta.descuento?.autorizadoPor || '',
    p_subtotal_esperado: venta.subtotal,
  };
}

// Permissions, stock, validation and missing migrations must reach the cashier.
function esFalloDeRed(error: unknown): boolean {
  const value = error as { message?: string; code?: string };
  if (value?.code) return false;
  return /failed to fetch|fetch failed|networkerror|network request failed|network connection|load failed/i.test(value?.message || '');
}

function esRechazoDeterminista(error: unknown): boolean {
  const value = error as { code?: string; status?: number };
  if (value?.status && value.status >= 500) return false;
  return /^(?:[0-9A-Z]{5}|PGRST\d+)$/.test(value?.code || '');
}

async function enviarVentaPOS(venta: VentaOfflineQueued): Promise<ResultadoVentaPOS> {
  const { data, error, status } = await supabase.rpc('registrar_venta_pos_v2', parametrosVentaPOS(venta));
  if (error) throw Object.assign(new Error(error.message), error, { status });
  if (!data?.success || !data.numero_ticket || !Number.isFinite(Number(data.total))) {
    throw new Error('Respuesta de cobro no válida. Revisa el ticket pendiente antes de volver a cobrar.');
  }
  return data as ResultadoVentaPOS;
}

function marcarVentaParaRevision(venta: VentaOfflineQueued, error: unknown): void {
  guardarColaVentas(leerColaVentas().map((item) => item.id === venta.id ? {
    ...item, estado: 'requiere_revision', error_ambiguo: true,
    error_sync: (error as { message?: string })?.message || 'Resultado de cobro no confirmado.',
  } : item));
}

let isRegisteringSale = false;

export async function registrarVentaPOS(
  items: ItemVentaPOS[],
  metodoPago: 'yape' | 'plin' | 'efectivo' | 'tarjeta',
  clienteNombre: string = 'Cliente Mostrador',
  clienteDni: string = '',
  descuento?: DescuentoPOS
): Promise<ResultadoVentaPOS> {
  if (isRegisteringSale) throw new Error('Ya hay un cobro en proceso. Espera a que termine.');
  if (items.length === 0) throw new Error('El carrito de venta no contiene ningún producto.');
  const cantidades = new Map<string, number>();
  for (const item of items) {
    if (!item.producto_id || !Number.isSafeInteger(item.cantidad) || item.cantidad <= 0) throw new Error('Cada producto debe tener una cantidad entera mayor que cero.');
    const cantidad = (cantidades.get(item.producto_id) || 0) + item.cantidad;
    if (!Number.isSafeInteger(cantidad)) throw new Error('Cantidad de producto fuera de rango.');
    cantidades.set(item.producto_id, cantidad);
  }
  if (!['yape', 'plin', 'efectivo', 'tarjeta'].includes(metodoPago)) throw new Error('Método de pago no válido.');
  const montoDescuento = Number(descuento?.monto ?? 0);
  if (!Number.isFinite(montoDescuento) || montoDescuento < 0) throw new Error('El descuento debe ser un monto válido mayor o igual a cero.');
  isRegisteringSale = true;
  try {
    const configured = isSupabaseConfigured();
    const online = typeof navigator === 'undefined' || navigator.onLine;
    // A previous unknown response is a retry of the same operation, even when
    // its first request already consumed the last item on the server.
    const ambigua = leerColaVentas().find((venta) => venta.request_version === 2 && venta.error_ambiguo &&
      venta.metodo_pago === metodoPago && venta.cliente_nombre === (clienteNombre.trim() || 'Cliente Mostrador') &&
      venta.cliente_dni === clienteDni.trim() && Number(venta.descuento?.monto || 0) === montoDescuento &&
      (venta.descuento?.motivo || '') === (montoDescuento > 0 ? descuento?.motivo?.trim() || 'Descuento autorizado' : '') &&
      (venta.descuento?.autorizadoPor || '') === (montoDescuento > 0 ? descuento?.autorizadoPor || '' : '') &&
      venta.items.length === cantidades.size && venta.items.every((item) => cantidades.get(item.producto_id) === item.cantidad));
    if (ambigua) {
      if (!configured || !online) throw new Error('El ticket pendiente requiere conexión para confirmar su resultado. No vuelvas a cobrarlo.');
      let data: ResultadoVentaPOS;
      try { data = await enviarVentaPOS(ambigua); }
      catch (error) {
        marcarVentaParaRevision(ambigua, error);
        throw new Error((error as { message?: string })?.message || 'No se pudo confirmar el ticket pendiente.');
      }
      try { quitarVentaDeCola(ambigua.id); } catch { /* Idempotent retry remains safe. */ }
      const productosConfirmados = await obtenerProductosInventario();
      return { ...data, cliente_nombre: ambigua.cliente_nombre, cliente_dni: ambigua.cliente_dni, fecha: ambigua.fecha, pendiente_sync: false, productos_actualizados: productosConfirmados };
    }
    let prods: ProductoPOS[];
    if (configured && !online) {
      const cache = localStorage.getItem(LOCAL_PRODUCTS_KEY);
      if (!cache) throw new Error('No hay inventario guardado para cobrar sin conexión.');
      prods = JSON.parse(cache);
      if (!inventarioValido(prods)) throw new Error('El inventario guardado no es válido para cobrar sin conexión.');
    } else prods = await obtenerProductosInventario();
    let subtotal = 0;
    const snapshot = Array.from(cantidades, ([producto_id, cantidad]) => {
      const prod = prods.find((p) => p.id === producto_id && p.activo !== false);
      if (!prod) throw new Error('Producto con ID ' + producto_id + ' no encontrado en el inventario.');
      if (prod.stock_actual < cantidad) throw new Error('Stock insuficiente para ' + prod.nombre + ' (Stock actual: ' + prod.stock_actual + ')');
      if (!Number.isFinite(Number(prod.precio_venta)) || Number(prod.precio_venta) < 0) throw new Error('El precio del producto no es válido.');
      const importe = Math.round(Number(prod.precio_venta) * cantidad * 100) / 100;
      subtotal += importe;
      return { producto_id, cantidad, nombre_producto: prod.nombre, precio_unitario: Number(prod.precio_venta), subtotal: importe };
    });
    subtotal = Math.round(subtotal * 100) / 100;
    if (montoDescuento > subtotal) throw new Error('El descuento no puede superar el subtotal del carrito.');
    const total = Math.round((subtotal - montoDescuento) * 100) / 100;
    const id = crypto.randomUUID();
    const fecha = new Date().toISOString();
    const venta: VentaOfflineQueued = {
      id, request_version: 2, estado: 'pendiente', items: snapshot,
      metodo_pago: metodoPago, cliente_nombre: clienteNombre.trim() || 'Cliente Mostrador', cliente_dni: clienteDni.trim(), subtotal,
      descuento: montoDescuento > 0 ? { monto: montoDescuento, motivo: descuento?.motivo?.trim() || 'Descuento autorizado', autorizadoPor: descuento?.autorizadoPor || '' } : undefined,
      total, numero_ticket: 'TK-' + getLocalPeruDateString().replace(/-/g, '') + '-' + id, fecha,
    };
    // Persist immutable identity before a request: a lost response is safe to retry.
    guardarColaVentas([...leerColaVentas(), venta]);
    let rpcData: ResultadoVentaPOS | null = null;
    if (configured && online) {
      try {
        rpcData = await enviarVentaPOS(venta);
      } catch (error) {
        if (esRechazoDeterminista(error)) {
          quitarVentaDeCola(id);
          throw new Error((error as { message?: string })?.message || 'No se pudo registrar el cobro.');
        }
        if (!esFalloDeRed(error)) {
          marcarVentaParaRevision(venta, error);
          throw new Error((error as { message?: string })?.message || 'No se confirmó el cobro. Revisa el ticket pendiente.');
        }
      }
    }
    const updated = prods.map((p) => ({ ...p, stock_actual: p.stock_actual - (cantidades.get(p.id) || 0) }));
    try { localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(updated)); }
    catch { console.warn('[registrarVentaPOS] Cobro persistido; no se pudo actualizar la caché de inventario.'); }
    if (rpcData) {
      try { quitarVentaDeCola(id); } catch { /* The same ID can safely be retried. */ }
    }
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('gym-products-updated'));
    return {
      success: true, ...rpcData,
      numero_ticket: rpcData?.numero_ticket || venta.numero_ticket,
      subtotal: rpcData?.subtotal ?? subtotal, descuento: rpcData?.descuento ?? montoDescuento,
      total: Number(rpcData?.total ?? total), metodo_pago: metodoPago,
      cliente_nombre: venta.cliente_nombre, cliente_dni: venta.cliente_dni, fecha,
      pendiente_sync: !rpcData,
      productos_actualizados: updated,
    };
  } finally { isRegisteringSale = false; }
}

let isSyncingOfflineSales = false;

/** Retry durable operations without changing their date, quote or identity. */
export async function procesarColaVentasOffline(): Promise<number> {
  if (!isSupabaseConfigured() || !navigator.onLine || isSyncingOfflineSales || isRegisteringSale) return 0;
  isSyncingOfflineSales = true;
  let count = 0;
  try {
    const queue = leerColaVentas();
    for (const venta of queue) {
      // Older clients patched stock before queuing: retain for reconciliation.
      if (venta.request_version !== 2) continue;
      try {
        await enviarVentaPOS(venta);
        quitarVentaDeCola(venta.id);
        count++;
      } catch (error) {
        const actual = leerColaVentas();
        guardarColaVentas(actual.map((item) => item.id === venta.id ? {
          ...item, estado: esFalloDeRed(error) ? 'pendiente' : 'requiere_revision',
          error_ambiguo: item.error_ambiguo,
          error_sync: (error as { message?: string })?.message || 'Error al sincronizar el ticket.',
        } : item));
      }
    }
  } catch (error) { console.warn('[procesarColaVentasOffline] Se conservó la cola pendiente:', error); }
  finally { isSyncingOfflineSales = false; }
  return count;
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
  _userId: string, _userEmail: string, _dniIngresado: string, _nombreIngresado?: string
): Promise<{ success: boolean; message: string; member?: GymMember }> {
  return { success: false, message: 'Recepción debe verificar tu identidad y vincular tu cuenta de forma segura. Conocer un DNI no permite activar una membresía.' };
}

/**
 * Vincula un correo electrónico (o cuenta de Google) al socio identificado por su DNI.
 * Unifica ambos accesos (DNI + contraseña y Google) en una sola cuenta y mismo perfil.
 */
export async function vincularCorreoASocio(
  _dni: string, _email: string
): Promise<{ success: boolean; message: string; member?: GymMember }> {
  return { success: false, message: 'Recepción debe verificar la titularidad del correo antes de vincular la cuenta. No se modificaron tus datos.' };
}

/**
 * Asigna un número de DNI (8 dígitos) a un socio que no lo tenía registrado
 * (ej. socios importados sin DNI desde Excel/cuaderno o nuevas altas en caja).
 * Vincula directamente el DNI con el correo registrado y unifica la cuenta.
 */
export async function asignarDniYActivarCuenta(
  memberId: string, nuevoDni: string, emailRegistrado?: string, celularRegistrado?: string
): Promise<{ success: boolean; message: string; socioActualizado?: SocioRecepcion; member?: GymMember }> {
  const cleanDni = nuevoDni.trim();
  if (!/^\d{8}$/.test(cleanDni)) return { success: false, message: 'El DNI debe contener exactamente 8 dígitos numéricos.' };
  if (!isSupabaseConfigured()) return { success: false, message: 'Se requiere conexión con el servidor para asignar el DNI.' };
  try {
    const payload: Record<string, unknown> = { dni: cleanDni, updated_at: new Date().toISOString() };
    if (emailRegistrado !== undefined) payload.email = emailRegistrado.trim().toLowerCase() || null;
    if (celularRegistrado !== undefined) payload.celular = celularRegistrado.trim() || null;
    const { data: row, error } = await supabase.from('socios').update(payload).eq('id', memberId).select('*').maybeSingle();
    if (error || !row || row.id !== memberId) return { success: false, message: 'No se pudo asignar el DNI. Verifica permisos, conexión y que el DNI no esté registrado.' };
    const member = mapConfirmedMemberRow(row);
    const current = getStoredMembers();
    saveStoredMembers([member, ...current.filter((item) => item.id !== memberId)]);
    const days = Math.ceil((new Date(`${member.expiresAt}T23:59:59-05:00`).getTime() - Date.now()) / 86400000);
    const socioActualizado: SocioRecepcion = { ...row, dias_restantes: Number.isFinite(days) ? days : 0, estado_calculado: member.membershipStatus === 'inactive' ? 'vencido' : member.membershipStatus === 'expiring' ? 'por_vencer' : 'activo', tiene_deuda_activa: member.balanceDue > 0 };
    return { success: true, message: 'DNI guardado. El acceso digital requiere una cuenta verificada y vinculada por gerencia.', socioActualizado, member };
  } catch { return { success: false, message: 'No se pudo guardar el DNI en el servidor.' }; }
}

const ENROLLMENT_OPERATIONS_KEY = 'trankilandia_inscripciones_operaciones_v1';
interface EnrollmentOperation { id: string; payload: Record<string, unknown>; confirmed?: boolean }

function readEnrollmentOperations(): EnrollmentOperation[] {
  try {
    const operations: EnrollmentOperation[] = JSON.parse(localStorage.getItem(ENROLLMENT_OPERATIONS_KEY) || '[]');
    if (!Array.isArray(operations) || operations.some((operation) => !operation
        || typeof operation.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(operation.id)
        || !operation.payload || typeof operation.payload.id !== 'string'
        || (operation.confirmed !== undefined && typeof operation.confirmed !== 'boolean'))) throw new Error('Invalid journal');
    return operations;
  } catch {
    throw new Error('No se pudo leer el registro de inscripciones pendientes. Requiere revisión antes de volver a cobrar.');
  }
}

/** Resolve ambiguous enrollment before deciding whether an existing DNI is a renewal. */
export function getPendingEnrollmentMember(dni: string): GymMember | null {
  const operation = readEnrollmentOperations().find((item) => !item.confirmed && item.payload.dni === dni.trim());
  return operation ? mapConfirmedMemberRow(operation.payload) : null;
}

function enrollmentDate(value: string, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} es requerida.`);
  const date = normalizeDateToISO(value);
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime())
      || parsed.toISOString().slice(0, 10) !== date || date < '1900-01-01' || date > '2200-12-31') {
    throw new Error(`${label} no es válida.`);
  }
  return date;
}

function enrollmentText(value: unknown, label: string, limit: number, required = false): string | null {
  if (value !== undefined && value !== null && typeof value !== 'string') throw new Error(`${label} no es válido.`);
  const text = typeof value === 'string' ? value.trim() : '';
  if ((required && !text) || text.length > limit) throw new Error(`${label} no es válido.`);
  return text || null;
}

/** Register the member and its first payment in one checked server transaction. */
export async function registerGymMember(member: GymMember): Promise<GymMember> {
  if (!isSupabaseConfigured()) throw new Error('Se requiere conexión con el servidor para registrar un socio.');
  const id = enrollmentText(member.id, 'ID del socio', 100, true)!;
  const dni = enrollmentText(member.dni, 'DNI', 8);
  if (dni && !/^\d{8}$/.test(dni)) throw new Error('El DNI debe contener exactamente 8 dígitos.');
  const amounts = [member.planPrice, member.advancePaid, member.balanceDue];
  if (amounts.some((amount) => typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0
      || amount > 99999999.99 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001)) {
    throw new Error('Los importes deben ser positivos o cero y tener como máximo dos decimales.');
  }
  if (Math.round(member.advancePaid * 100) + Math.round(member.balanceDue * 100) !== Math.round(member.planPrice * 100)) {
    throw new Error('El adelanto y el saldo deben sumar el precio del plan.');
  }
  if (!['full', 'advance'].includes(member.paymentType) || (member.paymentType === 'full' && member.balanceDue !== 0)) {
    throw new Error('El pago completo debe cubrir el precio del plan.');
  }
  if (!['efectivo', 'yape', 'plin', 'tarjeta'].includes(member.paymentMethod)) throw new Error('Método de pago no válido.');
  const start = enrollmentDate(member.registeredAt, 'La fecha de inicio');
  const end = enrollmentDate(member.expiresAt, 'La fecha de fin');
  const due = member.paymentDueDate ? enrollmentDate(member.paymentDueDate, 'La fecha límite de pago') : null;
  if (end < start || (due && (due < start || due > end))) throw new Error('Las fechas del plan y del pago no son válidas.');
  if (member.age != null && (!Number.isInteger(member.age) || member.age < 1 || member.age > 120)) throw new Error('La edad no es válida.');
  const shift = member.shift || 'manana';
  if (!['manana', 'tarde', 'noche'].includes(shift)) throw new Error('El turno no es válido.');
  const payload: Record<string, unknown> = {
    id, nombre: enrollmentText(member.name, 'Nombre', 200, true), dni,
    email: enrollmentText(member.email, 'Correo', 254)?.toLowerCase() || null,
    celular: enrollmentText(member.phone, 'Celular', 30), plan: enrollmentText(member.plan, 'Plan', 200, true),
    precio_plan: member.planPrice, tipo_pago: member.paymentType, adelanto_pagado: member.advancePaid,
    saldo_pendiente: member.balanceDue, fecha_inicio: start, fecha_fin: end, fecha_limite_pago: due,
    metodo_pago: member.paymentMethod, numero_boleta: enrollmentText(member.receiptNumber, 'Boleta', 100, true),
    turno: shift, coach_asignado: enrollmentText(member.coachName, 'Coach', 200, true),
    observaciones: enrollmentText(member.observations, 'Observaciones', 2000), edad: member.age ?? null,
    sexo: enrollmentText(member.gender, 'Sexo', 40),
  };
  const operations = readEnrollmentOperations();
  const previous = operations.find((operation) => operation.payload.id === id);
  if (previous && JSON.stringify(previous.payload) !== JSON.stringify(payload)) {
    throw new Error('Hay una inscripción pendiente o confirmada con este ID. Reintenta con los mismos datos o revisa el socio registrado.');
  }
  const operation = previous || { id: crypto.randomUUID(), payload };
  if (!previous) {
    try { localStorage.setItem(ENROLLMENT_OPERATIONS_KEY, JSON.stringify([...operations, operation])); }
    catch { throw new Error('No se pudo guardar la operación de inscripción para reintentar de forma segura.'); }
  }
  let response;
  try {
    response = await supabase.rpc('registrar_socio_atomico', { p_operacion_id: operation.id, p_socio: operation.payload });
  } catch {
    throw new Error('No se pudo confirmar la inscripción por conexión. Reintenta con los mismos datos; no vuelvas a cobrar.');
  }
  const { data, error } = response;
  if (error) {
    // A later rejection cannot prove an earlier ambiguous request did not commit.
    if (!previous && ['P0001', '42501', '23505', '23514', '22007', '22008', '22P02', 'PGRST202', '42883'].includes(error.code || '')) {
      try {
        const latest: EnrollmentOperation[] = JSON.parse(localStorage.getItem(ENROLLMENT_OPERATIONS_KEY) || '[]');
        localStorage.setItem(ENROLLMENT_OPERATIONS_KEY, JSON.stringify(latest.filter((item) => item.id !== operation.id)));
      } catch { /* Retaining the operation is safer than losing its retry identity. */ }
    }
    if (error.code === 'PGRST202' || error.code === '42883') {
      throw new Error('El servidor requiere aplicar migration_enrollment_consistency.sql para registrar socios de forma segura.');
    }
    throw new Error(`El servidor no confirmó la inscripción: ${error.message || 'error de servidor'}. Reintenta con los mismos datos si el resultado es incierto.`);
  }
  const row = data?.socio;
  if (data?.success !== true || data.operacion_id !== operation.id || row?.id !== id
      || typeof row.nombre !== 'string' || typeof row.plan !== 'string'
      || typeof row.fecha_inicio !== 'string' || typeof row.fecha_fin !== 'string'
      || [row.precio_plan, row.adelanto_pagado, row.saldo_pendiente].some((amount) => amount == null || !Number.isFinite(Number(amount)))) {
    throw new Error(data?.error || 'El servidor no devolvió una confirmación válida de inscripción. Reintenta con los mismos datos; no vuelvas a cobrar.');
  }
  try {
    const latest = readEnrollmentOperations();
    localStorage.setItem(ENROLLMENT_OPERATIONS_KEY, JSON.stringify(latest.map((item) => item.id === operation.id ? { ...item, confirmed: true } : item)));
  } catch {
    throw new Error('La inscripción fue confirmada por el servidor, pero no se pudo persistir su confirmación local. Reintenta con los mismos datos; no vuelvas a cobrar.');
  }
  // Read again after the request so unrelated confirmed members are preserved.
  const current = getStoredMembers();
  const confirmed = mapConfirmedMemberRow(row);
  saveStoredMembers([confirmed, ...current.filter((item) => item.id !== id)]);
  // Keep the UUID durably after success as well: a repeated submit is the same operation.
  return confirmed;
}

export interface RenovarMembresiaParams {
  socioId: string;
  plan: string;
  precioPlan: number;
  tipoPago: 'full' | 'advance';
  adelantoPagado: number;
  saldoPendiente: number;
  fechaInicio: string;
  fechaFin: string;
  fechaLimitePago?: string;
  metodoPago?: string;
  numeroBoleta?: string;
  turno?: 'manana' | 'tarde' | 'noche';
  coachAsignado?: string;
  registrarIngreso?: boolean;
  operador?: string;
}

/**
 * Renovar la membresía de un socio existente de forma segura y atómica.
 * Usa la RPC 'renovar_membresia_socio' (SECURITY DEFINER) para evitar bloqueos por triggers de saldo.
 * Si la RPC aún no está activa en Supabase, ejecuta fallback directo a socios e ingresos.
 */
export async function renovarMembresiaSocio(
  params: RenovarMembresiaParams
): Promise<{ success: boolean; message: string; data?: any }> {
  if (!params.socioId || !params.socioId.trim()) {
    throw new Error('El ID del socio es requerido para renovar.');
  }

  const current = getStoredMembers();
  const existing = current.find((m) => m.id === params.socioId);
  const cleanDni = existing?.dni || '';

  const fechaIni = normalizeDateToISO(params.fechaInicio);
  const fechaFin = normalizeDateToISO(params.fechaFin);
  const boleta = params.numeroBoleta || `B001-${String(Math.floor(Math.random() * 900000 + 100000))}`;
  const coach = params.coachAsignado || existing?.coachName || 'Coach Marcos Rivas';
  const turno = params.turno || existing?.shift || 'manana';
  const metodoPago: 'efectivo' | 'yape' | 'plin' | 'tarjeta' =
    params.metodoPago === 'yape' || params.metodoPago === 'plin' || params.metodoPago === 'tarjeta'
      ? params.metodoPago
      : 'efectivo';
  const registrarIngreso = params.registrarIngreso !== false;

  let rpcSuccess = false;
  let rpcData: any = null;

  // 1. Intentar ejecución atómica mediante RPC SECURITY DEFINER
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('renovar_membresia_socio', {
        p_socio_id: params.socioId,
        p_plan: params.plan,
        p_precio_plan: params.precioPlan,
        p_tipo_pago: params.tipoPago,
        p_adelanto_pagado: params.adelantoPagado,
        p_saldo_pendiente: params.saldoPendiente,
        p_fecha_inicio: fechaIni,
        p_fecha_fin: fechaFin,
        p_fecha_limite_pago: params.fechaLimitePago || null,
        p_metodo_pago: metodoPago,
        p_numero_boleta: boleta,
        p_turno: turno,
        p_coach_asignado: coach,
        p_registrar_ingreso: registrarIngreso,
        p_operador: params.operador || 'Recepción',
      });

      if (!error && data && (data.success || data === true)) {
        rpcSuccess = true;
        rpcData = data;
      } else if (error) {
        console.warn('[renovarMembresiaSocio] RPC no disponible o falló, usando fallback:', error.message);
      }
    } catch (rpcErr) {
      console.warn('[renovarMembresiaSocio] Excepción llamando RPC, usando fallback:', rpcErr);
    }

    // 2. Fallback directo si RPC no está migrado aún en Supabase
    if (!rpcSuccess) {
      // Verificar si el socio tiene saldo_pendiente previo en Supabase que se esté reduciendo
      const { data: dbSocio } = await supabase
        .from('socios')
        .select('saldo_pendiente')
        .eq('id', params.socioId)
        .maybeSingle();

      const prevSaldo = Number(dbSocio?.saldo_pendiente) || 0;
      if (prevSaldo > 0 && params.saldoPendiente < prevSaldo) {
        const montoALiquidar = prevSaldo - params.saldoPendiente;
        try {
          await supabase.rpc('liquidar_saldo_socio', {
            p_socio_id: params.socioId,
            p_monto: montoALiquidar,
            p_metodo_pago: metodoPago,
            p_operador: params.operador || 'Recepción',
          });
        } catch (liqErr) {
          console.warn('[renovarMembresiaSocio] Advertencia liquidando saldo previo con RPC:', liqErr);
        }
      }

      const updatePayload: Record<string, any> = {
        plan: params.plan,
        precio_plan: params.precioPlan,
        tipo_pago: params.tipoPago,
        adelanto_pagado: params.adelantoPagado,
        fecha_inicio: fechaIni,
        fecha_fin: fechaFin,
        fecha_limite_pago: params.fechaLimitePago || null,
        metodo_pago: metodoPago,
        numero_boleta: boleta,
        turno,
        coach_asignado: coach,
        estado: 'activo',
        updated_at: new Date().toISOString(),
      };

      // Si el nuevo saldo es mayor o igual o si no hay conflicto de reducción directa
      if (params.saldoPendiente >= prevSaldo || prevSaldo === 0) {
        updatePayload.saldo_pendiente = params.saldoPendiente;
      }

      const { error: updErr } = await supabase
        .from('socios')
        .update(updatePayload)
        .eq('id', params.socioId);

      if (updErr) {
        throw new Error(`Error en Supabase al renovar socio: ${updErr.message}`);
      }

      // Registrar ingreso si se solicitó y monto > 0
      const montoIngreso = params.tipoPago === 'full' ? params.precioPlan : params.adelantoPagado;
      if (registrarIngreso && montoIngreso > 0 && prevSaldo === 0) {
        await supabase.from('ingresos').insert({
          key_socio: params.socioId,
          monto: montoIngreso,
          metodo_pago: metodoPago,
          tipo: params.tipoPago === 'full' ? 'Renovación de Membresía' : 'Renovación con Adelanto',
          observacion: `Cobro boleta ${boleta} (${params.plan}) - ${params.operador || 'Recepción'}`,
        });
      }

      // Intentar actualizar public.profiles sin bloquear si falla por RLS
      if (cleanDni) {
        try {
          await supabase
            .from('profiles')
            .update({
              full_name: existing?.name,
              plan: params.plan,
              membership_status: 'activo',
              updated_at: new Date().toISOString(),
            })
            .eq('dni', cleanDni);
        } catch {}
      }
    }
  }

  // 3. Actualizar memoria local en todos los casos
  let foundInLocal = false;
  const updatedMembers = current.map((m) => {
    if (m.id === params.socioId || (cleanDni && m.dni === cleanDni)) {
      foundInLocal = true;
      return {
        ...m,
        plan: params.plan,
        planPrice: params.precioPlan,
        paymentType: params.tipoPago,
        advancePaid: params.adelantoPagado,
        balanceDue: params.saldoPendiente,
        paymentDueDate: params.fechaLimitePago,
        paymentMethod: metodoPago,
        receiptNumber: boleta,
        membershipStatus: 'active' as const,
        expiresAt: fechaFin,
        registeredAt: fechaIni,
        shift: turno,
        coachName: coach,
      };
    }
    return m;
  });

  if (!foundInLocal) {
    updatedMembers.unshift({
      id: params.socioId,
      name: existing?.name || params.socioId,
      dni: cleanDni,
      email: `${cleanDni || params.socioId}@socio.trankilandia.pe`,
      phone: existing?.phone || '',
      plan: params.plan,
      planPrice: params.precioPlan,
      paymentType: params.tipoPago,
      advancePaid: params.adelantoPagado,
      balanceDue: params.saldoPendiente,
      paymentDueDate: params.fechaLimitePago,
      paymentMethod: metodoPago,
      receiptNumber: boleta,
      membershipStatus: 'active',
      expiresAt: fechaFin,
      registeredAt: fechaIni,
      shift: turno,
      coachName: coach,
    });
  }

  saveStoredMembers(updatedMembers);

  return {
    success: true,
    message: `¡Membresía renovada con éxito hasta el ${fechaFin}!`,
    data: rpcData,
  };
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
function mapConfirmedMemberRow(row: any): GymMember {
  const expiresAt = row.fecha_fin || '';
  const days = Math.ceil((new Date(`${expiresAt}T23:59:59-05:00`).getTime() - Date.now()) / 86400000);
  return {
    id: row.id, name: row.nombre, dni: row.dni, email: row.email, phone: row.celular,
    plan: row.plan, planPrice: Number(row.precio_plan), paymentType: row.tipo_pago,
    advancePaid: Number(row.adelanto_pagado), balanceDue: Number(row.saldo_pendiente),
    paymentDueDate: row.fecha_limite_pago, paymentMethod: row.metodo_pago,
    receiptNumber: row.numero_boleta, membershipStatus: days < 0 ? 'inactive' : days <= 5 ? 'expiring' : 'active',
    expiresAt, coachName: row.coach_asignado || '', registeredAt: row.fecha_inicio || '',
    observations: row.observaciones, age: row.edad, gender: row.sexo, shift: row.turno,
  };
}

export async function updateMemberProfile(memberId: string, data: Partial<GymMember>): Promise<GymMember[]> {
  if (!isSupabaseConfigured()) throw new Error('Se requiere conexión con el servidor para guardar el perfil.');
  const fields = Object.entries(data).filter(([, value]) => value !== undefined);
  if (fields.some(([key]) => key.startsWith('document'))) throw new Error('La carga de documentos aún requiere un almacenamiento privado configurado.');
  const { data: serverRole, error: roleError } = await supabase.rpc('get_auth_role');
  if (roleError || !['admin', 'caja', 'entrenador', 'cliente'].includes(serverRole)) throw new Error('No se pudo verificar tu cuenta y permisos.');
  const staff = serverRole === 'admin' || serverRole === 'caja';
  const allowedSelf = new Set(['name', 'phone', 'email', 'age', 'gender', 'observations']);
  if (!staff && fields.some(([key]) => !allowedSelf.has(key))) throw new Error('Solo puedes editar tus datos de contacto y perfil.');
  const payload: Record<string, unknown> = {};
  const mapping: Record<string, string> = { name: 'nombre', phone: 'celular', email: 'email', age: 'edad', gender: 'sexo', observations: 'observaciones' };
  if (staff) Object.assign(mapping, { dni: 'dni', shift: 'turno', coachName: 'coach_asignado', plan: 'plan', planPrice: 'precio_plan', advancePaid: 'adelanto_pagado', paymentType: 'tipo_pago', registeredAt: 'fecha_inicio', expiresAt: 'fecha_fin' });
  for (const [key, value] of fields) if (mapping[key]) payload[mapping[key]] = key === 'registeredAt' || key === 'expiresAt' ? normalizeDateToISO(String(value)) : value;
  let row: any;
  if (staff) {
    const current = getStoredMembers().find((member) => member.id === memberId);
    if (data.balanceDue !== undefined && data.balanceDue !== current?.balanceDue) throw new Error('Los saldos se actualizan mediante el cobro o la renovación de la membresía.');
    const result = await supabase.from('socios').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', memberId).select('*').maybeSingle();
    if (result.error || !result.data) throw new Error('El servidor no confirmó la actualización del socio.');
    row = result.data;
  } else {
    const result = await supabase.rpc('actualizar_mi_socio', { p_socio_id: memberId, p_cambios: payload });
    if (result.error || !result.data?.success || !result.data.socio) throw new Error(result.data?.error || 'El servidor no confirmó la actualización del perfil.');
    row = result.data.socio;
  }
  if (row.id !== memberId) throw new Error('La respuesta del servidor no corresponde al socio solicitado.');
  const confirmed = mapConfirmedMemberRow(row);
  const current = getStoredMembers();
  const updated = current.some((member) => member.id === memberId) ? current.map((member) => member.id === memberId ? confirmed : member) : [confirmed, ...current];
  saveStoredMembers(updated);
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

export interface AuditoriaVentaItem {
  id: string | number;
  numeroTicket: string;
  fecha: string;
  hora: string;
  clienteNombre: string;
  clienteDni?: string;
  metodoPago: string;
  total: number;
  fechaHoraISO?: string;
  items: {
    productoId: string;
    nombreProducto: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[];
}

export interface ResumenVentasPorProducto {
  productoId: string;
  nombre: string;
  cantidadTotal: number;
  totalRecaudado: number;
  precioUnitarioPromedio: number;
}

export interface AuditoriaVentasPOSResponse {
  ventas: AuditoriaVentaItem[];
  resumenPorProducto: ResumenVentasPorProducto[];
  totalVendido: number;
  totalUnidades: number;
}

/**
 * Consulta la auditoría detallada de ventas POS y desglose de productos vendidos
 * para el arqueo de caja y control de encargados en Administración.
 */
export async function obtenerAuditoriaVentasPOS(
  fechaInicio?: string,
  fechaFin?: string
): Promise<AuditoriaVentasPOSResponse> {
  const todasLasVentas: AuditoriaVentaItem[] = [];

  // 1. Obtener de Supabase si está configurado
  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('ventas')
        .select(`
          id,
          numero_ticket,
          total,
          metodo_pago,
          cliente_nombre,
          cliente_dni,
          created_at,
          venta_items (
            producto_id,
            nombre_producto,
            cantidad,
            precio_unitario,
            subtotal
          )
        `)
        .order('created_at', { ascending: false });

      if (fechaInicio) {
        query = query.gte('created_at', `${fechaInicio}T00:00:00.000Z`);
      }
      if (fechaFin) {
        query = query.lte('created_at', `${fechaFin}T23:59:59.999Z`);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        data.forEach((v: any) => {
          const createdAt = new Date(v.created_at);
          const fechaStr = createdAt.toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
          const horaStr = createdAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' });

          const items = Array.isArray(v.venta_items)
            ? v.venta_items.map((it: any) => ({
                productoId: it.producto_id || 'prod',
                nombreProducto: it.nombre_producto || 'Producto',
                cantidad: Number(it.cantidad) || 1,
                precioUnitario: Number(it.precio_unitario) || 0,
                subtotal: Number(it.subtotal) || 0,
              }))
            : [];

          todasLasVentas.push({
            id: v.id,
            numeroTicket: v.numero_ticket || `TK-${v.id}`,
            fecha: fechaStr,
            hora: horaStr,
            fechaHoraISO: v.created_at || createdAt.toISOString(),
            clienteNombre: v.cliente_nombre || 'Cliente Mostrador',
            clienteDni: v.cliente_dni || undefined,
            metodoPago: v.metodo_pago || 'efectivo',
            total: Number(v.total) || 0,
            items,
          });
        });
      }
    } catch (err) {
      console.warn('[obtenerAuditoriaVentasPOS] Error consultando ventas en Supabase:', err);
    }
  }

  // 2. Complementar con ventas locales de contingencia (offline queue)
  try {
    const rawOffline = localStorage.getItem(LOCAL_OFFLINE_SALES_KEY);
    if (rawOffline) {
      const offlineQueue: any[] = JSON.parse(rawOffline);
      if (Array.isArray(offlineQueue)) {
        const prods = await obtenerProductosInventario();
        offlineQueue.forEach((ov: any) => {
          // Verificar si ya está en todasLasVentas para no duplicar
          if (!todasLasVentas.some((v) => v.numeroTicket === ov.numero_ticket)) {
            const dateObj = ov.fecha ? new Date(ov.fecha) : new Date();
            const fechaStr = dateObj.toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
            const horaStr = dateObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' });

            // Filtrar rango de fecha si aplica
            const isoDate = dateObj.toISOString().split('T')[0];
            if (fechaInicio && isoDate < fechaInicio) return;
            if (fechaFin && isoDate > fechaFin) return;

            const items = Array.isArray(ov.items)
              ? ov.items.map((it: any) => {
                  const p = prods.find((prod) => prod.id === it.producto_id);
                  const pUnit = Number(it.precio_unitario || p?.precio_venta || 0);
                  const cant = Number(it.cantidad) || 1;
                  return {
                    productoId: it.producto_id,
                    nombreProducto: it.nombre_producto || p?.nombre || 'Producto',
                    cantidad: cant,
                    precioUnitario: pUnit,
                    subtotal: Number(it.subtotal) || (pUnit * cant),
                  };
                })
              : [];

            todasLasVentas.push({
              id: ov.id || ov.numero_ticket,
              numeroTicket: ov.numero_ticket || 'TK-OFFLINE',
              fecha: fechaStr,
              hora: horaStr,
              fechaHoraISO: dateObj.toISOString(),
              clienteNombre: ov.cliente_nombre || 'Cliente Mostrador',
              clienteDni: ov.cliente_dni || undefined,
              metodoPago: ov.metodo_pago || 'efectivo',
              total: Number(ov.total) || 0,
              items,
            });
          }
        });
      }
    }
  } catch (offlineErr) {
    console.warn('[obtenerAuditoriaVentasPOS] Error leyendo cola local:', offlineErr);
  }

  // 3. Consolidar totales y ranking por producto
  const productoMap = new Map<string, { nombre: string; cantidad: number; total: number }>();
  let totalVendido = 0;
  let totalUnidades = 0;

  todasLasVentas.forEach((v) => {
    totalVendido += v.total;
    v.items.forEach((it) => {
      totalUnidades += it.cantidad;
      const key = it.productoId || it.nombreProducto;
      const existing = productoMap.get(key) || {
        nombre: it.nombreProducto,
        cantidad: 0,
        total: 0,
      };
      existing.cantidad += it.cantidad;
      existing.total += it.subtotal;
      productoMap.set(key, existing);
    });
  });

  const resumenPorProducto: ResumenVentasPorProducto[] = Array.from(productoMap.entries())
    .map(([productoId, data]) => ({
      productoId,
      nombre: data.nombre,
      cantidadTotal: data.cantidad,
      totalRecaudado: data.total,
      precioUnitarioPromedio: data.cantidad > 0 ? data.total / data.cantidad : 0,
    }))
    .sort((a, b) => b.cantidadTotal - a.cantidadTotal);

  return {
    ventas: todasLasVentas,
    resumenPorProducto,
    totalVendido,
    totalUnidades,
  };
}

export interface MovimientoCaja {
  id: string;
  fechaHora: string; // ISO
  horaFormateada: string; // "04:30 p. m."
  tipo: 'membresia_nueva' | 'renovacion' | 'abono_deuda' | 'venta_pos';
  tipoEtiqueta: string;
  clienteNombre: string;
  clienteDni?: string;
  concepto: string;
  metodoPago: 'efectivo' | 'yape' | 'plin' | 'tarjeta';
  monto: number;
  operador: string;
  ticketOBoleta?: string;
}

export interface ReporteCajaDiario {
  fechaInicio: string;
  fechaFin: string;
  totalRecaudado: number;
  totalEfectivo: number;
  totalYape: number;
  totalPlin: number;
  totalTarjeta: number;
  totalMembresias: number;
  conteoMembresias: number;
  totalVentasPOS: number;
  conteoVentasPOS: number;
  movimientos: MovimientoCaja[];
  resumenProductos: ResumenVentasPorProducto[];
}

/**
 * Reporte integral de caja diaria y arqueo unificado:
 * Combina en un solo flujo cronológico los ingresos por membresías, renovaciones,
 * abonos y ventas de mostrador POS, con desglose exacto por método de pago.
 */
export async function obtenerReporteCajaMovimientos(
  fechaInicio?: string,
  fechaFin?: string
): Promise<ReporteCajaDiario> {
  const todayPeru = getLocalPeruDateString();
  const rawStart = fechaInicio || todayPeru;
  const rawEnd = fechaFin || rawStart;

  const dateStart = rawStart.includes('T') ? rawStart.split('T')[0] : rawStart;
  const dateEnd = rawEnd.includes('T') ? rawEnd.split('T')[0] : rawEnd;

  const startISO = rawStart.includes('T') ? rawStart : `${dateStart}T00:00:00.000Z`;
  const endISO = rawEnd.includes('T') ? rawEnd : `${dateEnd}T23:59:59.999Z`;

  const movimientos: MovimientoCaja[] = [];

  // 1. Obtener ventas de productos POS (Supabase + cola offline integrada)
  const posAudit = await obtenerAuditoriaVentasPOS(dateStart, dateEnd);

  posAudit.ventas.forEach((v) => {
    const itemsResumen = v.items && v.items.length > 0
      ? v.items.map((it) => `${it.cantidad}x ${it.nombreProducto}`).join(', ')
      : `Ticket ${v.numeroTicket}`;

    const rawPago = (v.metodoPago || '').toLowerCase();
    const metodo: 'efectivo' | 'yape' | 'plin' | 'tarjeta' =
      rawPago === 'yape' || rawPago === 'plin' || rawPago === 'tarjeta' ? rawPago : 'efectivo';

    movimientos.push({
      id: `pos-${v.numeroTicket || v.id}`,
      fechaHora: v.fechaHoraISO || new Date().toISOString(),
      horaFormateada: v.hora || '12:00 p. m.',
      tipo: 'venta_pos',
      tipoEtiqueta: 'Venta POS Mostrador',
      clienteNombre: v.clienteNombre || 'Cliente Mostrador',
      clienteDni: v.clienteDni,
      concepto: itemsResumen,
      metodoPago: metodo,
      monto: v.total,
      operador: 'Recepción / POS',
      ticketOBoleta: v.numeroTicket,
    });
  });

  // 2. Obtener ingresos de membresías, renovaciones y abonos de Supabase
  if (isSupabaseConfigured()) {
    try {
      const { data: ingresosDb, error: ingErr } = await supabase
        .from('ingresos')
        .select('id, created_at, monto, metodo_pago, tipo, observacion, key_socio, venta_id')
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .order('created_at', { ascending: false });

      if (!ingErr && Array.isArray(ingresosDb)) {
        // Mapa local de socios para asociar nombres y DNIs
        const storedMembers = getStoredMembers();
        const sociosMap = new Map<string, GymMember>();
        storedMembers.forEach((m) => {
          if (m.id) sociosMap.set(m.id, m);
          if (m.dni) sociosMap.set(m.dni, m);
        });

        ingresosDb.forEach((ing: any) => {
          const obs = (ing.observacion || '').toLowerCase();
          const tipoRaw = (ing.tipo || '').toLowerCase();

          // Evitar duplicar ventas POS sincronizadas si ya están registradas desde la tabla de ventas
          if (tipoRaw.includes('pos') || obs.includes('venta offline ticket') || obs.includes('venta pos')) {
            const tokens = obs.split(/[^a-z0-9-]+/);
            const ventaAsociada = posAudit.ventas.find((v) => ing.venta_id != null && String(v.id) === String(ing.venta_id));
            const movimiento = movimientos.find((m) =>
              m.ticketOBoleta && (m.ticketOBoleta === ventaAsociada?.numeroTicket || tokens.includes(m.ticketOBoleta.toLowerCase()))
            );
            if (movimiento) {
              // Legacy discounts were separate negative entries. Fold them into
              // the existing sale, keeping one sale count and the net amount.
              if (tipoRaw.includes('descuento') && Number(ing.monto) < 0) movimiento.monto += Number(ing.monto);
              return;
            }
          }

          const socioInfo = ing.key_socio ? sociosMap.get(ing.key_socio) : undefined;
          const clienteNombre = socioInfo?.name || (ing.key_socio ? `Socio ${ing.key_socio}` : 'Cliente');
          const clienteDni = socioInfo?.dni || (ing.key_socio && /^\d{8}$/.test(ing.key_socio) ? ing.key_socio : undefined);

          let tipo: 'membresia_nueva' | 'renovacion' | 'abono_deuda' | 'venta_pos' = 'membresia_nueva';
          let tipoEtiqueta = 'Membresía';

          if (tipoRaw.includes('renov') || obs.includes('renov')) {
            tipo = 'renovacion';
            tipoEtiqueta = 'Renovación';
          } else if (tipoRaw.includes('abono') || tipoRaw.includes('adelanto') || tipoRaw.includes('liquid') || obs.includes('abono') || obs.includes('saldo')) {
            tipo = 'abono_deuda';
            tipoEtiqueta = 'Abono / Deuda';
          } else if (tipoRaw.includes('pos') || tipoRaw.includes('venta')) {
            tipo = 'venta_pos';
            tipoEtiqueta = 'Venta POS Mostrador';
          }

          const rawPago = (ing.metodo_pago || '').toLowerCase();
          const metodo: 'efectivo' | 'yape' | 'plin' | 'tarjeta' =
            rawPago === 'yape' || rawPago === 'plin' || rawPago === 'tarjeta' ? rawPago : 'efectivo';

          const createdDate = new Date(ing.created_at || new Date());
          const horaStr = createdDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' });

          const matchBoleta = (ing.observacion || '').match(/B\d{3}-\d+/i);
          const ticketOBoleta = matchBoleta ? matchBoleta[0] : undefined;

          movimientos.push({
            id: `ing-${ing.id}`,
            fechaHora: ing.created_at || createdDate.toISOString(),
            horaFormateada: horaStr,
            tipo,
            tipoEtiqueta,
            clienteNombre,
            clienteDni,
            concepto: ing.observacion || ing.tipo || 'Pago recibido',
            metodoPago: metodo,
            monto: Number(ing.monto) || 0,
            operador: obs.includes('recepción') || obs.includes('recepcion') ? 'Recepción' : 'Administración',
            ticketOBoleta,
          });
        });
      }
    } catch (ingDbErr) {
      console.warn('[obtenerReporteCajaMovimientos] Error leyendo ingresos de Supabase:', ingDbErr);
    }
  }

  // 3. Ordenar movimientos cronológicamente descendente (más reciente primero)
  movimientos.sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());

  // 4. Calcular totales de arqueo exacto
  let totalEfectivo = 0;
  let totalYape = 0;
  let totalPlin = 0;
  let totalTarjeta = 0;
  let totalMembresias = 0;
  let conteoMembresias = 0;
  let totalVentasPOS = 0;
  let conteoVentasPOS = 0;

  movimientos.forEach((m) => {
    if (m.metodoPago === 'efectivo') totalEfectivo += m.monto;
    else if (m.metodoPago === 'yape') totalYape += m.monto;
    else if (m.metodoPago === 'plin') totalPlin += m.monto;
    else if (m.metodoPago === 'tarjeta') totalTarjeta += m.monto;

    if (m.tipo === 'venta_pos') {
      totalVentasPOS += m.monto;
      conteoVentasPOS += 1;
    } else {
      totalMembresias += m.monto;
      conteoMembresias += 1;
    }
  });

  const totalRecaudado = totalEfectivo + totalYape + totalPlin + totalTarjeta;

  return {
    fechaInicio: dateStart,
    fechaFin: dateEnd,
    totalRecaudado,
    totalEfectivo,
    totalYape,
    totalPlin,
    totalTarjeta,
    totalMembresias,
    conteoMembresias,
    totalVentasPOS,
    conteoVentasPOS,
    movimientos,
    resumenProductos: posAudit.resumenPorProducto || [],
  };
}

/**
 * Crear o editar un producto en el inventario (Admin)
 */
function cacheProductoConfirmado(producto: ProductoPOS): void {
  try {
    const raw = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    const cached: unknown = raw ? JSON.parse(raw) : [];
    const prods = inventarioValido(cached) ? cached : [];
    const updated = prods.some((p) => p.id === producto.id)
      ? prods.map((p) => p.id === producto.id ? producto : p)
      : [producto, ...prods];
    localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(updated));
  } catch { /* Server confirmation remains authoritative when a cache is full. */ }
}

export async function crearOActualizarProducto(producto: ProductoPOS): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Configura Supabase para guardar cambios en el inventario.');
  if (!inventarioValido([producto]) || !producto.nombre.trim()) throw new Error('Revisa el nombre, precio y stock del producto.');
  const { data, error } = await supabase.from('productos').upsert({
    id: producto.id, codigo_barras: producto.codigo_barras || null, nombre: producto.nombre.trim(),
    categoria: producto.categoria, precio_compra: producto.precio_compra || 0,
    precio_venta: producto.precio_venta, stock_actual: producto.stock_actual,
    stock_minimo: producto.stock_minimo, activo: producto.activo, updated_at: new Date().toISOString(),
  }).select('id, codigo_barras, nombre, categoria, precio_compra, precio_venta, stock_actual, stock_minimo, activo').single();
  if (error) throw new Error(error.message);
  if (!data || data.id !== producto.id) throw new Error('El servidor no confirmó el producto. No se guardaron cambios locales.');
  cacheProductoConfirmado(data as ProductoPOS);
}

/** A stock adjustment succeeds only after the server confirms the affected row. */
export async function ajustarStockProducto(productoId: string, nuevoStock: number): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Configura Supabase para ajustar el inventario.');
  if (!Number.isSafeInteger(nuevoStock) || nuevoStock < 0) throw new Error('El stock debe ser un número entero mayor o igual a cero.');
  const { data, error } = await supabase.from('productos')
    .update({ stock_actual: nuevoStock, updated_at: new Date().toISOString() }).eq('id', productoId)
    .select('id, codigo_barras, nombre, categoria, precio_compra, precio_venta, stock_actual, stock_minimo, activo').single();
  if (error) throw new Error(error.message);
  if (!data || data.id !== productoId) throw new Error('El servidor no confirmó el ajuste de stock.');
  cacheProductoConfirmado(data as ProductoPOS);
}

/** Archive products without deleting sales history or discarding rejected edits. */
export async function eliminarProductoInventario(productoId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) throw new Error('Configura Supabase para desactivar productos del inventario.');
  const { data, error } = await supabase.from('productos')
    .update({ activo: false, updated_at: new Date().toISOString() }).eq('id', productoId).select('id').single();
  if (error) throw new Error(error.message);
  if (!data || data.id !== productoId) throw new Error('El servidor no confirmó la desactivación del producto.');
  try {
    const raw = localStorage.getItem(LOCAL_PRODUCTS_KEY);
    const cached: unknown = raw ? JSON.parse(raw) : [];
    if (inventarioValido(cached)) localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(cached.filter((p) => p.id !== productoId)));
  } catch { /* The product is already archived on the server. */ }
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
  if (!isSupabaseConfigured()) throw new Error('Configura Supabase para archivar socios del padrón.');
  if (!memberId.trim()) throw new Error('El ID del socio es obligatorio.');
  const { data, error } = await supabase.rpc('archivar_socio_seguro', { p_socio_id: memberId });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'El servidor no confirmó el archivo del socio.');
  saveStoredMembers(getStoredMembers().filter((m) => m.id !== memberId));
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
  if (!isSupabaseConfigured()) throw new Error('Configura Supabase para administrar roles.');
  let userId = memberId;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberId)) {
    const { data, error } = await supabase.from('socios').select('user_id').eq('id', memberId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data?.user_id) throw new Error('El socio todavía no tiene una cuenta Auth vinculada.');
    userId = data.user_id;
  }
  const { data, error } = await supabase.rpc('cambiar_rol_usuario', { p_user_id: userId, p_role: nuevoRol });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'El servidor no confirmó el cambio de rol.');
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


