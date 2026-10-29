-- ==============================================================================
-- TRANKILANDIA GYM · ESQUEMA DE BASE DE DATOS Y GESTIÓN DE ROLES EN SUPABASE
-- ==============================================================================
-- Roles disponibles:
--   1. 'cliente'    (Socio del Gimnasio - ROL POR DEFECTO PARA TODOS)
--   2. 'caja'       (Recepción / Ventas / Cobros)
--   3. 'entrenador' (Coach de Musculación / Boxeo)
--   4. 'admin'      (Administrador / Gerencia)
-- ==============================================================================

-- 1. Crear tabla de perfiles (profiles)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  dni text,
  role text not null default 'cliente' check (role in ('admin', 'caja', 'entrenador', 'cliente')),
  membership_status text default 'activo' check (membership_status in ('activo', 'vencido', 'congelado')),
  plan text default 'Musculación Ingreso Libre',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Habilitar Row Level Security (Seguridad por filas)
alter table public.profiles enable row level security;

-- Política 1: Todos los usuarios autenticados pueden ver perfiles
create policy "Usuarios autenticados pueden ver perfiles"
  on public.profiles
  for select
  to authenticated
  using (true);

-- Política 2: Los usuarios pueden actualizar su propio perfil
create policy "Usuarios pueden actualizar su propio perfil"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id);

-- ==============================================================================
-- 3. TRIGGER AUTOMÁTICO: CADA NUEVO USUARIO ES 'CLIENTE' POR DEFECTO
-- ==============================================================================

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
    'cliente'  -- Rol por defecto: CLIENTE para todo el mundo
  )
  on conflict (id) do update set
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    full_name = coalesce(excluded.full_name, profiles.full_name),
    updated_at = now();

  return new;
end;
$$;

-- Vincular el trigger a la tabla interna 'auth.users' de Supabase
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- 4. INSERTAR/ACTUALIZAR USUARIOS QUE YA INICIARON SESIÓN PREVIAMENTE
-- Asegura que todos queden como 'cliente' por defecto
-- ==============================================================================
insert into public.profiles (id, email, full_name, avatar_url, role)
select
  id,
  email,
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
  raw_user_meta_data->>'avatar_url',
  'cliente' as role
from auth.users
on conflict (id) do update set role = 'cliente';

-- Actualizar todos los existentes a 'cliente' por seguridad:
update public.profiles set role = 'cliente';
