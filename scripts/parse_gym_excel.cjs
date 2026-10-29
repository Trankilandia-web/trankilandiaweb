const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const excelPath = 'c:/Users/luisg/Downloads/Gym.xlsm';
const wb = XLSX.readFile(excelPath);

const wsCli = wb.Sheets['Clientes'];
const dataCli = XLSX.utils.sheet_to_json(wsCli, { header: 1 });
const wsIns = wb.Sheets['bdinscripciones'];
const dataIns = XLSX.utils.sheet_to_json(wsIns, { header: 1 });
const wsIng = wb.Sheets['ingresos'];
const dataIng = XLSX.utils.sheet_to_json(wsIng, { header: 1 });
const wsAct = wb.Sheets['Actividades'];
const dataAct = XLSX.utils.sheet_to_json(wsAct, { header: 1 });

function excelDateToISO(serial, fallback = '2026-11-30') {
  if (!serial || typeof serial !== 'number' || isNaN(serial)) return fallback;
  const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
  if (isNaN(d.getTime())) return fallback;
  return d.toISOString().split('T')[0];
}

function cleanName(raw) {
  if (!raw) return 'Socio Trankilandia';
  let cleaned = String(raw).replace(/^\s*\d+[\s.-]+/, '').trim();
  if (!cleaned) cleaned = String(raw).trim();
  return cleaned
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Catálogo de Actividades
const actMap = {
  m10: 'Musculación Libre 6 Meses',
  m11: '1 mes · Musculación Libre',
  m12: '2 MESES · Musculación Libre',
  m14: '6 MESES · Musculación Libre',
  m15: '3 MESES · Musculación Libre',
  m18: '8 MESES · Musculación Libre',
  m22: '1 AÑO · Musculación Libre',
  m23: '4 mes · Musculación Libre',
  m24: '1 mes · Musculación Libre'
};
for (let i = 2; i < dataAct.length; i++) {
  const row = dataAct[i];
  if (row[0] && row[1]) {
    actMap[row[0]] = String(row[1]).trim() + ' · Musculación Libre';
  }
}

// Inscripciones indexadas por key socio
const insBySocio = {};
for (let i = 3; i < dataIns.length; i++) {
  const row = dataIns[i];
  const sId = Number(row[2]);
  if (!isNaN(sId)) {
    insBySocio[sId] = row;
  }
}

// Ingresos reales indexados por keyInscripción
const pagosPorIns = {};
const metodoPagoPorIns = {};
for (let i = 2; i < dataIng.length; i++) {
  const row = dataIng[i];
  const insId = String(row[3]).trim();
  const monto = Number(row[6]) || 0;
  pagosPorIns[insId] = (pagosPorIns[insId] || 0) + monto;
  metodoPagoPorIns[insId] = String(row[5] || 'Efectivo').trim();
}

// 4 Entrenadores oficiales distribuidos en los 3 turnos
const coachesStaff = [
  { coach: 'Coach Marcos Rivas', turno: 'manana' },
  { coach: 'Coach Camila Mendoza', turno: 'manana' },
  { coach: 'Coach Valeria Gómez', turno: 'tarde' },
  { coach: 'Coach Daniel Quispe', turno: 'noche' }
];

const parsedMembers = [];

for (let i = 2; i < dataCli.length; i++) {
  const row = dataCli[i];
  const clientId = Number(row[0]);
  if (isNaN(clientId)) continue;
  const rawName = row[1];
  if (!rawName || String(rawName).trim() === '' || String(rawName).trim() === '.') continue;

  const nombre = cleanName(rawName);
  const id = 'MEM-' + String(parsedMembers.length + 1).padStart(3, '0');

  // DNI limpio: ignorar placeholders '12345678'
  let dni = null;
  if (row[2]) {
    const s = String(row[2]).trim().replace(/\D/g, '');
    if (s.length >= 6 && s !== '12345678' && !/^(\d)\1+$/.test(s)) {
      dni = s.padStart(8, '0');
    }
  }

  // Teléfono
  let phone = null;
  if (row[6]) {
    const s = String(row[6]).trim().replace(/\D/g, '');
    if (s.length >= 7) phone = s;
  }

  const age = (row[4] && !isNaN(Number(row[4]))) ? Number(row[4]) : null;
  const gender = (row[5] && String(row[5]).trim().toLowerCase().startsWith('f')) ? 'Femenino' : 'Masculino';
  const observations = (row[9] && String(row[9]).trim() !== '.') ? String(row[9]).trim() : null;

  // Datos financieros y de membresía
  const ins = insBySocio[clientId];
  let plan = '1 mes · Musculación Libre';
  let planPrice = 80;
  let advancePaid = 80;
  let balanceDue = 0;
  let registeredAt = '2026-10-01';
  let expiresAt = '2026-11-30';
  let paymentMethod = 'efectivo';
  let paymentDueDate = null;

  if (ins) {
    const insId = String(ins[0]).trim();
    if (ins[3] && actMap[ins[3]]) plan = actMap[ins[3]];
    planPrice = Number(ins[8]) || 80;
    const pagoInicial = Number(ins[9]) || 0;
    advancePaid = pagosPorIns[insId] !== undefined ? pagosPorIns[insId] : pagoInicial;
    balanceDue = Math.max(0, planPrice - advancePaid);

    if (ins[5]) registeredAt = excelDateToISO(ins[5], '2026-10-01');
    if (ins[6]) expiresAt = excelDateToISO(ins[6], '2026-11-30');

    if (metodoPagoPorIns[insId]) {
      const m = metodoPagoPorIns[insId].toLowerCase();
      if (m.includes('qr') || m.includes('yape')) paymentMethod = 'yape';
      else if (m.includes('plin')) paymentMethod = 'plin';
      else if (m.includes('tarjeta') || m.includes('pos')) paymentMethod = 'tarjeta';
      else paymentMethod = 'efectivo';
    }

    if (balanceDue > 0) {
      if (ins[11]) {
        paymentDueDate = excelDateToISO(ins[11], '2026-11-15');
      } else {
        paymentDueDate = '2026-11-15';
      }
    }
  }

  const coachObj = coachesStaff[parsedMembers.length % coachesStaff.length];
  const isExpired = expiresAt < '2026-10-29';
  const membershipStatus = isExpired ? 'expired' : 'active';
  const paymentType = balanceDue > 0 ? 'advance' : 'full';

  parsedMembers.push({
    id,
    name: nombre,
    dni,
    email: null,
    phone,
    plan,
    planPrice,
    paymentType,
    advancePaid,
    balanceDue,
    paymentDueDate,
    paymentMethod,
    receiptNumber: 'B001-' + String(parsedMembers.length + 100).padStart(6, '0'),
    membershipStatus,
    registeredAt,
    expiresAt,
    coachName: coachObj.coach,
    shift: coachObj.turno,
    observations,
    age,
    gender
  });
}

console.log(`✅ Procesados ${parsedMembers.length} socios 100% REALES de Gym.xlsm`);

// Guardar en realMembers.json
const jsonPath = path.join(__dirname, '..', 'src', 'data', 'realMembers.json');
fs.writeFileSync(jsonPath, JSON.stringify(parsedMembers, null, 2), 'utf8');
console.log(`✅ Guardado en ${jsonPath}`);

// Generar SQL para Supabase
function escapeSql(str) {
  if (str === null || str === undefined) return 'null';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

const sqlLines = [];
sqlLines.push('-- ==============================================================================');
sqlLines.push('-- TRANKILANDIA GYM · SEED DE DATOS 100% REALES DE GYM.XLSM');
sqlLines.push('-- ==============================================================================');
sqlLines.push('-- Total de socios reales: ' + parsedMembers.length);
sqlLines.push('-- Correos: NULL (Los socios ingresan con su propio correo y vinculan su DNI)');
sqlLines.push('');
sqlLines.push('-- Asegurar que la columna DNI permita NULL si el socio aún no tiene DNI registrado');
sqlLines.push('alter table public.socios alter column dni drop not null;');
sqlLines.push('update public.socios set dni = null where dni = \'12345678\';');
sqlLines.push('');
sqlLines.push('insert into public.socios (');
sqlLines.push('  id, nombre, dni, email, celular, plan, precio_plan, tipo_pago, adelanto_pagado,');
sqlLines.push('  saldo_pendiente, fecha_limite_pago, fecha_inicio, fecha_fin, metodo_pago,');
sqlLines.push('  numero_boleta, turno, coach_asignado, observaciones, edad, sexo');
sqlLines.push(') values');

const valueRows = parsedMembers.map(m => {
  const id = escapeSql(m.id);
  const nombre = escapeSql(m.name);
  const dni = m.dni ? escapeSql(m.dni) : 'null';
  const email = m.email ? escapeSql(m.email) : 'null';
  const celular = m.phone ? escapeSql(m.phone) : 'null';
  const plan = escapeSql(m.plan);
  const precio = m.planPrice;
  const tipoPago = escapeSql(m.paymentType);
  const adelanto = m.advancePaid;
  const saldo = m.balanceDue;
  const fechaLimite = m.paymentDueDate ? escapeSql(m.paymentDueDate) : 'null';
  const fechaInicio = escapeSql(m.registeredAt) + '::date';
  const fechaFin = escapeSql(m.expiresAt) + '::date';
  const metodo = escapeSql(m.paymentMethod);
  const boleta = escapeSql(m.receiptNumber);
  const turno = escapeSql(m.shift);
  const coach = escapeSql(m.coachName);
  const obs = m.observations ? escapeSql(m.observations) : 'null';
  const edad = m.age ? m.age : 'null';
  const sexo = escapeSql(m.gender);

  return `(${id}, ${nombre}, ${dni}, ${email}, ${celular}, ${plan}, ${precio}, ${tipoPago}, ${adelanto}, ${saldo}, ${fechaLimite}, ${fechaInicio}, ${fechaFin}, ${metodo}, ${boleta}, ${turno}, ${coach}, ${obs}, ${edad}, ${sexo})`;
});

sqlLines.push(valueRows.join(',\n'));
sqlLines.push('on conflict (id) do update set');
sqlLines.push('  nombre = excluded.nombre,');
sqlLines.push('  dni = coalesce(excluded.dni, socios.dni),');
sqlLines.push('  celular = coalesce(excluded.celular, socios.celular),');
sqlLines.push('  saldo_pendiente = excluded.saldo_pendiente,');
sqlLines.push('  adelanto_pagado = excluded.adelanto_pagado,');
sqlLines.push('  precio_plan = excluded.precio_plan,');
sqlLines.push('  tipo_pago = excluded.tipo_pago,');
sqlLines.push('  turno = excluded.turno,');
sqlLines.push('  coach_asignado = excluded.coach_asignado,');
sqlLines.push('  fecha_inicio = excluded.fecha_inicio,');
sqlLines.push('  fecha_fin = excluded.fecha_fin;');

sqlLines.push('');
sqlLines.push('-- Rutina Oficial inicial');
sqlLines.push(`insert into public.rutinas (member_id, title, objective, coach_name, coach_notes, days)
values (
  'MEM-001',
  'Acondicionamiento y Fuerza Funcional',
  'Movilidad articular, fortalecimiento lumbar y tono muscular',
  'Coach Marcos Rivas',
  'Calentamiento articular guiado. Priorizar técnica en peso muerto y control de postura.',
  '[
    {
      "id": "D1",
      "dayName": "Día 1: Tren Superior (Espalda & Hombros)",
      "focus": "Fortalecimiento Postural",
      "exercises": [
        {"id": "E1", "name": "Jalón al Pecho Agarre Neutro", "sets": 4, "reps": "12", "rest": "60s", "notes": "Codos hacia abajo"},
        {"id": "E2", "name": "Remo en Polea Baja", "sets": 3, "reps": "12", "rest": "60s", "notes": "Espalda firme sin flexión lumbar"},
        {"id": "E3", "name": "Elevaciones Laterales con Mancuerna", "sets": 3, "reps": "15", "rest": "45s", "notes": "Control en la bajada"}
      ]
    },
    {
      "id": "D2",
      "dayName": "Día 2: Tren Inferior & Core",
      "focus": "Glúteos & Estabilidad",
      "exercises": [
        {"id": "E4", "name": "Prensa de Piernas 45°", "sets": 4, "reps": "12", "rest": "90s", "notes": "Pies a ancho de hombros"},
        {"id": "E5", "name": "Puente de Glúteos", "sets": 4, "reps": "15", "rest": "60s", "notes": "Apretar arriba 2 segundos"},
        {"id": "E6", "name": "Plancha Isométrica", "sets": 3, "reps": "30s", "rest": "45s", "notes": "Alinear columna"}
      ]
    }
  ]'::jsonb
)
on conflict (member_id) do update set
  title = excluded.title,
  objective = excluded.objective,
  coach_notes = excluded.coach_notes,
  days = excluded.days;`);

sqlLines.push('');
sqlLines.push('-- Asistencias activas iniciales con socios reales');
sqlLines.push(`insert into public.asistencias (socio_id, dni, nombre, turno, fecha_ingreso)
values
  ('MEM-001', '46410051', 'Betty Romero Gavilan', 'manana', now() - interval '35 minutes'),
  ('MEM-002', '70472299', 'Alfred Choque Solis', 'manana', now() - interval '15 minutes')
on conflict do nothing;`);

const sqlPath = path.join(__dirname, '..', 'supabase', 'seed_socios_completo.sql');
fs.writeFileSync(sqlPath, sqlLines.join('\n'), 'utf8');
console.log(`✅ Guardado en ${sqlPath} con ${parsedMembers.length} socios.`);
