# Plan de Implementación: Balanza Inteligente EUROMAR® G78-BT & Portal "Mi Evolución"

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar la báscula de bioimpedancia de 8 electrodos EUROMAR® G78-BT mediante una PWA móvil (`/balanza`) con Web Bluetooth para Android y modo guiado para iPhone, registrando evaluaciones corporales en Supabase y visualizándolas en el módulo "Mi Evolución" del portal de socios.

**Architecture:** La terminal móvil `/balanza` se protege con PIN de personal, decodifica tramas BLE de la balanza (servicio `0xFFB0`), procesa las métricas de bioimpedancia y deltas mensuales en un motor desacoplado (`bioimpedanceEngine.ts`), persiste en `public.evaluaciones_corporales` y alimenta el nuevo componente interactivo `EvolucionCorporalView.tsx` dentro de `ClientePortal.tsx`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Supabase PostgreSQL, Web Bluetooth API (`navigator.bluetooth`), Lucide Icons, Vitest.

## Global Constraints
- El acceso a `/balanza` exige PIN de personal (Luis `2026`, Marisol `1234` o cajeros).
- Soporte dual: Web Bluetooth nativo en Android (Chrome) / Bluefy en iOS, y modo "Captura Rápida de Display" automático para Safari en iPhone de Marisol.
- El portal del socio (`/cliente`) no debe mostrar datos inventados; si no tiene mediciones, muestra un estado vacío invitando a evaluarse en recepción.
- No modificar el flujo de login por DNI ya estabilizado en el commit `ca3c863`.
- Todo el código debe pasar `npm run build` y `npm run test` sin errores de tipo ni fallos.

---

### Task 1: Modelo de Datos, Tipos TypeScript y Migración Supabase

**Files:**
- Create: `supabase/migration_evaluaciones_corporales.sql`
- Create: `src/types/evaluacion.ts`
- Test: `src/tests/unit/evaluacionTypes.test.ts`

**Interfaces:**
- Produces: 
  - `EvaluacionCorporal`: interface de evaluación corporal completa.
  - `SegmentalMetrics`: `{ musculo_kg: number, grasa_pct: number }` para cada una de las 5 zonas.
  - `DeltasEvaluacion`: diferencias numéricas entre dos evaluaciones consecutivas.
  - `DiagnosticoRecomposicion`: `{ fase: string, titulo: string, descripcion: string, tipo: 'recomposicion' | 'hipertrofia' | 'definicion' | 'mantenimiento' }`.

- [ ] **Step 1: Escribir el test que valida los tipos y esquemas de evaluación**
  - Crear `src/tests/unit/evaluacionTypes.test.ts` verificando validación de rangos biológicos (estatura 100-240 cm, peso 20-250 kg, edad 10-99 años).
- [ ] **Step 2: Ejecutar test y verificar fallo**
  - Correr `npx vitest run src/tests/unit/evaluacionTypes.test.ts` (debe fallar por módulos no encontrados).
- [ ] **Step 3: Crear `src/types/evaluacion.ts`**
  - Definir interfaces completas `EvaluacionCorporal`, `SegmentalData`, `DeltasEvaluacion`, `DiagnosticoRecomposicion` y helpers de validación `validarBiometriaBase()`.
- [ ] **Step 4: Crear migración `supabase/migration_evaluaciones_corporales.sql`**
  - Script SQL idempotente con `create table if not exists public.evaluaciones_corporales`, columna `estatura_cm` en `public.socios`, índices y políticas RLS para `anon` y `authenticated`.
- [ ] **Step 5: Ejecutar test y verificar éxito**
  - Correr `npx vitest run src/tests/unit/evaluacionTypes.test.ts`.
- [ ] **Step 6: Commit**
  - `git add src/types/evaluacion.ts supabase/migration_evaluaciones_corporales.sql src/tests/unit/evaluacionTypes.test.ts`
  - `git commit -m "feat(evaluaciones): add data types and Supabase migration for corporal evaluations"`

---

### Task 2: Motor de Bioimpedancia y Cálculo de Deltas Mensuales

**Files:**
- Create: `src/lib/bioimpedanceEngine.ts`
- Test: `src/tests/unit/bioimpedanceEngine.test.ts`

**Interfaces:**
- Consumes: `EvaluacionCorporal`, `DeltasEvaluacion`, `DiagnosticoRecomposicion` de `src/types/evaluacion.ts`.
- Produces:
  - `calcularMetricasCompletas(input: EntradaMedicion): EvaluacionCorporal`
  - `calcularDeltasMensuales(actual: EvaluacionCorporal, anterior?: EvaluacionCorporal | null): DeltasEvaluacion | null`
  - `determinarDiagnostico(delta: DeltasEvaluacion | null, actual: EvaluacionCorporal): DiagnosticoRecomposicion`
  - `calcularPuntuacionCorporal(peso: number, grasaPct: number, musculoPct: number, sexo: string, edad: number): number`

