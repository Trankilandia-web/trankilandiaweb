-- ==============================================================================
-- TRANKILANDIA GYM · REPARACIÓN INTEGRAL DE SOCIOS, VINCULACIÓN WEB Y DNI
-- ==============================================================================
-- Ejecutar en el SQL Editor de Supabase (https://app.supabase.com)
-- 1. Repara a Wilmer Fernandez (DNI 70447554) y vincula su carnet
-- 2. Asegura rol 'admin' permanente para Marisol Flores y Luis Lloclla
-- 3. Actualiza políticas RLS para permitir consulta, inserción y vinculación
-- 4. Activa replicación en tiempo real (Supabase Realtime) para ambos dispositivos
-- ==============================================================================

-- 1. ASEGURAR ROL DE ADMINISTRADOR A MARISOL FLORES Y LUIS LLOCLLA
UPDATE public.profiles
SET role = 'admin'
WHERE email ILIKE ANY (ARRAY[
  '%marisolflores%',
  '%marisolflores15%',
  '%luisgerardolloccllasaune%',
  '%luis.llocclla%'
]);

-- Trigger automático para que cuando se autentiquen con Google o correo, queden como 'admin'
CREATE OR REPLACE FUNCTION public.handle_set_admin_role()
RETURNS trigger AS $$
BEGIN
  IF NEW.email ILIKE ANY (ARRAY['%marisolflores%', '%marisolflores15%', '%luisgerardolloccllasaune%', '%luis.llocclla%']) THEN
    NEW.role := 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_admin_role ON public.profiles;
CREATE TRIGGER trg_set_admin_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_set_admin_role();

-- 2. REPARACIÓN INMEDIATA DEL SOCIO WILMER FERNANDEZ (DNI 70447554)
DO $$
DECLARE
  v_profile_id uuid;
BEGIN
  -- Buscar si existe un perfil para este DNI o usuario
  SELECT id INTO v_profile_id FROM public.profiles WHERE dni = '70447554' LIMIT 1;

  -- A. Si el socio existe en socios por DNI o ID provisional, actualizarlo a su estado oficial
  IF EXISTS (SELECT 1 FROM public.socios WHERE dni = '70447554' OR id = 'MEM-2747') THEN
    UPDATE public.socios
    SET
      nombre = 'Wilmer Fernandez',
      dni = '70447554',
      plan = '1 Mes · Musculación Libre',
      precio_plan = 80,
      tipo_pago = 'full',
      adelanto_pagado = 80,
      saldo_pendiente = 0,
      fecha_inicio = (now() AT TIME ZONE 'America/Lima')::date,
      fecha_fin = ((now() AT TIME ZONE 'America/Lima')::date + interval '30 days')::date,
      metodo_pago = 'efectivo',
      numero_boleta = 'B001-000418',
      turno = 'manana',
      coach_asignado = 'Coach Marcos Rivas',
      observaciones = 'Inscripción activa oficial',
      user_id = COALESCE(v_profile_id, user_id),
      updated_at = now()
    WHERE dni = '70447554' OR id = 'MEM-2747';
  ELSE
    -- Si no existía, insertarlo oficialmente
    INSERT INTO public.socios (
      id, user_id, nombre, dni, plan, precio_plan, tipo_pago,
      adelanto_pagado, saldo_pendiente, fecha_inicio, fecha_fin,
      metodo_pago, numero_boleta, turno, coach_asignado, observaciones,
      created_at, updated_at
    ) VALUES (
      'MEM-00418',
      v_profile_id,
      'Wilmer Fernandez',
      '70447554',
      '1 Mes · Musculación Libre',
      80,
      'full',
      80,
      0,
      (now() AT TIME ZONE 'America/Lima')::date,
      ((now() AT TIME ZONE 'America/Lima')::date + interval '30 days')::date,
      'efectivo',
      'B001-000418',
      'manana',
      'Coach Marcos Rivas',
      'Inscripción activa oficial',
      now(),
      now()
    );
  END IF;

  -- B. Actualizar el perfil en public.profiles para que la app web muestre su membresía activa
  IF v_profile_id IS NOT NULL THEN
    UPDATE public.profiles
    SET
      full_name = 'Wilmer Fernandez',
      membership_status = 'activo',
      plan = '1 Mes · Musculación Libre',
      updated_at = now()
    WHERE id = v_profile_id;
  END IF;
END $$;

-- 3. ACTUALIZACIÓN DE POLÍTICAS RLS EN PUBLIC.SOCIOS
ALTER TABLE public.socios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clientes ven exclusivamente su propio registro" ON public.socios;
DROP POLICY IF EXISTS "Clientes consultan socio no vinculado por DNI" ON public.socios;
DROP POLICY IF EXISTS "Clientes ven su propio registro o consultan DNI no vinculado" ON public.socios;
DROP POLICY IF EXISTS "Clientes vinculan su propio user_id" ON public.socios;
DROP POLICY IF EXISTS "Admin y Caja gestionan todos los socios" ON public.socios;
DROP POLICY IF EXISTS "Lectura de socios para usuarios autenticados" ON public.socios;
DROP POLICY IF EXISTS "Gestion total de socios para admin y caja" ON public.socios;

-- Lectura para todos los usuarios autenticados (permite que mostrador, laptop y clientes vean los socios)
CREATE POLICY "Lectura de socios para usuarios autenticados"
  ON public.socios FOR SELECT
  TO authenticated
  USING (true);

-- Gestión total (insertar, editar, eliminar) para administradores, recepción y vinculación cliente
CREATE POLICY "Gestion total de socios para admin y caja"
  ON public.socios FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'caja')
    )
    OR auth.jwt() ->> 'email' ILIKE ANY (ARRAY['%marisolflores%', '%marisolflores15%', '%luisgerardolloccllasaune%', '%luis.llocclla%'])
    OR (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'caja')
    )
    OR auth.jwt() ->> 'email' ILIKE ANY (ARRAY['%marisolflores%', '%marisolflores15%', '%luisgerardolloccllasaune%', '%luis.llocclla%'])
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

