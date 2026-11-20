import { describe, it, expect } from 'vitest';
import {
  isWebBluetoothAvailable,
  decodificarTramaPeso,
  decodificarTramaImpedancia,
  FITDAYS_SERVICES,
} from '../../lib/bleScaleConnector';

describe('Conector Web Bluetooth y Decodificador BLE Balanza EUROMAR G78-BT', () => {
  it('isWebBluetoothAvailable debe retornar boolean y no lanzar error si navigator no tiene bluetooth', () => {
    const disponible = isWebBluetoothAvailable();
    expect(typeof disponible).toBe('boolean');
  });

  it('FITDAYS_SERVICES debe definir los UUIDs de GATT para servicio 0xFFB0', () => {
    expect(FITDAYS_SERVICES.SERVICE_MAIN).toContain('ffb0');
    expect(FITDAYS_SERVICES.CHAR_WEIGHT_LIVE).toContain('ffb2');
    expect(FITDAYS_SERVICES.CHAR_IMPEDANCE).toContain('ffb3');
  });

  it('decodificarTramaPeso debe interpretar peso en medición activa (0xCE)', () => {
    // Trama de prueba: 8 bytes
    // [0xCE, 0x1D, 0x4C, 0x00, 0x00, 0x00, 0x00, 0x39]
    // 0x1D4C = 7500 en decimal -> 75.00 kg
    const buffer = new Uint8Array([0xCE, 0x1D, 0x4C, 0x00, 0x00, 0x00, 0x00, 0x39]).buffer;
    const dataView = new DataView(buffer);

    const res = decodificarTramaPeso(dataView);
    expect(res.pesoKg).toBe(75.0);
    expect(res.esEstable).toBe(false);
  });

  it('decodificarTramaPeso debe identificar peso bloqueado/estable (0xCA)', () => {
    // [0xCA, 0x1E, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00]
    // 0x1E14 = 7700 decimal -> 77.00 kg
    const buffer = new Uint8Array([0xCA, 0x1E, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00]).buffer;
    const dataView = new DataView(buffer);

    const res = decodificarTramaPeso(dataView);
    expect(res.pesoKg).toBe(77.0);
    expect(res.esEstable).toBe(true);
  });

  it('decodificarTramaImpedancia debe extraer los ohmios de las 8 derivaciones', () => {
    // Trama segmental de 16 bytes:
    // [0xCF, 0x00, 0x01, 0xF4, 0x02, 0x26, 0x01, 0x90, ...]
    // Pies: 0x01F4 = 500 ohms, Manos: 0x0226 = 550 ohms, Torso: 0x0190 = 400 ohms
    const buffer = new Uint8Array([
      0xCF, 0x00, 0x01, 0xF4, 0x02, 0x26, 0x01, 0x90,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]).buffer;
    const dataView = new DataView(buffer);

    const res = decodificarTramaImpedancia(dataView);
    expect(res.impedanciaPies).toBe(500);
    expect(res.impedanciaManos).toBe(550);
    expect(res.impedanciaTorso).toBe(400);
  });
});