- [ ] **Step 1: Escribir los tests unitarios de fórmulas matemáticas y recomposición**
  - Crear `src/tests/unit/bioimpedanceEngine.test.ts` con casos de prueba:
    - Ganancia muscular con pérdida de grasa -> "Fase de Recomposición".
    - Ganancia de músculo con grasa estable -> "Hipertrofia Limpia".
    - Cálculo de BMR según fórmula Katch-McArdle y cálculo de edad metabólica.
    - Deltas correctos entre dos mediciones de meses consecutivos.
- [ ] **Step 2: Ejecutar test y verificar fallo**
  - Correr `npx vitest run src/tests/unit/bioimpedanceEngine.test.ts`.
- [ ] **Step 3: Implementar `src/lib/bioimpedanceEngine.ts`**
  - Escribir funciones puras, robustas y libres de dependencias externas para cálculo de BMR, IMC, deltas y diagnóstico de recomposición.
- [ ] **Step 4: Ejecutar test y verificar que pasen al 100%**
  - Correr `npx vitest run src/tests/unit/bioimpedanceEngine.test.ts`.
- [ ] **Step 5: Commit**
  - `git add src/lib/bioimpedanceEngine.ts src/tests/unit/bioimpedanceEngine.test.ts`
  - `git commit -m "feat(evaluaciones): implement bioimpedance calculation engine and monthly deltas"`

---

### Task 3: Decodificador BLE de Balanza y Conector Web Bluetooth

**Files:**
- Create: `src/lib/bleScaleConnector.ts`
- Test: `src/tests/unit/bleScaleConnector.test.ts`

**Interfaces:**
- Consumes: Web Bluetooth API (`navigator.bluetooth`).
- Produces:
  - `isWebBluetoothAvailable(): boolean`
  - `conectarBalanzaG78(callbacks: BleScaleCallbacks): Promise<ScaleConnection>`
  - `decodificarTramaPeso(dataView: DataView): { pesoKg: number, esEstable: boolean }`
  - `decodificarTramaImpedancia(dataView: DataView): ImpedanciaSegmentalRaw`

- [ ] **Step 1: Escribir los tests para decodificación de tramas BLE**
  - Crear `src/tests/unit/bleScaleConnector.test.ts` simulando tramas de bytes de peso (canal `FFB2`) e impedancia segmental (canal `FFB3`), y prueba de detección en Safari iOS vs. Chrome Android.
- [ ] **Step 2: Ejecutar test y verificar fallo**
  - Correr `npx vitest run src/tests/unit/bleScaleConnector.test.ts`.
- [ ] **Step 3: Implementar `src/lib/bleScaleConnector.ts`**
  - Protocolo GATT `0xFFB0`, manejo de eventos notify/indicate, reconexión limpia y desconexión segura al cerrar el modal.
- [ ] **Step 4: Ejecutar test y verificar que pase**
  - Correr `npx vitest run src/tests/unit/bleScaleConnector.test.ts`.
- [ ] **Step 5: Commit**
  - `git add src/lib/bleScaleConnector.ts src/tests/unit/bleScaleConnector.test.ts`
  - `git commit -m "feat(ble): implement Web Bluetooth scale connector and frame decoder"`

---

### Task 4: Servicio de Persistencia y Caché Local-First en Supabase

**Files:**
- Create: `src/lib/evaluacionesService.ts`
- Test: `src/tests/unit/evaluacionesService.test.ts`

**Interfaces:**
- Consumes: `supabase` de `src/lib/supabase.ts`, `EvaluacionCorporal` de `src/types/evaluacion.ts`.
- Produces:
  - `guardarEvaluacion(evaluacion: EvaluacionCorporal): Promise<{ success: boolean, error?: string }>`
  - `obtenerHistorialEvaluaciones(socioDni: string): Promise<EvaluacionCorporal[]>`
  - `obtenerUltimaEvaluacion(socioDni: string): Promise<EvaluacionCorporal | null>`
  - `sincronizarEvaluacionesOffline(): Promise<number>`

- [ ] **Step 1: Escribir tests para el servicio de evaluaciones con soporte offline**
  - Crear `src/tests/unit/evaluacionesService.test.ts` validando almacenamiento en Supabase y fallback a `localStorage` si no hay internet.
- [ ] **Step 2: Ejecutar test y verificar fallo**
  - Correr `npx vitest run src/tests/unit/evaluacionesService.test.ts`.
- [ ] **Step 3: Implementar `src/lib/evaluacionesService.ts`**
  - Guardado en `public.evaluaciones_corporales`, actualización de `estatura_cm` en `public.socios`, y cola de pendientes en `localStorage` ante caídas de red.
- [ ] **Step 4: Ejecutar test y verificar éxito**
  - Correr `npx vitest run src/tests/unit/evaluacionesService.test.ts`.
- [ ] **Step 5: Commit**
  - `git add src/lib/evaluacionesService.ts src/tests/unit/evaluacionesService.test.ts`
  - `git commit -m "feat(evaluaciones): implement evaluations persistence service with offline resilience"`

---

### Task 5: Terminal Móvil de Pesaje (`/balanza`) con Soporte Android e iPhone

