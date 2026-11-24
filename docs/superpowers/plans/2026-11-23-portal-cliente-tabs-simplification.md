# Portal del Cliente: Simplificación de Pestañas a 4 Vistas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reducir de 6 a 4 las pestañas de navegación en el Portal del Cliente (`ClientePortal.tsx`), consolidando "Mi Membresía" dentro de "Mi Carnet", y fusionando "Mis Datos" con "Seguridad" dentro de "Mi Perfil" con selector secundario.

**Architecture:** 
1. Redefinir `activeTab` a `'carnet' | 'rutina' | 'evolucion' | 'perfil'`.
2. Añadir `subPerfilTab` (`'datos' | 'seguridad'`) para conmutar limpiamente entre información del socio y cambio de contraseña/acceso Google.
3. Asegurar retrocompatibilidad con query params de URL (`?tab=membresia` -> `carnet`, `?tab=seguridad` -> `perfil` con subpestaña de seguridad).
4. Mover el resumen de membresía, renovación y marcas personales (PRs) a la pestaña `Mi Carnet`.
5. Proteger con pruebas unitarias en `src/tests/unit/clientePortalTabs.test.tsx`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Vitest, Happy-DOM.

## Global Constraints
- No perder ninguna funcionalidad existente (descarga de carnet, ver boleta, QR, cambio de clave, cuenta Google, formulario de datos, PRs, renovación de plan).
- Mantener diseño consistente con la paleta de colores oficial: negro zinc (`bg-zinc-900`, `bg-zinc-950`), bordes sutiles (`border-white/10`), acentos ámbar (`bg-amber-400`, `text-amber-400`).
- Compatibilidad retroactiva con enlaces que apunten a `?tab=seguridad` o `?tab=membresia`.

---

### Task 1: Pruebas Unitarias para Navegación del Portal del Cliente

**Files:**
- Create: `src/tests/unit/clientePortalTabs.test.tsx`
- Consumes: `src/pages/portal/ClientePortal.tsx`, `@testing-library/react`, `vitest`

- [ ] **Step 1: Escribir la prueba unitaria**
Crear `src/tests/unit/clientePortalTabs.test.tsx` verificando:
- La presencia de las 4 pestañas principales: "Mi Carnet", "Mi Rutina", "Mi Evolución", "Mi Perfil".
- La ausencia de las 6 pestañas sueltas anteriores ("Seguridad" y "Mis Datos" ya no deben ser pestañas primarias simultáneas).
- Que al seleccionar "Mi Perfil", existan los sub-selectores "Mis Datos" y "Seguridad".

- [ ] **Step 2: Ejecutar la prueba para verificar que falla antes de la refactorización**
Run: `npx vitest run src/tests/unit/clientePortalTabs.test.tsx`
Expected: FAIL porque aún existen 6 pestañas primarias.

- [ ] **Step 3: Commit temporal del test**
```bash
git add src/tests/unit/clientePortalTabs.test.tsx
git commit -m "test: agregar suite de pruebas para pestañas simplificadas de cliente"
```

---

### Task 2: Refactorizar `ClientePortal.tsx` a 4 Pestañas

**Files:**
- Modify: `src/pages/portal/ClientePortal.tsx`

**Interfaces:**
- `activeTab`: `'carnet' | 'rutina' | 'evolucion' | 'perfil'`
- `subPerfilTab`: `'datos' | 'seguridad'`
- URL Query handling:
  - `tabParam === 'seguridad'` -> `activeTab = 'perfil'`, `subPerfilTab = 'seguridad'`
  - `tabParam === 'membresia'` -> `activeTab = 'carnet'`
  - `tabParam === 'perfil'` -> `activeTab = 'perfil'`, `subPerfilTab = 'datos'`
  - `tabParam === 'rutina'` -> `activeTab = 'rutina'`
  - `tabParam === 'evolucion'` -> `activeTab = 'evolucion'`
  - Por defecto -> `activeTab = 'carnet'`

- [ ] **Step 1: Actualizar tipos y estado de tabs en `ClientePortal.tsx`**
Reemplazar la definición de `activeTab` e introducir `subPerfilTab`.

- [ ] **Step 2: Actualizar la barra de pestañas (de 6 a 4 botones)**
Reemplazar los 6 botones en la barra de navegación por:
1. `Mi Carnet` (`CreditCard`)
2. `Mi Rutina` (`Flame`)
3. `Mi Evolución` (`TrendingUp`)
4. `Mi Perfil` (`User`)

- [ ] **Step 3: Mover el Resumen de Membresía y Marcas (PRs) a `Mi Carnet`**
Colocar la sección de Estado del Plan, Vencimiento, Saldo, Botón Renovar, WhatsApp y Marcas Personales (PRs) justo debajo de la sección de Horario & Entrenador en `activeTab === 'carnet'`.

- [ ] **Step 4: Unificar `perfil` y `seguridad` bajo `activeTab === 'perfil'` con selector secundario tipo pill**
Renderizar en `activeTab === 'perfil'`:
- Cabecera con selector secundario tipo pill:
  - `[👤 Mis Datos Personales]`
  - `[🔑 Seguridad & Contraseña]`
- Renderizar la sección de Ficha del Socio y formulario de actualización cuando `subPerfilTab === 'datos'`.
- Renderizar la sección de Seguridad, Métodos de Ingreso, Cambio de Clave y Cuenta Google cuando `subPerfilTab === 'seguridad'`.

- [ ] **Step 5: Ejecutar la prueba unitaria para verificar que pasa**
Run: `npx vitest run src/tests/unit/clientePortalTabs.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**
```bash
git add src/pages/portal/ClientePortal.tsx
git commit -m "feat: simplificar navegacion del portal del cliente a 4 pestañas con sub-secciones"
```

---

### Task 3: Verificación Integral del Sistema

**Files:**
- Test: Todas las suites de pruebas y build de producción.

- [ ] **Step 1: Ejecutar la suite completa de Vitest**
Run: `npx vitest run`
Expected: 100% de tests passing (201+ tests).

- [ ] **Step 2: Ejecutar la compilación de Vite**
Run: `npm run build`
Expected: Build exitoso sin errores en `dist/`.

- [ ] **Step 3: Commit final de verificación si hay ajustes**
```bash
git add .
git commit -m "chore: verificacion exitosa de 4 pestañas en portal del cliente"
```
