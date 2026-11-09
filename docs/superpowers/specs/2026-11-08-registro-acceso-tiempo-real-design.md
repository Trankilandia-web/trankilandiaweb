# Especificación de Diseño: Registro Íntegro, Acceso Dual DNI/Google, Auto-Asistencia y Sincronización en Tiempo Real

- **Fecha:** 2026-11-08
- **Estado:** Propuesta de Diseño
- **Módulos Afectados:**
  - `src/pages/portal/CajaDashboard.tsx` (Recepción, Scanner, Inscripción, Asignación de DNI, Voucher Credenciales)
  - `src/pages/portal/ClientePortal.tsx` (Portal Socio, Modal Onboarding Cambio de Contraseña, Carnet Digital)
  - `src/components/LoginModal.tsx` (Login DNI + Google)
  - `src/lib/supabaseDb.ts` (Sincronización Realtime, Asignación DNI, Unificación de Cuentas)
  - `src/lib/authPasswords.ts` (Gestión de Contraseña DNI)
  - `src/data/gymStore.ts` (Eventos reactivos y persistencia local-first)

---

## 1. Problema y Objetivos del Sistema

### 1.1 Contexto Actual
El gimnasio Trankilandia cuenta con socios históricos (registrados previamente en Excel o cuadernos de recepción) que no tienen DNI asignado en el sistema nuevo ni cuentas web vinculadas. Al mismo tiempo, nuevos clientes se inscriben a diario en mostrador.

### 1.2 Objetivos Principales
1. **Inscripción y Datos Limpios**:
   - Capturar **DNI (8 dígitos)** y **Correo Electrónico** de manera explícita y separada del **Celular WhatsApp**.
   - Garantizar que el DNI y el Correo pertenezcan al mismo socio en la base de datos (`socios`) y en el sistema de autenticación (`profiles`).
2. **Acceso Dual Unificado (DNI & Google)**:
   - Si el cliente ingresa con su **DNI + Contraseña**, o hace clic en **Continuar con Google** (usando su correo registrado), el sistema debe resolver **exactamente la misma sesión, el mismo carnet digital, la misma membresía y la misma rutina**.
3. **Credenciales Iniciales y Cambio Automático**:
   - Credencial inicial por defecto:
     - **Usuario**: DNI (8 dígitos)
     - **Contraseña**: DNI (8 dígitos)
   - Al iniciar sesión por primera vez con estas credenciales iniciales, el sistema debe desplegar **automáticamente** un modal de seguridad que obligue/guíe al socio a definir su contraseña personal y confirmar su correo Google.
4. **Rescate de Socios Antiguos en Mostrador**:
   - Cuando un socio sin DNI llega al local, la recepcionista lo busca por nombre en tiempo real.
   - Un botón destacado `[+ Asignar DNI y Activar Acceso Web]` permite registrar su DNI, Correo y Celular.
   - Al guardar, el sistema **marca automáticamente su asistencia** (si está al día) y genera una **Tarjeta de Credenciales** con:
     - Botón para enviar por WhatsApp las credenciales con 1 clic.
     - Botón para copiar credenciales al portapapeles.
5. **Marcación Automática y Verificación al Escanear**:
   - Al escanear un DNI o carnet con lector 1D/2D o cámara, **la asistencia se registra de inmediato y de forma automática** sin requerir clics adicionales.
   - Si el socio está al día: sonido de éxito + mensaje verde + actualización en vivo del contador de atletas en sala.
   - Si la membresía está vencida: sonido de advertencia + mensaje rojo con días vencidos y botón de renovación rápida.
   - Si no está registrado: sonido de alerta + opción para inscribirlo de inmediato con ese DNI.
6. **Sincronización en Tiempo Real (Cero Tergiversación)**:
   - Ningún dato debe desfasarse o cruzarse entre pantallas.
   - Soporte para eventos de ventana (`gym-members-updated`, `storage`) y canales en vivo de Supabase (`supabase.channel`) para que cualquier cambio en caja se refleje inmediatamente en el teléfono del cliente o en otros dispositivos de recepción.

---

## 2. Arquitectura de Datos y Unificación de Cuentas

### 2.1 Modelo de Identidad Unificada

```
                  ┌────────────────────────────────────────┐
                  │          SOCIO EN PADRÓN               │
                  │   (public.socios / GymMember)          │
                  ├────────────────────────────────────────┤
                  │ id: "MEM-00123"                        │
                  │ dni: "72345678"                        │
                  │ email: "carlos.atleta@gmail.com"       │
                  │ celular: "987654321"                   │
                  │ user_id: "auth-uuid-456"               │
                  │ plan: "1 Mes Libre"                    │
                  │ fecha_fin: "2026-12-08"                │
                  └───────────────▲────────────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         │                                                 │
┌────────┴────────────────────────┐       ┌────────────────┴───────────────┐
│     ACCESO 1: LOGIN CON DNI     │       │    ACCESO 2: LOGIN CON GOOGLE  │
├─────────────────────────────────┤       ├────────────────────────────────┤
│ Identificador: DNI (72345678)   │       │ Proveedor: Google OAuth        │
│ Email canónico interno:         │       │ Email: carlos.atleta@gmail.com │
│ 72345678@socio.trankilandia.pe  │       │ ID Auth: auth-uuid-456         │
│ Clave: DNI (inicial) o custom   │       │                                │
└─────────────────────────────────┘       └────────────────────────────────┘
```

