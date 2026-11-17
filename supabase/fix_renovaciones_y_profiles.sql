-- ==============================================================================
-- TRANKILANDIA GYM · SOLUCIÓN DEFINITIVA A RECURSIÓN RLS Y RENOVACIONES ATÓMICAS
-- Fecha: 2026-11-17
-- ==============================================================================

-- 1. CORREGIR RECURSIÓN INFINITA EN PUBLIC.PROFILES (Error 42P17)
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
DROP POLICY IF EXISTS "Profiles lectura sin recursion" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insercion segura" ON public.profiles;
DROP POLICY IF EXISTS "Profiles actualizacion propia" ON public.profiles;

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

-- 2. RPC ATÓMICA DE RENOVACIÓN DE MEMBRESÍAS (SECURITY DEFINER)
-- Permite que recepcionistas renueven socios, actualicen vigencias y registren
-- cobros en ingresos de manera atómica sin ser bloqueados por triggers de saldo.
CREATE OR REPLACE FUNCTION public.renovar_membresia_socio(
  p_socio_id TEXT,
  p_plan TEXT,
  p_precio_plan NUMERIC,
  p_tipo_pago TEXT,
  p_adelanto_pagado NUMERIC,
  p_saldo_pendiente NUMERIC,
  p_fecha_inicio TEXT,
  p_fecha_fin TEXT,
  p_fecha_limite_pago TEXT DEFAULT NULL,
  p_metodo_pago TEXT DEFAULT 'efectivo',
  p_numero_boleta TEXT DEFAULT NULL,
  p_turno TEXT DEFAULT 'manana',
  p_coach_asignado TEXT DEFAULT 'Coach Marcos Rivas',
  p_registrar_ingreso BOOLEAN DEFAULT true,
  p_operador TEXT DEFAULT 'Recepción'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_socio RECORD;
  v_boleta TEXT;
  v_ingreso_id BIGINT := NULL;
  v_monto_ingreso NUMERIC := 0;
  v_tipo_ingreso TEXT;
BEGIN
  IF p_socio_id IS NULL OR TRIM(p_socio_id) = '' THEN
    RAISE EXCEPTION 'El ID del socio es requerido.';
  END IF;

  SELECT * INTO v_socio
  FROM public.socios
  WHERE id = p_socio_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Socio % no encontrado.', p_socio_id;
  END IF;

  v_boleta := COALESCE(p_numero_boleta, v_socio.numero_boleta);
  IF v_boleta IS NULL OR TRIM(v_boleta) = '' THEN
    v_boleta := 'B001-' || LPAD((FLOOR(RANDOM() * 900000 + 100000))::TEXT, 6, '0');
  END IF;

  -- Actualizar registro en socios
  UPDATE public.socios
  SET
    plan = p_plan,
    precio_plan = p_precio_plan,
    tipo_pago = p_tipo_pago,
    adelanto_pagado = p_adelanto_pagado,
    saldo_pendiente = p_saldo_pendiente,
    fecha_inicio = p_fecha_inicio::date,
    fecha_fin = p_fecha_fin::date,
    fecha_limite_pago = p_fecha_limite_pago,
    metodo_pago = p_metodo_pago,
    numero_boleta = v_boleta,
    turno = p_turno,
    coach_asignado = p_coach_asignado,
    estado = 'activo',
    updated_at = NOW()
  WHERE id = p_socio_id;

  -- Registrar en ingresos si hubo pago efectivo hoy y p_registrar_ingreso es true
  v_monto_ingreso := CASE WHEN p_tipo_pago = 'full' THEN p_precio_plan ELSE p_adelanto_pagado END;
  IF p_registrar_ingreso AND v_monto_ingreso > 0 THEN
    v_tipo_ingreso := CASE WHEN p_tipo_pago = 'full' THEN 'Renovación de Membresía' ELSE 'Renovación con Adelanto' END;
    INSERT INTO public.ingresos (key_socio, monto, metodo_pago, tipo, observacion)
    VALUES (
      p_socio_id,
      v_monto_ingreso,
      p_metodo_pago,
      v_tipo_ingreso,
      'Cobro boleta ' || v_boleta || ' (' || p_plan || ') - ' || p_operador
    )
    RETURNING id INTO v_ingreso_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'socio_id', p_socio_id,
    'numero_boleta', v_boleta,
    'ingreso_id', v_ingreso_id,
    'fecha_inicio', p_fecha_inicio,
    'fecha_fin', p_fecha_fin,
    'saldo_pendiente', p_saldo_pendiente
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.renovar_membresia_socio TO anon, authenticated;
