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
 */
export function decodificarTramaPeso(dataView: DataView): BleWeightResult {
  if (dataView.byteLength < 3) {
    return { pesoKg: 0, esEstable: false };
  }

  const header = dataView.getUint8(0);
  const esEstable = header === 0xCA || header === 0xCF;

  // Los bytes 1 y 2 contienen el peso en formato Big-Endian (dividido por 100)
  const pesoRaw = dataView.getUint16(1, false);
  const pesoKg = Number((pesoRaw / 100.0).toFixed(2));

  return {
    pesoKg,
    esEstable,
  };
}

/**
 * Decodifica la trama segmental de impedancia de 8 electrodos (FFB3)
 */
export function decodificarTramaImpedancia(dataView: DataView): BleImpedanceResult {
  if (dataView.byteLength < 8) {
    return { impedanciaPies: 500, impedanciaManos: 520, impedanciaTorso: 420 };
  }

  // En el protocolo Lefu / Fitdays, los canales de ohmios van organizados por pares:
  // Bytes 2-3: Resistencia de electrodos de pies (Ohms)
  // Bytes 4-5: Resistencia de electrodos de manos (Ohms)
  // Bytes 6-7: Resistencia de torso/cuerpo cruzado (Ohms)
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
    impedanciaPies: impedanciaPies > 0 ? impedanciaPies : 500,
    impedanciaManos: impedanciaManos > 0 ? impedanciaManos : 520,
    impedanciaTorso: impedanciaTorso > 0 ? impedanciaTorso : 420,
    grasaCorporalPct,
    masaMuscularKg,
  };
}

/**
 * Inicia la conexión Web Bluetooth con la balanza EUROMAR G78-BT
 */
export async function conectarBalanzaG78(
  callbacks: BleScaleCallbacks
): Promise<ScaleConnectionHandle> {
  if (!isWebBluetoothAvailable()) {
    throw new Error('Web Bluetooth no está disponible en este navegador. Utiliza Google Chrome en Android o Bluefy en iPhone.');
  }

  const nav = navigator as any;

  callbacks.onStatusChange?.('buscando', 'Buscando balanza EUROMAR® G78-BT...');

  try {
    let device: any;
    const optionalServices = [
      FITDAYS_SERVICES.SERVICE_MAIN,
      FITDAYS_SERVICES.SERVICE_ALT,
      FITDAYS_SERVICES.SERVICE_WEIGHT_SCALE,
      FITDAYS_SERVICES.SERVICE_BODY_COMPOSITION,
    ];

    try {
      // 1. Intentar con acceptAllDevices: true para garantizar que ninguna balanza quede oculta por discrepancia de nombre
      device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices,
      });
    } catch (acceptErr: any) {
      // Si el usuario canceló explícitamente en el diálogo nativo, propagar la cancelación
      if (
        acceptErr?.name === 'NotFoundError' ||
        acceptErr?.message?.includes('cancelled') ||
        acceptErr?.message?.includes('User cancelled')
      ) {
        throw acceptErr;
      }

      // Si el navegador exige filtros en vez de acceptAllDevices, usar lista exhaustiva de prefijos
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

    if (!device || !device.gatt) {
      throw new Error('No se pudo acceder a la interfaz GATT del dispositivo.');
    }

    callbacks.onStatusChange?.('conectado', `Conectando con ${device.name || 'Balanza Inteligente'}...`);

    const server = await device.gatt.connect();

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

    // 1. Handshake / Inicialización opcional (FFB1)
    try {
      const cmdChar = await service.getCharacteristic(FITDAYS_SERVICES.CHAR_COMMAND);
      if (cmdChar && (cmdChar.properties.write || cmdChar.properties.writeWithoutResponse)) {
        const initPayload = new Uint8Array([0xAC, 0x02, 0x00, 0x00, 0xAE]);
        if (cmdChar.properties.writeWithoutResponse) {
          await cmdChar.writeValueWithoutResponse(initPayload);
        } else {
          await cmdChar.writeValue(initPayload);
        }
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
      callbacks.onStatusChange?.('desconectado', 'Balanza desconectada.');
    });

    return {
      disconnect: () => {
        if (device.gatt?.connected) {
          device.gatt.disconnect();
        }
        callbacks.onStatusChange?.('desconectado', 'Conexión finalizada.');
      },
      isConnected: () => Boolean(device.gatt?.connected),
    };
  } catch (err: any) {
    callbacks.onStatusChange?.('error', err.message || 'Error enlazando con la balanza.');
    callbacks.onError?.(err);
    throw err;
  }
}
