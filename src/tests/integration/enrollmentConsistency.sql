-- Disposable PostgreSQL only: schema_production.sql, security_consistency and
-- enrollment_consistency migrations applied. Synthetic records; always rollback.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('10000000-0000-4000-8000-000000000001','enrollment-staff@example.invalid','{}'),
 ('10000000-0000-4000-8000-000000000002','enrollment-client@example.invalid','{}'),
 ('10000000-0000-4000-8000-000000000003','enrollment-coach@example.invalid','{}');
update public.profiles set role = 'caja' where id = '10000000-0000-4000-8000-000000000001';
update public.profiles set role = 'entrenador' where id = '10000000-0000-4000-8000-000000000003';
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);

create temp table enrollment_fixture(payload jsonb);
insert into enrollment_fixture values ('{
 "id":"MEM-ENROLL-SQL","nombre":"Persona sintética","dni":"12345678","email":null,
 "celular":null,"plan":"Plan sintético","precio_plan":80,"tipo_pago":"advance",
 "adelanto_pagado":30,"saldo_pendiente":50,"fecha_limite_pago":"2026-11-25",
 "fecha_inicio":"2026-11-19","fecha_fin":"2026-12-19","metodo_pago":"efectivo",
 "numero_boleta":"TEST-ENROLL-SQL","turno":"manana","coach_asignado":"Coach sintético",
 "observaciones":null,"edad":null,"sexo":null
}');

create function pg_temp.expect_enrollment_rejection(p_id uuid,p_payload jsonb,p_message text,p_code text default 'P0001')
returns void language plpgsql as $$
begin
  begin
    perform public.registrar_socio_atomico(p_id,p_payload);
  exception when others then
    if sqlstate <> p_code or sqlerrm !~* p_message then
      raise exception 'Unexpected rejection [%]: % (expected % / %)',sqlstate,sqlerrm,p_code,p_message;
    end if;
    return;
  end;
  raise exception 'TEST_FAILURE: enrollment accepted: %',p_message;
end;
$$;

do $$
declare
  p jsonb := (select payload from enrollment_fixture);
  op uuid := '10000000-0000-4000-8000-000000000010';
  result jsonb;
  retry jsonb;
