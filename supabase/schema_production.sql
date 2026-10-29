-- ==============================================================================
-- TRANKILANDIA GYM · ESQUEMA DE PRODUCCIÓN Y SEGURIDAD RLS (SUPABASE FREE TIER)
-- ==============================================================================
-- Zona Horaria Obligatoria: Perú (UTC-5 / 'America/Lima')
-- Límites Free Tier: Vercel Hobby + Supabase Free (Sin Cron Jobs, Sin Realtime masivo)
-- Roles del Sistema:
--   1. 'admin'      (Gerencia y Control Total)
--   2. 'caja'       (Recepción, Control de Acceso 1D, POS e Inventario)
--   3. 'entrenador' (Gestor de Rutinas y Progresos por Turno)
--   4. 'cliente'    (Socio del Gimnasio · Rol estrictamente por defecto)
-- ==============================================================================

-- Extensiones requeridas
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 1. TABLA: PROFILES (VINCULADA A AUTH.USERS)
-- ==============================================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  dni text unique,
  role text not null default 'cliente' check (role in ('admin', 'caja', 'entrenador', 'cliente')),
  membership_status text default 'active',
  plan text default 'Musculación Ingreso Libre',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Si profiles ya existía previamente en Supabase, asegurar columnas adicionales
alter table public.profiles add column if not exists dni text;
alter table public.profiles add column if not exists role text not null default 'cliente';
alter table public.profiles add column if not exists membership_status text default 'active';
alter table public.profiles add column if not exists plan text default 'Musculación Ingreso Libre';

alter table public.profiles enable row level security;

-- Función segura para obtener el rol del usuario autenticado actual (Security Definer)
create or replace function public.get_auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'cliente'
  );
$$;

-- Políticas de Profiles (Idempotentes)
drop policy if exists "Usuarios autenticados leen perfiles básicos" on public.profiles;
create policy "Usuarios autenticados leen perfiles básicos"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Usuarios actualizan su propio perfil" on public.profiles;
create policy "Usuarios actualizan su propio perfil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (
    -- Un cliente no puede auto-elevarse a admin o caja
    (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()))
    or public.get_auth_role() = 'admin'
  );

