-- ==============================================================================
-- TRANKILANDIA GYM · REFUERZO DE SEGURIDAD Y PRIVACIDAD EN PERSONAL
-- ==============================================================================
-- 1. Elimina de forma definitiva cualquier PIN en texto plano remanente (pin = NULL).
-- 2. Asegura que las RPCs 'actualizar_pin_personal' y 'crear_personal_seguro'
--    exijan y verifiquen de forma estricta las credenciales de un administrador activo
--    (p_admin_id y p_admin_pin validado con crypt contra pin_hash).
-- 3. Evita que usuarios anónimos o no autorizados alteren PINs o creen personal.
-- ==============================================================================

-- 1. PURGA DEFINITIVA DE PINS EN TEXTO PLANO
UPDATE public.personal
SET pin = NULL
WHERE pin_hash IS NOT NULL;

-- 2. ELIMINAR VERSIONES PREVIAS DE LAS RPCS PARA EVITAR CONFLICTOS DE PARÁMETROS
DROP FUNCTION IF EXISTS public.actualizar_pin_personal(text, text, text, text);
DROP FUNCTION IF EXISTS public.crear_personal_seguro(text, text, text, text, text, text, text, text, text);

-- 3. RPC: ACTUALIZACIÓN SEGURA DE PIN (EXIGE CREDENCIALES DE ADMINISTRADOR)
CREATE OR REPLACE FUNCTION public.actualizar_pin_personal(
  p_admin_id text,
  p_admin_pin text,
  p_target_id text,
  p_nuevo_pin text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $func$
DECLARE
  v_admin record;
BEGIN
  -- Validar formato del nuevo PIN
  IF p_target_id IS NULL OR p_nuevo_pin !~ '^\d{4}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'El nuevo PIN debe contener exactamente 4 dígitos numéricos.'
    );
  END IF;

  -- Validar credenciales del administrador autorizador
  SELECT id, rol, activo, pin_hash INTO v_admin
  FROM public.personal
  WHERE id = p_admin_id AND rol = 'admin' AND activo = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Autorización denegada: cuenta de administrador inexistente o inactiva.'
    );
  END IF;

  IF v_admin.pin_hash IS NULL OR v_admin.pin_hash != crypt(p_admin_pin, v_admin.pin_hash) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Autorización denegada: PIN de administrador incorrecto.'
    );
  END IF;

  -- Actualizar PIN del colaborador objetivo (hasheado y con texto plano neutralizado)
  UPDATE public.personal
  SET pin_hash = crypt(p_nuevo_pin, gen_salt('bf', 8)),
      pin = NULL,
      intentos_fallidos = 0,
      bloqueado_hasta = NULL,
      updated_at = now()
  WHERE id = p_target_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Colaborador objetivo no encontrado.');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.actualizar_pin_personal(text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.actualizar_pin_personal(text, text, text, text) TO anon, authenticated, service_role;

-- 3. RPC: CREACIÓN SEGURA DE PERSONAL (EXIGE CREDENCIALES DE ADMINISTRADOR)
CREATE OR REPLACE FUNCTION public.crear_personal_seguro(
  p_admin_id text,
  p_admin_pin text,
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
  v_admin record;
  v_iniciales text;
  v_hash text;
  v_new_id text;
BEGIN
  -- Validaciones de entrada
  IF p_nombre IS NULL OR trim(p_nombre) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'El nombre es obligatorio.');
  END IF;

  IF p_pin !~ '^\d{4}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'El PIN debe contener exactamente 4 dígitos numéricos.');
  END IF;

  IF p_rol NOT IN ('admin', 'cajero') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rol no permitido. Debe ser admin o cajero.');
  END IF;

  IF p_turno NOT IN ('manana', 'tarde', 'noche', 'completo') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Turno no permitido.');
  END IF;

  -- Validar credenciales del administrador autorizador
  SELECT id, rol, activo, pin_hash INTO v_admin
  FROM public.personal
  WHERE id = p_admin_id AND rol = 'admin' AND activo = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Autorización denegada: cuenta de administrador inexistente o inactiva.'
    );
  END IF;

  IF v_admin.pin_hash IS NULL OR v_admin.pin_hash != crypt(p_admin_pin, v_admin.pin_hash) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Autorización denegada: PIN de administrador incorrecto.'
    );
  END IF;

  v_iniciales := upper(substring(trim(p_nombre) from 1 for 2));
  v_hash := crypt(p_pin, gen_salt('bf', 8));
  v_new_id := coalesce(p_id, 'staff-' || substr(md5(random()::text), 1, 8));

  INSERT INTO public.personal (
    id, nombre, rol, turno, pin, pin_hash, avatar_color, iniciales, telefono, activo, created_at, updated_at
  )
  VALUES (
    v_new_id, trim(p_nombre), p_rol, p_turno, NULL, v_hash,
    coalesce(p_avatar_color, 'from-amber-400 to-amber-600 text-black'),
    v_iniciales, p_telefono, true, now(), now()
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

REVOKE EXECUTE ON FUNCTION public.crear_personal_seguro(text, text, text, text, text, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.crear_personal_seguro(text, text, text, text, text, text, text, text, text) TO anon, authenticated, service_role;

SELECT 'Seguridad de public.personal reforzada: pin texto plano purgado y RPCs protegidas con verificación de administrador' AS resultado;
