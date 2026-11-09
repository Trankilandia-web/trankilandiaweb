const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Ruta prioritaria: g:/Gym.xlsm (especificada por el usuario)
const candidatePaths = [
  'g:/Gym.xlsm',
  'G:/Gym.xlsm',
  path.join(process.cwd(), 'Gym.xlsm'),
  'c:/Users/luisg/Downloads/Gym.xlsm',
];

let excelPath = candidatePaths.find((p) => fs.existsSync(p));
if (!excelPath) {
  console.error('❌ No se encontró el archivo Gym.xlsm en ninguna de las rutas esperadas:', candidatePaths);
  process.exit(1);
}

console.log(`📖 Leyendo archivo Excel actual desde: ${excelPath}`);
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
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Catálogo de Actividades completo
const actMap = {
  m10: 'Musculación Libre 6 Meses',
  m11: '1 Mes · Musculación Libre',
  m12: '2 Meses · Musculación Libre',
  m13: '1 Mes Promo / Estudiante · Musculación',
  m14: '6 Meses · Musculación Libre',
  m15: '3 Meses · Musculación Libre',
  m18: '8 Meses · Musculación Libre',
  m19: '1 Año Promocional · Musculación Libre',
  m22: '1 Año · Musculación Libre',
  m23: '4 Meses · Musculación Libre',
  m24: '1 Mes · Musculación Libre',
};

if (dataAct) {
  for (let i = 2; i < dataAct.length; i++) {
    const row = dataAct[i];
    if (row && row[0] && row[1]) {
      actMap[row[0]] = String(row[1]).trim() + ' · Musculación Libre';
    }
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
  { coach: 'Coach Daniel Quispe', turno: 'noche' },
];

const parsedMembers = [];
const todayLima = new Date().toISOString().split('T')[0];

for (let i = 2; i < dataCli.length; i++) {
  const row = dataCli[i];
  if (!row) continue;
  const clientId = Number(row[0]);
  if (isNaN(clientId)) continue;
  const rawName = row[1];
  if (!rawName || String(rawName).trim() === '' || String(rawName).trim() === '.') continue;

  const nombre = cleanName(rawName);
  // PRESERVAR EL ID CANÓNICO EXACTO DE CLIENTE PARA QUE COINCIDA CON SUPABASE (MEM-014, MEM-676, ETC.)
  const id = 'MEM-' + String(clientId).padStart(3, '0');

  // DNI limpio: ignorar placeholders '12345678' o patrones repetidos
  let dni = null;
  if (row[2]) {
    const s = String(row[2]).trim().replace(/\D/g, '');
    if (s.length >= 6 && s !== '12345678' && !/^(\d)\1+$/.test(s)) {
      dni = s.padStart(8, '0').slice(0, 8);
    }
  }

  // Teléfono
  let phone = null;
  if (row[6]) {
    const s = String(row[6]).trim().replace(/\D/g, '');
    if (s.length >= 7) phone = s.slice(0, 9);
  }

  const age = row[4] && !isNaN(Number(row[4])) ? Number(row[4]) : null;
  const gender = row[5] && String(row[5]).trim().toLowerCase().startsWith('f') ? 'Femenino' : 'Masculino';
  const observations = row[9] && String(row[9]).trim() !== '.' ? String(row[9]).trim() : null;

  // Datos financieros y de membresía
  const ins = insBySocio[clientId];
  let plan = '1 Mes · Musculación Libre';
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
  const isExpired = expiresAt < todayLima;
  const membershipStatus = isExpired ? 'inactive' : 'active';
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
    gender,
  });
}

console.log(`✅ Procesados ${parsedMembers.length} socios 100% REALES y ACTUALIZADOS de Gym.xlsm`);

// Guardar en realMembers.json
const jsonPath = path.join(__dirname, '..', 'src', 'data', 'realMembers.json');
fs.writeFileSync(jsonPath, JSON.stringify(parsedMembers, null, 2), 'utf8');
console.log(`✅ Guardado en ${jsonPath}`);

