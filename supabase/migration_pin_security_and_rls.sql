-- ==============================================================================
-- TRANKILANDIA GYM · MIGRACIÓN PASO 1: SEGURIDAD DE PINS, RLS Y PROTECCIÓN BRUTE-FORCE
-- ==============================================================================
-- 1. Activa la extensión criptográfica pgcrypto para hashing blowfish (bcrypt).
-- 2. Añade pin_hash, intentos_fallidos y bloqueado_hasta a public.personal.
-- 3. Convierte los PINs en texto plano actuales a hashes crypt('...', gen_salt('bf', 8)).
-- 4. Bloquea el SELECT de las columnas 'pin' y 'pin_hash' a los roles anon y authenticated.
-- 5. Provee la función RPC verificar_pin_personal con protección de fuerza bruta
--    (máximo 5 intentos fallidos -> bloqueo automático por 15 minutos).
-- 6. Provee RPCs seguras para creación y actualización de credenciales de personal.
-- ==============================================================================

-- 1. EXTENSIÓN CRIPTOGRÁFICA
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. MODIFICACIÓN DE ESTRUCTURA EN PUBLIC.PERSONAL
ALTER TABLE public.personal
  ADD COLUMN IF NOT EXISTS pin_hash text,
  ADD COLUMN IF NOT EXISTS intentos_fallidos integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bloqueado_hasta timestamptz DEFAULT NULL;

-- Permitir que la columna pin sea nula una vez migrada
ALTER TABLE public.personal
  ALTER COLUMN pin DROP NOT NULL;

-- 3. MIGRAR PINS ACTUALES A HASHES BCRYPT (SI NO SE HAN HASHEADO AÚN)
UPDATE public.personal
SET pin_hash = crypt(pin, gen_salt('bf', 8))
WHERE pin IS NOT NULL
  AND (pin_hash IS NULL OR pin_hash = '');

-- Opcional: una vez verificado, neutralizar el texto plano de la columna pin
-- UPDATE public.personal SET pin = NULL WHERE pin_hash IS NOT NULL;

-- 4. SEGURIDAD DE COLUMNAS (COLUMN-LEVEL SECURITY) & RLS
-- Revocar todos los permisos directos sobre la tabla al público y autenticados
REVOKE ALL ON TABLE public.personal FROM anon, authenticated;

-- Otorgar SELECT ÚNICAMENTE a las columnas públicas no confidenciales
-- La columna 'pin' y 'pin_hash' quedan ESTRICTAMENTE DENEGADAS para clientes web
GRANT SELECT (
  id,
  nombre,
  rol,
  turno,
  avatar_color,
  iniciales,
  telefono,
  activo,
  created_at,
  updated_at
) ON TABLE public.personal TO anon, authenticated;

-- Activar y reforzar Row Level Security
ALTER TABLE public.personal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso total personal" ON public.personal;
DROP POLICY IF EXISTS "Lectura publica segura de personal" ON public.personal;

CREATE POLICY "Lectura publica segura de personal"
  ON public.personal FOR SELECT
  TO anon, authenticated
  USING (activo = true);

-- 5. RPC SEGURA: VERIFICACIÓN DE PIN CON PROTECCIÓN CONTRA FUERZA BRUTA
CREATE OR REPLACE FUNCTION public.verificar_pin_personal(
  p_id text,
  p_pin text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $func$
DECLARE
  v_personal record;
  v_hash_to_check text;
  v_nuevos_intentos integer;
BEGIN
  -- A. Validar parámetros de entrada
  IF p_id IS NULL OR p_pin IS NULL OR p_pin !~ '^\d{4}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Formato de PIN inválido. Debe contener exactamente 4 dígitos numéricos.'
    );
  END IF;

  -- B. Consultar registro del colaborador
  SELECT
    id, nombre, rol, turno, avatar_color, iniciales, telefono, activo,
    created_at, pin, pin_hash, intentos_fallidos, bloqueado_hasta
  INTO v_personal
  FROM public.personal
  WHERE id = p_id;

  IF NOT FOUND OR v_personal.activo IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Colaborador no encontrado o cuenta desactivada.'
    );
  END IF;

  -- C. Verificar si la cuenta se encuentra bloqueada por intentos fallidos
  IF v_personal.bloqueado_hasta IS NOT NULL AND v_personal.bloqueado_hasta > now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'locked', true,
      'bloqueado_hasta', v_personal.bloqueado_hasta,
      'error', 'Cuenta bloqueada temporalmente por seguridad. Intente nuevamente en 15 minutos.'
    );
  END IF;

  -- Si el tiempo de bloqueo ya expiró, restablecer contador
  IF v_personal.bloqueado_hasta IS NOT NULL AND v_personal.bloqueado_hasta <= now() THEN
    UPDATE public.personal
    SET intentos_fallidos = 0,
        bloqueado_hasta = NULL
    WHERE id = p_id;
    v_personal.intentos_fallidos := 0;
  END IF;

  -- D. Resolver hash (compatibilidad inmediata con PIN plano previo si no se había migrado)
  v_hash_to_check := v_personal.pin_hash;
  IF v_hash_to_check IS NULL AND v_personal.pin IS NOT NULL THEN
    v_hash_to_check := crypt(v_personal.pin, gen_salt('bf', 8));
    UPDATE public.personal
    SET pin_hash = v_hash_to_check
    WHERE id = p_id;
  END IF;

  -- E. Comparar PIN usando crypt
  IF v_hash_to_check IS NOT NULL AND v_hash_to_check = crypt(p_pin, v_hash_to_check) THEN
    -- ÉXITO: Restablecer intentos fallidos y actualizar sesión
    UPDATE public.personal
    SET intentos_fallidos = 0,
        bloqueado_hasta = NULL,
        updated_at = now()
    WHERE id = p_id;

    RETURN jsonb_build_object(
      'success', true,
      'user', jsonb_build_object(
        'id', v_personal.id,
        'nombre', v_personal.nombre,
        'rol', v_personal.rol,
        'turno', v_personal.turno,
        'avatarColor', coalesce(v_personal.avatar_color, 'from-amber-400 to-amber-600 text-black'),
        'iniciales', v_personal.iniciales,
        'telefono', v_personal.telefono,
        'activo', v_personal.activo,
        'createdAt', v_personal.created_at
      )
    );
  ELSE
    -- FALLO: Incrementar intentos fallidos
    v_nuevos_intentos := coalesce(v_personal.intentos_fallidos, 0) + 1;

    IF v_nuevos_intentos >= 5 THEN
      -- Bloquear cuenta por 15 minutos
      UPDATE public.personal
      SET intentos_fallidos = v_nuevos_intentos,
          bloqueado_hasta = now() + interval '15 minutes',
          updated_at = now()
      WHERE id = p_id;

      RETURN jsonb_build_object(
        'success', false,
        'locked', true,
        'intentos_fallidos', v_nuevos_intentos,
        'intentos_restantes', 0,
        'error', 'Demasiados intentos fallidos (5/5). Cuenta bloqueada por 15 minutos.'
      );
    ELSE
      -- Registrar intento fallido
      UPDATE public.personal
      SET intentos_fallidos = v_nuevos_intentos,
          updated_at = now()
      WHERE id = p_id;

      RETURN jsonb_build_object(
        'success', false,
        'locked', false,
        'intentos_fallidos', v_nuevos_intentos,
        'intentos_restantes', 5 - v_nuevos_intentos,
        'error', 'PIN incorrecto. Le quedan ' || (5 - v_nuevos_intentos) || ' intento(s) antes del bloqueo.'
      );
    END IF;
  END IF;
