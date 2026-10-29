-- ==============================================================================
-- TRANKILANDIA GYM · MIGRACIÓN: ARQUEO DE CAJA CONSOLIDADO & SINCRONIZACIÓN
-- ==============================================================================
-- 1. Sincroniza todos los cobros históricos de membresías (S/. 65,249.00) en public.ingresos
-- 2. Actualiza obtener_resumen_admin para calcular recaudación total y por periodos
-- ==============================================================================

-- 1. Registrar pagos históricos de membresías en public.ingresos (Idempotente)
insert into public.ingresos (key_socio, monto, metodo_pago, tipo, observacion, created_at)
select
  s.id,
  s.adelanto_pagado,
  coalesce(nullif(lower(s.metodo_pago), ''), 'efectivo'),
  case when s.saldo_pendiente > 0 then 'Adelanto de Membresía' else 'Membresía Completa' end,
  'Cobro registrado de membresía ' || coalesce(s.plan, 'Musculación Libre') || ' (Padrón Oficial)',
  coalesce((s.fecha_inicio::text || ' 10:00:00 -05')::timestamptz, s.created_at, now())
from public.socios s
where s.adelanto_pagado > 0
  and not exists (
    select 1 from public.ingresos i where i.key_socio = s.id
  );

-- 2. Función RPC: obtener_resumen_admin optimizada
create or replace function public.obtener_resumen_admin(
  p_fecha_inicio date default null,
  p_fecha_fin date default (now() at time zone 'America/Lima')::date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_recaudado numeric(10,2) := 0;
  v_total_membresias numeric(10,2) := 0;
  v_total_pos numeric(10,2) := 0;
  v_metodos jsonb;
  v_socios_stats jsonb;
  v_inventario_stats jsonb;
  v_asistencias_stats jsonb;
  v_inicio date;
  v_fin date;
begin
  -- 0. Verificar permisos de Administrador
  if public.get_auth_role() != 'admin' then
    raise exception 'Acceso restringido: Solo el Administrador puede consultar el resumen gerencial.';
  end if;

  v_inicio := coalesce(p_fecha_inicio, '2020-01-01'::date);
  v_fin := coalesce(p_fecha_fin, (now() at time zone 'America/Lima')::date);

  -- 1. Arqueo consolidado de ingresos en public.ingresos
  select
    coalesce(sum(monto), 0),
    coalesce(sum(case when tipo != 'Venta POS Productos' and venta_id is null then monto else 0 end), 0),
    coalesce(sum(case when tipo = 'Venta POS Productos' or venta_id is not null then monto else 0 end), 0),
    jsonb_build_object(
      'efectivo', coalesce(sum(case when lower(metodo_pago) = 'efectivo' then monto else 0 end), 0),
      'yape', coalesce(sum(case when lower(metodo_pago) like '%yape%' then monto else 0 end), 0),
      'plin', coalesce(sum(case when lower(metodo_pago) like '%plin%' then monto else 0 end), 0),
      'tarjeta', coalesce(sum(case when lower(metodo_pago) like '%tarjeta%' or lower(metodo_pago) like '%pos%' then monto else 0 end), 0)
    )
  into v_total_recaudado, v_total_membresias, v_total_pos, v_metodos
  from public.ingresos
  where (created_at at time zone 'America/Lima')::date between v_inicio and v_fin;

  -- Respaldo de seguridad: si public.ingresos estuviera vacío o sin rango, consolidar con public.socios
  if v_total_recaudado = 0 and (p_fecha_inicio is null or p_fecha_inicio <= '2020-01-01'::date) then
    select
      coalesce(sum(s.adelanto_pagado), 0),
      coalesce(sum(s.adelanto_pagado), 0),
      0,
      jsonb_build_object(
        'efectivo', coalesce(sum(case when lower(s.metodo_pago) = 'efectivo' then s.adelanto_pagado else 0 end), 0),
        'yape', coalesce(sum(case when lower(s.metodo_pago) like '%yape%' then s.adelanto_pagado else 0 end), 0),
        'plin', coalesce(sum(case when lower(s.metodo_pago) like '%plin%' then s.adelanto_pagado else 0 end), 0),
        'tarjeta', coalesce(sum(case when lower(s.metodo_pago) like '%tarjeta%' then s.adelanto_pagado else 0 end), 0)
      )
    into v_total_recaudado, v_total_membresias, v_total_pos, v_metodos
    from public.socios s;
  end if;

  -- 2. Estadísticas de Socios y Turnos
  select jsonb_build_object(
    'total_socios', count(*),
    'total_deudas_pendientes', coalesce(sum(saldo_pendiente), 0),
    'socios_con_deuda', count(case when saldo_pendiente > 0 then 1 end),
    'por_turno', jsonb_build_object(
      'manana', count(case when turno = 'manana' then 1 end),
      'tarde', count(case when turno = 'tarde' then 1 end),
      'noche', count(case when turno = 'noche' then 1 end)
    ),
    'por_coach', jsonb_build_object(
      'marcos', count(case when coach_asignado ilike '%Marcos%' then 1 end),
      'camila', count(case when coach_asignado ilike '%Camila%' then 1 end),
      'valeria', count(case when coach_asignado ilike '%Valeria%' then 1 end),
      'daniel', count(case when coach_asignado ilike '%Daniel%' then 1 end)
    )
  ) into v_socios_stats
  from public.socios;

  -- 3. Métricas de Inventario y Margen de Ganancia
  select jsonb_build_object(
    'total_productos', count(*),
    'productos_stock_critico', count(case when stock_actual <= stock_minimo and activo = true then 1 end),
    'valor_costo', coalesce(sum(stock_actual * precio_compra), 0),
    'valor_venta', coalesce(sum(stock_actual * precio_venta), 0),
    'ganancia_estimada', coalesce(sum(stock_actual * (precio_venta - precio_compra)), 0)
  ) into v_inventario_stats
  from public.productos
  where activo = true;

  -- 4. Métricas de Asistencias y Aforo en el rango de fechas
  select jsonb_build_object(
    'total_asistencias', count(*),
    'por_turno', jsonb_build_object(
      'manana', count(case when turno = 'manana' then 1 end),
      'tarde', count(case when turno = 'tarde' then 1 end),
      'noche', count(case when turno = 'noche' then 1 end)
    )
  ) into v_asistencias_stats
  from public.asistencias
  where (fecha_ingreso at time zone 'America/Lima')::date between v_inicio and v_fin;

  return jsonb_build_object(
    'periodo', jsonb_build_object(
      'inicio', v_inicio::text,
      'fin', v_fin::text
    ),
    'recaudacion', jsonb_build_object(
      'total', v_total_recaudado,
      'membresias', v_total_membresias,
      'pos', v_total_pos,
      'por_metodo', v_metodos
    ),
    'socios', v_socios_stats,
    'inventario', v_inventario_stats,
    'asistencias', v_asistencias_stats
  );
end;
$$;

revoke execute on function public.obtener_resumen_admin(date, date) from public, anon;
grant execute on function public.obtener_resumen_admin(date, date) to authenticated;