begin
  result := public.registrar_socio_atomico(op,p);
  retry := public.registrar_socio_atomico(op,p);
  if result <> retry then raise exception 'Retry changed enrollment result'; end if;
  if result->>'success' <> 'true' or result->>'operacion_id' <> op::text then raise exception 'Enrollment was not confirmed'; end if;
  if (select count(*) from public.socios where id = 'MEM-ENROLL-SQL') <> 1 then raise exception 'Missing/duplicate member'; end if;
  if (select count(*) from public.ingresos where key_socio = 'MEM-ENROLL-SQL') <> 1 then raise exception 'Missing/duplicate income'; end if;
  if (select monto from public.ingresos where key_socio = 'MEM-ENROLL-SQL') <> 30 then raise exception 'Wrong advance income'; end if;
  if (select numero_boleta from public.socios where id = 'MEM-ENROLL-SQL') <> 'TEST-ENROLL-SQL' then raise exception 'Receipt changed'; end if;
  if (select user_id from public.socios where id = 'MEM-ENROLL-SQL') is not null then raise exception 'Enrollment linked Auth identity'; end if;
  if (select count(*) from public.inscripciones_operaciones where operacion_id = op) <> 1 then raise exception 'Missing durable idempotency record'; end if;

  perform pg_temp.expect_enrollment_rejection(op,p || '{"nombre":"Cambio"}','datos diferentes');
  perform pg_temp.expect_enrollment_rejection(gen_random_uuid(),p || '{"dni":"11112222"}','ID.*registrado','23505');
  perform pg_temp.expect_enrollment_rejection(gen_random_uuid(),p || '{"id":"MEM-OTHER"}','DNI.*registrado','23505');
  if (select nombre from public.socios where id = 'MEM-ENROLL-SQL') <> 'Persona sintética' then raise exception 'Existing member overwritten'; end if;

  perform pg_temp.expect_enrollment_rejection(gen_random_uuid(),p || '{"precio_plan":-1}','importe');
  perform pg_temp.expect_enrollment_rejection(gen_random_uuid(),p || '{"adelanto_pagado":30.001}','importe');
  perform pg_temp.expect_enrollment_rejection(gen_random_uuid(),p || '{"saldo_pendiente":49}','saldo');
  perform pg_temp.expect_enrollment_rejection(gen_random_uuid(),p || '{"tipo_pago":"full"}','completo');
  perform pg_temp.expect_enrollment_rejection(gen_random_uuid(),p || '{"precio_plan":"NaN"}','importe');
  perform pg_temp.expect_enrollment_rejection(gen_random_uuid(),p || '{"dni":"123456789"}','DNI');
  perform pg_temp.expect_enrollment_rejection(gen_random_uuid(),p || '{"fecha_inicio":"2026-02-30"}','fecha');
  perform pg_temp.expect_enrollment_rejection(gen_random_uuid(),p || '{"fecha_fin":"2026-11-01"}','fecha');
  perform pg_temp.expect_enrollment_rejection(gen_random_uuid(),p || '{"fecha_limite_pago":"2026-12-20"}','fecha');
  perform pg_temp.expect_enrollment_rejection(gen_random_uuid(),p || '{"metodo_pago":"bitcoin"}','pago');
  perform pg_temp.expect_enrollment_rejection(gen_random_uuid(),p || '{"user_id":"10000000-0000-4000-8000-000000000002"}','campo');

  perform public.registrar_socio_atomico(gen_random_uuid(),p || '{"id":"MEM-ZERO-SQL","dni":null,"adelanto_pagado":0,"saldo_pendiente":80}');
  if exists(select 1 from public.ingresos where key_socio = 'MEM-ZERO-SQL') then raise exception 'Zero advance created an income'; end if;
  if (select count(*) from public.ingresos where key_socio = 'MEM-ENROLL-SQL') <> 1 then raise exception 'Rejected request changed income'; end if;

  update public.socios set nombre = 'Perfil verificado después',dni = '22223333' where id = 'MEM-ENROLL-SQL';
  retry := public.registrar_socio_atomico(op,p);
  if retry->'socio'->>'nombre' <> 'Perfil verificado después' or retry->'socio'->>'dni' <> '22223333' then raise exception 'Retry returned stale profile data'; end if;
  if (select count(*) from public.ingresos where key_socio = 'MEM-ENROLL-SQL') <> 1 then raise exception 'Profile update retry duplicated income'; end if;

  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  perform pg_temp.expect_enrollment_rejection(gen_random_uuid(),p,'autorizado','42501');
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
  perform pg_temp.expect_enrollment_rejection(gen_random_uuid(),p,'autorizado','42501');
  perform set_config('request.jwt.claim.sub','',true);
  perform pg_temp.expect_enrollment_rejection(gen_random_uuid(),p,'autorizado','42501');
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);

  if has_function_privilege('anon','public.registrar_socio_atomico(uuid,jsonb)','execute') then raise exception 'Anonymous RPC access'; end if;
  if not has_function_privilege('authenticated','public.registrar_socio_atomico(uuid,jsonb)','execute') then raise exception 'Missing authenticated RPC grant'; end if;
  if has_table_privilege('authenticated','public.inscripciones_operaciones','insert,update,delete,select') then raise exception 'Browser access to idempotency journal'; end if;
end;
$$;

-- A forced ledger failure must roll back the member and the operation together.
create function pg_temp.reject_enrollment_income() returns trigger language plpgsql as $$
begin
  if new.key_socio = 'MEM-ROLLBACK-SQL' then raise exception 'Synthetic ledger failure'; end if;
  return new;
end;
$$;
create trigger enrollment_income_failure before insert on public.ingresos
for each row execute function pg_temp.reject_enrollment_income();
select pg_temp.expect_enrollment_rejection('10000000-0000-4000-8000-000000000020',
 (select payload from enrollment_fixture) || '{"id":"MEM-ROLLBACK-SQL","dni":"99998888"}','Synthetic ledger failure');
do $$
begin
  if exists(select 1 from public.socios where id = 'MEM-ROLLBACK-SQL') then raise exception 'Partial member survived ledger failure'; end if;
  if exists(select 1 from public.inscripciones_operaciones where operacion_id = '10000000-0000-4000-8000-000000000020') then raise exception 'Failed operation survived rollback'; end if;
  raise notice 'Enrollment SQL regression passed: atomic income/member, idempotency, identity conflicts, validation, zero advance, roles, rollback';
end;
$$;
rollback;
