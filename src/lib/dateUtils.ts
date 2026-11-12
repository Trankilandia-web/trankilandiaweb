/**
 * TRANKILANDIA GYM · UTILIDADES DE FECHA LOCAL (ZONA HORARIA PERÚ UTC-5)
 * ==============================================================================
 * Garantiza que todos los cálculos de vigencia, vencimientos diarios, asistencias
 * y registros operen estrictamente en la zona horaria oficial 'America/Lima' (UTC-5).
 * Resuelve el bug donde después de las 19:00 horas (medianoche UTC) se restaba 1 día
 * de vigencia a los socios.
 * ==============================================================================
 */

/**
 * Retorna la fecha local en Perú en formato estándar 'YYYY-MM-DD'.
 */
export function getLocalPeruDateString(date: Date = new Date()): string {
  // Formateador estricto IANA con zona horaria de Perú
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Calcula la diferencia en días enteros entre una fecha objetivo y la fecha actual en Perú.
 * Retorna un número positivo si la fecha está en el futuro, 0 si vence hoy, y negativo si ya venció.
 */
export function calculateDaysRemaining(targetDateStr: string, baseDateStr?: string): number {
  if (!targetDateStr) return 0;

  // Extraer partes YYYY-MM-DD limpias
  const cleanTarget = targetDateStr.slice(0, 10);
  const cleanBase = baseDateStr ? baseDateStr.slice(0, 10) : getLocalPeruDateString();

  const [tY, tM, tD] = cleanTarget.split('-').map(Number);
  const [bY, bM, bD] = cleanBase.split('-').map(Number);

  if (!tY || !tM || !tD || !bY || !bM || !bD) return 0;

  // Comparación en UTC para evitar anomalías por cambios de horario de verano
  const targetUtc = Date.UTC(tY, tM - 1, tD);
  const baseUtc = Date.UTC(bY, bM - 1, bD);

  return Math.round((targetUtc - baseUtc) / (1000 * 60 * 60 * 24));
}

/**
 * Añade una cantidad de días a una fecha base (por defecto hoy en Perú) y retorna 'YYYY-MM-DD'.
 */
export function addDaysToLocalPeruDate(days: number, baseDateStr?: string): string {
  const base = baseDateStr ? baseDateStr.slice(0, 10) : getLocalPeruDateString();
  const [y, m, d] = base.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d + days));
  const newYear = dateObj.getUTCFullYear();
  const newMonth = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const newDay = String(dateObj.getUTCDate()).padStart(2, '0');
  return `${newYear}-${newMonth}-${newDay}`;
}