-- Trigger de nuevo usuario de Auth (Siempre crea con rol 'cliente')
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    'cliente'
  )
  on conflict (id) do update set
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    full_name = coalesce(excluded.full_name, profiles.full_name),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- 2. TABLA: SOCIOS (PADRÓN GENERAL, PLANES Y DEUDAS)
-- ==============================================================================
create table if not exists public.socios (
  id text primary key, -- Código legible: MEM-001, MEM-002, etc.
  user_id uuid references public.profiles(id) on delete set null,
  nombre text not null,
  dni text unique,
  email text,
  celular text,
  plan text not null,
  precio_plan numeric(10,2) not null,
  tipo_pago text not null check (tipo_pago in ('full', 'advance')),
  adelanto_pagado numeric(10,2) not null default 0,
  saldo_pendiente numeric(10,2) not null default 0,
  fecha_limite_pago text,
  fecha_inicio date not null default (now() at time zone 'America/Lima')::date,
  fecha_fin date not null default ((now() at time zone 'America/Lima')::date + interval '30 days')::date,
  metodo_pago text not null default 'efectivo',
  numero_boleta text not null default 'B001-000000',
  turno text not null default 'manana' check (turno in ('manana', 'tarde', 'noche')),
  coach_asignado text not null default 'Coach Marcos Rivas',
  observaciones text,
  edad int,
  sexo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Asegurar columnas si socios ya existía previamente
alter table public.socios alter column dni drop not null;
alter table public.socios add column if not exists turno text not null default 'manana';
alter table public.socios add column if not exists coach_asignado text not null default 'Coach Marcos Rivas';
alter table public.socios add column if not exists numero_boleta text not null default 'B001-000000';
alter table public.socios add column if not exists metodo_pago text not null default 'efectivo';
alter table public.socios add column if not exists saldo_pendiente numeric(10,2) not null default 0;
alter table public.socios add column if not exists adelanto_pagado numeric(10,2) not null default 0;
alter table public.socios add column if not exists tipo_pago text not null default 'full';
alter table public.socios add column if not exists precio_plan numeric(10,2) not null default 0;
alter table public.socios add column if not exists fecha_limite_pago text;
alter table public.socios add column if not exists observaciones text;
alter table public.socios add column if not exists edad int;
alter table public.socios add column if not exists sexo text;

create index if not exists idx_socios_dni on public.socios(dni);
create index if not exists idx_socios_turno on public.socios(turno);
create index if not exists idx_socios_fecha_fin on public.socios(fecha_fin);

alter table public.socios enable row level security;

-- Políticas de Socios (Idempotentes)
drop policy if exists "Admin y Caja gestionan todos los socios" on public.socios;
create policy "Admin y Caja gestionan todos los socios"
  on public.socios for all
  to authenticated
  using (public.get_auth_role() in ('admin', 'caja'))
  with check (public.get_auth_role() in ('admin', 'caja'));

drop policy if exists "Entrenadores ven atletas de su turno o asignados" on public.socios;
create policy "Entrenadores ven atletas de su turno o asignados"
  on public.socios for select
  to authenticated
  using (public.get_auth_role() in ('admin', 'caja', 'entrenador'));

drop policy if exists "Clientes ven exclusivamente su propio registro" on public.socios;
create policy "Clientes ven exclusivamente su propio registro"
  on public.socios for select
  to authenticated
  using (
    auth.uid() = user_id
    or email = (select email from public.profiles where id = auth.uid())
    or dni = (select dni from public.profiles where id = auth.uid())
  );

-- ==============================================================================
-- 3. VISTA: V_SOCIOS_ESTADO (CÁLCULO DINÁMICO EN TIMEZONE PERÚ UTC-5)
-- Evita errores de PostgreSQL con CURRENT_DATE en stored columns y desfases de 7PM
-- ==============================================================================
create or replace view public.v_socios_estado
with (security_invoker = true) as
select
  s.*,
  (s.fecha_fin - (now() at time zone 'America/Lima')::date) as dias_restantes,
  case
    when s.fecha_fin < (now() at time zone 'America/Lima')::date then 'vencido'
    when s.fecha_fin <= ((now() at time zone 'America/Lima')::date + interval '5 days')::date then 'por_vencer'
    else 'activo'
  end as estado_calculado,
  case
    when s.saldo_pendiente > 0 then true
    else false
  end as tiene_deuda_activa
from public.socios s;

-- ==============================================================================
-- 4. TABLA: ASISTENCIAS (CONTROL DE ACCESO CON LECTOR 1D & AFORO DE 90 MIN)
-- ==============================================================================
create table if not exists public.asistencias (
  id bigserial primary key,
  socio_id text not null references public.socios(id) on delete cascade,
  dni text not null,
  nombre text not null,
  turno text not null check (turno in ('manana', 'tarde', 'noche')),
  fecha_ingreso timestamptz not null default now(),
  registrado_por uuid references public.profiles(id)
);

-- Asegurar columnas si asistencias ya existía previamente
alter table public.asistencias add column if not exists turno text not null default 'manana';
alter table public.asistencias add column if not exists fecha_ingreso timestamptz not null default now();
alter table public.asistencias add column if not exists registrado_por uuid references public.profiles(id);

create index if not exists idx_asistencias_dni_fecha on public.asistencias(dni, fecha_ingreso desc);
create index if not exists idx_asistencias_ingreso on public.asistencias(fecha_ingreso);

alter table public.asistencias enable row level security;

-- Políticas de Asistencias (Idempotentes)
drop policy if exists "Admin y Caja registran y ven asistencias" on public.asistencias;
create policy "Admin y Caja registran y ven asistencias"
  on public.asistencias for all
  to authenticated
  using (public.get_auth_role() in ('admin', 'caja'))
  with check (public.get_auth_role() in ('admin', 'caja'));

drop policy if exists "Entrenadores ven asistencias de sala" on public.asistencias;
create policy "Entrenadores ven asistencias de sala"
  on public.asistencias for select
  to authenticated
  using (public.get_auth_role() in ('admin', 'caja', 'entrenador'));

drop policy if exists "Cliente ve su propio historial de ingresos" on public.asistencias;
create policy "Cliente ve su propio historial de ingresos"
  on public.asistencias for select
  to authenticated
  using (
    dni = (select dni from public.profiles where id = auth.uid())
    or socio_id in (select id from public.socios where user_id = auth.uid())
  );

-- ==============================================================================
-- 5. VISTA: V_AFORO_ACTUAL (CÁLCULO EXACTO A 90 MINUTOS / 1:30H DE ENTRENAMIENTO)
-- ==============================================================================
create or replace view public.v_aforo_actual
with (security_invoker = true) as
select
  count(distinct a.socio_id) as personas_en_sala,
  count(distinct case when a.turno = 'manana' then a.socio_id end) as aforo_manana,
  count(distinct case when a.turno = 'tarde' then a.socio_id end) as aforo_tarde,
  count(distinct case when a.turno = 'noche' then a.socio_id end) as aforo_noche,
  (now() at time zone 'America/Lima') as hora_consulta_peru
from public.asistencias a
where a.fecha_ingreso >= (now() - interval '90 minutes');

-- ==============================================================================
-- 6. TABLA: PRODUCTOS E INVENTARIO (BEBIDAS, PROTEÍNAS, ENERGIZANTES)
-- ==============================================================================
create table if not exists public.productos (
  id text primary key, -- SKU: BEB-001, PRO-001, etc.
  codigo_barras text unique,
  nombre text not null,
  categoria text not null check (categoria in ('Bebidas', 'Energizantes', 'Proteinas', 'Suplementos', 'Snacks', 'Accesorios')),
  precio_compra numeric(10,2) not null default 0,
  precio_venta numeric(10,2) not null,
  stock_actual int not null default 0 check (stock_actual >= 0),
  stock_minimo int not null default 5,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_productos_categoria on public.productos(categoria);
create index if not exists idx_productos_codigo on public.productos(codigo_barras);

alter table public.productos enable row level security;

-- Políticas de Productos (Idempotentes)
drop policy if exists "Todos los autenticados pueden ver productos activos" on public.productos;
create policy "Todos los autenticados pueden ver productos activos"
  on public.productos for select
  to authenticated
  using (activo = true or public.get_auth_role() in ('admin', 'caja'));

drop policy if exists "Admin y Caja administran el catálogo y stock" on public.productos;
create policy "Admin y Caja administran el catálogo y stock"
  on public.productos for all
  to authenticated
  using (public.get_auth_role() in ('admin', 'caja'))
  with check (public.get_auth_role() in ('admin', 'caja'));

-- ==============================================================================
-- 7. TABLAS: VENTAS Y DETALLE DE ITEMS (POS RECEPCIÓN)
-- ==============================================================================
create table if not exists public.ventas (
  id bigserial primary key,
  numero_ticket text unique not null,
  total numeric(10,2) not null check (total >= 0),
  metodo_pago text not null check (metodo_pago in ('yape', 'plin', 'efectivo', 'tarjeta')),
  cliente_nombre text default 'Cliente Mostrador',
  cliente_dni text,
  usuario_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.venta_items (
  id bigserial primary key,
  venta_id bigint not null references public.ventas(id) on delete cascade,
  producto_id text not null references public.productos(id),
  nombre_producto text not null,
  cantidad int not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null,
  subtotal numeric(10,2) not null
);

create index if not exists idx_ventas_fecha on public.ventas(created_at);
create index if not exists idx_venta_items_venta on public.venta_items(venta_id);

alter table public.ventas enable row level security;
alter table public.venta_items enable row level security;

drop policy if exists "Admin y Caja ven y gestionan ventas" on public.ventas;
create policy "Admin y Caja ven y gestionan ventas"
  on public.ventas for all
  to authenticated
  using (public.get_auth_role() in ('admin', 'caja'))
  with check (public.get_auth_role() in ('admin', 'caja'));

drop policy if exists "Admin y Caja ven items de ventas" on public.venta_items;
create policy "Admin y Caja ven items de ventas"
  on public.venta_items for all
  to authenticated
  using (public.get_auth_role() in ('admin', 'caja'))
  with check (public.get_auth_role() in ('admin', 'caja'));

-- ==============================================================================
-- 8. TABLA: INGRESOS FINANCIEROS (ARQUEO CONSOLIDADO: MEMBRESÍAS + POS)
-- ==============================================================================
create table if not exists public.ingresos (
  id bigserial primary key,
  key_socio text references public.socios(id) on delete set null,
  venta_id bigint references public.ventas(id) on delete cascade,
  monto numeric(10,2) not null check (monto > 0),
  metodo_pago text not null,
  tipo text not null, -- 'Membresía Completa', 'Adelanto de Membresía', 'Liquidación Saldo', 'Venta POS'
  observacion text,
  created_at timestamptz not null default now()
);

-- Asegurar columnas si ingresos ya existía previamente
alter table public.ingresos add column if not exists key_socio text references public.socios(id) on delete set null;
alter table public.ingresos add column if not exists venta_id bigint references public.ventas(id) on delete cascade;
alter table public.ingresos add column if not exists monto numeric(10,2) not null default 0;
alter table public.ingresos add column if not exists metodo_pago text not null default 'efectivo';
alter table public.ingresos add column if not exists tipo text not null default 'Membresía Completa';
alter table public.ingresos add column if not exists observacion text;
alter table public.ingresos add column if not exists created_at timestamptz not null default now();

alter table public.ingresos enable row level security;

drop policy if exists "Admin y Caja ven y registran ingresos" on public.ingresos;
create policy "Admin y Caja ven y registran ingresos"
  on public.ingresos for all
  to authenticated
  using (public.get_auth_role() in ('admin', 'caja'))
  with check (public.get_auth_role() in ('admin', 'caja'));

-- ==============================================================================
-- 9. FUNCIÓN RPC ATÓMICA: REGISTRAR_VENTA_POS (TRANSACCIÓN 100% SEGURA)
-- Valida stock, descuenta inventario, genera venta e ingreso en 1 solo HTTP request
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
  -- 0. Validar permisos estrictos: solo Admin y Caja pueden cobrar / registrar ventas
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

  -- 3. Pre-validar stock y calcular total atómicamente con bloqueo FOR UPDATE
  for v_item in select * from jsonb_to_recordset(p_items) as x(producto_id text, cantidad int)
  loop
    select * into v_prod
    from public.productos
    where id = v_item.producto_id and activo = true
    for update; -- Bloqueo de fila para evitar condiciones de carrera (Race Conditions)

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

    -- Descuento estricto de inventario
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

-- Restricción de ejecución: REVOCAR a público/anónimos y permitir solo a usuarios autenticados
revoke execute on function public.registrar_venta_pos(jsonb, text, text, text) from public, anon;
grant execute on function public.registrar_venta_pos(jsonb, text, text, text) to authenticated;

-- ==============================================================================
-- 10. TABLAS: RUTINAS Y PROGRESOS (EXCLUSIVO COACHES & CLIENTES)
-- ==============================================================================
create table if not exists public.rutinas (
  id bigserial primary key,
  member_id text not null unique references public.socios(id) on delete cascade,
  title text not null default 'Rutina de Entrenamiento',
  objective text,
  coach_name text not null default 'Coach Marcos Rivas',
  coach_notes text,
  days jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.progresos (
  id text primary key,
  member_id text not null references public.socios(id) on delete cascade,
  fecha text not null,
  peso_kg numeric(5,2),
  press_banca_kg numeric(5,2),
  sentadilla_kg numeric(5,2),
  peso_muerto_kg numeric(5,2),
  pullups_reps int,
  observaciones text,
  created_at timestamptz not null default now()
);

alter table public.rutinas enable row level security;
alter table public.progresos enable row level security;

-- Políticas de Rutinas (Idempotentes)
drop policy if exists "Admin, Caja y Coaches gestionan rutinas" on public.rutinas;
create policy "Admin, Caja y Coaches gestionan rutinas"
  on public.rutinas for all
  to authenticated
  using (public.get_auth_role() in ('admin', 'caja', 'entrenador'))
  with check (public.get_auth_role() in ('admin', 'caja', 'entrenador'));

drop policy if exists "Clientes ven su propia rutina" on public.rutinas;
create policy "Clientes ven su propia rutina"
  on public.rutinas for select
  to authenticated
  using (
    member_id in (
      select id from public.socios
      where user_id = auth.uid()
      or email = (select email from public.profiles where id = auth.uid())
      or dni = (select dni from public.profiles where id = auth.uid())
    )
  );

-- Políticas de Progresos (Idempotentes)
drop policy if exists "Admin y Coaches gestionan progresos físicos" on public.progresos;
create policy "Admin y Coaches gestionan progresos físicos"
  on public.progresos for all
  to authenticated
  using (public.get_auth_role() in ('admin', 'entrenador'))
  with check (public.get_auth_role() in ('admin', 'entrenador'));

drop policy if exists "Clientes ven su historial de progresos" on public.progresos;
create policy "Clientes ven su historial de progresos"
  on public.progresos for select
  to authenticated
  using (
    member_id in (
      select id from public.socios
      where user_id = auth.uid()
      or email = (select email from public.profiles where id = auth.uid())
      or dni = (select dni from public.profiles where id = auth.uid())
    )
  );

-- ==============================================================================
-- 11. SEED INICIAL DE PRODUCTOS DE ALTA ROTACIÓN (CATÁLOGO REAL GYM)
-- ==============================================================================
insert into public.productos (id, codigo_barras, nombre, categoria, precio_compra, precio_venta, stock_actual, stock_minimo)
values
  ('BEB-001', '7751234001', 'Agua Mineral San Mateo 600ml', 'Bebidas', 1.20, 2.50, 48, 12),
  ('BEB-002', '7751234002', 'Sporade 500ml (Varios Sabores)', 'Bebidas', 2.00, 3.50, 36, 10),
  ('BEB-003', '7751234003', 'Gatorade 500ml Blue Ice', 'Bebidas', 2.50, 4.50, 24, 8),
  ('ENE-001', '7751234004', 'Monster Energy 473ml (Negro / Blanco)', 'Energizantes', 5.50, 9.00, 24, 6),
  ('ENE-002', '7751234005', 'Red Bull 250ml', 'Energizantes', 5.00, 8.50, 18, 6),
  ('PRO-001', '7751234006', 'Batido Proteico Whey Shaker (Scoop + Leche/Agua)', 'Proteinas', 3.50, 7.00, 100, 20),
  ('PRO-002', '7751234007', 'Proteína 100% Whey Gold 2 Lbs (Chocolate/Vainilla)', 'Proteinas', 110.00, 155.00, 8, 3),
  ('SUP-001', '7751234008', 'Creatina Monohidratada Creapure 300g', 'Suplementos', 75.00, 110.00, 10, 3),
  ('SUP-002', '7751234009', 'Pre-Entreno C4 Explosive (Servicio Individual)', 'Suplementos', 2.50, 5.00, 50, 15),
  ('SNK-001', '7751234010', 'Barra Proteica Quest Bar 60g', 'Snacks', 6.00, 10.00, 30, 8)
on conflict (id) do update set
  precio_venta = excluded.precio_venta,
  stock_actual = excluded.stock_actual;

-- ==============================================================================
-- 12. FUNCIÓN RPC: OBTENER RESUMEN Y ARQUEO CONSOLIDADO ADMIN (MÉTRICAS ENGINE-SIDE)
-- ==============================================================================
-- Prohibido descargar tablas masivas al navegador. Calcula todo en PostgreSQL.
-- Devuelve un JSON consolidado de < 2 KB protegiendo el Egress del Free Tier.
-- ==============================================================================
create or replace function public.obtener_resumen_admin(
  p_fecha_inicio date default (now() at time zone 'America/Lima')::date,
  p_fecha_fin date default (now() at time zone 'America/Lima')::date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resumen jsonb;
  v_total_recaudado numeric(10,2) := 0;
  v_total_membresias numeric(10,2) := 0;
  v_total_pos numeric(10,2) := 0;
  v_metodos jsonb;
  v_socios_stats jsonb;
  v_inventario_stats jsonb;
  v_asistencias_stats jsonb;
begin
  -- 0. Verificar permisos de Administrador
  if public.get_auth_role() != 'admin' then
    raise exception 'Acceso restringido: Solo el Administrador puede consultar el resumen gerencial.';
  end if;

  -- 1. Arqueo consolidado de ingresos en el rango de fechas (hora de Perú)
  select
    coalesce(sum(monto), 0),
    coalesce(sum(case when tipo != 'Venta POS Productos' and venta_id is null then monto else 0 end), 0),
    coalesce(sum(case when tipo = 'Venta POS Productos' or venta_id is not null then monto else 0 end), 0),
    jsonb_build_object(
      'efectivo', coalesce(sum(case when metodo_pago = 'efectivo' then monto else 0 end), 0),
      'yape', coalesce(sum(case when metodo_pago = 'yape' then monto else 0 end), 0),
      'plin', coalesce(sum(case when metodo_pago = 'plin' then monto else 0 end), 0),
      'tarjeta', coalesce(sum(case when metodo_pago = 'tarjeta' then monto else 0 end), 0)
    )
  into v_total_recaudado, v_total_membresias, v_total_pos, v_metodos
  from public.ingresos
  where (created_at at time zone 'America/Lima')::date between p_fecha_inicio and p_fecha_fin;

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
  where (fecha_ingreso at time zone 'America/Lima')::date between p_fecha_inicio and p_fecha_fin;

  -- 5. Consolidar JSON final (< 2 KB)
  v_resumen := jsonb_build_object(
    'periodo', jsonb_build_object('inicio', p_fecha_inicio, 'fin', p_fecha_fin),
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

  return v_resumen;
end;
$$;

revoke execute on function public.obtener_resumen_admin(date, date) from public, anon;
grant execute on function public.obtener_resumen_admin(date, date) to authenticated;