-- 4. FUNCIÓN RPC: vincular_socio_por_dni CON SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.vincular_socio_por_dni(
  p_dni text,
  p_nombre text DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_socio record;
  v_clean_dni text;
  v_res jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado: Inicia sesión para vincular tu membresía.';
  END IF;

  v_clean_dni := regexp_replace(p_dni, '[^0-9]', '', 'g');
  IF length(v_clean_dni) != 8 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'El DNI debe tener exactamente 8 dígitos numéricos.'
    );
  END IF;

  -- 1. Buscar si ya existe el socio en el padrón
  SELECT * INTO v_socio
  FROM public.socios
  WHERE dni = v_clean_dni
  LIMIT 1;

  IF FOUND THEN
    -- Si ya está vinculado a otra cuenta distinta
    IF v_socio.user_id IS NOT NULL AND v_socio.user_id != v_uid THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Este DNI ya está vinculado a otra cuenta de usuario. Acércate a recepción.'
      );
    END IF;

    -- Vincular perfil con el nombre y plan oficial de public.socios
    UPDATE public.profiles
    SET
      dni = v_clean_dni,
      full_name = v_socio.nombre,
      plan = v_socio.plan,
      membership_status = CASE
        WHEN v_socio.fecha_fin < (now() AT TIME ZONE 'America/Lima')::date THEN 'vencido'
        ELSE 'activo'
      END,
      updated_at = now()
    WHERE id = v_uid;

    -- Vincular el socio con el usuario autenticado
    UPDATE public.socios
    SET
      user_id = v_uid,
      email = COALESCE(p_email, email, (SELECT email FROM public.profiles WHERE id = v_uid)),
      updated_at = now()
    WHERE id = v_socio.id;

    SELECT to_jsonb(s.*) INTO v_res
    FROM public.socios s
    WHERE s.id = v_socio.id;

    RETURN jsonb_build_object(
      'success', true,
      'is_new', false,
      'message', '¡Membresía vinculada con éxito a nombre de ' || v_socio.nombre || '!',
      'socio', v_res
    );
  ELSE
    -- Si no existe en el padrón, crear cuenta digital preservando el nombre ingresado
    UPDATE public.profiles
    SET
      dni = v_clean_dni,
      full_name = COALESCE(p_nombre, full_name),
      membership_status = 'inactive',
      plan = 'Sin Membresía Activa',
      updated_at = now()
    WHERE id = v_uid;

    INSERT INTO public.socios (
      id, nombre, dni, email, user_id, plan, precio_plan, tipo_pago,
      adelanto_pagado, saldo_pendiente, fecha_inicio, fecha_fin,
      metodo_pago, numero_boleta, turno, coach_asignado, observaciones
    ) VALUES (
      'MEM-' || right(extract(epoch from now())::bigint::text, 4),
      COALESCE(p_nombre, 'Nuevo Atleta'),
      v_clean_dni,
      p_email,
      v_uid,
      'Sin Membresía Activa',
      0,
      'full',
      0,
      0,
      (now() AT TIME ZONE 'America/Lima')::date,
      (now() AT TIME ZONE 'America/Lima')::date,
      'efectivo',
      'REG-' || right(v_clean_dni, 4),
      'manana',
      'Coach Marcos Rivas',
      'Cuenta digital creada. Pendiente de suscripción a un plan.'
    )
    RETURNING to_jsonb(socios.*) INTO v_res;

    RETURN jsonb_build_object(
      'success', true,
      'is_new', true,
      'message', 'Cuenta digital creada con DNI ' || v_clean_dni || '. Acércate a recepción para activar tu membresía.',
      'socio', v_res
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.vincular_socio_por_dni(text, text, text) TO authenticated;

-- 5. ACTIVAR REPLICACIÓN EN TIEMPO REAL (SUPABASE REALTIME WEBSOCKETS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'socios'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.socios;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'asistencias'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.asistencias;
  END IF;
END $$;

-- 6. VERIFICACIÓN FINAL: WILMER FERNANDEZ Y TOTAL DE SOCIOS
SELECT 
  id, 
  nombre, 
  dni, 
  plan, 
  precio_plan, 
  saldo_pendiente, 
  fecha_inicio, 
  fecha_fin, 
  user_id 
FROM public.socios 
WHERE dni = '70447554';

SELECT count(*) as total_socios_en_nube FROM public.socios;
