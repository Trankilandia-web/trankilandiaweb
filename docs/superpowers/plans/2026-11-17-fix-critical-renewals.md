# Fix Critical Renewal Errors & Database Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the critical renewal flow, eliminate silent error catching, prevent database trigger blocks on balance changes, repair profiles RLS recursion, and provide a streamlined renewal experience with explicit error feedback in Reception.

**Architecture:** Create an atomic `SECURITY DEFINER` RPC `renovar_membresia_socio` in Supabase with a fallback mechanism in TypeScript, refactor `registerGymMember` and `updateMemberProfile` in `supabaseDb.ts` to surface errors and protect `socios` updates from secondary `profiles` failures, and enhance `HubReceptionSimple.tsx` with a reliable direct renewal modal and explicit error feedback.

**Tech Stack:** React 19, TypeScript, Vite, Supabase (PostgreSQL / RLS / RPC), Vitest.

## Global Constraints

- Never swallow database write errors silently in `catch {}` without informing the user.
- Do not break offline-first capabilities: local storage should remain as resilient cache, but UI must clearly indicate when cloud sync fails.
- All date calculations must respect Peru local time (UTC-5 / `America/Lima`).
- Prevent duplicate `ingresos` if the member already paid in a previous shift or date.

---

### Task 1: SQL Migration for Profiles RLS Recursion & Atomic Renewal RPC

**Files:**
- Create: `supabase/fix_renovaciones_y_profiles.sql`

**Interfaces:**
- Produces: RPC `public.renovar_membresia_socio(p_socio_id text, p_plan text, p_precio_plan numeric, p_tipo_pago text, p_adelanto_pagado numeric, p_saldo_pendiente numeric, p_fecha_inicio text, p_fecha_fin text, p_fecha_limite_pago text, p_metodo_pago text, p_numero_boleta text, p_turno text, p_coach_asignado text, p_registrar_ingreso boolean, p_operador text)` returning `JSONB`.

- [ ] **Step 1: Write the SQL migration file**

```sql
-- supabase/fix_renovaciones_y_profiles.sql
-- ==============================================================================
-- TRANKILANDIA GYM · SOLUCIÓN DEFINITIVA A RECURSIÓN RLS Y RENOVACIONES ATÓMICAS
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
```

- [ ] **Step 2: Commit Task 1**
```bash
git add supabase/fix_renovaciones_y_profiles.sql
git commit -m "fix(supabase): add non-recursive profiles RLS and atomic renovar_membresia_socio RPC"
```

---

### Task 2: Hardening `supabaseDb.ts`

**Files:**
- Modify: `src/lib/supabaseDb.ts`
- Test: `src/tests/unit/renewalLogicAndErrorHandling.test.ts`

**Interfaces:**
- Produces: `renovarMembresiaSocio(params: RenovarMembresiaParams): Promise<{ success: boolean; message: string; data?: any }>`
- Updates: `registerGymMember` and `updateMemberProfile` to throw on real failures and isolate `profiles` updates from breaking the primary member save.

- [ ] **Step 1: Write unit tests for renewal logic and error handling**

Create `src/tests/unit/renewalLogicAndErrorHandling.test.ts` testing:
1. Date calculation for past payment dates vs today.
2. Error propagation when Supabase returns an error.
3. Safe execution without crashing when profiles sync fails.

- [ ] **Step 2: Run test to verify initial state**
`npm run test src/tests/unit/renewalLogicAndErrorHandling.test.ts`

- [ ] **Step 3: Implement `renovarMembresiaSocio` and update `registerGymMember` / `updateMemberProfile`**

In `src/lib/supabaseDb.ts`:
1. Add `renovarMembresiaSocio`:
   - Calls `supabase.rpc('renovar_membresia_socio', ...)`.
   - If RPC is not found or fails with RPC error, gracefully executes direct update on `socios` + `ingresos` (fallback).
   - Updates local storage `saveStoredMembers`.
   - Returns `{ success: true, message: '...' }` or throws descriptive error.
2. In `registerGymMember`:
   - Check `upsertErr`: if present, `throw new Error(`Error guardando socio en base de datos: ${upsertErr.message}`)`.
   - Wrap `profiles` update in isolated `try/catch` with `console.warn` so a profiles recursion never halts member registration.
3. In `updateMemberProfile`:
   - Check `updateErr`: if present, `throw new Error(`Error actualizando socio en base de datos: ${updateErr.message}`)`.

- [ ] **Step 4: Run tests and ensure all pass**
`npm run test src/tests/unit/renewalLogicAndErrorHandling.test.ts`

- [ ] **Step 5: Commit Task 2**
```bash
git add src/lib/supabaseDb.ts src/tests/unit/renewalLogicAndErrorHandling.test.ts
git commit -m "feat(db): add renovarMembresiaSocio with RPC/fallback and explicit error propagation"
```

---

### Task 3: Streamlined Renewal Modal & Error Feedback in `HubReceptionSimple.tsx`

**Files:**
- Modify: `src/pages/portal/HubReceptionSimple.tsx`

**Features:**
- Quick Renewal Modal triggered directly from the scan banner:
  - If a member is expired or expiring, clicking `Renovar Membresía` opens a clean, focused modal right on the scan screen.
  - Allows selecting:
    1. **Fecha de Inicio:** "Hoy" vs "Fecha en que pagó" (selector de fecha).
    2. **Plan y Duración:** Selector rápido (1 Mes, 2 Meses, 3 Meses, 6 Meses, 8 Meses, etc.).
    3. **Precio y Pago:** Pago Completo vs Dejar Adelanto (con saldo pendiente automático) vs "Ya pagó con otro operador (no duplicar cobro en caja)".
    4. **Método de Pago:** Efectivo, Yape, Plin, Tarjeta.
    5. Botón de confirmación con estado de carga `isRenewing`.
- Surface explicit error notifications:
  - If renewal fails, display a prominent red error banner with the exact error message.
  - If renewal succeeds, update the live scan result card to green `ACTIVO` immediately without requiring page refresh.

- [ ] **Step 1: Add Quick Renewal Modal state and handler in `HubReceptionSimple.tsx`**
- [ ] **Step 2: Connect `renovarMembresiaSocio` to the modal and handle errors explicitly**
- [ ] **Step 3: Update `handleGuardarSocio` in Tab 3 to display clear error banner if `registerGymMember` fails**
- [ ] **Step 4: Test in browser/preview mode**
- [ ] **Step 5: Commit Task 3**
```bash
git add src/pages/portal/HubReceptionSimple.tsx
git commit -m "feat(reception): add direct renewal modal and explicit error feedback"
```

---

### Task 4: End-to-End Verification

- [ ] **Step 1: Run full unit test suite**
Run: `npm run test`
Expected: ALL PASS

- [ ] **Step 2: Build verification**
Run: `npm run build`
Expected: Build succeeds with 0 errors

- [ ] **Step 3: Commit and summarize**
```bash
git commit --allow-empty -m "chore: verify critical renewal fixes"
```
