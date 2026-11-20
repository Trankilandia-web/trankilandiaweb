-- PENDING REVIEW / APPLY MANUALLY. No historical stock or sales are rewritten.
-- Requires schema_production.sql and the server-managed profiles roles.
-- v2 is deliberately a new RPC: clients must not fall back to the older RPC.
begin;

alter table public.ventas add column if not exists operacion_id uuid;
alter table public.ventas add column if not exists subtotal numeric(10,2);
alter table public.ventas add column if not exists descuento numeric(10,2) not null default 0;
alter table public.ventas add column if not exists descuento_motivo text;
alter table public.ventas add column if not exists descuento_autorizado_por text;
alter table public.ventas add column if not exists operacion_payload jsonb;
create unique index if not exists ventas_operacion_id_unique on public.ventas(operacion_id);

create or replace function public.registrar_venta_pos_v2(
  p_venta_id uuid,
  p_items jsonb,
  p_metodo_pago text,
  p_cliente_nombre text,
  p_cliente_dni text,
  p_numero_ticket text,
  p_fecha timestamptz,
  p_descuento numeric,
  p_descuento_motivo text,
  p_descuento_autorizado_por text,
  p_subtotal_esperado numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item record;
  v_prod public.productos%rowtype;
  v_existing public.ventas%rowtype;
  v_id bigint;
  v_subtotal numeric(10,2) := 0;
  v_total numeric(10,2);
  v_payload jsonb;
begin
  if auth.uid() is null or coalesce(public.get_auth_role(), '') not in ('admin', 'caja') then
    raise exception 'No autorizado para registrar ventas.' using errcode = '42501';
  end if;
  if p_venta_id is null or p_numero_ticket is null or length(p_numero_ticket) > 100
     or p_numero_ticket !~ '^TK-[0-9]{8}-[0-9a-f-]{36}$' then
    raise exception 'Identificador de operación o ticket no válido.';
  end if;
  if p_fecha is null or p_fecha > now() + interval '5 minutes' then
    raise exception 'Fecha original de venta no válida.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'El carrito de venta debe ser una lista.';
  end if;
  if jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then
    raise exception 'El carrito debe contener de 1 a 100 productos.';
  end if;
  if p_metodo_pago is null or p_metodo_pago not in ('yape', 'plin', 'efectivo', 'tarjeta') then
    raise exception 'Método de pago no válido.';
  end if;
  if p_descuento is null or p_descuento < 0 or p_descuento::text in ('NaN', 'Infinity', '-Infinity')
     or p_descuento <> round(p_descuento, 2) then
    raise exception 'Descuento no válido.';
  end if;
  if p_subtotal_esperado is null or p_subtotal_esperado < 0
     or p_subtotal_esperado::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'Subtotal cotizado no válido.';
  end if;
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item.value) <> 'object'
       or coalesce(v_item.value->>'producto_id', '') = ''
       or coalesce(v_item.value->>'cantidad', '') !~ '^[1-9][0-9]*$' then
      raise exception 'Cada producto debe tener una cantidad entera mayor que cero.';
    end if;
  end loop;

  v_payload := jsonb_build_object(
    'items', p_items, 'metodo_pago', p_metodo_pago,
    'cliente_nombre', p_cliente_nombre, 'cliente_dni', p_cliente_dni,
    'numero_ticket', p_numero_ticket, 'fecha', p_fecha,
    'descuento', p_descuento, 'motivo', p_descuento_motivo,
    'autorizado_por', p_descuento_autorizado_por, 'subtotal_esperado', p_subtotal_esperado
  );
  -- Serializes retries of one operation even when its first request is in flight.
  perform pg_advisory_xact_lock(hashtextextended(p_venta_id::text, 0));
  select * into v_existing from public.ventas where operacion_id = p_venta_id;
  if found then
    if v_existing.operacion_payload is distinct from v_payload then
      raise exception 'La operación ya existe con datos diferentes. Requiere revisión.';
    end if;
    return jsonb_build_object('success', true, 'venta_id', v_existing.id,
      'numero_ticket', v_existing.numero_ticket, 'subtotal', v_existing.subtotal,
      'descuento', v_existing.descuento, 'total', v_existing.total,
      'metodo_pago', v_existing.metodo_pago, 'fecha', v_existing.created_at);
  end if;

  -- Aggregate repeated SKUs and lock in stable order to avoid overselling/deadlocks.
  for v_item in
    select producto_id, sum(cantidad)::bigint as cantidad
    from jsonb_to_recordset(p_items) as x(producto_id text, cantidad bigint)
    group by producto_id order by producto_id
  loop
    select * into v_prod from public.productos
      where id = v_item.producto_id and activo = true for update;
    if not found then raise exception 'Producto no encontrado o inactivo: %.', v_item.producto_id; end if;
    if v_item.cantidad > 2147483647 or v_prod.stock_actual < v_item.cantidad then
      raise exception 'Stock insuficiente para %.', v_prod.nombre;
    end if;
    if v_prod.precio_venta < 0 then raise exception 'Precio no válido para %.', v_prod.nombre; end if;
    v_subtotal := v_subtotal + v_prod.precio_venta * v_item.cantidad;
  end loop;
  -- Never silently change an amount already charged while offline.
  if v_subtotal <> p_subtotal_esperado then
    raise exception 'El precio del catálogo cambió. Requiere conciliar el cobro pendiente.';
  end if;
  if p_descuento > v_subtotal then raise exception 'El descuento supera el subtotal.'; end if;
  if p_descuento > 0 and btrim(coalesce(p_descuento_motivo, '')) = '' then
    raise exception 'El descuento requiere un motivo.';
  end if;
  v_total := v_subtotal - p_descuento;

  insert into public.ventas (operacion_id, operacion_payload, numero_ticket, subtotal, descuento,
    descuento_motivo, descuento_autorizado_por, total, metodo_pago, cliente_nombre,
    cliente_dni, usuario_id, created_at)
  values (p_venta_id, v_payload, p_numero_ticket, v_subtotal, p_descuento,
    p_descuento_motivo, p_descuento_autorizado_por, v_total, p_metodo_pago,
    coalesce(nullif(btrim(p_cliente_nombre), ''), 'Cliente Mostrador'), p_cliente_dni, auth.uid(), p_fecha)
  returning id into v_id;

  for v_item in
    select producto_id, sum(cantidad)::int as cantidad
    from jsonb_to_recordset(p_items) as x(producto_id text, cantidad bigint)
    group by producto_id order by producto_id
  loop
    select * into v_prod from public.productos where id = v_item.producto_id;
    insert into public.venta_items (venta_id, producto_id, nombre_producto, cantidad, precio_unitario, subtotal)
    values (v_id, v_prod.id, v_prod.nombre, v_item.cantidad, v_prod.precio_venta, v_prod.precio_venta * v_item.cantidad);
    update public.productos set stock_actual = stock_actual - v_item.cantidad, updated_at = now()
      where id = v_prod.id;
  end loop;
  -- Net revenue is atomic with the sale. A fully discounted sale collects no cash.
  -- Keeping zero out also preserves existing ingresos(monto > 0) constraints.
  if v_total > 0 then
    insert into public.ingresos (venta_id, monto, metodo_pago, tipo, observacion, created_at)
    values (v_id, v_total, p_metodo_pago, 'Venta POS Productos',
      'Ticket ' || p_numero_ticket || ' - Descuento: ' || p_descuento::text || ' - ' || coalesce(p_descuento_motivo, ''), p_fecha);
  end if;
  return jsonb_build_object('success', true, 'venta_id', v_id, 'numero_ticket', p_numero_ticket,
    'subtotal', v_subtotal, 'descuento', p_descuento, 'total', v_total,
    'metodo_pago', p_metodo_pago, 'fecha', p_fecha);
end;
$$;

revoke all on function public.registrar_venta_pos_v2(uuid, jsonb, text, text, text, text, timestamptz, numeric, text, text, numeric) from public, anon;
grant execute on function public.registrar_venta_pos_v2(uuid, jsonb, text, text, text, text, timestamptz, numeric, text, text, numeric) to authenticated;
commit;
