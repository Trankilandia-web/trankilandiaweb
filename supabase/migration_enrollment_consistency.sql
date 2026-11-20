-- Review/apply manually AFTER schema_production.sql and migration_security_consistency.sql.
-- Independent of migration_pos_consistency.sql. No historical members or receipts change.
-- Auth provisioning and user_id linkage remain exclusive to a verified trusted backend.
begin;

create table if not exists public.inscripciones_operaciones (
  operacion_id uuid primary key,
  socio_id text not null references public.socios(id),
  ingreso_id bigint references public.ingresos(id),
  usuario_id uuid not null references public.profiles(id),
  payload jsonb not null,
  resultado jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.inscripciones_operaciones enable row level security;
revoke all on table public.inscripciones_operaciones from public, anon, authenticated;

create or replace function public.registrar_socio_atomico(p_operacion_id uuid,p_socio jsonb)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_member public.socios%rowtype;
  v_operation public.inscripciones_operaciones%rowtype;
  v_key text;
  v_id text;
  v_dni text;
  v_price numeric;
  v_paid numeric;
  v_balance numeric;
  v_start date;
  v_end date;
  v_due date;
  v_income_id bigint;
  v_result jsonb;
begin
  if auth.uid() is null or coalesce(public.get_auth_role(),'') not in ('admin','caja') then
    raise exception 'No autorizado para registrar socios.' using errcode = '42501';
  end if;
  if p_operacion_id is null or p_socio is null or jsonb_typeof(p_socio) <> 'object' then
    raise exception 'Operación o datos del socio no válidos.';
  end if;
  if exists(select 1 from jsonb_object_keys(p_socio) as fields(key) where key not in (
    'id','nombre','dni','email','celular','plan','precio_plan','tipo_pago','adelanto_pagado',
    'saldo_pendiente','fecha_inicio','fecha_fin','fecha_limite_pago','metodo_pago',
    'numero_boleta','turno','coach_asignado','observaciones','edad','sexo'
  )) then raise exception 'El registro contiene un campo no permitido.'; end if;
  foreach v_key in array array['id','nombre','plan','tipo_pago','fecha_inicio','fecha_fin','metodo_pago','numero_boleta','turno','coach_asignado'] loop
    if coalesce(jsonb_typeof(p_socio->v_key),'') <> 'string' or nullif(btrim(p_socio->>v_key),'') is null then
      raise exception 'Campo requerido no válido: %.',v_key;
    end if;
  end loop;
  foreach v_key in array array['dni','email','celular','fecha_limite_pago','observaciones','sexo'] loop
    if p_socio ? v_key and jsonb_typeof(p_socio->v_key) not in ('string','null') then
      raise exception 'Formato no válido para el campo %.',v_key;
    end if;
  end loop;
  v_id := btrim(p_socio->>'id');
  v_dni := nullif(btrim(p_socio->>'dni'),'');
  if length(v_id) > 100 or length(p_socio->>'nombre') > 200 or length(p_socio->>'plan') > 200
     or length(p_socio->>'numero_boleta') > 100 or length(p_socio->>'coach_asignado') > 200
     or length(coalesce(p_socio->>'email','')) > 254 or length(coalesce(p_socio->>'celular','')) > 30
     or length(coalesce(p_socio->>'observaciones','')) > 2000 or length(coalesce(p_socio->>'sexo','')) > 40 then
    raise exception 'Datos del socio demasiado extensos.';
  end if;
  if v_dni is not null and v_dni !~ '^[0-9]{8}$' then raise exception 'DNI no válido: se requieren ocho dígitos.'; end if;
  foreach v_key in array array['precio_plan','adelanto_pagado','saldo_pendiente'] loop
    if coalesce(jsonb_typeof(p_socio->v_key),'') <> 'number'
       or coalesce(p_socio->>v_key,'') !~ '^[0-9]+(\.[0-9]{1,2})?$' then
      raise exception 'Importe no válido: %.',v_key;
    end if;
    if (p_socio->>v_key)::numeric > 99999999.99 then raise exception 'Importe fuera de rango.'; end if;
  end loop;
  v_price := (p_socio->>'precio_plan')::numeric;
  v_paid := (p_socio->>'adelanto_pagado')::numeric;
  v_balance := (p_socio->>'saldo_pendiente')::numeric;
  if v_paid + v_balance <> v_price then raise exception 'El adelanto y el saldo deben sumar el precio del plan.'; end if;
  if p_socio->>'tipo_pago' not in ('full','advance') or (p_socio->>'tipo_pago' = 'full' and v_balance <> 0) then
    raise exception 'El pago completo debe cubrir el precio del plan.';
  end if;
  if p_socio->>'metodo_pago' not in ('efectivo','yape','plin','tarjeta') then raise exception 'Método de pago no válido.'; end if;
  if p_socio->>'turno' not in ('manana','tarde','noche') then raise exception 'Turno no válido.'; end if;
  if p_socio->>'edad' is not null then
    if jsonb_typeof(p_socio->'edad') <> 'number' or p_socio->>'edad' !~ '^[0-9]{1,3}$' then raise exception 'Edad no válida.'; end if;
    if (p_socio->>'edad')::integer not between 1 and 120 then raise exception 'Edad no válida.'; end if;
  end if;
  foreach v_key in array array['fecha_inicio','fecha_fin','fecha_limite_pago'] loop
    if p_socio->>v_key is not null and p_socio->>v_key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Fecha no válida.'; end if;
  end loop;
  begin
    v_start := (p_socio->>'fecha_inicio')::date;
    v_end := (p_socio->>'fecha_fin')::date;
    v_due := (p_socio->>'fecha_limite_pago')::date;
  exception when invalid_datetime_format or datetime_field_overflow then raise exception 'Fecha no válida.';
  end;
  if v_start < date '1900-01-01' or v_end > date '2200-12-31' or v_end < v_start
     or (v_due is not null and (v_due < v_start or v_due > v_end)) then raise exception 'Fechas del plan o del pago no válidas.'; end if;

  -- Serialize the same operation, then identity conflicts from concurrent terminals.
  perform pg_advisory_xact_lock(hashtextextended('enrollment-operation:' || p_operacion_id::text,0));
  select * into v_operation from public.inscripciones_operaciones where operacion_id = p_operacion_id;
  if found then
    if v_operation.payload is distinct from p_socio then raise exception 'La operación ya existe con datos diferentes. Requiere revisión.'; end if;
    select * into v_member from public.socios where id = v_operation.socio_id;
    if not found or v_member.archivado_en is not null then raise exception 'El socio de esta inscripción fue archivado. Requiere revisión.'; end if;
    -- Return current confirmed data without undoing subsequent profile/plan updates.
    return v_operation.resultado || jsonb_build_object('socio',to_jsonb(v_member));
  end if;
  perform pg_advisory_xact_lock(hashtextextended('enrollment-member:' || v_id,0));
  if v_dni is not null then perform pg_advisory_xact_lock(hashtextextended('enrollment-dni:' || v_dni,0)); end if;
  if exists(select 1 from public.socios where id = v_id) then raise exception 'El ID del socio ya está registrado. Usa la renovación o revisa el padrón.' using errcode = '23505'; end if;
  if v_dni is not null and exists(select 1 from public.socios where dni = v_dni) then raise exception 'El DNI ya está registrado. Usa la renovación o revisa el padrón.' using errcode = '23505'; end if;

  -- Deliberately INSERT-only: never overwrite a member or infer an Auth identity.
  insert into public.socios(id,nombre,dni,email,celular,plan,precio_plan,tipo_pago,
    adelanto_pagado,saldo_pendiente,fecha_inicio,fecha_fin,fecha_limite_pago,metodo_pago,
    numero_boleta,turno,coach_asignado,observaciones,edad,sexo)
  values(v_id,btrim(p_socio->>'nombre'),v_dni,nullif(lower(btrim(p_socio->>'email')),''),
    nullif(btrim(p_socio->>'celular'),''),btrim(p_socio->>'plan'),v_price,p_socio->>'tipo_pago',
    v_paid,v_balance,v_start,v_end,v_due::text,p_socio->>'metodo_pago',btrim(p_socio->>'numero_boleta'),
    p_socio->>'turno',btrim(p_socio->>'coach_asignado'),nullif(btrim(p_socio->>'observaciones'),''),
    (p_socio->>'edad')::integer,nullif(btrim(p_socio->>'sexo'),'')) returning * into v_member;
  if v_paid > 0 then
    insert into public.ingresos(key_socio,monto,metodo_pago,tipo,observacion)
    values(v_id,v_paid,v_member.metodo_pago,
      case when v_member.tipo_pago = 'advance' then 'Adelanto de Membresía' else 'Membresía Completa' end,
      'Cobro boleta ' || v_member.numero_boleta || ' (' || v_member.plan || ')') returning id into v_income_id;
  end if;
  v_result := jsonb_build_object('success',true,'operacion_id',p_operacion_id,'socio',to_jsonb(v_member),'ingreso_id',v_income_id);
  insert into public.inscripciones_operaciones(operacion_id,socio_id,ingreso_id,usuario_id,payload,resultado)
  values(p_operacion_id,v_id,v_income_id,auth.uid(),p_socio,v_result);
  return v_result;
end;
$$;
revoke all on function public.registrar_socio_atomico(uuid,jsonb) from public,anon;
grant execute on function public.registrar_socio_atomico(uuid,jsonb) to authenticated;
commit;
