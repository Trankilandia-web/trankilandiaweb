-- ==============================================================================
-- TRANKILANDIA GYM · ESQUEMA DE BASE DE DATOS Y GESTIÓN DE ROLES EN SUPABASE
-- ==============================================================================
-- Roles disponibles:
--   1. 'admin'      (Administrador / Gerencia)
--   2. 'caja'       (Recepción / Ventas / Cobros)
--   3. 'entrenador' (Coach de Musculación / Boxeo)
--   4. 'cliente'    (Socio del Gimnasio)
-- ==============================================================================

-- 1. Crear tipo enumerado para los roles (o validación check)
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

-- Política 1: Todos los usuarios autenticados pueden leer perfiles (necesario para verificar rol y para que admin/caja vean socios)
create policy "Los usuarios autenticados pueden ver perfiles"
  on public.profiles
  for select
  to authenticated
  using (true);

-- Política 2: Los usuarios pueden actualizar su propio perfil (nombre, dni)
create policy "Los usuarios pueden actualizar su propio perfil"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id);

-- Política 3: Los administradores pueden insertar o actualizar cualquier perfil
create policy "Admins pueden gestionar todos los perfiles"
  on public.profiles
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ==============================================================================
-- 3. FUNCIÓN Y TRIGGER AUTOMÁTICO (AUTOMATIZACIÓN AL INICIAR SESIÓN CON GOOGLE)
-- Cada vez que un usuario inicia sesión con Google o se registra, esta función
-- se dispara automáticamente y crea su perfil en 'public.profiles'.
-- ==============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  assigned_role text := 'cliente';
  user_email text := lower(new.email);
begin
  -- Si el correo es el oficial del gimnasio o el del administrador, se le asigna 'admin'
  if user_email = 'trankilandiagymperu@gmail.com' or
     user_email like 'luisgerardolloccllasaune%' or
     user_email like 'luisllocclla%' then
    assigned_role := 'admin';
  else
    assigned_role := 'cliente';
  end if;

  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    assigned_role
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
-- Si ya iniciaste sesión antes de crear el trigger, esto asegura que tu usuario
-- se copie de 'auth.users' a 'public.profiles' de inmediato:
-- ==============================================================================
insert into public.profiles (id, email, full_name, avatar_url, role)
select
  id,
  email,
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
  raw_user_meta_data->>'avatar_url',
  case
    when lower(email) in ('trankilandiagymperu@gmail.com') or lower(email) like 'luisgerardolloccllasaune%' then 'admin'
    else 'cliente'
  end as role
from auth.users
on conflict (id) do nothing;
