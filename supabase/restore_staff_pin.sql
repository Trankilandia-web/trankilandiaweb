-- ==============================================================================
-- TRANKILANDIA GYM · RESTAURACIÓN DE ACCESO CON PIN DEL PERSONAL
-- ==============================================================================
-- Restaura la autenticación rápida por PIN de 4 dígitos para recepción y administración
-- - Marisol: PIN 1234
-- - Luis Lloclla: PIN 2026
-- - Recepción / Caja: PIN 1234
-- ==============================================================================

begin;

-- Asegurar extensión pgcrypto
create extension if not exists pgcrypto with schema extensions;

-- 1. Asignar los PINs y restablecer bloqueos
update public.personal
set 
  pin = '1234',
  pin_hash = extensions.crypt('1234', extensions.gen_salt('bf', 8)),
  intentos_fallidos = 0,
  bloqueado_hasta = null,
  activo = true
where id = 'staff-marisol';

update public.personal
set 
  pin = '2026',
  pin_hash = extensions.crypt('2026', extensions.gen_salt('bf', 8)),
  intentos_fallidos = 0,
  bloqueado_hasta = null,
  activo = true
where id = 'staff-luis';

update public.personal
set 
  pin = '1234',
  pin_hash = extensions.crypt('1234', extensions.gen_salt('bf', 8)),
  intentos_fallidos = 0,
  bloqueado_hasta = null,
  activo = true
where rol = 'cajero' or id = 'staff-mwbbbeur';

-- 2. Restaurar función RPC pública de verificación de PIN
create or replace function public.verificar_pin_personal(
  p_id text,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $func$
declare
  v_personal record;
  v_hash_to_check text;
  v_nuevos_intentos integer;
begin
  if p_id is null or p_pin is null or p_pin !~ '^\d{4}$' then
    return jsonb_build_object(
      'success', false,
      'error', 'Formato de PIN inválido. Debe contener exactamente 4 dígitos numéricos.'
    );
  end if;

  select
    id, nombre, rol, turno, avatar_color, iniciales, telefono, activo,
    created_at, pin, pin_hash, intentos_fallidos, bloqueado_hasta
  into v_personal
  from public.personal
  where id = p_id;

  if not found or v_personal.activo is not true then
    return jsonb_build_object(
      'success', false,
      'error', 'Colaborador no encontrado o cuenta desactivada.'
    );
  end if;

  if v_personal.bloqueado_hasta is not null and v_personal.bloqueado_hasta > now() then
    return jsonb_build_object(
      'success', false,
      'locked', true,
      'bloqueado_hasta', v_personal.bloqueado_hasta,
      'error', 'Cuenta bloqueada temporalmente por seguridad. Intente nuevamente en 15 minutos.'
    );
  end if;

  if v_personal.bloqueado_hasta is not null and v_personal.bloqueado_hasta <= now() then
    update public.personal
    set intentos_fallidos = 0,
        bloqueado_hasta = null
    where id = p_id;
    v_personal.intentos_fallidos := 0;
  end if;

  v_hash_to_check := v_personal.pin_hash;
  if v_hash_to_check is null and v_personal.pin is not null then
    v_hash_to_check := extensions.crypt(v_personal.pin, extensions.gen_salt('bf', 8));
    update public.personal set pin_hash = v_hash_to_check where id = p_id;
  end if;

  if (v_hash_to_check is not null and v_hash_to_check = extensions.crypt(p_pin, v_hash_to_check))
     or (v_personal.pin is not null and v_personal.pin = p_pin) then
    update public.personal
    set intentos_fallidos = 0,
        bloqueado_hasta = null,
        updated_at = now()
    where id = p_id;

    return jsonb_build_object(
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
  else
    v_nuevos_intentos := coalesce(v_personal.intentos_fallidos, 0) + 1;
    if v_nuevos_intentos >= 5 then
      update public.personal
      set intentos_fallidos = v_nuevos_intentos,
          bloqueado_hasta = now() + interval '15 minutes',
          updated_at = now()
      where id = p_id;

      return jsonb_build_object(
        'success', false,
        'locked', true,
        'intentos_fallidos', v_nuevos_intentos,
        'intentos_restantes', 0,
        'error', 'Demasiados intentos fallidos (5/5). Cuenta bloqueada por 15 minutos.'
      );
    else
      update public.personal
      set intentos_fallidos = v_nuevos_intentos,
          updated_at = now()
      where id = p_id;

      return jsonb_build_object(
        'success', false,
        'locked', false,
        'intentos_fallidos', v_nuevos_intentos,
        'intentos_restantes', 5 - v_nuevos_intentos,
        'error', 'PIN incorrecto. Le quedan ' || (5 - v_nuevos_intentos) || ' intento(s) antes del bloqueo.'
      );
    end if;
  end if;
end;
$func$;

grant execute on function public.verificar_pin_personal(text, text) to anon, authenticated, service_role;

commit;
