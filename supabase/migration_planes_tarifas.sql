-- ==============================================================================
-- TRANKILANDIA GYM: MIGRACIÓN DE PLANES Y TARIFAS EN VIVO POR ADMINISTRACIÓN
-- Archivo: supabase/migration_planes_tarifas.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.planes (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  tagline text,
  precio_mensual numeric NOT NULL,
  precio_trimestral numeric NOT NULL DEFAULT 0,
  precio_semestral numeric NOT NULL DEFAULT 0,
  precio_anual numeric NOT NULL DEFAULT 0,
  badge text,
  descripcion text,
  requiere_documento text,
  activo boolean NOT NULL DEFAULT true,
  es_popular boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.planes ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública y escritura administrativa
DROP POLICY IF EXISTS "Planes lectura publica" ON public.planes;
CREATE POLICY "Planes lectura publica" ON public.planes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Planes gestion total" ON public.planes;
CREATE POLICY "Planes gestion total" ON public.planes FOR ALL USING (true);

-- Semilla con los 4 planes oficiales iniciales de Trankilandia Gym
INSERT INTO public.planes (
  id,
  nombre,
  tagline,
  precio_mensual,
  precio_trimestral,
  precio_semestral,
  precio_anual,
  badge,
  descripcion,
  requiere_documento,
  activo,
  es_popular
) VALUES
(
  'escolar',
  'Plan Escolar (14 a 17 años)',
  'Tarifa preferencial para escolares presentando su DNI (14 a 17 años)',
  50,
  150,
  280,
  500,
  'TARIFA ESCOLAR · S/. 50',
  'Diseñado especialmente para adolescentes de 14 a 17 años que inician su desarrollo físico y deportivo.',
  'dni_escolar',
  true,
  false
),
(
  'universitario',
  'Plan Universitario / Instituto',
  'Tarifa preferencial para universitarios y estudiantes de institutos superiores',
  60,
  150,
  290,
  520,
  'UNIVERSITARIO · S/. 60',
  'Tarifa preferencial pensada para estudiantes de universidades e institutos. Promoción de 3 meses x S/. 150.',
  'carnet_estudiante',
  true,
  false
),
(
  'general',
  'Plan General Libre',
  'La membresía más elegida para transformar tu físico en Huamanga',
  80,
  190,
  330,
  430,
  'MÁS ELEGIDO',
  'Entrena a tu ritmo sin límite de horario con la guía constante de instructores en sala.',
  null,
  true,
  true
),
(
  'combo_boxeo',
  'Plan Gym + Escuela de Boxeo',
  'Fuerza muscular completa + Escuela de Boxeo dirigida',
  120,
  300,
  540,
  900,
  'COMBO 2 EN 1',
  'La experiencia deportiva más completa: musculación libre y clases dirigidas de boxeo.',
  null,
  true,
  false
)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  tagline = EXCLUDED.tagline,
  precio_mensual = EXCLUDED.precio_mensual,
  precio_trimestral = EXCLUDED.precio_trimestral,
  precio_semestral = EXCLUDED.precio_semestral,
  precio_anual = EXCLUDED.precio_anual,
  badge = EXCLUDED.badge,
  descripcion = EXCLUDED.descripcion,
  requiere_documento = EXCLUDED.requiere_documento,
  updated_at = now();
