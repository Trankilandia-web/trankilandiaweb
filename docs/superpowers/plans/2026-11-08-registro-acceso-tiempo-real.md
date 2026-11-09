# Plan de Implementación: Registro Íntegro, Acceso Dual DNI/Google, Auto-Asistencia y Sincronización en Tiempo Real

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar un flujo íntegro y en tiempo real para inscripción de socios (DNI, correo Google y celular separados), asignación rápida de DNI a socios antiguos con entrega de credenciales por WhatsApp, auto-marcación instantánea de asistencia al escanear, modal guiado de cambio de contraseña en el primer login con DNI, y sincronización reactiva multi-dispositivo sin recargar la página.

**Architecture:**
- **Local-First Resiliente con Supabase Realtime**: Manejo de estado en React sincronizado mediante eventos de ventana (`gym-members-updated`, `storage`) y canales Postgres Realtime (`supabase.channel`).
- **Unificación de Cuentas**: `profiles` y `socios` vinculados por DNI y correo de Google, permitiendo que ambos inicios de sesión compartan el mismo carnet, membresía y rutinas.
- **Seguridad Gradual**: Contraseña inicial igual al DNI; detección automática en el portal del cliente para solicitar cambio de clave y vinculación de correo opcional en el primer ingreso.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Framer Motion / Motion React, Supabase Client & Realtime.

## Global Constraints
- Preservar comentarios existentes y arquitectura local-first (la aplicación debe funcionar tanto online como sin conexión/con fallos de red).
- Validar DNI con `extraerDniPeru` soportando DNI azul tradicional y DNI electrónico.
- Textos de interfaz y mensajes de WhatsApp redactados en español claro, profesional y amigable.
- Cero advertencias o errores de compilación TypeScript (`tsc -b && vite build`).

---

### Task 1: Separación de Campos de Inscripción y Generación de Credenciales

**Files:**
- Modify: `src/pages/portal/CajaDashboard.tsx:165-200`, `src/pages/portal/CajaDashboard.tsx:840-960`, `src/pages/portal/CajaDashboard.tsx:2600-2650`

**Interfaces:**
- Consumes: `extraerDniPeru`, `registerGymMember`, `asignarDniYActivarCuenta`, `registrarAsistencia`.
- Produces: `clientPhone` separado de `clientEmail`, modal de credenciales tras inscripción con 1-clic WhatsApp.

- [ ] **Step 1: Separar los estados de formulario en `CajaDashboard.tsx`**
  - Declarar `clientPhone` independiente de `clientEmail`.
  - Asegurar que al seleccionar un socio para renovar se carguen `clientEmail` y `clientPhone` en sus casillas correspondientes.

- [ ] **Step 2: Actualizar `handleProcessRegistration` en `CajaDashboard.tsx`**
  - Guardar `phone: clientPhone.trim()` y `email: clientEmail.trim() || `${cleanDni}@cliente.trankilandia.pe``.
  - Si el socio se inscribe con fecha de hoy y está al día, registrar su asistencia de bienvenida automáticamente.
  - Al completar la inscripción, activar el nuevo modal de credenciales `credencialesModal` con los datos del nuevo socio.

- [ ] **Step 3: Actualizar la UI del formulario de inscripción en `CajaDashboard.tsx`**
  - Mostrar 3 inputs independientes y ordenados:
    1. DNI (8 dígitos) con botón de auto-completado si ya existe.
    2. Correo Electrónico ("Para acceso web con Google").
    3. Celular / WhatsApp ("Para envío de credenciales y avisos").

- [ ] **Step 4: Verificar en desarrollo con build de TypeScript**
  Run: `npx tsc --noEmit`
  Expected: Sin errores de tipos.

---

### Task 2: Asignación Rápida de DNI + Email + Celular a Socios Antiguos y Auto-Marcación

**Files:**
- Modify: `src/lib/supabaseDb.ts:983-1080`
- Modify: `src/pages/portal/CajaDashboard.tsx:730-790`, `src/pages/portal/CajaDashboard.tsx:3630-3720`

**Interfaces:**
- Consumes: `asignarDniYActivarCuenta(memberId, nuevoDni, emailRegistrado?, celularRegistrado?)`, `procesarIngresoPorDni`.
- Produces: Modal de asignación enriquecido + Modal de entrega de credenciales con WhatsApp y Copiar.

