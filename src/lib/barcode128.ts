// ==============================================================================
// TRANKILANDIA GYM · GENERADOR CLIENT-SIDE DE CÓDIGO DE BARRAS CODE 128 (1D)
// ==============================================================================
// - Implementación estándar oficial Code 128 B (sin dependencias externas).
// - Cumple con especificación física industrial:
//     * Quiet Zone >= 16px a los lados (margen blanco obligatorio para pistolas 1D).
//     * Barras negras puras (#000000) sobre fondo blanco puro (#FFFFFF).
//     * Ancho mínimo de módulo: 2px para lectura confiable en celular y papel.
// ==============================================================================

// Tabla oficial de 107 patrones Code 128 (anchuras alternadas de barra / espacio)
const CODE128_PATTERNS: number[][] = [
  [2, 1, 2, 2, 2, 2], [2, 2, 2, 1, 2, 2], [2, 2, 2, 2, 2, 1], [1, 2, 1, 2, 2, 3], [1, 2, 1, 3, 2, 2], // 0-4
  [1, 3, 1, 2, 2, 2], [1, 2, 2, 2, 1, 3], [1, 2, 2, 3, 1, 2], [1, 3, 2, 2, 1, 2], [2, 2, 1, 2, 1, 3], // 5-9
  [2, 2, 1, 3, 1, 2], [2, 3, 1, 2, 1, 2], [1, 1, 2, 2, 3, 2], [1, 2, 2, 1, 3, 2], [1, 2, 2, 2, 3, 1], // 10-14
  [1, 1, 3, 2, 2, 2], [1, 2, 3, 1, 2, 2], [1, 2, 3, 2, 2, 1], [2, 2, 3, 2, 1, 1], [2, 2, 1, 1, 3, 2], // 15-19
  [2, 2, 1, 2, 3, 1], [2, 1, 3, 2, 1, 2], [2, 2, 3, 1, 1, 2], [3, 1, 2, 1, 3, 1], [3, 1, 1, 2, 2, 2], // 20-24
  [3, 2, 1, 1, 2, 2], [3, 2, 1, 2, 2, 1], [3, 1, 2, 2, 1, 2], [3, 2, 2, 1, 1, 2], [3, 2, 2, 2, 1, 1], // 25-29
  [2, 1, 2, 1, 2, 3], [2, 1, 2, 3, 2, 1], [2, 3, 2, 1, 2, 1], [1, 1, 1, 3, 2, 3], [1, 3, 1, 1, 2, 3], // 30-34
  [1, 3, 1, 3, 2, 1], [1, 1, 2, 3, 1, 3], [1, 3, 2, 1, 1, 3], [1, 3, 2, 3, 1, 1], [2, 1, 1, 3, 1, 3], // 35-39
  [2, 3, 1, 1, 1, 3], [2, 3, 1, 3, 1, 1], [1, 1, 2, 1, 3, 3], [1, 1, 2, 3, 3, 1], [1, 3, 2, 1, 3, 1], // 40-44
  [1, 1, 3, 1, 2, 3], [1, 1, 3, 3, 2, 1], [1, 3, 3, 1, 2, 1], [3, 1, 3, 1, 2, 1], [2, 1, 1, 3, 3, 1], // 45-49
  [2, 3, 1, 1, 3, 1], [2, 1, 3, 1, 1, 3], [2, 1, 3, 3, 1, 1], [2, 1, 3, 1, 3, 1], [3, 1, 1, 1, 2, 3], // 50-54
  [3, 1, 1, 3, 2, 1], [3, 3, 1, 1, 2, 1], [3, 1, 2, 1, 1, 3], [3, 1, 2, 3, 1, 1], [3, 3, 2, 1, 1, 1], // 55-59
  [3, 1, 4, 1, 1, 1], [2, 2, 1, 4, 1, 1], [4, 3, 1, 1, 1, 1], [1, 1, 1, 2, 2, 4], [1, 1, 1, 4, 2, 2], // 60-64
  [1, 2, 1, 1, 2, 4], [1, 2, 1, 4, 2, 1], [1, 4, 1, 1, 2, 2], [1, 4, 1, 2, 2, 1], [1, 1, 2, 2, 1, 4], // 65-69
  [1, 1, 2, 4, 1, 2], [1, 2, 2, 1, 1, 4], [1, 2, 2, 4, 1, 1], [1, 4, 2, 1, 1, 2], [1, 4, 2, 2, 1, 1], // 70-74
  [2, 4, 1, 2, 1, 1], [2, 2, 1, 1, 1, 4], [4, 1, 3, 1, 1, 1], [2, 4, 1, 1, 1, 2], [1, 3, 4, 1, 1, 1], // 75-79
  [1, 1, 1, 2, 4, 2], [1, 2, 1, 1, 4, 2], [1, 2, 1, 2, 4, 1], [1, 1, 4, 2, 1, 2], [1, 2, 4, 1, 1, 2], // 80-84
  [1, 2, 4, 2, 1, 1], [4, 1, 1, 2, 1, 2], [4, 2, 1, 1, 1, 2], [4, 2, 1, 2, 1, 1], [2, 1, 2, 1, 4, 1], // 85-89
  [2, 1, 4, 1, 2, 1], [4, 1, 2, 1, 2, 1], [1, 1, 1, 1, 4, 3], [1, 1, 1, 3, 4, 1], [1, 3, 1, 1, 4, 1], // 90-94
  [1, 1, 4, 1, 1, 3], [1, 1, 4, 3, 1, 1], [4, 1, 1, 1, 1, 3], [4, 1, 1, 3, 1, 1], [1, 1, 3, 1, 4, 1], // 95-99
  [1, 1, 4, 1, 3, 1], [3, 1, 1, 1, 4, 1], [4, 1, 1, 1, 3, 1], [2, 1, 1, 4, 1, 2], [2, 1, 1, 2, 1, 4], // 100-104 (104 = Start B)
  [2, 1, 1, 2, 3, 2], // 105 = Start C
  [2, 3, 3, 1, 1, 1, 2] // 106 = Stop
];