END;
$func$;

-- Permisos de ejecución de la RPC
REVOKE EXECUTE ON FUNCTION public.verificar_pin_personal(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verificar_pin_personal(text, text) TO anon, authenticated, service_role;

-- 6. RPC SEGURA: ACTUALIZAR PIN DE PERSONAL
CREATE OR REPLACE FUNCTION public.actualizar_pin_personal(
  p_id text,
  p_nuevo_pin text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $func$
BEGIN
  IF p_id IS NULL OR p_nuevo_pin !~ '^\d{4}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El PIN debe contener exactamente 4 dígitos numéricos.'
    );
  END IF;

  UPDATE public.personal
  SET pin_hash = crypt(p_nuevo_pin, gen_salt('bf', 8)),
      pin = NULL, -- Eliminar texto plano
      intentos_fallidos = 0,
      bloqueado_hasta = NULL,
      updated_at = now()
  WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Colaborador no encontrado.');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.actualizar_pin_personal(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.actualizar_pin_personal(text, text) TO anon, authenticated, service_role;

-- 7. RPC SEGURA: CREAR PERSONAL CON PIN HASHEADO
CREATE OR REPLACE FUNCTION public.crear_personal_seguro(
  p_id text,
  p_nombre text,
  p_rol text,
  p_turno text,
  p_pin text,
  p_avatar_color text DEFAULT 'from-amber-400 to-amber-600 text-black',
  p_telefono text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $func$
DECLARE
  v_iniciales text;
  v_hash text;
  v_new_id text;
BEGIN
  IF p_nombre IS NULL OR trim(p_nombre) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'El nombre es obligatorio.');
  END IF;

  IF p_pin !~ '^\d{4}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'El PIN debe contener 4 dígitos.');
  END IF;

  IF p_rol NOT IN ('admin', 'cajero') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rol no permitido. Debe ser admin o cajero.');
  END IF;

  IF p_turno NOT IN ('manana', 'tarde', 'noche', 'completo') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Turno no permitido.');
  END IF;

  v_iniciales := upper(substring(trim(p_nombre) from 1 for 2));
  v_hash := crypt(p_pin, gen_salt('bf', 8));
  v_new_id := coalesce(p_id, 'staff-' || substr(md5(random()::text), 1, 8));

  INSERT INTO public.personal (
    id,
    nombre,
    rol,
    turno,
    pin,
    pin_hash,
    avatar_color,
    iniciales,
    telefono,
    activo,
    created_at,
    updated_at
  )
  VALUES (
    v_new_id,
    trim(p_nombre),
    p_rol,
    p_turno,
    NULL, -- Jamás guardar texto plano
    v_hash,
    coalesce(p_avatar_color, 'from-amber-400 to-amber-600 text-black'),
    v_iniciales,
    p_telefono,
    true,
    now(),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', v_new_id,
      'nombre', trim(p_nombre),
      'rol', p_rol,
      'turno', p_turno,
      'avatarColor', coalesce(p_avatar_color, 'from-amber-400 to-amber-600 text-black'),
      'iniciales', v_iniciales,
      'telefono', p_telefono,
      'activo', true
    )
  );
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.crear_personal_seguro(text, text, text, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.crear_personal_seguro(text, text, text, text, text, text, text) TO anon, authenticated, service_role;

-- 8. CONFIRMACIÓN
SELECT 'Migración de seguridad de PINs, bloqueo contra fuerza bruta y RLS aplicada con éxito' AS resultado;