- [ ] **Step 1: Ampliar la firma de `asignarDniYActivarCuenta` en `src/lib/supabaseDb.ts`**
  - Permitir parámetro opcional `celularRegistrado?: string`.
  - Actualizar `celular` en el registro de `socios` tanto en Supabase como en `localStorage`.

- [ ] **Step 2: Ampliar el modal de asignación de DNI en `CajaDashboard.tsx`**
  - Añadir estados `nuevoEmailInput` y `nuevoCelularInput`.
  - En el formulario modal:
    - Input DNI (8 dígitos, autofocus, numérico).
    - Input Correo Electrónico (opcional pero recomendado para Google).
    - Input Celular WhatsApp (opcional).

- [ ] **Step 3: Actualizar `handleGuardarNuevoDni` en `CajaDashboard.tsx`**
  - Llamar a `asignarDniYActivarCuenta` pasando `nuevoEmailInput` y `nuevoCelularInput`.
  - Si la asignación es exitosa:
    - Ejecutar `procesarIngresoPorDni(cleanDni)` para registrar automáticamente la asistencia de hoy sin clics extras.
    - Abrir `credencialesModal` configurando los datos: Atleta, DNI, Clave inicial (DNI), y hora de asistencia registrada.

- [ ] **Step 4: Diseñar el componente `CredencialesModal` en `CajaDashboard.tsx`**
  - Renderizar tarjeta de credenciales:
    - Logo / Título: "Credenciales de Acceso Web Activadas".
    - Nombre del socio y Plan.
    - Usuario: `[DNI]`
    - Clave Inicial: `[DNI]`
    - Badge: `✅ Asistencia de hoy registrada automáticamente a las [HH:MM]`.
    - Botón primario: *"📲 Enviar Credenciales por WhatsApp"* (abre `https://wa.me/{celular}?text=...`).
    - Botón secundario: *"📋 Copiar Credenciales"*.
    - Botón de cierre: *"Listo"*.

- [ ] **Step 5: Verificar con compilador TypeScript**
  Run: `npx tsc --noEmit`
  Expected: 0 errores.

---

### Task 3: Auto-Marcación y Verificación Inmediata al Escanear (Activo, Vencido, No Registrado)

**Files:**
- Modify: `src/pages/portal/CajaDashboard.tsx:640-730`
- Modify: `src/components/portal/OmniScanToast.tsx`

**Interfaces:**
- Consumes: `procesarEntradaEscaner`, `extraerDniPeru`, `registrarAsistencia`.
- Produces: Respuesta inmediata visual y sonora al escanear:
  - Activo: Asistencia guardada en el acto, aviso verde y actualización de aforo.
  - Vencido: Bloqueo, aviso rojo con días vencidos y botón para renovar.
  - No inscrito: Bloqueo, aviso rojo y botón para inscribir.

- [ ] **Step 1: Revisar `procesarEntradaEscaner` en `CajaDashboard.tsx`**
  - Garantizar que al detectar un DNI válido de un socio activo (`dias_restantes >= 0`), `registrarAsistencia` se invoque de inmediato.
  - Reproducir sonido de confirmación (tono agudo agradable).
  - Actualizar `asistenciasActivas` y el contador de sala en tiempo real.

- [ ] **Step 2: Tratar el caso de membresía vencida o no inscrito**
  - Si `dias_restantes < 0`:
    - Reproducir sonido de alerta (tono grave / advertencia).
    - Mostrar `lastScanResult: { status: 'vencido', socio, ... }`.
    - Proporcionar acción rápida para abrir pestaña de renovación.
  - Si el DNI no existe en el sistema:
    - Reproducir sonido de error.
    - Mostrar `lastScanResult: { status: 'no_inscrito', dni, ... }`.
    - Proporcionar botón *"Inscribir Atleta con este DNI"*.

- [ ] **Step 3: Verificar compilación**
  Run: `npx tsc --noEmit`
  Expected: 0 errores.

---

### Task 4: Modal Automático de Primer Ingreso en `ClientePortal.tsx`

