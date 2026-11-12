-- ==============================================================================
-- TRANKILANDIA GYM · ENDURECIMIENTO DE INTEGRIDAD FINANCIERA (VULN-01)
-- TRIGGER: BLOQUEO DE REDUCCIÓN DIRECTA DE SALDO_PENDIENTE POR REST
-- ==============================================================================
-- Impide que cualquier cliente o visitante con el rol 'anon' anule deudas o
-- reduzca 'saldo_pendiente' directamente mediante peticiones PATCH /rest/v1/socios.
-- Obliga a que toda reducción o liquidación de deuda se ejecute mediante la
-- función atómica oficial 'liquidar_saldo_socio' (SECURITY DEFINER).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.proteger_reduccion_saldo_socios()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si la petición se ejecuta bajo el rol anon (PostgREST directo sin función SECURITY DEFINER)
  IF CURRENT_USER = 'anon' THEN
    -- Bloquear cualquier intento de reducir o condonar saldo_pendiente (incluso enviando NULL)
    IF COALESCE(NEW.saldo_pendiente, 0) < COALESCE(OLD.saldo_pendiente, 0) THEN
      RAISE EXCEPTION 'Operación rechazada: La anulación o reducción directa de saldos pendientes está prohibida. Toda liquidación o abono debe realizarse mediante la función oficial liquidar_saldo_socio.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Vincular trigger BEFORE UPDATE en public.socios (idempotente)
DROP TRIGGER IF EXISTS trg_proteger_saldo_socios ON public.socios;
CREATE TRIGGER trg_proteger_saldo_socios
BEFORE UPDATE ON public.socios
FOR EACH ROW
EXECUTE FUNCTION public.proteger_reduccion_saldo_socios();

SELECT 'Trigger trg_proteger_saldo_socios activado: Reducción directa de saldo por anon bloqueada con éxito' AS resultado;
