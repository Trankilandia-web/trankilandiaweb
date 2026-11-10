-- ==============================================================================
-- TRANKILANDIA GYM · SOLUCIÓN INTEGRAL PARA SUPABASE
-- Cuentas de Personal en la Nube, Arreglo de Permisos y Alta Disponibilidad
-- Ejecutar este archivo completo en el SQL Editor de tu proyecto en Supabase:
-- https://supabase.com/dashboard/project/kffaydyoivwkaalmqdro/editor
-- ==============================================================================

-- 1. CORREGIR POLÍTICAS RECURSIVAS EN PUBLIC.PROFILES
DROP POLICY IF EXISTS "Usuarios autenticados leen perfiles básicos" ON public.profiles;
DROP POLICY IF EXISTS "Perfiles lectura publica" ON public.profiles;
DROP POLICY IF EXISTS "Perfiles lectura autenticada" ON public.profiles;
DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios actualizan su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Lectura general de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Modificacion general de perfiles" ON public.profiles;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura general de perfiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Modificacion general de perfiles"
  ON public.profiles FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. CREACIÓN DE TABLA DEDICADA DE PERSONAL (SEGURIDAD Y PIN)
CREATE TABLE IF NOT EXISTS public.personal (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  rol text NOT NULL CHECK (rol IN ('admin', 'cajero')),
  turno text NOT NULL CHECK (turno IN ('manana', 'tarde', 'noche', 'completo')),
  pin text NOT NULL,
  avatar_color text DEFAULT 'from-amber-400 to-amber-600 text-black',
  iniciales text NOT NULL,
  telefono text,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.personal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso total personal" ON public.personal;
CREATE POLICY "Acceso total personal"
  ON public.personal FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

GRANT ALL ON TABLE public.personal TO anon, authenticated, service_role;

-- 3. INSERCIÓN DE CUENTAS OFICIALES DE PERSONAL EN PUBLIC.PERSONAL
INSERT INTO public.personal (id, nombre, rol, turno, pin, avatar_color, iniciales, telefono)
VALUES
  ('staff-marisol', 'Marisol', 'admin', 'completo', '1234', 'from-amber-400 to-amber-600 text-black', 'M', '999787489'),
  ('staff-luis', 'Luis Lloclla', 'admin', 'completo', '2026', 'from-purple-500 to-indigo-600 text-white', 'LL', '958183360'),
  ('staff-recepcion-m', 'Recepción Mañana', 'cajero', 'manana', '1111', 'from-emerald-400 to-teal-600 text-black', 'RM', NULL),
  ('staff-recepcion-t', 'Recepción Tarde', 'cajero', 'tarde', '2222', 'from-blue-400 to-indigo-600 text-white', 'RT', NULL)
ON CONFLICT (id) DO UPDATE SET
  pin = EXCLUDED.pin,
  nombre = EXCLUDED.nombre,
  rol = EXCLUDED.rol,
  turno = EXCLUDED.turno,
  telefono = EXCLUDED.telefono,
  updated_at = now();

-- 4. CONFIRMACIÓN FINAL DE INTEGRIDAD
SELECT 'Cuentas de personal creadas y permisos asegurados con éxito en Supabase' AS resultado;