export interface BarcodeModule {
  isBlack: boolean;
  width: number;
}

/**
 * Codifica una cadena de texto (DNI) a una secuencia de módulos Code 128 B
 */
export function encodeCode128B(text: string): BarcodeModule[] {
  const codes: number[] = [104]; // Start Code B
  let checksum = 104;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const value = charCode - 32;
    if (value >= 0 && value <= 94) {
      codes.push(value);
      checksum += value * (i + 1);
    }
  }

  // Check digit modulo 103
  codes.push(checksum % 103);
  // Stop Code
  codes.push(106);

  // Convertir los códigos en módulos alternados de barras y espacios
  const modules: BarcodeModule[] = [];

  codes.forEach((code) => {
    const pattern = CODE128_PATTERNS[code];
    if (!pattern) return;

    let isBlack = true;
    for (let i = 0; i < pattern.length; i++) {
      modules.push({
        isBlack,
        width: pattern[i],
      });
      isBlack = !isBlack;
    }
  });

  return modules;
}

/**
 * Renderiza el código de barras en un elemento HTML5 Canvas nativo
 * Garantiza fondo blanco puro, barras negras puras y Quiet Zone >= 16px
 */
export function renderBarcodeToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  options: {
    moduleWidth?: number;
    height?: number;
    quietZone?: number;
    includeText?: boolean;
    scale?: number;
  } = {}
) {
  const {
    moduleWidth = 2,
    height = 64,
    quietZone = 20,
    includeText = true,
    scale = 1,
  } = options;

  const modules = encodeCode128B(text);
  const totalModuleUnits = modules.reduce((sum, m) => sum + m.width, 0);

  const rawWidth = totalModuleUnits * moduleWidth + quietZone * 2;
  const rawHeight = height + (includeText ? 24 : 0);

  canvas.width = rawWidth * scale;
  canvas.height = rawHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(scale, scale);

  // 1. Fondo blanco puro obligatorio (#FFFFFF)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, rawWidth, rawHeight);

  // 2. Dibujar barras negras puras (#000000)
  let currentX = quietZone;
  ctx.fillStyle = '#000000';

  modules.forEach((mod) => {
    const barW = mod.width * moduleWidth;
    if (mod.isBlack) {
      ctx.fillRect(currentX, 6, barW, height);
    }
    currentX += barW;
  });

  // 3. Texto del DNI centrado debajo del código
  if (includeText) {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, rawWidth / 2, height + 14);
  }
}

export interface CarnetDigitalData {
  nombre: string;
  dni: string;
  memberId: string;
  plan: string;
  turno: 'manana' | 'tarde' | 'noche';
  coach: string;
  estado: string;
  tieneDeuda: boolean;
  saldoDeuda?: number;
  vencimiento: string;
}

/**
 * Genera y descarga el Carnet Digital completo en formato PNG de Alta Resolución (Scale: 2 o 3)
 * para que el socio lo guarde en su galería móvil y pueda ingresar 100% offline.
 */
