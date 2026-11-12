import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAlertVolume,
  setAlertVolume,
  isAlertMuted,
  setAlertMuted,
  playGymAlert,
  GymAlertType,
} from '../../lib/audioVoiceAlerts';
import { playAttendanceTone } from '../../hooks/useMemberAttendance';
import { buscarProductoPorCodigo, ProductoPOS } from '../../lib/supabaseDb';

describe('Pruebas Unitarias · Reglas de Escáner de Código de Barras y Sistema de Alertas Sonoras', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Reglas de Clasificación de Códigos de Barras (DNI vs Producto)', () => {
    // REGLA 1: Exactamente 8 caracteres numéricos -> ES UN DNI
    const esDni = (code: string) => /^\d{8}$/.test(code.trim());

    // REGLA 2: Exactamente 12 o 13 caracteres numéricos -> ES UN PRODUCTO
    const esProducto = (code: string) => /^(\d{12}|\d{13})$/.test(code.trim());

    it('debe identificar códigos de 8 caracteres numéricos estrictamente como DNI de socio', () => {
      expect(esDni('46410051')).toBe(true);
      expect(esDni('00112233')).toBe(true);
      expect(esDni('70809010')).toBe(true);

      // No debe clasificar como producto
      expect(esProducto('46410051')).toBe(false);

      // Casos inválidos para DNI de 8 dígitos
      expect(esDni('4641005')).toBe(false); // 7 dígitos
      expect(esDni('464100519')).toBe(false); // 9 dígitos
      expect(esDni('4641005A')).toBe(false); // Alfanumérico
      expect(esDni(' 46410051 ')).toBe(true); // Con espacios recortables
    });

    it('debe identificar códigos de 12 o 13 caracteres numéricos estrictamente como Productos (UPC/EAN)', () => {
      // 13 dígitos (EAN-13 estándar de bebidas, ej. San Mateo, Sporade)
      expect(esProducto('7750106001017')).toBe(true);
      expect(esProducto('7750106001024')).toBe(true);
      expect(esProducto('9002490100070')).toBe(true);

      // 12 dígitos (UPC-A estándar, ej. Monster Energy Ultra, Quest Bar)
      expect(esProducto('070847811169')).toBe(true);
      expect(esProducto('888849000102')).toBe(true);

      // No debe clasificar como DNI
      expect(esDni('7750106001017')).toBe(false);
      expect(esDni('070847811169')).toBe(false);

      // Casos inválidos para producto
      expect(esProducto('12345678901')).toBe(false); // 11 dígitos
      expect(esProducto('12345678901234')).toBe(false); // 14 dígitos
      expect(esProducto('775010600101A')).toBe(false); // Alfanumérico
    });
  });

  describe('Control de Volumen y Silenciado Persistente', () => {
    it('debe retornar el volumen por defecto de 80% (0.8) si no hay configuración previa', () => {
      expect(getAlertVolume()).toBe(0.8);
      expect(isAlertMuted()).toBe(false);
    });

    it('debe permitir cambiar y persistir el nivel de volumen entre 0.0 y 1.0', () => {
      setAlertVolume(0.45);
      expect(getAlertVolume()).toBe(0.45);

      setAlertVolume(1.0);
      expect(getAlertVolume()).toBe(1.0);

      // Clamping automático de valores fuera de rango
      setAlertVolume(1.5);
      expect(getAlertVolume()).toBe(1.0);

      setAlertVolume(-0.2);
      expect(getAlertVolume()).toBe(0.0);
    });

    it('debe permitir silenciar y reactivar las alertas acústicas', () => {
      expect(isAlertMuted()).toBe(false);

      setAlertMuted(true);
      expect(isAlertMuted()).toBe(true);

      setAlertMuted(false);
      expect(isAlertMuted()).toBe(false);
    });
  });

  describe('Generador Acústico de Alertas (Saludable, Por vencer, Vencida, POS)', () => {
    it('debe admitir y ejecutar los tipos oficiales de alerta sin arrojar excepciones', () => {
      const tipos: GymAlertType[] = [
        'saludable',
        'por_vencer',
        'vencida',
        'producto_pos',
        'producto_no_encontrado',
        'rebote',
        'error',
      ];

      for (const tipo of tipos) {
        expect(() => playGymAlert(tipo)).not.toThrow();
      }
    });

    it('playAttendanceTone debe mapear correctamente los estados de asistencia a alertas sonoras', () => {
      expect(() => playAttendanceTone('saludable')).not.toThrow();
      expect(() => playAttendanceTone('por_vencer')).not.toThrow();
      expect(() => playAttendanceTone('vencida')).not.toThrow();
      expect(() => playAttendanceTone('ok')).not.toThrow();
      expect(() => playAttendanceTone('alerta')).not.toThrow();
      expect(() => playAttendanceTone('error')).not.toThrow();
    });
  });

  describe('buscarProductoPorCodigo · Reconocimiento EAN-13, Sporade y Pistola Láser', () => {
    const mockCatalogo: ProductoPOS[] = [
      {
        id: 'PROD-1310',
        nombre: 'SPORADE',
        categoria: 'Bebidas',
        precio_venta: 3.5,
        stock_actual: 24,
        stock_minimo: 5,
        activo: true,
        codigo_barras: '7750670010238, 7750670010245, 7750670010252, 7750670015370',
      },
      {
        id: 'PROD-4910',
        nombre: 'VOLT',
        categoria: 'Energizantes',
        precio_venta: 3.0,
        stock_actual: 30,
        stock_minimo: 6,
        activo: true,
        codigo_barras: '7750670021708',
      },
      {
        id: 'PROD-9340',
        nombre: 'AGUA MINERAL',
        categoria: 'Bebidas',
        precio_venta: 2.0,
        stock_actual: 40,
        stock_minimo: 10,
        activo: true,
        codigo_barras: '7750670000307, 7750106001017',
      },
    ];

    it('debe encontrar Sporade con el código de barras EAN-13 físico oficial 7750670010238', () => {
      const match = buscarProductoPorCodigo(mockCatalogo, '7750670010238');
      expect(match).toBeDefined();
      expect(match?.id).toBe('PROD-1310');
      expect(match?.nombre).toBe('SPORADE');
    });

    it('debe limpiar prefijos de pistolas 2D (ej: ]E07750670010238) y encontrar Sporade', () => {
      const match = buscarProductoPorCodigo(mockCatalogo, ']E07750670010238');
      expect(match).toBeDefined();
      expect(match?.id).toBe('PROD-1310');
    });

    it('debe reconocer Sporade mediante prefijo GS1 AJE Perú 775067001 incluso si es un sabor nuevo no registrado', () => {
      // 7750670019999 empieza con 775067001
      const match = buscarProductoPorCodigo(mockCatalogo, '7750670019999');
      expect(match).toBeDefined();
      expect(match?.id).toBe('PROD-1310');
    });

    it('debe reconocer Volt y Agua por sus códigos EAN y marcas', () => {
      const matchVolt = buscarProductoPorCodigo(mockCatalogo, '7750670021708');
      expect(matchVolt?.nombre).toBe('VOLT');

      const matchAgua = buscarProductoPorCodigo(mockCatalogo, '7750670000307');
      expect(matchAgua?.nombre).toBe('AGUA MINERAL');
    });

    it('debe soportar búsqueda directa por SKU (ej: PROD-1310)', () => {
      const match = buscarProductoPorCodigo(mockCatalogo, 'PROD-1310');
      expect(match?.nombre).toBe('SPORADE');
    });

    it('debe retornar undefined para códigos inexistentes sin lanzar error', () => {
      const match = buscarProductoPorCodigo(mockCatalogo, '1234567890123');
      expect(match).toBeUndefined();
    });
  });
});
