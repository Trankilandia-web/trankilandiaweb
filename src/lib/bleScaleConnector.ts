/**
 * ==============================================================================
 * TRANKILANDIA GYM · CONECTOR WEB BLUETOOTH & DECODIFICADOR BLE (G78-BT / LEFU)
 * ==============================================================================
 * Conecta directamente desde el navegador de un teléfono Android (o Bluefy en iOS)
 * a la balanza inteligente EUROMAR® G78-BT utilizando la API estándar Web Bluetooth.
 * ==============================================================================
 */

export const FITDAYS_SERVICES = {
  // Servicio primario estándar de básculas Fitdays / Lefu
  SERVICE_MAIN: '0000ffb0-0000-1000-8000-00805f9b34fb',
  SERVICE_ALT: '0000fff0-0000-1000-8000-00805f9b34fb',
  SERVICE_WEIGHT_SCALE: '0000181d-0000-1000-8000-00805f9b34fb',
  SERVICE_BODY_COMPOSITION: '0000181b-0000-1000-8000-00805f9b34fb',
  // Característica para comandos de inicialización y protocolo handshake
  CHAR_COMMAND: '0000ffb1-0000-1000-8000-00805f9b34fb',
  // Característica de flujo continuo de peso en vivo (Notify)
  CHAR_WEIGHT_LIVE: '0000ffb2-0000-1000-8000-00805f9b34fb',
  // Característica de resultados de bioimpedancia segmental (Indicate)
  CHAR_IMPEDANCE: '0000ffb3-0000-1000-8000-00805f9b34fb',
};

export interface BleWeightResult {
  pesoKg: number;
  esEstable: boolean;
}

export interface BleImpedanceResult {
  impedanciaPies: number;
  impedanciaManos: number;
  impedanciaTorso: number;
  grasaCorporalPct?: number;
  masaMuscularKg?: number;
}

export interface BleScaleCallbacks {
  onStatusChange?: (estado: 'desconectado' | 'buscando' | 'conectado' | 'pesando' | 'bloqueado' | 'completado' | 'error', mensaje?: string) => void;
  onLiveWeight?: (pesoKg: number, esEstable: boolean) => void;
  onImpedanceData?: (impedancia: BleImpedanceResult) => void;
  onError?: (err: Error) => void;
}

export interface ScaleConnectionHandle {
  disconnect: () => void;
  isConnected: () => boolean;
}

/**
 * Detecta si el navegador actual cuenta con soporte de Web Bluetooth (Chrome en Android, etc.)
 */
export function isWebBluetoothAvailable(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as any;
  return Boolean(nav.bluetooth && typeof nav.bluetooth.requestDevice === 'function');
}

/**
 * Decodifica la trama de peso en vivo emitida por la característica FFB2
 * Soporta de forma nativa:
 * 1. Protocolo Fitdays / Lefu 8 electrodos (Trama Envelope A2: gramos en 24 bits BE)
 * 2. Protocolo Sroemer / Crenot / Fitdays (Bytes 0 y 3 son 0xA2, 18 bits en bytes 6-8)
 * 3. Protocolo Clásico Lefu / Senssun (Headers 0xCF, 0xCA, 0xCE, 0xCB)
 * 4. Filtro estricto de tara y ruido (<15 kg es ignorado para evitar falsos positivos)
 */
