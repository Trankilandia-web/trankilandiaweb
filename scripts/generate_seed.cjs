const fs = require('fs');
const path = require('path');

const membersPath = path.join(__dirname, '..', 'src', 'data', 'realMembers.json');
const outputPath = path.join(__dirname, '..', 'supabase', 'seed_socios_completo.sql');

const members = JSON.parse(fs.readFileSync(membersPath, 'utf8'));

function escapeSql(str) {
  if (str === null || str === undefined) return 'null';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

function parseExpiry(exp) {
  if (!exp) return "'2026-11-30'::date";
  if (exp.includes('22 Nov')) return "'2026-11-22'::date";
  if (exp.includes('15 Dic')) return "'2026-12-15'::date";
  return "'2026-11-30'::date";
}

function parseStart(reg) {
  if (reg && reg.includes('22 Oct')) return "'2026-10-22'::date";
  return "'2026-10-01'::date";
}

const coachesStaff = [
  { coach: 'Coach Marcos Rivas', turno: 'manana' },
  { coach: 'Coach Camila Mendoza', turno: 'manana' },
  { coach: 'Coach Valeria Gómez', turno: 'tarde' },
  { coach: 'Coach Daniel Quispe', turno: 'noche' }
];

const lines = [];
lines.push('-- ==============================================================================');
lines.push('-- TRANKILANDIA GYM · SEED OFICIAL: 389 SOCIOS REALES (GYM.XLSM) + RUTINAS');
lines.push('-- ==============================================================================');
lines.push('-- Carga masiva de socios reales del padrón de Huamanga, Ayacucho');
lines.push('-- Distribución oficial en 3 turnos y 4 entrenadores (2 varones, 2 mujeres).');
lines.push('');
lines.push('insert into public.socios (');
lines.push('  id, nombre, dni, email, celular, plan, precio_plan, tipo_pago, adelanto_pagado,');
lines.push('  saldo_pendiente, fecha_limite_pago, fecha_inicio, fecha_fin, metodo_pago,');
lines.push('  numero_boleta, turno, coach_asignado, observaciones, edad, sexo');
lines.push(') values');

const valueRows = members.map((m, index) => {
  let coachInfo;
  if (m.id === 'MEM-001') {
    coachInfo = coachesStaff[0]; // Coach Marcos Rivas, mañana
  } else {
    coachInfo = coachesStaff[index % 4];
  }
  
  const id = escapeSql(m.id);
  const nombre = escapeSql(m.name);
  const dni = escapeSql(m.dni);
  const email = escapeSql(m.email);
  const celular = escapeSql(m.phone);
  const plan = escapeSql(m.plan || '1 mes · Musculación Libre');
  const precio = Number(m.planPrice || 80);
  const tipoPago = escapeSql(m.paymentType || 'full');
  const adelanto = Number(m.advancePaid || 0);
  const saldo = Number(m.balanceDue || 0);
  const fechaLimite = escapeSql(m.paymentDueDate || null);
  const fechaInicio = parseStart(m.registeredAt);
  const fechaFin = parseExpiry(m.expiresAt);
  const metodo = escapeSql(m.paymentMethod || 'efectivo');
  const boleta = escapeSql(m.receiptNumber || ('B001-' + String(100 + index)));
  const turno = escapeSql(coachInfo.turno);
  const coach = escapeSql(coachInfo.coach);
  const obs = escapeSql(m.observations || null);
  const edad = m.age ? Number(m.age) : 'null';
  const sexo = escapeSql(m.gender || (index % 2 === 0 ? 'Masculino' : 'Femenino'));

  return `(${id}, ${nombre}, ${dni}, ${email}, ${celular}, ${plan}, ${precio}, ${tipoPago}, ${adelanto}, ${saldo}, ${fechaLimite}, ${fechaInicio}, ${fechaFin}, ${metodo}, ${boleta}, ${turno}, ${coach}, ${obs}, ${edad}, ${sexo})`;
});

lines.push(valueRows.join(',\n'));
lines.push('on conflict (dni) do update set');
lines.push('  nombre = excluded.nombre,');
lines.push('  saldo_pendiente = excluded.saldo_pendiente,');
lines.push('  adelanto_pagado = excluded.adelanto_pagado,');
lines.push('  turno = excluded.turno,');
lines.push('  coach_asignado = excluded.coach_asignado,');
lines.push('  fecha_fin = excluded.fecha_fin;');

lines.push('');
lines.push('-- Vincular automáticamente el usuario de Supabase Auth si ya inició sesión');
lines.push('update public.socios');
lines.push('set user_id = p.id');
lines.push('from public.profiles p');
lines.push('where (p.email = socios.email or p.dni = socios.dni)');
lines.push('  and socios.user_id is null;');

lines.push('');
lines.push('-- 2. Seed de Rutina Oficial para MEM-001 (Luis Gerardo Llocclla)');
lines.push(`insert into public.rutinas (member_id, title, objective, coach_name, coach_notes, days)
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

lines.push('');
lines.push('-- 3. Seed de Progresos Físicos de ejemplo para MEM-001');
lines.push(`insert into public.progresos (id, member_id, fecha, peso_kg, press_banca_kg, sentadilla_kg, peso_muerto_kg, pullups_reps, observaciones)
values
  ('PRG-01', 'MEM-001', '28 Oct 2026', 76.5, 95.0, 120.0, 140.0, 14, 'Excelente fuerza en sentadilla profunda y mejoría notable en resistencia en saco.'),
  ('PRG-02', 'MEM-001', '30 Sep 2026', 75.2, 90.0, 115.0, 135.0, 12, 'Inicio del ciclo de fuerza. Adaptación técnica.')
on conflict (id) do nothing;`);

lines.push('');
lines.push('-- 4. Seed de Asistencias Activas (Para que el Aforo de 90 min en Caja y Admin muestre datos reales de inmediato)');
lines.push(`insert into public.asistencias (socio_id, dni, nombre, turno, fecha_ingreso)
values
  ('MEM-001', '73921845', 'Luis Gerardo Llocclla', 'manana', now() - interval '25 minutes'),
  ('MEM-014', '46410051', 'Betty Romero Gavilan', 'manana', now() - interval '45 minutes'),
  ('MEM-031', '70472299', 'Alfred Choque Solis', 'manana', now() - interval '10 minutes');`);

fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
console.log(`✅ Archivo generado exitosamente en ${outputPath} con ${valueRows.length} socios.`);