### 2.2 Reglas de Resolución de Cuenta:
- Cuando el usuario se loguea con **Google**:
  1. `obtenerSocioPorUserId(userId)` busca en `socios` donde `user_id = userId`.
  2. Si no lo encuentra, busca en `profiles` el DNI asociado y busca en `socios` por ese DNI.
  3. Si no tiene DNI en `profiles`, busca en `socios` donde `email = google_email`.
  4. Al encontrarlo, auto-vincula permanentemente: `socios.user_id = userId` y `profiles.dni = socio.dni`.
- Cuando el usuario se loguea con **DNI**:
  1. Se verifica su contraseña contra `getStoredCustomPassword(dni)` o la clave inicial (`dni`).
  2. En `loginUser` se asocia el DNI y el correo registrado del socio para construir la sesión unificada.
  3. Al entrar al portal, si el usuario tiene `!getStoredCustomPassword(dni)`, se activa el modal de Onboarding Primer Ingreso.

---

## 3. Especificación Detallada de Flujos e Interfaces

### 3.1 Flujo de Mostrador y Recepción (`CajaDashboard.tsx`)

#### A. Formulario de Inscripción / Renovación
- Campos visibles en el formulario de recepción:
  1. `clientDni`: Input numérico de 8 dígitos con auto-formateo.
  2. `clientName`: Nombre y Apellidos completos.
  3. `clientEmail`: Input tipo email dedicado con placeholder *"ejemplo@gmail.com (Para su acceso web Google)"*.
  4. `clientPhone`: Input numérico de 9 dígitos para WhatsApp.
  5. `clientShift`: Selección de Turno (Mañana / Tarde / Noche).
  6. `selectedPlan` y Métodos de Pago.
- Al presionar **"Registrar Inscripción"**:
  - Se guarda el socio en local-first y Supabase.
  - Se aprovisiona el acceso web unificado.
  - Se emite el evento en tiempo real `gym-members-updated`.
  - Se marca la asistencia de bienvenida si corresponde al día de hoy.
  - Se abre el modal de confirmación y entrega de credenciales.

#### B. Asignación Rápida a Socios Antiguos (Búsqueda por Nombre)
- En la tabla de búsqueda rápida de recepción, para cualquier socio que tenga `dni = ''` o `null`:
  - Botón dorado de acción: `[+ Asignar DNI y Activar Web]`.
  - Modal de Asignación:
    - Nombre del Atleta (bloqueado/solo lectura).
    - Campo DNI: 8 dígitos numéricos (valida que no esté duplicado con otro socio).
    - Campo Correo Electrónico: Email del cliente (para login Google).
    - Campo Celular: Celular WhatsApp.
  - Al presionar **"Guardar & Activar Acceso"**:
    1. Llama a `asignarDniYActivarCuenta(socioId, cleanDni, cleanEmail, cleanPhone)`.
    2. Actualiza la lista en memoria `listaSociosRecepcion`, `sociosMap` y `members`.
    3. Si el socio tiene membresía vigente, **marca automáticamente su asistencia de hoy** (`registrarAsistencia`).
    4. Cierra el formulario y abre inmediatamente el **Voucher Modal de Credenciales**.

#### C. Voucher Modal de Credenciales
- Muestra:
  - Tarjeta estilo carnet con logo de Trankilandia Gym.
  - Nombre del socio y Plan actual.
  - **Usuario Web**: `[DNI]`
  - **Contraseña Inicial**: `[DNI]`
  - Estado de Asistencia: `✅ Ingreso de hoy registrado automáticamente a las HH:MM` (o advertencia si está vencido).
  - Acciones principales:
    - **Botón "📲 Enviar Credenciales por WhatsApp"**: Abre WhatsApp Web / App con el texto preparado:
      ```
      ¡Hola Carlos! Bienvenido a Trankilandia Gym 🏋️‍♂️
      Tu acceso al portal web ya está activo:
      🌐 Web: https://trankilandia.pe/login
      👤 Usuario: 72345678
      🔑 Contraseña Inicial: 72345678
      
      Al ingresar por primera vez, el sistema te solicitará cambiar tu contraseña. ¡Aquí podrás ver tu carnet digital con código de barras y tus rutinas diarias!
      ```
    - **Botón "📋 Copiar Credenciales"**: Copia el texto al portapapeles.
    - **Botón "Listo / Cerrar"**.

