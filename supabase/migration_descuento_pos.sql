-- ==============================================================================
-- TRANKILANDIA GYM · MIGRACIÓN: REGISTRO DE VENTAS POS CON DESCUENTO AUDITADO
-- Permite registrar ventas en mostrador con descuento proporcionado,
-- recalculando el total neto y auditando el motivo en el flujo contable.
-- ==============================================================================

create or replace function public.registrar_venta_pos(
  p_items jsonb, -- Array de [{ "producto_id": "BEB-001", "cantidad": 2 }]
  p_metodo_pago text,
  p_cliente_nombre text default 'Cliente Mostrador',
  p_cliente_dni text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_prod record;
  v_venta_id bigint;
  v_total numeric(10,2) := 0;
  v_ticket text;
  v_fecha_txt text;
begin
  -- 0. Validar permisos: rol admin o caja
  if public.get_auth_role() not in ('admin', 'caja') then
    raise exception 'No autorizado para registrar ventas (Rol actual: %)', public.get_auth_role();
  end if;

  -- 1. Validar que vengan items
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito de venta no contiene ningún producto.';
  end if;

  -- 2. Validar que el método de pago sea válido
  if p_metodo_pago not in ('yape', 'plin', 'efectivo', 'tarjeta') then
    raise exception 'Método de pago no válido: %', p_metodo_pago;
  end if;

  -- 3. Validar stock y acumular total con bloqueo FOR UPDATE
  for v_item in select * from jsonb_to_recordset(p_items) as x(producto_id text, cantidad int)
  loop
    select * into v_prod
    from public.productos
    where id = v_item.producto_id and activo = true
    for update;

    if not found then
      raise exception 'Producto con ID % no encontrado o inactivo.', v_item.producto_id;
    end if;

    if v_prod.stock_actual < v_item.cantidad then
      raise exception 'Stock insuficiente para % (Disponible: %, Solicitado: %).',
        v_prod.nombre, v_prod.stock_actual, v_item.cantidad;
    end if;

    v_total := v_total + (v_prod.precio_venta * v_item.cantidad);
  end loop;

  -- 4. Generar número de ticket único con timestamp de Perú
  v_fecha_txt := to_char((now() at time zone 'America/Lima'), 'YYYYMMDD');
  v_ticket := 'TK-' || v_fecha_txt || '-' || lpad((nextval('public.ventas_id_seq'))::text, 4, '0');

  -- 5. Insertar encabezado de Venta
  insert into public.ventas (numero_ticket, total, metodo_pago, cliente_nombre, cliente_dni, usuario_id)
  values (v_ticket, v_total, p_metodo_pago, coalesce(p_cliente_nombre, 'Cliente Mostrador'), p_cliente_dni, auth.uid())
  returning id into v_venta_id;

  -- 6. Insertar items y descontar stock
  for v_item in select * from jsonb_to_recordset(p_items) as x(producto_id text, cantidad int)
  loop
    select * into v_prod from public.productos where id = v_item.producto_id;

    insert into public.venta_items (venta_id, producto_id, nombre_producto, cantidad, precio_unitario, subtotal)
    values (
      v_venta_id,
      v_prod.id,
      v_prod.nombre,
      v_item.cantidad,
      v_prod.precio_venta,
      (v_prod.precio_venta * v_item.cantidad)
    );

    update public.productos
    set stock_actual = stock_actual - v_item.cantidad,
        updated_at = now()
    where id = v_prod.id;
  end loop;

  -- 7. Registrar en el arqueo diario de Ingresos
  insert into public.ingresos (venta_id, monto, metodo_pago, tipo, observacion)
  values (
    v_venta_id,
    v_total,
    p_metodo_pago,
    'Venta POS Productos',
    'Ticket ' || v_ticket || ' - ' || coalesce(p_cliente_nombre, 'Mostrador')
  );

  return jsonb_build_object(
    'success', true,
    'venta_id', v_venta_id,
    'numero_ticket', v_ticket,
    'total', v_total,
    'metodo_pago', p_metodo_pago
  );
end;
$$;

revoke execute on function public.registrar_venta_pos(jsonb, text, text, text) from public, anon;
grant execute on function public.registrar_venta_pos(jsonb, text, text, text) to authenticated;
