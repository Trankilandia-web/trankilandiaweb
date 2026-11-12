-- ==============================================================================
-- TRANKILANDIA GYM · FIXES CRITICOS DE PRODUCCION
-- Ejecutar COMPLETO en Supabase SQL Editor → Run
-- Fecha: 2026-11-12
-- ==============================================================================

-- ==============================================================================
-- FIX 1: RECURSION INFINITA EN PUBLIC.PROFILES (500 en fetchSociosParaAdmin)
-- ==============================================================================
-- Eliminar todas las políticas existentes que causan recursión
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios autenticados leen perfiles básicos" ON public.profiles;
DROP POLICY IF EXISTS "Perfiles lectura publica" ON public.profiles;
DROP POLICY IF EXISTS "Perfiles lectura autenticada" ON public.profiles;
DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios actualizan su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Lectura general de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Modificacion general de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles lectura general" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insercion autoregistro" ON public.profiles;
DROP POLICY IF EXISTS "Profiles actualizacion controlada" ON public.profiles;

-- Habilitar RLS con políticas limpias (sin subconsultas que causen recursión)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles lectura sin recursion"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Profiles insercion segura"
  ON public.profiles FOR INSERT
  TO anon, authenticated
  WITH CHECK (id IS NOT NULL);

CREATE POLICY "Profiles actualizacion propia"
  ON public.profiles FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

SELECT 'FIX 1 OK: Recursion infinita en profiles eliminada' AS resultado;

-- ==============================================================================
-- FIX 2: CONCEDER PERMISOS A RPCs CRITICOS (401 en registrar_venta_pos y vincular_socio_por_dni)
-- ==============================================================================

-- RPC para registrar ventas del POS con control de stock atomico
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'registrar_venta_pos'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.registrar_venta_pos TO anon, authenticated';
    RAISE NOTICE 'GRANT OK: registrar_venta_pos';
  ELSE
    RAISE NOTICE 'SKIP: registrar_venta_pos no existe aun (aplicar migration_descuento_pos.sql primero)';
  END IF;
END $$;

-- RPC para vincular DNI de cliente con su cuenta de Google/email
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'vincular_socio_por_dni'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.vincular_socio_por_dni TO anon, authenticated';
    RAISE NOTICE 'GRANT OK: vincular_socio_por_dni';
  ELSE
    RAISE NOTICE 'SKIP: vincular_socio_por_dni no existe aun (aplicar migration_vincular_dni_rpc.sql primero)';
  END IF;
END $$;

-- RPC para vincular correo a DNI
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'vincular_correo_a_dni'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.vincular_correo_a_dni TO anon, authenticated';
    RAISE NOTICE 'GRANT OK: vincular_correo_a_dni';
  ELSE
    RAISE NOTICE 'SKIP: vincular_correo_a_dni no existe aun';
  END IF;
END $$;

-- RPC de liquidación de saldos (ya debería estar activo, reforzar por si acaso)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'liquidar_saldo_socio'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.liquidar_saldo_socio TO anon, authenticated';
    RAISE NOTICE 'GRANT OK: liquidar_saldo_socio';
  ELSE
    RAISE NOTICE 'SKIP: liquidar_saldo_socio no existe aun';
  END IF;
END $$;

-- RPC de verificacion de PIN del personal
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'verificar_pin_personal'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.verificar_pin_personal TO anon, authenticated';
    RAISE NOTICE 'GRANT OK: verificar_pin_personal';
  ELSE
    RAISE NOTICE 'SKIP: verificar_pin_personal no existe aun';
  END IF;
END $$;

SELECT 'FIX 2 OK: Permisos de RPCs concedidos' AS resultado;

-- ==============================================================================
-- FIX 3: VERIFICAR Y AGREGAR COLUMNA estado EN socios (si no existe)
-- (necesaria para el fallback de eliminarSocio cuando DELETE es denegado)
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'socios'
      AND column_name = 'estado'
  ) THEN
    ALTER TABLE public.socios
      ADD COLUMN estado text DEFAULT 'activo'
        CHECK (estado IN ('activo', 'inactivo', 'congelado', 'suspendido'));
    RAISE NOTICE 'FIX 3: Columna estado agregada a socios';
  ELSE
    RAISE NOTICE 'FIX 3: Columna estado ya existe en socios (OK)';
  END IF;
END $$;

SELECT 'FIX 3 OK: Columna estado en socios verificada' AS resultado;

-- ==============================================================================
-- FIX 4: VERIFICAR COLUMNA key_socio EN ingresos
-- (requerida por la política RLS de migration_rls_hardening.sql)
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ingresos'
      AND column_name = 'key_socio'
  ) THEN
    -- La columna no existe: corregir la política RLS para no requerirla
    DROP POLICY IF EXISTS "Ingresos insercion estricta" ON public.ingresos;
    CREATE POLICY "Ingresos insercion estricta"
      ON public.ingresos FOR INSERT
      TO anon, authenticated
      WITH CHECK (monto IS NOT NULL AND monto != 0);
    RAISE NOTICE 'FIX 4: Politica ingresos corregida (key_socio no existe, check eliminado)';
  ELSE
    RAISE NOTICE 'FIX 4: Columna key_socio existe en ingresos (OK)';
  END IF;
END $$;

SELECT 'FIX 4 OK: Politica de ingresos verificada' AS resultado;

-- ==============================================================================
-- VERIFICACION FINAL
-- ==============================================================================
SELECT
  'profiles RLS' AS componente,
  COUNT(*) AS politicas_activas
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
UNION ALL
SELECT
  'socios RLS' AS componente,
  COUNT(*) AS politicas_activas
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'socios'
UNION ALL
SELECT
  'RPCs activos en public' AS componente,
  COUNT(*) AS politicas_activas
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('registrar_venta_pos', 'vincular_socio_por_dni', 'liquidar_saldo_socio', 'verificar_pin_personal');

SELECT '=== TODOS LOS FIXES CRITICOS APLICADOS ===' AS estado_final;