**Files:**
- Modify: `src/pages/portal/ClientePortal.tsx`
- Consumes: `getStoredCustomPassword`, `actualizarPasswordSocio`, `vincularCorreoASocio`.
- Produces: Modal bloqueante/guiado `FirstLoginPasswordModal` para cambiar contraseña inicial en el primer ingreso.

- [ ] **Step 1: Crear estado y efecto de detección de primer ingreso**
  - Al cargar `ClientePortal`, si `effectiveDni` existe y `!getStoredCustomPassword(effectiveDni)`:
    - Activar estado `showFirstLoginModal = true`.

- [ ] **Step 2: Construir el modal `FirstLoginPasswordModal`**
  - Estructura visual moderna en Tailwind:
    - Icono de escudo de seguridad y bienvenida.
    - Título: *"🔒 Actualiza tu Contraseña de Ingreso"*.
    - Mensaje: *"Hola [Nombre]. Tu cuenta inicial usa tu DNI como contraseña. Por tu seguridad, define tu contraseña personal."*.
    - Input: Nueva Contraseña (mínimo 6 caracteres).
    - Input: Confirmar Nueva Contraseña.
    - Input opcional: Correo Google para vincular (si el socio no tiene correo en su ficha).
    - Botón: *"Guardar mi Nueva Contraseña y Ver Mi Carnet"*.

- [ ] **Step 3: Manejar envío del formulario**
  - Validar longitud mínima (6 caracteres) y coincidencia.
  - Llamar a `actualizarPasswordSocio(effectiveDni, nuevoPassword)`.
  - Si se ingresó correo, llamar a `vincularCorreoASocio(effectiveDni, nuevoEmail)`.
  - Cerrar modal y mostrar notificación toast de éxito.

- [ ] **Step 4: Verificar compilación**
  Run: `npx tsc --noEmit`
  Expected: 0 errores.

---

### Task 5: Sincronización en Tiempo Real Multi-Dispositivo

**Files:**
- Modify: `src/lib/supabaseDb.ts`
- Modify: `src/pages/portal/CajaDashboard.tsx`
- Modify: `src/pages/portal/ClientePortal.tsx`

**Interfaces:**
- Consumes: `supabase.channel`, `window.addEventListener('storage')`, `window.addEventListener('gym-members-updated')`.
- Produces: Sincronización reactiva en tiempo real entre pestañas y dispositivos.

- [ ] **Step 1: Crear función de suscripción en tiempo real en `src/lib/supabaseDb.ts`**
  - Exportar `subscribeToGymRealtime({ onSociosChange, onAsistenciasChange })`.
  - Escuchar cambios Postgres en tablas `socios` y `asistencias`.

- [ ] **Step 2: Integrar suscripción en `CajaDashboard.tsx`**
  - Al recibir un cambio de `socios` o `asistencias`, refrescar la memoria local y los contadores en caliente.
  - Escuchar eventos `storage` para coordinar múltiples ventanas/pestañas abiertas en mostrador.

- [ ] **Step 3: Integrar sincronización reactiva en `ClientePortal.tsx`**
  - Escuchar cambios en `gym-members-updated` y `gym-password-updated` para reflejar cualquier cambio de vigencia o estado de inmediato.

- [ ] **Step 4: Verificar compilación**
  Run: `npx tsc --noEmit`
  Expected: 0 errores.

---

### Task 6: Script de Verificación Integral y Build Final

**Files:**
- Create: `scripts/verify_realtime_dual_login.cjs`

- [x] **Step 1: Escribir script de prueba automatizada**
  - Validar parseo de DNI azul y electrónico.
  - Validar asignación de DNI y vinculación de correo Google.
  - Validar contraseña inicial (DNI) y cambio por contraseña personalizada.
  - Validar auto-marcación de asistencia y detección de membresía vencida.

- [x] **Step 2: Ejecutar el script de verificación**
  Run: `node scripts/verify_realtime_dual_login.cjs`
  Expected: Todas las pruebas pasando con éxito (PASS).

- [x] **Step 3: Compilar y verificar el bundle de producción**
  Run: `npm run build`
  Expected: Compilación exitosa con código de salida 0.

- [x] **Step 4: Limpiar scripts temporales y confirmar integridad del repositorio**
  Run: `git status`
