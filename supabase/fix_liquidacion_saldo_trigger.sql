-- ==============================================================================
-- TRANKILANDIA GYM · CORRECCIÓN CRÍTICA DE LIQUIDACIÓN DE SALDOS Y COBRANZAS
-- ==============================================================================
-- Resuelve el error en recepción/caja:
-- "Error en liquidación de saldo: Operación rechazada: La anulación o reducción
--  directa de saldos pendientes está prohibida. Toda liquidación o abono debe
--  realizarse mediante la función oficial liquidar_saldo_socio."
--
-- Causa:
-- El trigger trg_proteger_saldo_socios bloqueaba indebidamente las llamadas
-- legítimas a liquidar_saldo_socio() y renovar_membresia_socio() porque se
-- ejecutan bajo la conexión anónima de recepción.
--
-- Solución:
-- Se implementa un canal de autorización transaccional (set_config local) que
-- permite a las funciones oficiales reducir saldos mientras continúa BLOQUEANDO
-- cualquier manipulación directa de deudas por REST.
--
-- Ejecutar en el SQL Editor de Supabase:
-- https://supabase.com/dashboard/project/kffaydyoivwkaalmqdro/editor
-- ==============================================================================

BEGIN;

-- 1. Actualizar el trigger protector para reconocer funciones oficiales autorizadas
CREATE OR REPLACE FUNCTION public.proteger_reduccion_saldo_socios()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Permitir si la operación proviene de una función oficial autorizada (liquidar_saldo_socio o renovar_membresia_socio)
  IF current_setting('app.bypass_saldo_protection', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Bloquear cualquier reducción o anulación directa por fuera de las funciones oficiales
  IF COALESCE(NEW.saldo_pendiente, 0) < COALESCE(OLD.saldo_pendiente, 0) THEN
    RAISE EXCEPTION 'Operación rechazada: La anulación o reducción directa de saldos pendientes está prohibida. Toda liquidación o abono debe realizarse mediante la función oficial liquidar_saldo_socio.';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Asegurar la vinculación del trigger en public.socios
DROP TRIGGER IF EXISTS trg_proteger_saldo_socios ON public.socios;
CREATE TRIGGER trg_proteger_saldo_socios
BEFORE UPDATE ON public.socios
FOR EACH ROW
EXECUTE FUNCTION public.proteger_reduccion_saldo_socios();


-- 3. Actualizar la RPC atómica oficial de liquidación de saldos con la bandera de autorización
CREATE OR REPLACE FUNCTION public.liquidar_saldo_socio(
  p_socio_id TEXT,
  p_monto NUMERIC,
  p_metodo_pago TEXT,
  p_operador TEXT DEFAULT 'Recepción'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_socio RECORD;
  v_nuevo_saldo NUMERIC;
  v_nuevo_adelanto NUMERIC;
  v_tipo_pago TEXT;
  v_boleta TEXT;
  v_ingreso_id BIGINT;
  v_metodo_limpio TEXT;
  v_tipo_ingreso TEXT;
BEGIN
  -- Activar autorización exclusiva para esta transacción
  PERFORM set_config('app.bypass_saldo_protection', 'true', true);

  -- 1. Validaciones de entrada
  IF p_socio_id IS NULL OR TRIM(p_socio_id) = '' THEN
    RAISE EXCEPTION 'El ID del socio es requerido.';
  END IF;

  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto a cobrar debe ser estrictamente mayor a S/. 0.00.';
  END IF;

  v_metodo_limpio := LOWER(TRIM(COALESCE(p_metodo_pago, 'efectivo')));
  IF v_metodo_limpio NOT IN ('efectivo', 'yape', 'plin', 'tarjeta', 'transferencia') THEN
    v_metodo_limpio := 'efectivo';
  END IF;

  -- 2. Bloqueo de fila para evitar carreras concurrentes
  SELECT * INTO v_socio
  FROM public.socios
  WHERE id = p_socio_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Socio con ID % no encontrado en el padrón.', p_socio_id;
  END IF;

  IF COALESCE(v_socio.saldo_pendiente, 0) <= 0 THEN
    RAISE EXCEPTION 'El socio % ya se encuentra al día (Saldo pendiente: S/. 0.00).', v_socio.nombre;
  END IF;

  -- 3. Cálculo de nuevos importes
  IF p_monto > v_socio.saldo_pendiente THEN
    p_monto := v_socio.saldo_pendiente;
  END IF;

  v_nuevo_saldo := GREATEST(0, v_socio.saldo_pendiente - p_monto);
  v_nuevo_adelanto := COALESCE(v_socio.adelanto_pagado, 0) + p_monto;
  v_tipo_pago := CASE WHEN v_nuevo_saldo = 0 THEN 'full' ELSE 'advance' END;
  v_boleta := 'B001-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');

  v_tipo_ingreso := CASE 
    WHEN v_nuevo_saldo = 0 THEN 'Liquidación Total de Saldo' 
    ELSE 'Abono Parcial de Membresía' 
  END;

  -- 4. Actualización atómica en socios
  UPDATE public.socios
  SET
    saldo_pendiente = v_nuevo_saldo,
    adelanto_pagado = v_nuevo_adelanto,
    tipo_pago = v_tipo_pago,
    fecha_limite_pago = CASE WHEN v_nuevo_saldo = 0 THEN NULL ELSE fecha_limite_pago END,
    numero_boleta = v_boleta,
    updated_at = NOW()
  WHERE id = p_socio_id;

  -- 5. Registro contable atómico en ingresos
  INSERT INTO public.ingresos (
    key_socio,
    monto,
    metodo_pago,
    tipo,
    observacion
  ) VALUES (
    p_socio_id,
    p_monto,
    v_metodo_limpio,
    v_tipo_ingreso,
    'Cobro por ' || COALESCE(p_operador, 'Recepción') || '. Boleta: ' || v_boleta || '. Saldo restante: S/. ' || v_nuevo_saldo
  ) RETURNING id INTO v_ingreso_id;

  RETURN jsonb_build_object(
    'success', true,
    'socio_id', p_socio_id,
    'monto_cobrado', p_monto,
    'saldo_anterior', v_socio.saldo_pendiente,
    'saldo_restante', v_nuevo_saldo,
    'adelanto_acumulado', v_nuevo_adelanto,
    'tipo_pago', v_tipo_pago,
    'numero_boleta', v_boleta,
    'ingreso_id', v_ingreso_id
  );
END;
$$;

-- Permisos y propiedad de liquidar_saldo_socio
ALTER FUNCTION public.liquidar_saldo_socio(TEXT, NUMERIC, TEXT, TEXT) OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.liquidar_saldo_socio(TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.liquidar_saldo_socio(TEXT, NUMERIC, TEXT, TEXT) TO anon, authenticated, service_role;


-- 4. Actualizar la RPC atómica de renovación de membresías con la misma bandera de autorización
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
  -- Activar autorización exclusiva para esta transacción
  PERFORM set_config('app.bypass_saldo_protection', 'true', true);

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

-- Permisos y propiedad de renovar_membresia_socio
ALTER FUNCTION public.renovar_membresia_socio OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.renovar_membresia_socio FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.renovar_membresia_socio TO anon, authenticated, service_role;

COMMIT;

SELECT 'CORRECCIÓN EXITOSA: liquidar_saldo_socio y renovar_membresia_socio desbloqueados para recepción.' AS resultado;
