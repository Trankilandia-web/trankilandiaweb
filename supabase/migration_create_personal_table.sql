-- ==============================================================================
-- TRANKILANDIA GYM · CREACIÓN DE TABLA DE PERSONAL Y AUTENTICACIÓN SEGURA
-- Archivo: supabase/migration_create_personal_table.sql
-- Ejecutar en el SQL Editor de Supabase (https://supabase.com/dashboard/project/kffaydyoivwkaalmqdro/editor)
-- ==============================================================================

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

-- Habilitar RLS con acceso seguro
ALTER TABLE public.personal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso de personal" ON public.personal;
CREATE POLICY "Acceso de personal"
  ON public.personal FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Semilla oficial de usuarios
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
  updated_at = now();