#### D. Marcación Automática al Escanear
- En cualquier momento que el lector omnidireccional o la cámara detecten un DNI / código:
  - Si el socio existe y está **al día**:
    - Se registra la asistencia en `asistencias` (DB y local).
    - `lastScanResult: 'al_dia'`.
    - Beep sonoro de confirmación.
    - Notificación verde en pantalla completa / banner: *"✅ INGRESO PERMITIDO - Carlos Ramírez (Turno Mañana · 18 días restantes)"*.
  - Si el socio existe pero está **vencido**:
    - No se registra la asistencia.
    - `lastScanResult: 'vencido'`.
    - Sonido de advertencia.
    - Notificación roja: *"⚠️ MEMBRESÍA VENCIDA HACE X DÍAS - Carlos Ramírez"* con botón directo: *"Renovar Membresía"*.
  - Si el DNI **no está registrado**:
    - `lastScanResult: 'no_inscrito'`.
    - Sonido de error.
    - Notificación roja: *"❌ DNI NO REGISTRADO"* con botón directo: *"Inscribir Nuevo Atleta"*.

---

### 3.2 Flujo del Cliente en el Portal (`ClientePortal.tsx`)

#### Modal Automático de Onboarding / Primer Ingreso:
- Al cargarse el `ClientePortal`:
  - Se evalúa si el usuario inició sesión con DNI (`effectiveDni` existe) y aún no cuenta con una contraseña personalizada (`!getStoredCustomPassword(effectiveDni)`).
  - Si es así, se despliega el modal `FirstLoginPasswordModal`:
    - No se puede cerrar con clic afuera para garantizar la seguridad de su cuenta.
    - Título: *"🔒 Actualiza tu Contraseña de Ingreso"*
    - Subtítulo: *"Hola [Nombre]. Tu cuenta inicial usa tu DNI como contraseña. Por tu privacidad y seguridad, define una contraseña personal de tu preferencia."*
    - Inputs:
      - Nueva Contraseña (mínimo 6 caracteres).
      - Confirmar Nueva Contraseña.
      - Correo Google para vincular (si su perfil no tiene correo registrado).
    - Botón: *"Guardar Mi Nueva Contraseña y Ver Mi Carnet"*.
  - Al enviar:
    - Se invoca `actualizarPasswordSocio(effectiveDni, nuevoPassword)`.
    - Si se ingresó correo, se invoca `vincularCorreoASocio(effectiveDni, nuevoEmail)`.
    - Se emite toast de éxito y se cierra el modal, dando acceso inmediato al carnet y rutinas.

---

### 3.3 Sincronización en Tiempo Real Multi-Dispositivo

1. **Escucha Local Reactiva**:
   - `window.addEventListener('gym-members-updated', ...)`: Al guardar un socio en cualquier pestaña o modal, toda la UI se actualiza inmediatamente sin recargar.
   - `window.addEventListener('storage', ...)`: Sincronización instantánea entre diferentes pestañas del navegador en el mismo equipo.
2. **Supabase Realtime Channel**:
   - Suscripción en segundo plano a la tabla `socios` y `asistencias`:
     ```ts
     supabase
       .channel('gym-realtime-channel')
       .on('postgres_changes', { event: '*', schema: 'public', table: 'socios' }, (payload) => {
         // Actualizar padrón de socios en caliente
       })
       .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'asistencias' }, (payload) => {
         // Incrementar contador de aforo y refrescar lista de asistencias activas
       })
       .subscribe();
     ```
   - Garantiza que si recepción inscribe a un socio desde la PC de mostrador, el teléfono del socio o la tablet de entrada reconocen la membresía en milisegundos.

---

## 4. Plan de Pruebas y Criterios de Aceptación

| Caso de Prueba | Comportamiento Esperado |
|---|---|
| 1. Inscripción nueva con DNI + Correo + Celular | Socio guardado en `socios`, perfil en `profiles`, asistencia marcada automáticamente si corresponde, modal con botón WhatsApp y datos listos. |
| 2. Socio antiguo sin DNI buscado por nombre | Al asignar DNI y correo, se unifica, se marca asistencia de hoy automáticamente y se muestra el voucher con credenciales. |
| 3. Primer login de socio con DNI + DNI | Al entrar a `/cliente`, se abre automáticamente el modal de cambio de clave; no permite continuar con clave DNI sin actualizarla. |
| 4. Login con Google de un socio con correo registrado | Resuelve directamente el mismo perfil, carnet y membresía que el login con DNI. |
| 5. Escaneo de DNI con membresía activa | Marca asistencia automáticamente sin clics, emite beep verde y actualiza lista de presentes en vivo. |
| 6. Escaneo de DNI con membresía vencida | Bloquea ingreso, emite sonido de alerta roja y muestra opción de renovar. |
| 7. Escaneo de DNI no registrado | Emite alerta roja y ofrece botón para registrar nuevo atleta. |
| 8. Sincronización en tiempo real | Modificaciones en una pestaña o terminal se reflejan sin recargar la página. |
