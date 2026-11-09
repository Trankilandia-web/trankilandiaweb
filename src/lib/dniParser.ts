/**
 * ==============================================================================
 * TRANKILANDIA GYM · MOTOR INTELIGENTE DE EXTRACCIÓN Y PARSEO DE DNI PERUANO
 * ==============================================================================
 * Soporta escaneo óptico, pistolas láser 1D, lectores 2D y digitación manual
 * tanto para el DNI Azul Clásico (antiguo) como para el DNI Electrónico (DNIe).
 *
 * Características del DNI Azul Peruano (antiguo):
 * 1. Código de barras 1D (Code 39 o Code 128) en el reverso:
 *    - Contiene los 8 dígitos del DNI seguidos de 1 dígito verificador (9 caracteres en total).
 *    - Pistolas láser pueden emitir asteriscos (*123456789*) o guión (12345678-9).
 * 2. Código 2D PDF417 en el reverso:
 *    - Contiene cadena compacta que inicia con los 8 dígitos o el bloque MRZ (I<PER...).
 * 3. DNIe (electrónico moderno):
 *    - Emite 8 dígitos limpios, formato QR JSON {"dni":"..."} o URL ?dni=...
 * ==============================================================================
 */

export interface DniExtractionResult {
  dni: string;
  sourceType: 'dnie_puro' | 'dni_azul_1d' | 'code39_asteriscos' | 'mrz' | 'pdf417' | 'json' | 'url' | 'manual';
  rawInput: string;
}

/**
 * Extrae y normaliza un número de DNI peruano de 8 dígitos a partir de cualquier
 * cadena escaneada (pistola láser 1D, lector 2D, código QR, PDF417 o entrada manual).
 */
export function extraerDniPeru(
  rawInput: string | null | undefined,
  knownDnis?: Set<string> | string[]
): string | null {
  if (!rawInput) return null;
  const parsed = analizarDniPeru(rawInput, knownDnis);
  return parsed ? parsed.dni : null;
}

/**
 * Analiza en profundidad la entrada de escáner y devuelve tanto el DNI normalizado de 8 dígitos
 * como el tipo de origen detectado (DNI azul antiguo, DNIe, MRZ, etc.).
 */
export function analizarDniPeru(
  rawInput: string | null | undefined,
  knownDnis?: Set<string> | string[]
): DniExtractionResult | null {
  if (!rawInput) return null;
  const text = String(rawInput).trim();
  if (!text) return null;

  const dnisSet = knownDnis instanceof Set ? knownDnis : Array.isArray(knownDnis) ? new Set(knownDnis) : null;

  // 1. Lector 2D con estructura JSON (ej: {"dni":"73456789"} o {"id":"MEM-001"})
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text);
      const cand = String(parsed.dni || parsed.d || parsed.num || parsed.id || '').replace(/\D/g, '');
      if (cand.length === 8) {
        return { dni: cand, sourceType: 'json', rawInput: text };
      }
    } catch {}
  }

  // 2. URLs con parámetro de DNI (ej: https://.../cliente?dni=73456789)
  const urlMatch = text.match(/[?&]dni=(\d{8})/i);
  if (urlMatch) {
    return { dni: urlMatch[1], sourceType: 'url', rawInput: text };
  }

  // 3. Formato MRZ del reverso de DNI azul o DNIe (ej: I<PER73456789<<<<... o IDPER73456789)
  const mrzMatch = text.match(/I[<D]PER(\d{8})/i);
  if (mrzMatch) {
    return { dni: mrzMatch[1], sourceType: 'mrz', rawInput: text };
  }

  // 4. Pistolas láser leyendo Code 39 con caracteres de parada (ej: *73456789* o *734567891*)
  const astMatch = text.match(/\*(\d{8,10})\*/);
  if (astMatch) {
    const rawDigits = astMatch[1];
    const candidate = rawDigits.length >= 9 ? rawDigits.slice(0, 8) : rawDigits;
    if (candidate.length === 8) {
      return { dni: candidate, sourceType: 'code39_asteriscos', rawInput: text };
    }
  }

  // 5. Normalización de dígitos limpios
  const cleanDigits = text.replace(/\D/g, '');

  // A) Exactamente 8 dígitos: DNIe moderno o DNI puro
  if (cleanDigits.length === 8) {
    return { dni: cleanDigits, sourceType: 'dnie_puro', rawInput: text };
  }

  // B) 9 dígitos: El estándar absoluto del código de barras 1D del DNI Azul Clásico Peruano
  // (8 dígitos del DNI + 1 dígito verificador al final asignado por RENIEC)
  if (cleanDigits.length === 9) {
    const candidate8 = cleanDigits.slice(0, 8);
    return { dni: candidate8, sourceType: 'dni_azul_1d', rawInput: text };
  }

  // C) 10 dígitos: Lectores en modo teclado con '0' inicial + DNI azul (0 + 8 dígitos + 1 verificador)
  if (cleanDigits.length === 10 && cleanDigits.startsWith('0')) {
    const candidate8 = cleanDigits.slice(1, 9);
    return { dni: candidate8, sourceType: 'dni_azul_1d', rawInput: text };
  }

  // D) Si contiene una secuencia de 8 dígitos exacta dentro de un texto más largo (PDF417 de DNI azul)
  // Ej: "734567891LLOCLLA<SAUNE..." o "01|73456789|..."
  if (text.length > 8) {
    // Si conocemos la lista de socios, buscar si coincide alguno
    if (dnisSet) {
      for (const known of dnisSet) {
        if (text.includes(known)) {
          return { dni: known, sourceType: 'pdf417', rawInput: text };
        }
      }
    }

    // Si comienza con 8 dígitos seguidos de letras o separadores
    const startMatch = text.match(/^(\d{8})[A-Za-z\s|<_-]/);
    if (startMatch) {
      return { dni: startMatch[1], sourceType: 'pdf417', rawInput: text };
    }

    // Si comienza con 9 dígitos (DNI azul + verificador) seguidos de datos personales
    const start9Match = text.match(/^(\d{8})\d[A-Za-z\s|<_-]/);
    if (start9Match) {
      return { dni: start9Match[1], sourceType: 'pdf417', rawInput: text };
    }

    // Buscar cualquier token de 8 dígitos aislado
    const wordMatch = text.match(/\b(\d{8})\b/);
    if (wordMatch) {
      return { dni: wordMatch[1], sourceType: 'pdf417', rawInput: text };
    }
  }

  return null;
}
