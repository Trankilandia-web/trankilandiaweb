-- ==============================================================================
-- TRANKILANDIA GYM · MIGRACIÓN: EVALUACIONES CORPORALES Y BALANZA SMART
-- ==============================================================================
-- Tabla de evaluaciones segmentales de 8 electrodos (EUROMAR G78-BT / Fitdays)
-- y columna de estatura en el padrón de socios.
-- ==============================================================================

begin;

-- 1. Agregar estatura a socios si no existe
alter table public.socios add column if not exists estatura_cm numeric(5,1);

-- 2. Crear tabla especializada para evaluaciones corporales
create table if not exists public.evaluaciones_corporales (
  id uuid primary key default gen_random_uuid(),
  socio_id text not null references public.socios(id) on delete cascade,
  socio_dni text not null,
  fecha timestamptz not null default now(),
  
  -- Biometría de entrada
  estatura_cm numeric(5,1) not null,
  edad integer not null,
  sexo text not null,
  
  -- Métricas Corporales Globales
  peso_kg numeric(5,2) not null,
  imc numeric(4,1) not null,
  grasa_corporal_pct numeric(4,1) not null,
  grasa_corporal_kg numeric(5,2) not null,
  masa_muscular_kg numeric(5,2) not null,
  masa_muscular_pct numeric(4,1) not null,
  grasa_visceral integer not null,
  agua_pct numeric(4,1) not null,
  masa_osea_kg numeric(4,2) not null,
  bmr_kcal integer not null,
  edad_metabolica integer not null,
  proteina_pct numeric(4,1) not null,
  puntuacion_corporal integer not null default 75,
  
  -- Desglose Segmental (JSONB)
  segmental_data jsonb not null default '{}'::jsonb,
  
  -- Auditoría de la medición
  evaluador_id text not null,
  evaluador_nombre text not null,
  observaciones text,
  origen text not null default 'bluetooth_g78',
  created_at timestamptz not null default now()
);

-- 3. Índices de rendimiento
create index if not exists idx_evaluaciones_socio_dni on public.evaluaciones_corporales(socio_dni);
create index if not exists idx_evaluaciones_fecha on public.evaluaciones_corporales(fecha desc);

-- 4. Habilitar y configurar RLS
alter table public.evaluaciones_corporales enable row level security;

drop policy if exists "allow_all_evaluaciones_corporales" on public.evaluaciones_corporales;
create policy "allow_all_evaluaciones_corporales"
  on public.evaluaciones_corporales
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- 5. Conceder permisos de uso
grant select, insert, update, delete on public.evaluaciones_corporales to anon, authenticated, service_role;

commit;
