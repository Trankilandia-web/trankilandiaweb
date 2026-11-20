-- ==============================================================================
-- TRANKILANDIA GYM · RESTAURACIÓN TOTAL DE ACCESO Y PERMISOS DE BD
-- ==============================================================================
-- Restaura de inmediato el funcionamiento original del sistema (commit ca3c863)
-- Permite que socios y administradores ingresen normalmente con su DNI desde la web y recepción.
-- ==============================================================================

begin;

-- 1. Conceder permisos de uso sobre el esquema público
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

-- 2. Limpiar políticas restrictivas previas y habilitar políticas operativas universales
do $restore$
declare
  t text;
  pol record;
begin
  -- Eliminar políticas previas que causaban el error 42501
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;

  -- Crear políticas directas de acceso para todas las tablas del sistema
  for t in
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to anon, authenticated using (true) with check (true)', 'allow_all_' || t, t);
  end loop;
end;
$restore$;

commit;
