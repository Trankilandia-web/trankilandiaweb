-- ==============================================================================
-- TRANKILANDIA GYM · MIGRACIÓN: RPC ATÓMICO PARA VINCULACIÓN SEGURA DE DNI
-- ==============================================================================
-- Permite que cualquier cliente que ingrese con Google/correo pueda vincular
-- su membresía existente sin ser bloqueado por las políticas RLS.
-- ==============================================================================

-- 1. Política de consulta segura de DNI no vinculado
drop policy if exists "Clientes consultan socio no vinculado por DNI" on public.socios;
create policy "Clientes consultan socio no vinculado por DNI"
  on public.socios for select
  to authenticated
  using (
    user_id is null or user_id = auth.uid()
  );

-- 2. Función RPC: vincular_socio_por_dni
create or replace function public.vincular_socio_por_dni(
  p_dni text,
  p_nombre text default null,
  p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_socio record;
  v_res jsonb;
  v_clean_dni text;
begin
  if v_uid is null then
    raise exception 'No autenticado: Inicia sesión para vincular tu carnet.';
  end if;

  v_clean_dni := regexp_replace(p_dni, '[^0-9]', '', 'g');
  if length(v_clean_dni) != 8 then
    return jsonb_build_object(
      'success', false, 
      'message', 'El DNI debe tener exactamente 8 dígitos numéricos.'
    );
  end if;

  -- 1. Buscar si ya existe el socio en el padrón
  select * into v_socio
  from public.socios
  where dni = v_clean_dni;

  if found then
    -- Si ya está vinculado a otra cuenta distinta
    if v_socio.user_id is not null and v_socio.user_id != v_uid then
      return jsonb_build_object(
        'success', false, 
        'message', 'Este DNI ya está vinculado a otra cuenta. Si es tu número, acércate a recepción.'
      );
    end if;

    -- Vincular socio y perfil
    update public.profiles
    set 
      dni = v_clean_dni,
      full_name = coalesce(v_socio.nombre, p_nombre, full_name),
      updated_at = now()
    where id = v_uid;

    update public.socios
    set
      user_id = v_uid,
      email = coalesce(p_email, email, (select email from public.profiles where id = v_uid)),
      updated_at = now()
    where id = v_socio.id;

    -- Retornar el socio actualizado en JSON
    select to_jsonb(s.*) into v_res
    from public.socios s
    where s.id = v_socio.id;

    return jsonb_build_object(
      'success', true,
      'is_new', false,
      'message', '¡Membresía vinculada con éxito a nombre de ' || v_socio.nombre || '!',
      'socio', v_res
    );
  else
    -- Si no existe en el padrón, crear cuenta nueva con membresía inactiva
    update public.profiles
    set
      dni = v_clean_dni,
      full_name = coalesce(p_nombre, full_name),
      membership_status = 'inactive',
      plan = 'Sin Membresía Activa',
      updated_at = now()
    where id = v_uid;

    insert into public.socios (
      id, nombre, dni, email, user_id, plan, precio_plan, tipo_pago,
      adelanto_pagado, saldo_pendiente, fecha_inicio, fecha_fin,
      metodo_pago, numero_boleta, turno, coach_asignado, observaciones
    ) values (
      'MEM-' || right(extract(epoch from now())::bigint::text, 4),
      coalesce(p_nombre, 'Nuevo Atleta'),
      v_clean_dni,
      p_email,
      v_uid,
      'Sin Membresía Activa',
      0,
      'full',
      0,
      0,
      (now() at time zone 'America/Lima')::date,
      (now() at time zone 'America/Lima')::date,
      'efectivo',
      'REG-' || right(v_clean_dni, 4),
      'manana',
      'Coach Marcos Rivas',
      'Cuenta digital creada. Pendiente de suscripción a un plan.'
    )
    returning to_jsonb(socios.*) into v_res;

    return jsonb_build_object(
      'success', true,
      'is_new', true,
      'message', 'Cuenta creada exitosamente con DNI ' || v_clean_dni || '. Acércate a recepción o suscríbete para activar tu membresía.',
      'socio', v_res
    );
  end if;
end;
$$;

revoke execute on function public.vincular_socio_por_dni(text, text, text) from public, anon;
grant execute on function public.vincular_socio_por_dni(text, text, text) to authenticated;