export function decodificarTramaPeso(dataView: DataView): BleWeightResult {
  const len = dataView.byteLength;
  if (len < 3) {
    return { pesoKg: 0, esEstable: false };
  }

  const b0 = dataView.getUint8(0);

  let rawPesoGramos: number | null = null;
  let esEstable = false;

  // --------------------------------------------------------------------------
  // PATRÓN 1: Protocolo Fitdays / Lefu G78 Oficial con sobre de trama (Envelope)
  // Formato: [SEQ] [LEN_HI=00] [LEN_LO=07] [PART=00] [TYPE=A2] [STATUS] [00] [W_HI] [W_MID] [W_LO] ...
  // Total 12 bytes o más. Type 0xA2 indica flujo de peso en vivo.
  // --------------------------------------------------------------------------
  if (len >= 10 && dataView.getUint8(4) === 0xA2) {
    const status = dataView.getUint8(5);
    // 0x01: pesando/inestable | 0x02..0x08 o 0xCA/0xCF: peso estabilizado/bloqueado o bioimpedancia en curso | 0x00: socio se bajó
    esEstable = (status >= 0x02 && status <= 0x08) || status === 0xCA || status === 0xCF;

    if (status === 0x00) {
      return { pesoKg: 0, esEstable: false };
    }

    const wHi = dataView.getUint8(7);
    const wMid = dataView.getUint8(8);
    const wLo = dataView.getUint8(9);
    rawPesoGramos = (wHi << 16) | (wMid << 8) | wLo;
  }
  // Variante Sroemer / Crenot / Fitdays (Bytes 0 y 3 son 0xA2):
  // [A2] [07] [00] [A2] [STATUS=02] [00] [B6] [B7] [B8] ...
  else if (len >= 9 && b0 === 0xA2 && dataView.getUint8(3) === 0xA2) {
    const status = dataView.getUint8(4);
    esEstable = (status >= 0x02 && status <= 0x08) || status === 0xCA || status === 0xCF;
    const b6 = dataView.getUint8(6);
    const b7 = dataView.getUint8(7);
    const b8 = dataView.getUint8(8);
    rawPesoGramos = ((b6 & 0x03) << 16) | (b7 << 8) | b8;
  }
  // --------------------------------------------------------------------------
  // PATRÓN 2: Protocolo Clásico Lefu / Senssun / Chipsea (8 a 16 bytes)
  // Byte 0: 0xCF / 0xCA (estable) o 0xCE / 0xCB (inestable)
  // Bytes 1 y 2: Peso en Big-Endian (dividido por 100 o por 10)
  // --------------------------------------------------------------------------
  else if (b0 === 0xCA || b0 === 0xCF || b0 === 0xCE || b0 === 0xCB) {
    esEstable = b0 === 0xCA || b0 === 0xCF;
    const pesoRaw = dataView.getUint16(1, false);
    if (pesoRaw >= 2000 && pesoRaw <= 30000) {
      const pesoKg = Number((pesoRaw / 100.0).toFixed(2));
      return { pesoKg: pesoKg >= 15.0 ? pesoKg : 0, esEstable: pesoKg >= 15.0 ? esEstable : false };
    } else if (pesoRaw >= 200 && pesoRaw <= 3000) {
      const pesoKg = Number((pesoRaw / 10.0).toFixed(2));
      return { pesoKg: pesoKg >= 15.0 ? pesoKg : 0, esEstable: pesoKg >= 15.0 ? esEstable : false };
    }
  }

  // Si obtuvimos gramos a través de trama BE u24 (Patrón 1)
  if (rawPesoGramos !== null) {
    const pesoKg = Number((rawPesoGramos / 1000.0).toFixed(2));
    // Filtro estricto de tara y ruido (menos de 15 kg nunca es un socio del gym)
    if (pesoKg < 15.0 || pesoKg > 250.0) {
      return { pesoKg: 0, esEstable: false };
    }
    return { pesoKg, esEstable };
  }

  // --------------------------------------------------------------------------
  // PATRÓN 3: Fallback de escaneo heurístico en la trama (u24 gramos o u16 centésimas)
  // --------------------------------------------------------------------------
  for (let offset = 0; offset <= len - 3; offset++) {
    const candidateGrams =
      (dataView.getUint8(offset) << 16) |
      (dataView.getUint8(offset + 1) << 8) |
      dataView.getUint8(offset + 2);
    const candidateKg = candidateGrams / 1000.0;
    if (candidateKg >= 25.0 && candidateKg <= 220.0) {
      return {
        pesoKg: Number(candidateKg.toFixed(2)),
        esEstable,
      };
    }
  }

  for (let offset = 0; offset <= len - 2; offset++) {
    const candidateCents = dataView.getUint16(offset, false);
    const candidateKg = candidateCents / 100.0;
    if (candidateKg >= 25.0 && candidateKg <= 220.0) {
      return {
        pesoKg: Number(candidateKg.toFixed(2)),
        esEstable,
      };
    }
  }

  return { pesoKg: 0, esEstable: false };
}

/**
 * Decodifica la trama segmental de impedancia de 8 electrodos (FFB3 o FFB2)
 * Soporta tramas A7 (40 bytes con 10 canales en doble frecuencia) y tramas clásicas.
 */
