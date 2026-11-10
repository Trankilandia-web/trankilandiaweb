import { describe, it, expect, beforeEach } from 'vitest';
import {
  obtenerSocioActivo,
  obtenerSocioPorUserId,
  fetchSociosParaAdmin,
  registrarAsistencia,
  cargarAsistenciasActivas90Min,
  vincularDniCliente,
} from '../../lib/supabaseDb';

describe('Pruebas de Integración · Base de Datos Supabase en la Nube', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('obtenerSocioActivo debe consultar directamente por DNI a Supabase y mapear los datos del socio', async () => {
    // Betty Romero Gavilan es la socia oficial con DNI 46410051 en el padrón
    const socio = await obtenerSocioActivo({ dni: '46410051' });

    expect(socio).not.toBeNull();
    expect(socio?.name).toBe('Betty Romero Gavilan');
    expect(socio?.dni).toBe('46410051');
    expect(socio?.plan).toBeDefined();
    expect(socio?.coachName).toBeDefined();
    expect(socio?.shift).toBeDefined();
  });

  it('obtenerSocioActivo debe manejar identificadores sintéticos tipo socio-46410051 sin error 22P02 de PostgreSQL', async () => {
    // Al iniciar sesión por DNI, el userId se genera como 'socio-46410051'. No debe arrojar error de tipo UUID
    const socio = await obtenerSocioActivo({ userId: 'socio-46410051' });

    expect(socio).not.toBeNull();
    expect(socio?.name).toBe('Betty Romero Gavilan');
    expect(socio?.dni).toBe('46410051');
  });

  it('obtenerSocioPorUserId debe ser retrocompatible y delegar exitosamente a obtenerSocioActivo', async () => {
    const socio = await obtenerSocioPorUserId('socio-46410051');
    expect(socio).not.toBeNull();
    expect(socio?.dni).toBe('46410051');
  });

  it('obtenerSocioActivo debe retornar null de forma limpia para un DNI inexistente', async () => {
    const socio = await obtenerSocioActivo({ dni: '00000000' });
    expect(socio).toBeNull();
  });

  it('fetchSociosParaAdmin debe consultar el padrón en Supabase y retornar los socios oficiales', async () => {
    const socios = await fetchSociosParaAdmin();

    expect(socios).toBeDefined();
    expect(Array.isArray(socios)).toBe(true);
    expect(socios.length).toBeGreaterThanOrEqual(417);

    // Debe contener a socios representativos del Excel sin socios fantasma
    const betty = socios.find((s) => s.dni === '46410051');
    expect(betty).toBeDefined();
    expect(betty?.name).toBe('Betty Romero Gavilan');

    // No debe existir el socio fantasma MEM-2747
    const phantom = socios.find((s) => s.id === 'MEM-2747');
    expect(phantom).toBeUndefined();
  });

  it('registrarAsistencia debe registrar el ingreso en tiempo real y reflejarlo en los últimos 90 minutos', async () => {
    const res = await registrarAsistencia({
      socio_id: 'MEM-014',
      dni: '46410051',
      nombre: 'Betty Romero Gavilan',
      turno: 'manana',
    });

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.dni).toBe('46410051');

    // Verificar en lista activa de los últimos 90 minutos
    const activas = await cargarAsistenciasActivas90Min();
    expect(activas.some((a) => a.dni === '46410051')).toBe(true);
  });

  it('vincularDniCliente debe validar que el DNI tenga 8 dígitos', async () => {
    const res = await vincularDniCliente('dummy-user', 'test@gmail.com', '1234');
    expect(res.success).toBe(false);
    expect(res.message).toContain('8 dígitos');
  });

  it('vincularDniCliente con un socio existente debe vincular su membresía oficial sin crear socios fantasma', async () => {
    const validUuid = '00000000-0000-0000-0000-000000000001';
    const res = await vincularDniCliente(validUuid, 'betty.romero@gmail.com', '46410051', 'Betty Romero');
    expect(res.success).toBe(true);
    expect(res.member).toBeDefined();
    expect(res.member?.dni).toBe('46410051');
    expect(res.member?.name).toBe('Betty Romero Gavilan');
  }, 15000);
});