**Files:**
- Create: `src/pages/portal/TerminalBalanza.tsx`
- Modify: `src/App.tsx` (agregar ruta `/balanza`)
- Test: `src/tests/unit/TerminalBalanza.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `bleScaleConnector`, `evaluacionesService`, `bioimpedanceEngine`.
- Produces:
  - Componente de página completa para el móvil del gimnasio y el iPhone de Marisol.

- [ ] **Step 1: Escribir test del componente TerminalBalanza**
  - Crear `src/tests/unit/TerminalBalanza.test.tsx` verificando:
    - Bloqueo por PIN de personal antes de operar.
    - Búsqueda de socio por DNI/nombre y autocompletado.
    - Visualización del botón Bluetooth en Android o del modo "Captura Rápida de Display" en iPhone Safari.
    - Confirmación y guardado con feedback visual.
- [ ] **Step 2: Ejecutar test y verificar fallo**
  - Correr `npx vitest run src/tests/unit/TerminalBalanza.test.tsx`.
- [ ] **Step 3: Implementar `src/pages/portal/TerminalBalanza.tsx`**
  - UI táctil en negro y oro, teclado PIN, buscador rápido de 417 socios, selector de estatura, conexión BLE animada y modo de ingreso rápido para el iPhone de Marisol.
- [ ] **Step 4: Conectar la ruta `/balanza` en `src/App.tsx`**
  - Agregar `<Route path="/balanza" element={<TerminalBalanza />} />` en `src/App.tsx`.
- [ ] **Step 5: Ejecutar test y verificar que pase**
  - Correr `npx vitest run src/tests/unit/TerminalBalanza.test.tsx`.
- [ ] **Step 6: Commit**
  - `git add src/pages/portal/TerminalBalanza.tsx src/App.tsx src/tests/unit/TerminalBalanza.test.tsx`
  - `git commit -m "feat(terminal): implement mobile weighing terminal page with iOS/Android dual mode"`

---

### Task 6: Rediseño del Módulo "Mi Evolución" en el Portal de Socios (`/cliente`)

**Files:**
- Create: `src/components/portal/EvolucionCorporalView.tsx`
- Modify: `src/pages/portal/ClientePortal.tsx` (reemplazar sección demo en línea 1623)
- Test: `src/tests/unit/EvolucionCorporalView.test.tsx`

**Interfaces:**
- Consumes: `EvaluacionCorporal`, `DeltasEvaluacion`, `evaluacionesService`.
- Produces:
  - Vista rica y motivacional de evolución para el socio.

- [ ] **Step 1: Escribir test para `EvolucionCorporalView`**
  - Crear `src/tests/unit/EvolucionCorporalView.test.tsx` verificando:
    - Renderizado de estado vacío cuando el cliente no tiene mediciones.
    - Renderizado de diagnóstico de recomposición y deltas cuando hay evaluaciones.
    - Desglose segmental de 5 zonas (brazos, piernas y tronco).
- [ ] **Step 2: Ejecutar test y verificar fallo**
  - Correr `npx vitest run src/tests/unit/EvolucionCorporalView.test.tsx`.
- [ ] **Step 3: Implementar `src/components/portal/EvolucionCorporalView.tsx`**
  - Silueta anatómica segmental SVG, tarjetas de deltas mensuales, badge de Fit Score, gráfica de tendencia histórica y botón para compartir ficha en WhatsApp.
- [ ] **Step 4: Integrar en `src/pages/portal/ClientePortal.tsx`**
  - Reemplazar el bloque estático de la pestaña `evolucion` por `<EvolucionCorporalView socioDni={memberDni} />`.
- [ ] **Step 5: Ejecutar test y verificar éxito**
  - Correr `npx vitest run src/tests/unit/EvolucionCorporalView.test.tsx`.
- [ ] **Step 6: Commit**
  - `git add src/components/portal/EvolucionCorporalView.tsx src/pages/portal/ClientePortal.tsx src/tests/unit/EvolucionCorporalView.test.tsx`
  - `git commit -m "feat(portal): implement interactive body evolution view with segmental map and deltas"`

---

### Task 7: Accesos de Navegación, Verificación Integral y Despliegue

**Files:**
- Modify: `src/components/portal/PortalHeader.tsx` (agregar enlace a Balanza para staff)
- Test: Suite completa `npm run test` y build `npm run build`

- [ ] **Step 1: Agregar acceso a la Terminal Balanza en el menú de navegación del personal**
  - En `PortalHeader.tsx`, si el rol es `admin` o `caja`, mostrar botón directo `⚖️ Balanza G78`.
- [ ] **Step 2: Ejecutar suite de pruebas completa**
  - `npm run test` (todos los tests deben pasar).
- [ ] **Step 3: Ejecutar compilación de producción**
  - `npm run build` (cero errores de compilación TypeScript/Vite).
- [ ] **Step 4: Commit y Push a GitHub**
  - `git add . && git commit -m "feat(integration): finalize EUROMAR G78 scale integration and client evolution portal"`
  - `git push origin main`
- [ ] **Step 5: Despliegue en Vercel**
  - `vercel --prod --yes` y verificar el despliegue en producción.
