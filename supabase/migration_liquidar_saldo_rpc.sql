-- ==============================================================================
-- TRANKILANDIA GYM · BLINDAJE FASE 2: RPC ATÓMICA DE LIQUIDACIÓN DE SALDOS
-- Y TRIGGER DE DEDUPLICACIÓN DE ASISTENCIAS POR HARDWARE (LÁSER 1D)
-- ==============================================================================
-- 1. Liquidación atómica ACID de saldos y abonos de membresía
--    (Elimina el desfase no-atómico UPDATE socios + INSERT ingresos del cliente)
-- 2. Bloqueo de concurrencia pesimista con SELECT ... FOR UPDATE
-- 3. Generación y retorno del número de comprobante/boleta oficial
-- 4. Trigger de deduplicación para amortiguar rebotes del lector de código de barras
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- A. RPC: liquidar_saldo_socio (Transacción Atómica de Cobro)
-- ------------------------------------------------------------------------------
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
  -- 1. Validaciones estrictas de entrada
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

  -- 2. Bloqueo pesimista de fila en socios para evitar carreras concurrentes
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

  -- 3. Cálculo de nuevos saldos matemáticos
  -- El cobro no puede superar la deuda real existente
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

  -- 4. Actualización atómica en la tabla socios
  UPDATE public.socios
  SET
    saldo_pendiente = v_nuevo_saldo,
    adelanto_pagado = v_nuevo_adelanto,
    tipo_pago = v_tipo_pago,
    fecha_limite_pago = CASE WHEN v_nuevo_saldo = 0 THEN NULL ELSE fecha_limite_pago END,
    numero_boleta = v_boleta,
    updated_at = NOW()
  WHERE id = p_socio_id;

  -- 5. Registro atómico inmutable en el libro contable de ingresos
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

-- Permisos controlados de ejecución
REVOKE EXECUTE ON FUNCTION public.liquidar_saldo_socio(TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.liquidar_saldo_socio(TEXT, NUMERIC, TEXT, TEXT) TO anon, authenticated, service_role;


-- ------------------------------------------------------------------------------
-- B. TRIGGER: check_asistencia_duplicada (Filtro Anti-Rebote de Escáner 1D)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_asistencia_duplicada()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el socio ya registró un ingreso en los últimos 60 segundos, descartar la inserción repetida
  IF EXISTS (
    SELECT 1 FROM public.asistencias
    WHERE socio_id = NEW.socio_id
      AND fecha_ingreso >= (NOW() - INTERVAL '60 seconds')
  ) THEN
    -- Descarte silencioso (no lanza excepción al cliente para no bloquear el flujo del escáner)
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_evitar_doble_asistencia ON public.asistencias;
CREATE TRIGGER trg_evitar_doble_asistencia
BEFORE INSERT ON public.asistencias
FOR EACH ROW
EXECUTE FUNCTION public.check_asistencia_duplicada();

SELECT 'Blindaje Fase 2: RPC liquidar_saldo_socio y Trigger Anti-Doble Asistencia listos para producción' AS resultado;
