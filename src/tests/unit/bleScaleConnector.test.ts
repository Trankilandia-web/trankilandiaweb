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

  it('decodificarTramaPeso debe interpretar protocolo Fitdays G78 (Envelope A2) en medición activa (97.40 kg)', () => {
    // Trama Envelope Fitdays A2:
    // [SEQ=0x01, LEN_HI=0x00, LEN_LO=0x07, PART=0x00, TYPE=0xA2, STATUS=0x01 (inestable), 0x00, W_HI=0x01, W_MID=0x7C, W_LO=0x78, 0x00, 0x1A]
    // Gramos: (0x01 << 16) | (0x7C << 8) | 0x78 = 97400 g -> 97.40 kg
    const buffer = new Uint8Array([
      0x01, 0x00, 0x07, 0x00, 0xA2, 0x01, 0x00, 0x01, 0x7C, 0x78, 0x00, 0x1A,
    ]).buffer;
    const dataView = new DataView(buffer);

    const res = decodificarTramaPeso(dataView);
    expect(res.pesoKg).toBe(97.4);
    expect(res.esEstable).toBe(false);
  });

  it('decodificarTramaPeso debe identificar peso estabilizado en protocolo Fitdays G78 (STATUS=0x02)', () => {
    // STATUS=0x02 indica estabilizado/bloqueado
    const buffer = new Uint8Array([
      0x01, 0x00, 0x07, 0x00, 0xA2, 0x02, 0x00, 0x01, 0x7C, 0x78, 0x00, 0x1A,
    ]).buffer;
    const dataView = new DataView(buffer);

    const res = decodificarTramaPeso(dataView);
    expect(res.pesoKg).toBe(97.4);
    expect(res.esEstable).toBe(true);
  });

  it('decodificarTramaPeso debe filtrar ruidos o tara inferiores a 15 kg (evitando 0.07 kg)', () => {
    // 70 gramos = 0.07 kg
    const buffer = new Uint8Array([
      0x01, 0x00, 0x07, 0x00, 0xA2, 0x01, 0x00, 0x00, 0x00, 0x46, 0x00, 0x1A,
    ]).buffer;
    const dataView = new DataView(buffer);

    const res = decodificarTramaPeso(dataView);
    expect(res.pesoKg).toBe(0);
    expect(res.esEstable).toBe(false);
  });

  it('decodificarTramaPeso debe interpretar variante Sroemer (95.55 kg)', () => {
    // [0xA2, 0x07, 0x00, 0xA2, 0x02, 0x00, 0x69, 0x75, 0x3E, 0x00, 0x00]
    // 0x69753E & 0x3FFFF = 95550 g -> 95.55 kg
    const buffer = new Uint8Array([
      0xA2, 0x07, 0x00, 0xA2, 0x02, 0x00, 0x69, 0x75, 0x3E, 0x00, 0x00,
    ]).buffer;
    const dataView = new DataView(buffer);

    const res = decodificarTramaPeso(dataView);
    expect(res.pesoKg).toBe(95.55);
    expect(res.esEstable).toBe(true);
  });

  it('decodificarTramaImpedancia debe interpretar trama segmental A7 de 40 bytes', () => {
    // Trama A7 de 40 bytes:
    const bytes = new Uint8Array(40);
    bytes[4] = 0xA7; // Type A7
    // Torso 42.0 ohms (420 en x10)
    bytes[15] = 0x01;
    bytes[16] = 0xA4;
    // Brazo izq 52.0 ohms (520 en x10)
    bytes[17] = 0x02;
    bytes[18] = 0x08;
    // Brazo der 52.0 ohms
    bytes[19] = 0x02;
    bytes[20] = 0x08;
    // Pierna izq 48.0 ohms (480 en x10)
    bytes[21] = 0x01;
    bytes[22] = 0xE0;
    // Pierna der 48.0 ohms
    bytes[23] = 0x01;
    bytes[24] = 0xE0;

    const res = decodificarTramaImpedancia(new DataView(bytes.buffer));
    expect(res.impedanciaTorso).toBe(42.0);
    expect(res.impedanciaManos).toBe(52.0);
    expect(res.impedanciaPies).toBe(48.0);
  });
});
