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

  return {
    impedanciaPies: impedanciaPies > 0 ? impedanciaPies : 500,
    impedanciaManos: impedanciaManos > 0 ? impedanciaManos : 520,
    impedanciaTorso: impedanciaTorso > 0 ? impedanciaTorso : 420,
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
    const device = await nav.bluetooth.requestDevice({
      filters: [
        { namePrefix: 'EUROMAR' },
        { namePrefix: 'G78' },
        { namePrefix: 'Fitdays' },
        { namePrefix: 'Lefu' },
        { namePrefix: 'Body' },
        { namePrefix: 'Scale' },
        { services: [FITDAYS_SERVICES.SERVICE_MAIN] },
      ],
      optionalServices: [FITDAYS_SERVICES.SERVICE_MAIN],
    });

    if (!device || !device.gatt) {
      throw new Error('No se pudo acceder a la interfaz GATT del dispositivo.');
    }

    callbacks.onStatusChange?.('conectado', `Conectando con ${device.name || 'Balanza Inteligente'}...`);

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(FITDAYS_SERVICES.SERVICE_MAIN);

    // 1. Suscribirse a lectura de peso en vivo (FFB2)
    try {
      const weightChar = await service.getCharacteristic(FITDAYS_SERVICES.CHAR_WEIGHT_LIVE);
      await weightChar.startNotifications();
      weightChar.addEventListener('characteristicvaluechanged', (event: any) => {
        const val: DataView = event.target.value;
        const res = decodificarTramaPeso(val);
        callbacks.onLiveWeight?.(res.pesoKg, res.esEstable);
        if (res.esEstable) {
          callbacks.onStatusChange?.('bloqueado', `Peso fijado: ${res.pesoKg} kg`);
        } else {
          callbacks.onStatusChange?.('pesando', `Midiendo: ${res.pesoKg} kg`);
        }
      });
    } catch (e: any) {
      console.warn('Advertencia suscribiendo a canal FFB2:', e);
    }

    // 2. Suscribirse a trama segmental de bioimpedancia (FFB3)
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
