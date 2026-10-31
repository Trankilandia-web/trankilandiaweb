-- ==============================================================================
-- TRANKILANDIA GYM: MIGRACIÓN DE AUTENTICACIÓN DNI & PRIVILEGIOS DE ADMINISTRADOR
-- Archivo: supabase/migration_auth_dni_socios.sql
-- Ejecutar en el SQL Editor de Supabase (https://app.supabase.com)
-- ==============================================================================

-- 1. EXTENSIÓN CRIPTOGRÁFICA PARA ENCRIPTADO BCRYPT
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================================================================
-- 2. ACTIVAR PRIVILEGIOS DE SUPER ADMINISTRADOR
-- Inserta o actualiza tu usuario en public.profiles para otorgarte rol 'admin'
-- ==============================================================================
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  membership_status,
  plan,
  updated_at
)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Luis Gerardo Lloclla Sauñe'),
  'admin',
  'activo',
  'Musculación Ingreso Libre',
  now()
FROM auth.users u
WHERE u.email ILIKE '%luisgerardolloccllasaune@gmail.com%'
   OR u.email ILIKE '%trankilandiagymperu@gmail.com%'
ON CONFLICT (id) DO UPDATE 
SET 
  role = 'admin',
  email = EXCLUDED.email,
  updated_at = now();

-- Trigger permanente para garantizar que tu usuario siempre tenga rol admin
CREATE OR REPLACE FUNCTION public.handle_new_superadmin_user()
RETURNS trigger AS $$
BEGIN
  IF NEW.email ILIKE '%luisgerardolloccllasaune@gmail.com%' OR NEW.email ILIKE '%trankilandiagymperu@gmail.com%' THEN
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      role,
      membership_status,
      plan,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Luis Gerardo Lloclla Sauñe'),
      'admin',
      'activo',
      'Musculación Ingreso Libre',
      now()
    )
    ON CONFLICT (id) DO UPDATE 
    SET role = 'admin', updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_superadmin ON auth.users;
CREATE TRIGGER on_auth_user_created_superadmin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_superadmin_user();

-- ==============================================================================
-- 3. RPC: ASIGNAR DNI A SOCIO DESDE RECEPCIÓN (BYPASS RLS SEGURO)
-- Permite al personal de caja asignar DNI a atletas que no lo tenían
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.asignar_dni_a_socio(
  p_socio_id text,
  p_dni text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_socio public.socios%ROWTYPE;
  v_existente_id text;
  v_clean_dni text;
BEGIN
  v_clean_dni := regexp_replace(p_dni, '\D', '', 'g');

  IF length(v_clean_dni) != 8 THEN
    RETURN jsonb_build_object('success', false, 'message', 'El DNI debe contener exactamente 8 dígitos numéricos.');
  END IF;

  -- Verificar unicidad de DNI en socios
  SELECT id INTO v_existente_id 
  FROM public.socios 
  WHERE dni = v_clean_dni AND id != p_socio_id 
  LIMIT 1;

  IF v_existente_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Este DNI ya pertenece a otro socio registrado.');
  END IF;

  -- Actualizar DNI en tabla socios
  UPDATE public.socios
  SET 
    dni = v_clean_dni,
    updated_at = now()
  WHERE id = p_socio_id
  RETURNING * INTO v_socio;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Socio no encontrado con el ID especificado.');
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'DNI asignado exitosamente.', 
    'socio', row_to_json(v_socio)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.asignar_dni_a_socio(text, text) TO authenticated, anon;

-- ==============================================================================
-- 4. APROVISIONAMIENTO EN LOTE PARA TODOS LOS SOCIOS CON DNI
-- Genera en auth.users la cuenta canónica:
--   - Usuario / Email: [DNI]@socio.trankilandia.pe
--   - Contraseña inicial: [DNI] (encriptada con bcrypt)
--   - Perfil en public.profiles y vinculación con public.socios.user_id
-- ==============================================================================
DO $$
DECLARE
  r RECORD;
  v_canonical_email text;
  v_encrypted_pw text;
  v_user_id uuid;
  v_inserted_count integer := 0;
BEGIN
  FOR r IN 
    SELECT DISTINCT ON (dni) 
      id, dni, nombre, email, plan 
    FROM public.socios 
    WHERE dni ~ '^\d{8}$'
  LOOP
    v_canonical_email := r.dni || '@socio.trankilandia.pe';

    -- 1. Verificar si ya existe en auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_canonical_email;

    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();
      v_encrypted_pw := crypt(r.dni, gen_salt('bf'));

      -- 2. Insertar en auth.users
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        v_canonical_email,
        v_encrypted_pw,
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', r.nombre, 'dni', r.dni, 'role', 'cliente'),
        now(),
        now(),
        '',
        '',
        '',
        ''
      );

      -- 3. Identidad de autenticación (tolerante a cualquier versión de Supabase)
      BEGIN
        INSERT INTO auth.identities (
          id,
          user_id,
          identity_data,
          provider,
          last_sign_in_at,
          created_at,
          updated_at
        ) VALUES (
          v_user_id,
          v_user_id,
          jsonb_build_object('sub', v_user_id::text, 'email', v_canonical_email),
          'email',
          now(),
          now(),
          now()
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;

      -- 4. Crear registro en public.profiles cumpliendo los constraints del esquema
      INSERT INTO public.profiles (
        id,
        email,
        full_name,
        dni,
        role,
        membership_status,
        plan,
        created_at,
        updated_at
      ) VALUES (
        v_user_id,
        v_canonical_email,
        r.nombre,
        r.dni,
        'cliente',
        'activo',
        COALESCE(r.plan, 'Musculación Ingreso Libre'),
        now(),
        now()
      ) ON CONFLICT (id) DO UPDATE 
      SET 
        dni = EXCLUDED.dni, 
        full_name = EXCLUDED.full_name,
        updated_at = now();

      v_inserted_count := v_inserted_count + 1;
    ELSE
      -- Si auth.users ya existía, asegurar fila en public.profiles
      INSERT INTO public.profiles (
        id,
        email,
        full_name,
        dni,
        role,
        membership_status,
        plan,
        created_at,
        updated_at
      ) VALUES (
        v_user_id,
        v_canonical_email,
        r.nombre,
        r.dni,
        'cliente',
        'activo',
        COALESCE(r.plan, 'Musculación Ingreso Libre'),
        now(),
        now()
      ) ON CONFLICT (id) DO UPDATE 
      SET 
        dni = EXCLUDED.dni, 
        full_name = EXCLUDED.full_name,
        updated_at = now();
    END IF;

    -- 5. Vincular public.socios.user_id con public.profiles.id (Foreign Key válida)
    UPDATE public.socios 
    SET user_id = v_user_id 
    WHERE id = r.id AND user_id IS NULL;

  END LOOP;

  RAISE NOTICE 'Aprovisionamiento completado: % socios con acceso DNI en Supabase Auth.', v_inserted_count;
END $$;
