import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { obtenerSocioActivo, obtenerSocioPorUserId, fetchSociosParaAdmin, registrarAsistencia, cargarAsistenciasActivas90Min, vincularDniCliente } from '../../lib/supabaseDb';

// Disposable local Supabase only. Config/setup reject remote origins before any
// request. This suite creates and removes its own synthetic fixture records.
const admin = createClient(import.meta.env.VITE_SUPABASE_URL!, process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const fixtureId = `MEM-TEST-${crypto.randomUUID()}`;
const dni = String(10000000 + Math.floor(Math.random() * 80000000));
let userId: string | undefined;

beforeAll(async () => {
  const email = `fixture-${crypto.randomUUID()}@example.invalid`;
  const password = `Fixture-${crypto.randomUUID()}!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw created.error;
  userId = created.data.user.id;
  const profile = await admin.from('profiles').update({ role: 'admin' }).eq('id', userId);
  if (profile.error) throw profile.error;
  const inserted = await admin.from('socios').insert({
    id: fixtureId, dni, nombre: 'Socio Fixture Integración', plan: 'Plan Fixture', precio_plan: 80,
    tipo_pago: 'full', adelanto_pagado: 80, saldo_pendiente: 0, fecha_fin: '2099-12-31',
    turno: 'manana', coach_asignado: 'Coach Fixture', metodo_pago: 'efectivo', user_id: userId,
  });
  if (inserted.error) throw inserted.error;
  const login = await supabase.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
}, 15000);

afterAll(async () => {
  await supabase.auth.signOut();
  await admin.from('asistencias').delete().eq('socio_id', fixtureId);
  await admin.from('socios').delete().eq('id', fixtureId);
  if (userId) await admin.auth.admin.deleteUser(userId);
});

describe('Supabase local · fixtures sintéticos', () => {
  it('consulta por DNI y mapea correctamente una membresía', async () => {
    const socio = await obtenerSocioActivo({ dni });
    expect(socio).toMatchObject({ id: fixtureId, name: 'Socio Fixture Integración', dni, plan: 'Plan Fixture', coachName: 'Coach Fixture', shift: 'manana' });
  });
  it('resuelve identificadores legacy sin enviarlos como UUID', async () => {
    const socio = await obtenerSocioPorUserId(`socio-${dni}`);
    expect(socio?.id).toBe(fixtureId);
  });
  it('retorna null para un DNI inexistente', async () => {
    expect(await obtenerSocioActivo({ dni: '00000000' })).toBeNull();
  });
  it('incluye la fixture en el padrón obtenido del servidor', async () => {
    const socios = await fetchSociosParaAdmin();
    expect(socios.find((s) => s.id === fixtureId)?.dni).toBe(dni);
  });
  it('registra asistencia de la fixture y permite leerla en la sala', async () => {
    const result = await registrarAsistencia({ socio_id: fixtureId, dni, nombre: 'Socio Fixture Integración', turno: 'manana' });
    expect(result.success).toBe(true);
    const activas = await cargarAsistenciasActivas90Min();
    expect(activas.some((a) => a.socio_id === fixtureId)).toBe(true);
  });
  it('requiere verificar titularidad en recepción antes de vincular una identidad', async () => {
    const result = await vincularDniCliente(userId!, 'fixture@example.invalid', dni);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/recepción|titularidad/i);
  });
});