export function decodificarTramaImpedancia(dataView: DataView): BleImpedanceResult {
  const len = dataView.byteLength;
  if (len < 8) {
    return { impedanciaPies: 500, impedanciaManos: 520, impedanciaTorso: 420 };
  }

  // Trama A7 de 40 bytes de Fitdays / Lefu (8 electrodos, doble frecuencia)
  // Bytes 15 a 34 contienen 10 canales de impedancia (ohms x 10)
  if (len >= 35 && dataView.getUint8(4) === 0xA7) {
    const torsoOhms1 = dataView.getUint16(15, false) / 10.0;
    const brazoIzqOhms1 = dataView.getUint16(17, false) / 10.0;
    const brazoDerOhms1 = dataView.getUint16(19, false) / 10.0;
    const piernaIzqOhms1 = dataView.getUint16(21, false) / 10.0;
    const piernaDerOhms1 = dataView.getUint16(23, false) / 10.0;

    const impedanciaPies = (piernaIzqOhms1 + piernaDerOhms1) / 2 || 500;
    const impedanciaManos = (brazoIzqOhms1 + brazoDerOhms1) / 2 || 520;
    const impedanciaTorso = torsoOhms1 || 420;

    return {
      impedanciaPies: impedanciaPies > 20 && impedanciaPies < 1500 ? impedanciaPies : 500,
      impedanciaManos: impedanciaManos > 20 && impedanciaManos < 1500 ? impedanciaManos : 520,
      impedanciaTorso: impedanciaTorso > 10 && impedanciaTorso < 800 ? impedanciaTorso : 420,
    };
  }

  // En el protocolo Lefu / Fitdays clásico:
  const impedanciaPies = dataView.getUint16(2, false);
  const impedanciaManos = dataView.getUint16(4, false);
  const impedanciaTorso = dataView.getUint16(6, false);

  let grasaCorporalPct: number | undefined;
  let masaMuscularKg: number | undefined;

  // Si la balanza envía métricas directas calculadas por su chip en bytes 8-11:
  if (dataView.byteLength >= 10) {
    const rawGrasa = dataView.getUint16(8, false);
    const posGrasa = rawGrasa / 10.0;
    if (posGrasa >= 4 && posGrasa <= 65) {
      grasaCorporalPct = Number(posGrasa.toFixed(1));
    }
  }

  if (dataView.byteLength >= 12) {
    const rawMusculo = dataView.getUint16(10, false);
    const posMusculo = rawMusculo / 10.0;
    if (posMusculo >= 15 && posMusculo <= 120) {
      masaMuscularKg = Number(posMusculo.toFixed(1));
    }
  }

  return {
    impedanciaPies: impedanciaPies > 100 && impedanciaPies < 1500 ? impedanciaPies : 500,
    impedanciaManos: impedanciaManos > 100 && impedanciaManos < 1500 ? impedanciaManos : 520,
    impedanciaTorso: impedanciaTorso > 100 && impedanciaTorso < 1500 ? impedanciaTorso : 420,
    grasaCorporalPct,
    masaMuscularKg,
  };
}

export const STORAGE_KEY_LAST_BLE_ID = 'trankilandia_last_ble_scale_id';
export const STORAGE_KEY_LAST_BLE_NAME = 'trankilandia_last_ble_scale_name';

// Referencia en memoria del dispositivo emparejado durante la sesión de la app
let cachedDevice: any = null;
let activeConnectionHandle: ScaleConnectionHandle | null = null;

/**
 * Retorna el nombre de la balanza guardada/emparejada previamente, si existe
 */
export function getSavedScaleName(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_LAST_BLE_NAME) || (cachedDevice?.name ?? null);
  } catch {
    return null;
  }
}

/**
 * Retorna si la balanza ya se encuentra conectada activamente vía GATT
 */
export function isScaleCurrentlyConnected(): boolean {
  return Boolean(cachedDevice?.gatt?.connected);
}

/**
 * Obtiene el dispositivo actualmente en caché o conectado
 */
export function getCachedScaleDevice(): any {
  return cachedDevice;
}

/**
 * Olvida el dispositivo emparejado para forzar un nuevo escaneo desde cero
 */
export function forgetPairedScale(): void {
  try {
    if (cachedDevice?.gatt?.connected) {
      cachedDevice.gatt.disconnect();
    }
  } catch {}
  cachedDevice = null;
  activeConnectionHandle = null;
  try {
    localStorage.removeItem(STORAGE_KEY_LAST_BLE_ID);
    localStorage.removeItem(STORAGE_KEY_LAST_BLE_NAME);
  } catch {}
}

/**
 * Inicia la conexión Web Bluetooth con la balanza EUROMAR G78-BT
 * Si ya se emparejó previamente, se reconecta automáticamente sin diálogo ni popups.
 */
