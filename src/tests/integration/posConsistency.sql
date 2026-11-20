-- Run only in a disposable PostgreSQL instance with schema_production.sql and
-- migration_pos_consistency.sql applied. All records below are synthetic.
begin;
insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-4000-8000-000000000001', 'pos-fixture@example.invalid', '{}'::jsonb);
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
insert into public.productos (id, nombre, categoria, precio_venta, stock_actual)
values ('POS-FIXTURE', 'Producto sintético', 'Bebidas', 10, 5);

do $$
declare
  v_sale jsonb;
  v_retry jsonb;
  v_id uuid := '00000000-0000-4000-8000-000000000002';
  v_fecha timestamptz := '2026-11-17 16:00:00-05';
begin
  v_sale := public.registrar_venta_pos_v2(v_id, '[{"producto_id":"POS-FIXTURE","cantidad":1}]',
    'efectivo', 'Cliente sintético', null, 'TK-20261117-' || v_id, v_fecha, 2, 'Promo', 'Operadora sintética', 10);
  v_retry := public.registrar_venta_pos_v2(v_id, '[{"producto_id":"POS-FIXTURE","cantidad":1}]',
    'efectivo', 'Cliente sintético', null, 'TK-20261117-' || v_id, v_fecha, 2, 'Promo', 'Operadora sintética', 10);
  if v_sale <> v_retry then raise exception 'Retry returned a different sale'; end if;
  if (select stock_actual from public.productos where id = 'POS-FIXTURE') <> 4 then raise exception 'Stock deducted twice'; end if;
  if (select count(*) from public.ventas where operacion_id = v_id) <> 1 then raise exception 'Duplicate sale'; end if;
  if (select count(*) from public.ingresos where venta_id = (v_sale->>'venta_id')::bigint) <> 1 then raise exception 'Duplicate revenue'; end if;
  if (select monto from public.ingresos where venta_id = (v_sale->>'venta_id')::bigint) <> 8 then raise exception 'Revenue must be net of discount'; end if;
  if (select created_at from public.ingresos where venta_id = (v_sale->>'venta_id')::bigint) <> v_fecha then raise exception 'Original revenue date lost'; end if;
  if (select created_at from public.ventas where operacion_id = v_id) <> v_fecha then raise exception 'Original sale date lost'; end if;

  begin
    perform public.registrar_venta_pos_v2(v_id, '[{"producto_id":"POS-FIXTURE","cantidad":1}]',
      'efectivo', 'Cliente sintético', null, 'TK-20261117-' || v_id, v_fecha, 3, 'Promo', 'Operadora sintética', 10);
    raise exception 'TEST_FAILURE: changed retry payload accepted';
  exception when others then
    if sqlerrm like 'TEST_FAILURE:%' then raise; end if;
  end;
  begin
    perform public.registrar_venta_pos_v2('00000000-0000-4000-8000-000000000003',
      '[{"producto_id":"POS-FIXTURE","cantidad":3},{"producto_id":"POS-FIXTURE","cantidad":3}]',
      'efectivo', 'Cliente sintético', null, 'TK-20261117-00000000-0000-4000-8000-000000000003', v_fecha, 0, '', '', 60);
    raise exception 'TEST_FAILURE: repeated SKU exceeded stock';
  exception when others then
    if sqlerrm like 'TEST_FAILURE:%' then raise; end if;
  end;
  begin
    perform public.registrar_venta_pos_v2('00000000-0000-4000-8000-000000000004',
      '[{"producto_id":"POS-FIXTURE","cantidad":1}]', 'efectivo', 'Cliente sintético', null,
      'TK-20261117-00000000-0000-4000-8000-000000000004', v_fecha, 0, '', '', 9);
    raise exception 'TEST_FAILURE: changed catalog price silently accepted';
  exception when others then
    if sqlerrm like 'TEST_FAILURE:%' then raise; end if;
  end;
  if (select stock_actual from public.productos where id = 'POS-FIXTURE') <> 4 then raise exception 'Rejected transaction modified stock'; end if;
  if (select count(*) from public.ventas where operacion_id is not null) <> 1 then raise exception 'Rejected transaction left partial sale'; end if;
  perform set_config('request.jwt.claim.sub', '', false);
  begin
    perform public.registrar_venta_pos_v2('00000000-0000-4000-8000-000000000005',
      '[{"producto_id":"POS-FIXTURE","cantidad":1}]', 'efectivo', 'Cliente sintético', null,
      'TK-20261117-00000000-0000-4000-8000-000000000005', v_fecha, 0, '', '', 10);
    raise exception 'TEST_FAILURE: unauthenticated transaction accepted';
  exception when insufficient_privilege then null;
  end;
  raise notice 'POS SQL regression passed: idempotency, net revenue, original date, stock, rollback, authorization';
end;
$$;
rollback;