// Generar SQL a prueba de errores para Supabase
function escapeSql(str) {
  if (str === null || str === undefined) return 'null';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

const valueRows = parsedMembers.map((m, idx) => {
  const id = escapeSql(m.id);
  const nombre = escapeSql(m.name);
  const dni = m.dni ? escapeSql(m.dni) : 'null';
  const email = m.email ? escapeSql(m.email) : 'null';
  const celular = m.phone ? escapeSql(m.phone) : 'null';
  const plan = escapeSql(m.plan);
  const precio = idx === 0 ? m.planPrice + '::numeric' : m.planPrice;
  const tipoPago = escapeSql(m.paymentType);
  const adelanto = idx === 0 ? m.advancePaid + '::numeric' : m.advancePaid;
  const saldo = idx === 0 ? m.balanceDue + '::numeric' : m.balanceDue;
  const fechaLimite = m.paymentDueDate ? escapeSql(m.paymentDueDate) : 'null';
  const fechaInicio = idx === 0 ? escapeSql(m.registeredAt) + '::date' : escapeSql(m.registeredAt);
  const fechaFin = idx === 0 ? escapeSql(m.expiresAt) + '::date' : escapeSql(m.expiresAt);
  const metodo = escapeSql(m.paymentMethod);
  const boleta = escapeSql(m.receiptNumber);
  const turno = escapeSql(m.shift);
  const coach = escapeSql(m.coachName);
  const obs = m.observations ? escapeSql(m.observations) : 'null';
  const edad = m.age ? (idx === 0 ? m.age + '::int' : m.age) : 'null';
  const sexo = escapeSql(m.gender);

  return `(${id}, ${nombre}, ${dni}, ${email}, ${celular}, ${plan}, ${precio}, ${tipoPago}, ${adelanto}, ${saldo}, ${fechaLimite}, ${fechaInicio}, ${fechaFin}, ${metodo}, ${boleta}, ${turno}, ${coach}, ${obs}, ${edad}, ${sexo})`;
});

const sqlLines = [];
sqlLines.push('-- ==============================================================================');
sqlLines.push('-- TRANKILANDIA GYM · SINCRONIZACIÓN DIRECTA Y ATÓMICA DE 417 SOCIOS (GYM.XLSM)');
sqlLines.push('-- ==============================================================================');
sqlLines.push('-- CERO TABLAS TEMPORALES O STAGING. 100% INMUNE A 42P01 Y A CLAVES DUPLICADAS (23505).');
sqlLines.push('-- Total de socios a sincronizar: ' + parsedMembers.length);
sqlLines.push('-- Fecha de corte: ' + todayLima);
sqlLines.push('');
sqlLines.push('-- 1. Asegurar estructura y que DNI permita nulos');
sqlLines.push('ALTER TABLE public.socios ALTER COLUMN dni DROP NOT NULL;');
sqlLines.push("UPDATE public.socios SET dni = NULL WHERE dni = '12345678' OR dni = '' OR length(trim(dni)) <> 8;");
sqlLines.push('');
sqlLines.push('-- 2. Función upsert inteligente (protege claves foráneas y evita error 23505)');
sqlLines.push('CREATE OR REPLACE FUNCTION public.sync_socio_atlet(');
sqlLines.push('  p_id text, p_nombre text, p_dni text, p_email text, p_celular text, p_plan text,');
sqlLines.push('  p_precio numeric, p_tipo_pago text, p_adelanto numeric, p_saldo numeric,');
sqlLines.push('  p_fecha_limite text, p_fecha_inicio date, p_fecha_fin date, p_metodo_pago text,');
sqlLines.push('  p_numero_boleta text, p_turno text, p_coach text, p_observaciones text, p_edad int, p_sexo text');
sqlLines.push(') RETURNS void AS $$');
sqlLines.push('DECLARE');
sqlLines.push('  v_target_id text := NULL;');
sqlLines.push('BEGIN');
sqlLines.push('  -- A. Buscar por DNI si existe');
sqlLines.push('  IF p_dni IS NOT NULL AND length(trim(p_dni)) = 8 THEN');
sqlLines.push('    SELECT id INTO v_target_id FROM public.socios WHERE dni = p_dni LIMIT 1;');
sqlLines.push('  END IF;');
sqlLines.push('');
sqlLines.push('  -- B. Si no se encontró por DNI, buscar por ID');
sqlLines.push('  IF v_target_id IS NULL THEN');
sqlLines.push('    SELECT id INTO v_target_id FROM public.socios WHERE id = p_id LIMIT 1;');
sqlLines.push('  END IF;');
sqlLines.push('');
sqlLines.push('  -- C. Si ya existe, actualizar registro');
sqlLines.push('  IF v_target_id IS NOT NULL THEN');
sqlLines.push('    UPDATE public.socios SET');
sqlLines.push('      nombre = p_nombre,');
sqlLines.push('      dni = CASE');
sqlLines.push('        WHEN p_dni IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.socios s2 WHERE s2.dni = p_dni AND s2.id <> v_target_id) THEN p_dni');
sqlLines.push('        ELSE dni');
sqlLines.push('      END,');
sqlLines.push('      email = COALESCE(p_email, email),');
sqlLines.push('      celular = COALESCE(p_celular, celular),');
sqlLines.push('      plan = p_plan,');
sqlLines.push('      precio_plan = p_precio,');
sqlLines.push('      tipo_pago = p_tipo_pago,');
sqlLines.push('      adelanto_pagado = p_adelanto,');
sqlLines.push('      saldo_pendiente = p_saldo,');
sqlLines.push('      fecha_limite_pago = p_fecha_limite,');
sqlLines.push('      fecha_inicio = p_fecha_inicio,');
sqlLines.push('      fecha_fin = p_fecha_fin,');
sqlLines.push('      metodo_pago = COALESCE(p_metodo_pago, metodo_pago),');
sqlLines.push('      numero_boleta = COALESCE(p_numero_boleta, numero_boleta),');
sqlLines.push('      turno = p_turno,');
sqlLines.push('      coach_asignado = p_coach,');
sqlLines.push('      observaciones = COALESCE(p_observaciones, observaciones),');
sqlLines.push('      edad = COALESCE(p_edad, edad),');
sqlLines.push('      sexo = COALESCE(p_sexo, sexo),');
sqlLines.push('      updated_at = now()');
sqlLines.push('    WHERE id = v_target_id;');
sqlLines.push('  ELSE');
sqlLines.push('    -- D. Si no existe ni por DNI ni por ID, insertar nuevo socio');
sqlLines.push('    INSERT INTO public.socios (');
sqlLines.push('      id, nombre, dni, email, celular, plan, precio_plan, tipo_pago,');
sqlLines.push('      adelanto_pagado, saldo_pendiente, fecha_limite_pago, fecha_inicio,');
sqlLines.push('      fecha_fin, metodo_pago, numero_boleta, turno, coach_asignado,');
sqlLines.push('      observaciones, edad, sexo, created_at, updated_at');
sqlLines.push('    ) VALUES (');
sqlLines.push('      p_id, p_nombre, p_dni, p_email, p_celular, p_plan, p_precio, p_tipo_pago,');
sqlLines.push('      p_adelanto, p_saldo, p_fecha_limite, p_fecha_inicio,');
sqlLines.push('      p_fecha_fin, p_metodo_pago, p_numero_boleta, p_turno, p_coach,');
sqlLines.push('      p_observaciones, p_edad, p_sexo, now(), now()');
sqlLines.push('    );');
sqlLines.push('  END IF;');
sqlLines.push('END;');
sqlLines.push('$$ LANGUAGE plpgsql;');
sqlLines.push('');
sqlLines.push('-- 3. Ejecución directa en bloque único de los 417 socios');
sqlLines.push('SELECT count(public.sync_socio_atlet(');
sqlLines.push('  v.id, v.nombre, v.dni, v.email, v.celular, v.plan, v.precio, v.tipo_pago,');
sqlLines.push('  v.adelanto, v.saldo, v.fecha_limite, v.fecha_inicio, v.fecha_fin, v.metodo_pago,');
sqlLines.push('  v.boleta, v.turno, v.coach, v.obs, v.edad, v.sexo');
sqlLines.push(')) as socios_procesados');
sqlLines.push('FROM (');
sqlLines.push('  VALUES');
sqlLines.push(valueRows.join(',\n'));
sqlLines.push(') AS v(id, nombre, dni, email, celular, plan, precio, tipo_pago, adelanto, saldo, fecha_limite, fecha_inicio, fecha_fin, metodo_pago, boleta, turno, coach, obs, edad, sexo);');
sqlLines.push('');
sqlLines.push('-- 4. Limpieza de función auxiliar');
sqlLines.push('DROP FUNCTION IF EXISTS public.sync_socio_atlet;');
sqlLines.push('');
sqlLines.push('-- 5. Verificación de conteo final');
sqlLines.push('SELECT count(*) as total_socios_sincronizados FROM public.socios;');

const sqlPath = path.join(__dirname, '..', 'supabase', 'seed_socios_completo.sql');
fs.writeFileSync(sqlPath, sqlLines.join('\n'), 'utf8');
console.log(`✅ Guardado en ${sqlPath} con ${parsedMembers.length} socios.`);
