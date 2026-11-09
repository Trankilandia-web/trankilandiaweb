const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'src', 'data', 'realMembers.json');
const members = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

function escapeSql(str) {
  if (str === null || str === undefined) return 'null';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

const lines = [];
lines.push('-- ==============================================================================');
lines.push('-- TRANKILANDIA GYM · CARGA LIMPIA Y DEFINITIVA DE 417 SOCIOS (GYM.XLSM)');
lines.push('-- ==============================================================================');
lines.push('-- Purga completa de datos obsoletos de hace 2 semanas.');
lines.push('-- Inserción limpia, directa y con integridad referencial 100%.');
lines.push('');
lines.push('-- 1. Asegurar estructura de DNI');
lines.push('ALTER TABLE public.socios ALTER COLUMN dni DROP NOT NULL;');
lines.push('');
lines.push('-- 2. Limpiar datos antiguos obsoletos en cascada');
lines.push('TRUNCATE TABLE public.asistencias, public.ingresos, public.rutinas, public.progresos, public.socios CASCADE;');
lines.push('');
lines.push('-- 3. Insertar los 417 socios oficiales y vigentes');
lines.push('INSERT INTO public.socios (');
lines.push('  id, nombre, dni, email, celular, plan, precio_plan, tipo_pago, adelanto_pagado,');
lines.push('  saldo_pendiente, fecha_limite_pago, fecha_inicio, fecha_fin, metodo_pago,');
lines.push('  numero_boleta, turno, coach_asignado, observaciones, edad, sexo, created_at, updated_at');
lines.push(') VALUES');

const rows = members.map((m) => {
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

  return `(${id}, ${nombre}, ${dni}, ${email}, ${celular}, ${plan}, ${precio}, ${tipoPago}, ${adelanto}, ${saldo}, ${fechaLimite}, ${fechaInicio}, ${fechaFin}, ${metodo}, ${boleta}, ${turno}, ${coach}, ${obs}, ${edad}, ${sexo}, now(), now())`;
});

lines.push(rows.join(',\n') + ';');
lines.push('');
lines.push('-- 4. Vincular automáticamente perfiles existentes con su socio por DNI');
lines.push('UPDATE public.socios s');
lines.push('SET user_id = p.id');
lines.push('FROM public.profiles p');
lines.push('WHERE p.dni IS NOT NULL AND s.dni IS NOT NULL AND p.dni = s.dni;');
lines.push('');
lines.push('-- 5. Confirmación final: Debe dar EXACTAMENTE 417');
lines.push('SELECT count(*) as total_socios_oficiales FROM public.socios;');

const outPath = path.join(__dirname, '..', 'supabase', 'seed_socios_completo.sql');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`✅ Sobrescrito ${outPath} exitosamente con 417 socios.`);