export function exportCarnetDigitalPNG(data: CarnetDigitalData, scale: number = 2): void {
  const width = 640;
  const height = 400;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(scale, scale);

  // 1. Fondo elegante degradado carbón / metálico oscuro
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#09090b');
  bgGrad.addColorStop(0.5, '#18181b');
  bgGrad.addColorStop(1, '#050505');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Borde dorado Trankilandia Gym
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // 3. Encabezado de la Tarjeta
  ctx.fillStyle = '#F59E0B';
  ctx.font = '900 20px "Arial Black", sans-serif';
  ctx.fillText('TRANKILANDIA GYM', 32, 45);

  ctx.fillStyle = '#A1A1AA';
  ctx.font = '10px "Courier New", monospace';
  ctx.fillText('MÁS QUE UN GIMNASIO · SEDE HUAMANGA, AYACUCHO', 32, 62);

  // Badge de Estado
  const badgeText = data.tieneDeuda ? 'ADELANTO PENDIENTE' : 'SOCIO ACTIVO';
  ctx.fillStyle = data.tieneDeuda ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)';
  ctx.fillRect(width - 180, 28, 148, 26);
  ctx.strokeStyle = data.tieneDeuda ? '#F59E0B' : '#10B981';
  ctx.lineWidth = 1;
  ctx.strokeRect(width - 180, 28, 148, 26);

  ctx.fillStyle = data.tieneDeuda ? '#F59E0B' : '#10B981';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, width - 106, 44);
  ctx.textAlign = 'left';

  // Línea divisoria
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.moveTo(32, 80);
  ctx.lineTo(width - 32, 80);
  ctx.stroke();

  // 4. Datos del Atleta
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 19px "Arial Black", sans-serif';
  ctx.fillText(data.nombre.toUpperCase(), 32, 115);

  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.fillText(`DNI: ${data.dni}   |   ID: ${data.memberId}`, 32, 138);

  ctx.fillStyle = '#D4D4D8';
  ctx.font = '12px sans-serif';
  ctx.fillText(`Plan: ${data.plan}`, 32, 165);

  const turnoTexto =
    data.turno === 'manana'
      ? 'Mañana (6:00 AM - 2:00 PM)'
      : data.turno === 'tarde'
      ? 'Tarde (2:00 PM - 6:00 PM)'
      : 'Noche (6:00 PM - 10:00 PM)';
  ctx.fillText(`Turno: ${turnoTexto}`, 32, 188);

  ctx.fillText(`Entrenador Asignado: ${data.coach}`, 32, 211);

  ctx.fillStyle = '#A1A1AA';
  ctx.font = '11px sans-serif';
  ctx.fillText(`Válido hasta: ${data.vencimiento}`, 32, 234);

  // 5. CAJA BLANCA OBLIGATORIA PARA CÓDIGO DE BARRAS 1D (QUIET ZONE >= 16PX)
  const barcodeBoxX = 32;
  const barcodeBoxY = 255;
  const barcodeBoxW = width - 64;
  const barcodeBoxH = 115;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(barcodeBoxX, barcodeBoxY, barcodeBoxW, barcodeBoxH);
  ctx.strokeStyle = '#E4E4E7';
  ctx.lineWidth = 1;
  ctx.strokeRect(barcodeBoxX, barcodeBoxY, barcodeBoxW, barcodeBoxH);

  // Renderizar las barras dentro de la caja blanca
  const modules = encodeCode128B(data.dni);
  const totalUnits = modules.reduce((s, m) => s + m.width, 0);
  const moduleW = Math.max(2, Math.floor((barcodeBoxW - 48) / totalUnits));
  const quietZoneOffset = Math.floor((barcodeBoxW - totalUnits * moduleW) / 2);

  let barX = barcodeBoxX + quietZoneOffset;
  const barY = barcodeBoxY + 12;
  const barH = 65;

  ctx.fillStyle = '#000000';
  modules.forEach((mod) => {
    const w = mod.width * moduleW;
    if (mod.isBlack) {
      ctx.fillRect(barX, barY, w, barH);
    }
    barX += w;
  });

  // DNI en texto plano debajo del código
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 15px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`* ${data.dni} *`, barcodeBoxX + barcodeBoxW / 2, barcodeBoxY + 98);

  // 6. Disparar descarga en el navegador
  const link = document.createElement('a');
  link.download = `carnet-trankilandia-${data.dni}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