export async function conectarBalanzaG78(
  callbacks: BleScaleCallbacks,
  options?: { forceNewDevice?: boolean }
): Promise<ScaleConnectionHandle> {
  if (!isWebBluetoothAvailable()) {
    throw new Error('Web Bluetooth no está disponible en este navegador. Utiliza Google Chrome en Android o Bluefy en iPhone.');
  }

  const nav = navigator as any;

  // 1. Si ya tenemos un dispositivo conectado activamente en memoria y no se forzó nuevo dispositivo:
  if (!options?.forceNewDevice && cachedDevice && cachedDevice.gatt?.connected) {
    callbacks.onStatusChange?.('conectado', `Balanza conectada y lista: ${cachedDevice.name || 'EUROMAR G78'}`);
    if (activeConnectionHandle) {
      return activeConnectionHandle;
    }
  }

  callbacks.onStatusChange?.('buscando', 'Conectando con balanza EUROMAR® G78-BT...');

  try {
    let device: any = null;
  const optionalServices = [
    FITDAYS_SERVICES.SERVICE_MAIN,
    FITDAYS_SERVICES.SERVICE_ALT,
    FITDAYS_SERVICES.SERVICE_WEIGHT_SCALE,
    FITDAYS_SERVICES.SERVICE_BODY_COMPOSITION,
  ];

  // 2. Intentar reconexión automática sin cuadro de diálogo nativo si no se solicitó emparejar otro dispositivo
  if (!options?.forceNewDevice) {
    // 2a. Reutilizar cachedDevice si existe en memoria
    if (cachedDevice && cachedDevice.gatt) {
      try {
        callbacks.onStatusChange?.('buscando', `Reconectando a ${cachedDevice.name || 'Balanza guardada'}...`);
        if (!cachedDevice.gatt.connected) {
          await cachedDevice.gatt.connect();
        }
        device = cachedDevice;
      } catch (reconnectErr) {
        console.warn('[BLE] Reconexión en memoria falló, probando getDevices():', reconnectErr);
      }
    }

    // 2b. Intentar con navigator.bluetooth.getDevices() (Chrome 85+ / Edge en Android y PC)
    if (!device && typeof nav.bluetooth.getDevices === 'function') {
      try {
        const permittedDevices = await nav.bluetooth.getDevices();
        if (permittedDevices && permittedDevices.length > 0) {
          const lastId = localStorage.getItem(STORAGE_KEY_LAST_BLE_ID);
          const target = (lastId ? permittedDevices.find((d: any) => d.id === lastId) : null) || permittedDevices[0];
          if (target && target.gatt) {
            callbacks.onStatusChange?.('buscando', `Reconectando a ${target.name || 'Balanza permitida'}...`);
            if (!target.gatt.connected) {
              await target.gatt.connect();
            }
            device = target;
            cachedDevice = target;
          }
        }
      } catch (getDevErr) {
        console.warn('[BLE] getDevices() auto-connect falló:', getDevErr);
      }
    }
  }

  // 3. Si no hay dispositivo previo o se solicitó forzar uno nuevo: mostrar diálogo nativo
  if (!device) {
    try {
      device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices,
      });
    } catch (acceptErr: any) {
      if (
        acceptErr?.name === 'NotFoundError' ||
        acceptErr?.message?.includes('cancelled') ||
        acceptErr?.message?.includes('User cancelled')
      ) {
        throw acceptErr;
      }

      device = await nav.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'EUROMAR' },
          { namePrefix: 'G78' },
          { namePrefix: 'Fitdays' },
          { namePrefix: 'Lefu' },
          { namePrefix: 'Scale' },
          { namePrefix: 'Electronic' },
          { namePrefix: 'QN' },
          { namePrefix: 'Yolanda' },
          { namePrefix: 'ICOMON' },
          { namePrefix: 'SW' },
          { namePrefix: 'BF' },
          { namePrefix: 'SENSSUN' },
          { namePrefix: 'BLE' },
          { namePrefix: 'Body' },
          { namePrefix: 'Balanza' },
          { services: [FITDAYS_SERVICES.SERVICE_MAIN] },
        ],
        optionalServices,
      });
    }
  }

  if (!device || !device.gatt) {
    throw new Error('No se pudo acceder a la interfaz GATT del dispositivo.');
  }

  // Guardar dispositivo emparejado para reconexiones automáticas futuras
  cachedDevice = device;
  try {
    localStorage.setItem(STORAGE_KEY_LAST_BLE_ID, device.id);
    localStorage.setItem(STORAGE_KEY_LAST_BLE_NAME, device.name || 'Balanza EUROMAR G78');
  } catch {}

  callbacks.onStatusChange?.('conectado', `Conectado con ${device.name || 'Balanza Inteligente'}`);

  let server = device.gatt.connected ? device.gatt : await device.gatt.connect();

    // Localizar servicio primario activo
    let service: any;
    for (const sUuid of optionalServices) {
      try {
        service = await server.getPrimaryService(sUuid);
        if (service) break;
      } catch {
        // Continuar buscando siguiente servicio
      }
    }

    if (!service) {
      throw new Error('No se encontró el servicio BLE de la balanza. Verifica que sea el modelo EUROMAR G78.');
    }

    // 1. Handshake / Inicialización (FFB1)
    // Se envían los comandos de sincronización Fitdays (B0 30, B0 31) y Lefu (AC 02)
    try {
      const cmdChar = await service.getCharacteristic(FITDAYS_SERVICES.CHAR_COMMAND);
      if (cmdChar && (cmdChar.properties.write || cmdChar.properties.writeWithoutResponse)) {
        const sendPacket = async (payload: Uint8Array) => {
          if (cmdChar.properties.writeWithoutResponse) {
            await cmdChar.writeValueWithoutResponse(payload);
          } else {
            await cmdChar.writeValue(payload);
          }
        };

        // Handshake Fitdays G78
        await sendPacket(new Uint8Array([0x01, 0x00, 0x01, 0x00, 0xB0, 0x30, 0x20]));
        await sendPacket(new Uint8Array([0x02, 0x00, 0x01, 0x00, 0xB0, 0x31, 0x21]));
        // Handshake Lefu clásico
        await sendPacket(new Uint8Array([0xAC, 0x02, 0x00, 0x00, 0xAE]));
      }
    } catch {
      // Ignorar de forma segura si el firmware no requiere handshake
    }

    // 2. Suscribirse primero a trama segmental de bioimpedancia (FFB3)
    try {
      const impedanceChar = await service.getCharacteristic(FITDAYS_SERVICES.CHAR_IMPEDANCE);
      await impedanceChar.startNotifications();
      impedanceChar.addEventListener('characteristicvaluechanged', (event: any) => {
        const val: DataView = event.target.value;
        const imp = decodificarTramaImpedancia(val);
        callbacks.onImpedanceData?.(imp);
        callbacks.onStatusChange?.('completado', '¡Medición y bioimpedancia completadas!');
      });
    } catch (e: any) {
      console.warn('Nota canal FFB3:', e);
    }

    // 3. Suscribirse a lectura de peso en vivo (FFB2)
    try {
      const weightChar = await service.getCharacteristic(FITDAYS_SERVICES.CHAR_WEIGHT_LIVE);
      await weightChar.startNotifications();
      weightChar.addEventListener('characteristicvaluechanged', (event: any) => {
        const val: DataView = event.target.value;
        const res = decodificarTramaPeso(val);
        callbacks.onLiveWeight?.(res.pesoKg, res.esEstable);
        if (res.esEstable) {
          callbacks.onStatusChange?.('bloqueado', `Peso fijado: ${res.pesoKg} kg`);
          // Si la trama de peso también contiene métricas segmentales
          if (val.byteLength >= 10) {
            const imp = decodificarTramaImpedancia(val);
            callbacks.onImpedanceData?.(imp);
          }
        } else {
          callbacks.onStatusChange?.('pesando', `Midiendo: ${res.pesoKg} kg`);
        }
      });
    } catch (e: any) {
      console.warn('Advertencia suscribiendo a canal FFB2:', e);
    }

    device.addEventListener('gattserverdisconnected', () => {
      callbacks.onStatusChange?.('desconectado', 'Balanza desconectada / en reposo.');
    });

    const handle: ScaleConnectionHandle = {
      disconnect: () => {
        if (device.gatt?.connected) {
          device.gatt.disconnect();
        }
        activeConnectionHandle = null;
        callbacks.onStatusChange?.('desconectado', 'Conexión finalizada.');
      },
      isConnected: () => Boolean(device.gatt?.connected),
    };

    activeConnectionHandle = handle;
    return handle;
  } catch (err: any) {
    callbacks.onStatusChange?.('error', err.message || 'Error enlazando con la balanza.');
    callbacks.onError?.(err);
    throw err;
  }
}
