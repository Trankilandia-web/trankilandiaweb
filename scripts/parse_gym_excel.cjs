const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const excelPath = 'c:/Users/luisg/Downloads/Gym.xlsm';
const wb = XLSX.readFile(excelPath);

const sClientes = XLSX.utils.sheet_to_json(wb.Sheets['Clientes'], { range: 1 });
const sInscripciones = XLSX.utils.sheet_to_json(wb.Sheets['bdinscripciones'], { range: 2 });
const sActividades = XLSX.utils.sheet_to_json(wb.Sheets['Actividades'], { range: 1 });
const sCobrar = XLSX.utils.sheet_to_json(wb.Sheets['ctsCobrar'], { range: 1 });
const sIngresos = XLSX.utils.sheet_to_json(wb.Sheets['ingresos'], { range: 1 });

function excelDateToISO(serial, defaultDate = '2026-11-30') {
  if (!serial || typeof serial !== 'number' || isNaN(serial)) return defaultDate;
  const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
  if (isNaN(d.getTime())) return defaultDate;
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

// Map actividades
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

sActividades.forEach(a => {
  if (a.__EMPTY && a['1']) {
    actMap[a.__EMPTY] = a['1'].trim() + ' · Musculación Libre';
  }
});

const inscMap = {};
sInscripciones.forEach(ins => {
  if (ins.__EMPTY_2 !== undefined && ins.__EMPTY_2 !== 'key socio') {
    inscMap[Number(ins.__EMPTY_2)] = ins;
  }
});

const cobrarMap = {};
sCobrar.forEach(c => {
  if (c.__EMPTY_2 && c.__EMPTY_2 !== 'keySocio') {
    cobrarMap[Number(c.__EMPTY_2)] = c;
  }
});

const ingresoMap = {};
sIngresos.forEach(ing => {
  if (ing.__EMPTY_4 && ing.__EMPTY_4 !== 'key socio') {
    ingresoMap[Number(ing.__EMPTY_4)] = ing;
  }
});

const coachesStaff = [
  { coach: 'Coach Marcos Rivas', turno: 'manana' },
  { coach: 'Coach Camila Mendoza', turno: 'manana' },
  { coach: 'Coach Valeria Gómez', turno: 'tarde' },
  { coach: 'Coach Daniel Quispe', turno: 'noche' }
];

const parsedMembers = [];

// 1. MEM-001 (Luis Gerardo Llocclla)
parsedMembers.push({
  id: 'MEM-001',
  name: 'Luis Gerardo Llocclla',
  dni: '73921845',
  email: 'luisgerardolloccllasaune@gmail.com',
  phone: '966123456',
  plan: 'Combo Musculación + Escuela de Boxeo',
  planPrice: 140,
  paymentType: 'advance',
  advancePaid: 70,
  balanceDue: 70,
  paymentDueDate: '05 Nov 2026',
  paymentMethod: 'yape',
  receiptNumber: 'B001-000492',
  membershipStatus: 'active',
  registeredAt: '2026-10-22',
  expiresAt: '2026-11-22',
  coachName: 'Coach Marcos Rivas',
  shift: 'manana',
  observations: 'Enfoque en fuerza e hipertrofia + potencia en boxeo',
  age: 26,
  gender: 'Masculino'
});

let idxCounter = 0;

sClientes.forEach((c, idx) => {
  if (idx === 0) return; // header row
  if (!c.__EMPTY && !c.__EMPTY_1) return; // empty row
  
  const rawName = c.__EMPTY_1;
  if (!rawName) return;
  const rawStr = String(rawName).trim();
  if (rawStr === '' || rawStr === '.' || rawStr.toLowerCase() === 'nombre') return;

  const keyCliente = c.__EMPTY ? Number(c.__EMPTY) : (idx + 100);
  const nombre = cleanName(rawName);

  // If this happens to be Luis Gerardo, skip duplicate
  if (nombre.toLowerCase().includes('luis gerardo')) return;

  // DNI: clean 8 digits if valid
  let dni = null;
  if (c.__EMPTY_2) {
    const rawDni = String(c.__EMPTY_2).trim().replace(/\D/g, '');
    if (rawDni.length >= 6) {
      dni = rawDni.padStart(8, '0');
    }
  }

  // Celular
  let celular = null;
  if (c.__EMPTY_6) {
    const rawTel = String(c.__EMPTY_6).trim().replace(/\D/g, '');
    if (rawTel.length >= 7) {
      celular = rawTel;
    }
  }

  // Correo: strictly null for clients (no corporate emails!)
  const email = null;

  // Edad & Sexo
  const edad = (c.__EMPTY_4 && !isNaN(Number(c.__EMPTY_4))) ? Number(c.__EMPTY_4) : null;
  let sexo = 'Masculino';
  if (c.__EMPTY_5) {
    sexo = String(c.__EMPTY_5).trim().toLowerCase().startsWith('f') ? 'Femenino' : 'Masculino';
  }

  // Observaciones
  const observaciones = c.__EMPTY_9 && String(c.__EMPTY_9).trim() !== '.' ? String(c.__EMPTY_9).trim() : null;

  // Inscription data
  const ins = inscMap[keyCliente];
  let plan = '1 mes · Musculación Libre';
  let precioPlan = 80;
  let adelantoPagado = 80;
  let saldoPendiente = 0;
  let fechaInicio = '2026-10-01';
  let fechaFin = '2026-11-30';

  if (ins) {
    if (ins.__EMPTY_3 && actMap[ins.__EMPTY_3]) {
      plan = actMap[ins.__EMPTY_3];
    }
    if (ins.__EMPTY_8 && !isNaN(Number(ins.__EMPTY_8))) {
      precioPlan = Number(ins.__EMPTY_8);
    }
    if (ins.__EMPTY_9 !== undefined && !isNaN(Number(ins.__EMPTY_9))) {
      adelantoPagado = Number(ins.__EMPTY_9);
    }
    if (ins.__EMPTY_10 !== undefined && !isNaN(Number(ins.__EMPTY_10))) {
      saldoPendiente = Number(ins.__EMPTY_10);
    }
    if (ins.__EMPTY_5) {
      fechaInicio = excelDateToISO(ins.__EMPTY_5, '2026-10-01');
    }
    if (ins.__EMPTY_6) {
      fechaFin = excelDateToISO(ins.__EMPTY_6, '2026-11-30');
    }
  }

  // Debt from ctsCobrar
  const cobrar = cobrarMap[keyCliente];
  if (cobrar && cobrar.__EMPTY_5 !== undefined && !isNaN(Number(cobrar.__EMPTY_5))) {
    const deuda = Number(cobrar.__EMPTY_5);
    if (deuda > 0) {
      saldoPendiente = deuda;
      if (precioPlan > deuda) {
        adelantoPagado = precioPlan - deuda;
      }
    }
  }

  const tipoPago = saldoPendiente > 0 ? 'advance' : 'full';
  
  // Payment method
  let metodoPago = 'yape';
  const ing = ingresoMap[keyCliente];
  if (ing && ing.__EMPTY_5) {
    const mStr = String(ing.__EMPTY_5).toLowerCase();
    if (mStr.includes('efectivo')) metodoPago = 'efectivo';
    else if (mStr.includes('tarjeta')) metodoPago = 'tarjeta';
    else if (mStr.includes('plin')) metodoPago = 'plin';
    else metodoPago = 'yape';
  }

  const coachInfo = coachesStaff[idxCounter % 4];
  idxCounter++;

  const id = 'MEM-' + String(keyCliente).padStart(3, '0');
  const numeroBoleta = 'B001-' + String(100 + idxCounter).padStart(6, '0');

  parsedMembers.push({
    id,
    name: nombre,
    dni,
    email,
    phone: celular,
    plan,
    planPrice: precioPlan,
    paymentType: tipoPago,
    advancePaid: adelantoPagado,
    balanceDue: saldoPendiente,
    paymentDueDate: saldoPendiente > 0 ? '05 Nov 2026' : null,
    paymentMethod: metodoPago,
    receiptNumber: numeroBoleta,
    membershipStatus: 'active',
    registeredAt: fechaInicio,
    expiresAt: fechaFin,
    coachName: coachInfo.coach,
    shift: coachInfo.turno,
    observations: observaciones,
    age: edad,
    gender: sexo
  });
});

console.log(`✅ Procesados ${parsedMembers.length} socios de Gym.xlsm`);

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
sqlLines.push('-- TRANKILANDIA GYM · SEED DE DATOS REALES (EXTRAÍDOS DE GYM.XLSM)');
sqlLines.push('-- ==============================================================================');
sqlLines.push('-- Total de socios reales: ' + parsedMembers.length);
sqlLines.push('-- Correos: NULL (Los socios ingresan con su propio correo y completan su DNI)');
sqlLines.push('');
sqlLines.push('-- Asegurar que la columna DNI permita NULL si el socio aún no tiene DNI registrado');
sqlLines.push('alter table public.socios alter column dni drop not null;');
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
sqlLines.push('  turno = excluded.turno,');
sqlLines.push('  coach_asignado = excluded.coach_asignado,');
sqlLines.push('  fecha_inicio = excluded.fecha_inicio,');
sqlLines.push('  fecha_fin = excluded.fecha_fin;');

sqlLines.push('');
sqlLines.push('-- Vincular automáticamente el usuario de Supabase Auth si ya inició sesión');
sqlLines.push('update public.socios');
sqlLines.push('set user_id = p.id');
sqlLines.push('from public.profiles p');
sqlLines.push('where (p.email = socios.email or (socios.dni is not null and p.dni = socios.dni))');
sqlLines.push('  and socios.user_id is null;');

sqlLines.push('');
sqlLines.push('-- Seed de Rutina Oficial para MEM-001 (Luis Gerardo Llocclla)');
sqlLines.push(`insert into public.rutinas (member_id, title, objective, coach_name, coach_notes, days)
values (
  'MEM-001',
  'Fuerza Hipertrofia & Escuela de Boxeo',
  'Aumento de masa muscular y potencia de golpeo',
  'Coach Marcos Rivas',
  'Controlar la fase excéntrica en los presses de banca. En el saco, mantener guardia cerrada y girar cadera en el hook.',
  '[
    {
      "id": "D1",
      "dayName": "Día 1: Empuje (Pecho, Hombro, Tríceps)",
      "focus": "Fuerza & Densidad",
      "exercises": [
        {"id": "E1", "name": "Press Banca con Barra", "sets": 4, "reps": "8-10", "rest": "90s", "notes": "Pesado, pausa en pecho"},
        {"id": "E2", "name": "Press Inclinado con Mancuernas", "sets": 3, "reps": "10-12", "rest": "60s", "notes": "Enfoque clavicular"},
        {"id": "E3", "name": "Press Militar de Pie", "sets": 4, "reps": "8", "rest": "90s", "notes": "Apretar glúteos y core"},
        {"id": "E4", "name": "Fondos en Paralelas lastrados", "sets": 3, "reps": "10", "rest": "60s", "notes": "Inclinación leve al frente"},
        {"id": "E5", "name": "Sombra de Boxeo con Mancuernas 1kg", "sets": 4, "reps": "3 min", "rest": "45s", "notes": "Jabs, cross y desplazamientos"}
      ]
    },
    {
      "id": "D2",
      "dayName": "Día 2: Tracción (Espalda & Bíceps)",
      "focus": "Amplitud & Potencia dorsal",
      "exercises": [
        {"id": "E6", "name": "Dominadas con Agarre Prono", "sets": 4, "reps": "8-10", "rest": "90s", "notes": "Subir hasta barbilla"},
        {"id": "E7", "name": "Remo con Barra Pendlay", "sets": 4, "reps": "8", "rest": "90s", "notes": "Espalda recta horizontal"},
        {"id": "E8", "name": "Jalón al Pecho Agarre Neutro", "sets": 3, "reps": "12", "rest": "60s", "notes": "Apretar dorsales abajo"},
        {"id": "E9", "name": "Curl de Bíceps con Barra Z", "sets": 3, "reps": "10-12", "rest": "60s", "notes": "Sin balanceo corporal"}
      ]
    },
    {
      "id": "D3",
      "dayName": "Día 3: Piernas & Core",
      "focus": "Fuerza explosiva & Estabilidad",
      "exercises": [
        {"id": "E10", "name": "Sentadilla Trasera con Barra", "sets": 4, "reps": "6-8", "rest": "120s", "notes": "Profunda con cadera estable"},
        {"id": "E11", "name": "Prensa de Piernas 45°", "sets": 3, "reps": "10-12", "rest": "90s", "notes": "Rango completo"},
        {"id": "E12", "name": "Peso Muerto Rumano", "sets": 3, "reps": "10", "rest": "90s", "notes": "Sentir estiramiento femoral"},
        {"id": "E13", "name": "Rueda Abdominal + Plancha", "sets": 4, "reps": "15 reps / 45s", "rest": "45s", "notes": "Core compacto"}
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
sqlLines.push('-- Seed de Progresos Físicos para MEM-001');
sqlLines.push(`insert into public.progresos (id, member_id, fecha, peso_kg, press_banca_kg, sentadilla_kg, peso_muerto_kg, pullups_reps, observaciones)
values
  ('PRG-01', 'MEM-001', '28 Oct 2026', 76.5, 95.0, 120.0, 140.0, 14, 'Excelente fuerza en sentadilla profunda y mejoría notable en resistencia en saco.'),
  ('PRG-02', 'MEM-001', '30 Sep 2026', 75.2, 90.0, 115.0, 135.0, 12, 'Inicio del ciclo de fuerza. Adaptación técnica.')
on conflict (id) do nothing;`);

sqlLines.push('');
sqlLines.push('-- Seed de Asistencias Activas (Aforo en sala de los últimos 45 min)');
sqlLines.push(`insert into public.asistencias (socio_id, dni, nombre, turno, fecha_ingreso)
values
  ('MEM-001', '73921845', 'Luis Gerardo Llocclla', 'manana', now() - interval '25 minutes'),
  ('MEM-014', '46410051', 'Betty Romero Gavilan', 'manana', now() - interval '45 minutes'),
  ('MEM-031', '70472299', 'Alfred Choque Solis', 'manana', now() - interval '10 minutes')
on conflict do nothing;`);

const sqlPath = path.join(__dirname, '..', 'supabase', 'seed_socios_completo.sql');
fs.writeFileSync(sqlPath, sqlLines.join('\n'), 'utf8');
console.log(`✅ Guardado en ${sqlPath} con ${parsedMembers.length} socios.`);
