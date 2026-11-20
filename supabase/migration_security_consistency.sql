-- Corrective migration. Review and apply AFTER the existing schema/migrations.
-- This file is intentionally not applied remotely by the application.
-- Provision Auth accounts with verified ownership in a trusted backend. Assign
-- profiles.role and personal.auth_user_id there, using exact Auth UUIDs, never
-- email patterns or user_metadata. Existing privileged accounts require review.
-- Rotate the legacy seeded PINs before enabling staff access.
begin;

create extension if not exists pgcrypto;
set local search_path = public, extensions, pg_temp;

-- Eliminate all email-based automatic role escalation.
drop trigger if exists trg_set_admin_role on public.profiles;
drop trigger if exists on_auth_user_created_superadmin on auth.users;
drop trigger if exists trg_admin_marisol_flores on auth.users;

create or replace function public.get_auth_role()
returns text language sql stable security definer
set search_path = public, pg_temp as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'cliente');
$$;
revoke all on function public.get_auth_role() from public, anon;
grant execute on function public.get_auth_role() to authenticated, service_role;

-- Replace every permissive policy instead of relying on names from one migration.
do $migration$
declare policy_row record; table_name text;
begin
  for policy_row in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename = any(array[
      'profiles','socios','personal','asistencias','productos','ventas',
      'venta_items','ingresos','rutinas','progresos','planes'
    ])
  loop
    execute format('drop policy %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
  foreach table_name in array array['profiles','socios','personal','asistencias','productos','ventas','venta_items','ingresos','rutinas','progresos','planes'] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    end if;
  end loop;
end;
$migration$;

-- Role, DNI and identity bindings are not editable from a browser profile form.
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url, updated_at) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.get_auth_role() in ('admin','caja'));
create policy profiles_edit_display on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles(id, email, full_name, avatar_url, role)
  values(new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url', 'cliente')
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.socios add column if not exists archivado_en timestamptz;
grant select, insert on public.socios to authenticated;
-- Archival and Auth identity bindings are reserved for checked server operations.
do $migration$
declare update_columns text;
begin
  select string_agg(quote_ident(attname),',') into update_columns from pg_attribute
  where attrelid = 'public.socios'::regclass and attnum > 0 and not attisdropped
    and attgenerated = '' and attname not in ('archivado_en','user_id');
  execute format('grant update (%s) on public.socios to authenticated',update_columns);
end;
$migration$;
create policy socios_staff_read on public.socios for select to authenticated
  using (archivado_en is null and (public.get_auth_role() in ('admin','caja','entrenador') or user_id = auth.uid()));
create policy socios_staff_insert on public.socios for insert to authenticated
  with check (public.get_auth_role() in ('admin','caja'));
create policy socios_staff_update on public.socios for update to authenticated
  using (archivado_en is null and public.get_auth_role() in ('admin','caja')) with check (public.get_auth_role() in ('admin','caja'));

grant select, insert on public.asistencias to authenticated;
create policy attendance_read on public.asistencias for select to authenticated
  using (public.get_auth_role() in ('admin','caja','entrenador') or exists(select 1 from public.socios s where s.id = socio_id and s.user_id = auth.uid()));
create policy attendance_insert on public.asistencias for insert to authenticated
  with check (public.get_auth_role() in ('admin','caja'));

grant select, insert, update on public.productos to authenticated;
create policy products_read on public.productos for select to authenticated
  using (public.get_auth_role() in ('admin','caja'));
create policy products_insert on public.productos for insert to authenticated
  with check (public.get_auth_role() in ('admin','caja'));
create policy products_update on public.productos for update to authenticated
  using (public.get_auth_role() in ('admin','caja')) with check (public.get_auth_role() in ('admin','caja'));

do $migration$
declare table_name text; sequence_name text;
begin
  foreach table_name in array array['ventas','venta_items','ingresos'] loop
    execute format('grant select, insert on public.%I to authenticated', table_name);
    execute format('create policy ledger_read on public.%I for select to authenticated using (public.get_auth_role() in (''admin'',''caja''))', table_name);
    execute format('create policy ledger_insert on public.%I for insert to authenticated with check (public.get_auth_role() in (''admin'',''caja''))', table_name);
  end loop;
  foreach table_name in array array['ventas','venta_items','ingresos','asistencias','progresos'] loop
    sequence_name := pg_get_serial_sequence('public.' || table_name, 'id');
    if sequence_name is not null then
      execute format('revoke all on sequence %s from public, anon', sequence_name);
      execute format('grant usage, select on sequence %s to authenticated', sequence_name);
    end if;
  end loop;
  foreach table_name in array array['rutinas','progresos'] loop
    execute format('grant select, insert, update on public.%I to authenticated', table_name);
    execute format('create policy training_read on public.%I for select to authenticated using (public.get_auth_role() in (''admin'',''caja'',''entrenador'') or exists(select 1 from public.socios s where s.id = member_id and s.user_id = auth.uid()))', table_name);
    execute format('create policy training_insert on public.%I for insert to authenticated with check (public.get_auth_role() in (''admin'',''entrenador''))', table_name);
    execute format('create policy training_update on public.%I for update to authenticated using (public.get_auth_role() in (''admin'',''entrenador'')) with check (public.get_auth_role() in (''admin'',''entrenador''))', table_name);
  end loop;
  if to_regclass('public.planes') is not null then
    grant select on public.planes to anon, authenticated;
    grant insert, update on public.planes to authenticated;
    create policy plans_read on public.planes for select to anon, authenticated using (true);
    create policy plans_insert on public.planes for insert to authenticated with check (public.get_auth_role() = 'admin');
    create policy plans_update on public.planes for update to authenticated using (public.get_auth_role() = 'admin') with check (public.get_auth_role() = 'admin');
  end if;
end;
$migration$;

-- Views must not bypass the policies of their underlying tables.
do $migration$
declare view_row record;
begin
  for view_row in select c.oid::regclass as relation from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
  loop
    execute format('alter view %s set (security_invoker = true)', view_row.relation);
    execute format('revoke all on %s from public, anon', view_row.relation);
    execute format('grant select on %s to authenticated', view_row.relation);
  end loop;
end;
$migration$;

-- Existing business transactions now run under caller RLS, retaining atomic POS,
-- balance payments and renewals for authenticated admin/caja accounts.
-- Identity-linking legacy functions are backend-only: knowing a DNI is not proof.
do $migration$
declare function_row record;
begin
  for function_row in select p.oid::regprocedure as signature, p.proname from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
    and p.proname = any(array['registrar_venta_pos','liquidar_saldo_socio','renovar_membresia_socio','obtener_resumen_admin','asignar_dni_a_socio','vincular_socio_por_dni','vincular_correo_a_dni'])
  loop
    execute format('revoke all on function %s from public, anon, authenticated', function_row.signature);
    if function_row.proname in ('vincular_socio_por_dni','vincular_correo_a_dni') then
      execute format('grant execute on function %s to service_role', function_row.signature);
    else
      execute format('alter function %s security invoker', function_row.signature);
      execute format('grant execute on function %s to authenticated, service_role', function_row.signature);
    end if;
  end loop;
end;
$migration$;

-- PIN is a second factor for an existing, exact Auth identity, never a replacement
-- for a Supabase session. Provision this binding from a trusted backend only.
alter table public.personal add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
alter table public.personal add column if not exists pin_hash text;
alter table public.personal add column if not exists intentos_fallidos integer not null default 0;
alter table public.personal add column if not exists bloqueado_hasta timestamptz;
alter table public.personal alter column pin drop not null;
create unique index if not exists personal_auth_user_unique on public.personal(auth_user_id) where auth_user_id is not null;
update public.personal set pin_hash = crypt(pin, gen_salt('bf', 10)) where pin is not null and pin_hash is null;
update public.personal set pin = null;
grant select(id,nombre,rol,turno,avatar_color,iniciales,telefono,activo,created_at,updated_at) on public.personal to authenticated;
create policy staff_read on public.personal for select to authenticated
  using (auth_user_id = auth.uid() or public.get_auth_role() = 'admin');

-- Drop ALL insecure overloads, including the older 2- and 7-argument versions.
do $migration$
declare function_row record;
begin
  for function_row in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('verificar_pin_personal','actualizar_pin_personal','crear_personal_seguro','desactivar_personal_seguro')
  loop execute format('drop function %s', function_row.signature); end loop;
end;
$migration$;

create function public.verificar_pin_personal(p_id text, p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare staff public.personal%rowtype; attempts integer;
begin
  if auth.uid() is null or p_pin is null or p_pin !~ '^[0-9]{4}$' then
    return jsonb_build_object('success',false,'error','Sesión o formato de PIN inválido.');
  end if;
  select * into staff from public.personal where id = p_id and auth_user_id = auth.uid() and activo = true for update;
  if not found or public.get_auth_role() <> (case when staff.rol = 'admin' then 'admin' else 'caja' end) then
    return jsonb_build_object('success',false,'error','Este perfil no está autorizado para la cuenta autenticada.');
  end if;
  if staff.bloqueado_hasta > now() then return jsonb_build_object('success',false,'locked',true,'error','Cuenta bloqueada temporalmente. Inténtalo después de 15 minutos.'); end if;
  attempts := case when staff.bloqueado_hasta is not null then 0 else coalesce(staff.intentos_fallidos,0) end;
  if staff.pin_hash is null or staff.pin_hash <> crypt(p_pin,staff.pin_hash) then
    attempts := attempts + 1;
    update public.personal set intentos_fallidos = attempts, bloqueado_hasta = case when attempts >= 5 then now() + interval '15 minutes' else null end where id = p_id;
    return jsonb_build_object('success',false,'locked',attempts >= 5,'intentos_restantes',greatest(0,5-attempts),'error','PIN incorrecto.');
  end if;
  update public.personal set intentos_fallidos = 0, bloqueado_hasta = null where id = p_id;
  return jsonb_build_object('success',true,'auth_user_id',auth.uid(),'user',jsonb_build_object(
    'id',staff.id,'nombre',staff.nombre,'rol',staff.rol,'turno',staff.turno,'avatarColor',staff.avatar_color,'iniciales',staff.iniciales,'activo',staff.activo,'createdAt',staff.created_at));
end;
$$;

create function public.actualizar_pin_personal(p_admin_id text,p_admin_pin text,p_target_id text,p_nuevo_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare check_result jsonb;
begin
  if auth.uid() is null or public.get_auth_role() <> 'admin' then raise exception 'Se requiere una cuenta de administrador.' using errcode = '42501'; end if;
  check_result := public.verificar_pin_personal(p_admin_id,p_admin_pin);
  if not coalesce((check_result->>'success')::boolean,false) then return check_result; end if;
  if p_nuevo_pin is null or p_nuevo_pin !~ '^[0-9]{4}$' then return jsonb_build_object('success',false,'error','El PIN debe contener 4 dígitos.'); end if;
  update public.personal set pin_hash = crypt(p_nuevo_pin,gen_salt('bf',10)), pin = null, intentos_fallidos = 0, bloqueado_hasta = null, updated_at = now() where id = p_target_id;
  return jsonb_build_object('success',found);
end;
$$;

create function public.crear_personal_seguro(p_admin_id text,p_admin_pin text,p_id text,p_nombre text,p_rol text,p_turno text,p_pin text,p_avatar_color text default null,p_telefono text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare check_result jsonb; new_staff public.personal%rowtype;
begin
  if auth.uid() is null or public.get_auth_role() <> 'admin' then raise exception 'Se requiere una cuenta de administrador.' using errcode = '42501'; end if;
  check_result := public.verificar_pin_personal(p_admin_id,p_admin_pin);
  if not coalesce((check_result->>'success')::boolean,false) then return check_result; end if;
  if p_nombre is null or trim(p_nombre) = '' or p_pin is null or p_pin !~ '^[0-9]{4}$' or p_rol is null or p_rol not in ('admin','cajero') or p_turno is null or p_turno not in ('manana','tarde','noche','completo') then
    return jsonb_build_object('success',false,'error','Datos de personal inválidos.');
  end if;
  insert into public.personal(id,nombre,rol,turno,pin,pin_hash,avatar_color,iniciales,telefono,activo)
  values(coalesce(p_id,'staff-' || gen_random_uuid()::text),trim(p_nombre),p_rol,p_turno,null,crypt(p_pin,gen_salt('bf',10)),p_avatar_color,upper(left(trim(p_nombre),2)),p_telefono,true) returning * into new_staff;
  return jsonb_build_object('success',true,'user',jsonb_build_object('id',new_staff.id,'nombre',new_staff.nombre,'rol',new_staff.rol,'turno',new_staff.turno,'avatarColor',new_staff.avatar_color,'iniciales',new_staff.iniciales,'activo',true,'createdAt',new_staff.created_at));
end;
$$;

create function public.desactivar_personal_seguro(p_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or public.get_auth_role() <> 'admin' then raise exception 'Se requiere una cuenta de administrador.' using errcode = '42501'; end if;
  if exists(select 1 from public.personal where id = p_id and auth_user_id = auth.uid()) then return jsonb_build_object('success',false,'error','No puedes desactivar tu propio perfil.'); end if;
  update public.personal set activo = false, updated_at = now() where id = p_id;
  return jsonb_build_object('success',found);
end;
$$;

-- Administrators can manage roles only through this checked server operation.
-- Direct profile updates remain limited to display fields for every browser user.
create or replace function public.cambiar_rol_usuario(p_user_id uuid, p_role text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or public.get_auth_role() <> 'admin' then
    raise exception 'Se requiere una cuenta de administrador.' using errcode = '42501';
  end if;
  if p_role is null or p_role not in ('admin','caja','entrenador','cliente') then
    return jsonb_build_object('success',false,'error','Rol inválido.');
  end if;
  if p_user_id = auth.uid() and p_role <> 'admin' then
    return jsonb_build_object('success',false,'error','No puedes retirar tus propios permisos de administrador.');
  end if;
  update public.profiles set role = p_role, updated_at = now() where id = p_user_id;
  if not found then return jsonb_build_object('success',false,'error','Cuenta no encontrada.'); end if;
  update public.personal set rol = case when p_role = 'admin' then 'admin' else 'cajero' end,
    activo = case when p_role in ('admin','caja') then activo else false end,
    updated_at = now() where auth_user_id = p_user_id;
  return jsonb_build_object('success',true,'user_id',p_user_id,'role',p_role);
end;
$$;
revoke all on function public.cambiar_rol_usuario(uuid,text) from public, anon;
grant execute on function public.cambiar_rol_usuario(uuid,text) to authenticated, service_role;

-- Archive members without deleting attendance, sales, account links or ledger.
create or replace function public.archivar_socio_seguro(p_socio_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or public.get_auth_role() <> 'admin' then
    raise exception 'Se requiere una cuenta de administrador.' using errcode = '42501';
  end if;
  update public.socios set archivado_en = now(), updated_at = now()
    where id = p_socio_id and archivado_en is null;
  if not found then return jsonb_build_object('success',false,'error','Socio inexistente o ya archivado.'); end if;
  return jsonb_build_object('success',true,'socio_id',p_socio_id);
end;
$$;
revoke all on function public.archivar_socio_seguro(text) from public, anon;
grant execute on function public.archivar_socio_seguro(text) to authenticated, service_role;

-- Self-service changes are limited to contact/display data of the linked member.
create or replace function public.actualizar_mi_socio(p_socio_id text, p_cambios jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare member_row public.socios%rowtype; field_name text;
begin
  if auth.uid() is null then raise exception 'Inicia sesión.' using errcode = '42501'; end if;
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then return jsonb_build_object('success',false,'error','Datos inválidos.'); end if;
  if exists(select 1 from jsonb_object_keys(p_cambios) as fields(key) where key not in ('nombre','celular','email','edad','sexo','observaciones')) then
    return jsonb_build_object('success',false,'error','Solo puedes actualizar tus datos de contacto y perfil.');
  end if;
  foreach field_name in array array['nombre','celular','email','sexo','observaciones'] loop
    if p_cambios ? field_name and jsonb_typeof(p_cambios->field_name) not in ('string','null') then return jsonb_build_object('success',false,'error','Formato de datos inválido.'); end if;
  end loop;
  if p_cambios ? 'nombre' and (nullif(trim(p_cambios->>'nombre'),'') is null or length(p_cambios->>'nombre') > 200) then return jsonb_build_object('success',false,'error','Nombre inválido.'); end if;
  if p_cambios ? 'edad' and p_cambios->>'edad' is not null then
    if p_cambios->>'edad' !~ '^[0-9]{1,3}$' then return jsonb_build_object('success',false,'error','Edad inválida.'); end if;
    if (p_cambios->>'edad')::integer not between 1 and 120 then return jsonb_build_object('success',false,'error','Edad inválida.'); end if;
  end if;
  if length(coalesce(p_cambios->>'celular','')) > 30 or length(coalesce(p_cambios->>'email','')) > 254 or length(coalesce(p_cambios->>'sexo','')) > 40 or length(coalesce(p_cambios->>'observaciones','')) > 2000 then return jsonb_build_object('success',false,'error','Datos demasiado extensos.'); end if;
  select * into member_row from public.socios where id = p_socio_id and user_id = auth.uid() and archivado_en is null for update;
  if not found then return jsonb_build_object('success',false,'error','El socio no pertenece a la cuenta autenticada.'); end if;
  update public.socios set
    nombre = case when p_cambios ? 'nombre' then trim(p_cambios->>'nombre') else nombre end,
    celular = case when p_cambios ? 'celular' then nullif(trim(p_cambios->>'celular'),'') else celular end,
    email = case when p_cambios ? 'email' then nullif(lower(trim(p_cambios->>'email')),'') else email end,
    edad = case when p_cambios ? 'edad' then (p_cambios->>'edad')::integer else edad end,
    sexo = case when p_cambios ? 'sexo' then p_cambios->>'sexo' else sexo end,
    observaciones = case when p_cambios ? 'observaciones' then p_cambios->>'observaciones' else observaciones end,
    updated_at = now()
  where id = member_row.id returning * into member_row;
  if p_cambios ? 'nombre' then update public.profiles set full_name = member_row.nombre, updated_at = now() where id = auth.uid(); end if;
  return jsonb_build_object('success',true,'socio',to_jsonb(member_row));
end;
$$;
revoke all on function public.actualizar_mi_socio(text,jsonb) from public, anon;
grant execute on function public.actualizar_mi_socio(text,jsonb) to authenticated, service_role;

revoke all on function public.verificar_pin_personal(text,text) from public, anon;
revoke all on function public.actualizar_pin_personal(text,text,text,text) from public, anon;
revoke all on function public.crear_personal_seguro(text,text,text,text,text,text,text,text,text) from public, anon;
revoke all on function public.desactivar_personal_seguro(text) from public, anon;
grant execute on function public.verificar_pin_personal(text,text), public.actualizar_pin_personal(text,text,text,text), public.crear_personal_seguro(text,text,text,text,text,text,text,text,text), public.desactivar_personal_seguro(text) to authenticated, service_role;

commit;
