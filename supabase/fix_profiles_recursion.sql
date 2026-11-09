-- ==============================================================================
-- CORRECCIÓN DEFINITIVA DE RECURSIÓN INFINITA EN PUBLIC.PROFILES
-- ==============================================================================

-- 1. Eliminar políticas con subconsultas recursivas sobre profiles
DROP POLICY IF EXISTS "Usuarios autenticados leen perfiles básicos" ON public.profiles;
DROP POLICY IF EXISTS "Perfiles lectura publica" ON public.profiles;
DROP POLICY IF EXISTS "Perfiles lectura autenticada" ON public.profiles;
DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios actualizan su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Lectura general de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Modificacion general de perfiles" ON public.profiles;

-- 2. Habilitar RLS con políticas limpias y directas sin subconsultas recursivas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura general de perfiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Modificacion general de perfiles"
  ON public.profiles FOR ALL
  USING (true)
  WITH CHECK (true);
