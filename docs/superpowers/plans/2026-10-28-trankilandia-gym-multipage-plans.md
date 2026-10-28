# Trankilandia Gym Multipage Platform & Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar Trankilandia Gym de una landing page monopágina a una plataforma web multipágina de club deportivo de élite con rutas reales, exposición completa de planes y membresías, horarios interactivos, tour de instalaciones, modal de reserva de tour VIP y footer corporativo de lujo.

**Architecture:** Aplicación React 19 con `react-router-dom` para enrutamiento del lado del cliente (`/`, `/planes`, `/clases`, `/instalaciones`). Estado global o contexto para el modal interactivo de pase de cortesía (`TourModal`). Desacoplamiento estricto de datos en `src/data/gymData.ts` con tipado TypeScript en `src/types/index.ts`. Cada página y componente es responsivo y respeta las directrices de `taste`, `impeccable` y `frontend_design`.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), `react-router-dom` v7+, Lucide React (`lucide-react`), Google Fonts (`Outfit` y `JetBrains Mono`).

## Global Constraints

- **Paleta bloqueada (1 solo acento):** Fondo base `#09090b` (`zinc-950`), tarjetas `#121215` (`zinc-900`), acento único ámbar `#FACC15` (`yellow-400` / `amber-400`). Sin degradados púrpuras ni cianes de IA.
- **Contraste WCAG AA:** Botón principal con texto negro `#000000` (`text-black font-extrabold`) sobre fondo ámbar `#FACC15` (contraste > 11:1). Textos secundarios en `#A1A1AA` (`zinc-400`).
- **Navegación Multipágina Real:** Cero recargas de página, URLs limpias con `react-router-dom`, indicador visual de ruta activa y scroll automático al tope en cambio de ruta.
- **Reemplazo del botón de video:** Ningún botón confuso de "Ver Video". Sustituido por "AGENDAR TOUR VIP / PASE DE CORTESÍA" con modal interactivo funcional.
- **Consistencia de Botones:** `whitespace-nowrap`, sin saltos de línea de texto en botones en escritorio.
- **Tipografía:** Display en `Outfit` (pesos 800/900), cuerpo en sans-serif legible, métricas/horarios en `font-mono`.
- **Iconos:** Familia única `lucide-react` con `strokeWidth={1.75}` constante.

---

### Task 1: Instalación de `react-router-dom`, Modelado de Tipos y Datos Expandidos

**Files:**
- Modify: `package.json`
- Modify: `src/types/index.ts`
- Modify: `src/data/gymData.ts`
- Test: `npm run build`

**Interfaces:**
- Consumes: Ninguno
- Produces: `react-router-dom` instalado, tipos para planes, matriz comparativa, horarios, instalaciones y preguntas frecuentes; constantes exportadas `MEMBERSHIP_PLANS`, `PLAN_COMPARISON_CATEGORIES`, `SCHEDULE_DAYS`, `SCHEDULE_CLASSES`, `FACILITY_ZONES`, `MEMBERSHIP_FAQS`.

- [ ] **Step 1: Instalar `react-router-dom`**
  - Run: `npm install react-router-dom`
- [ ] **Step 2: Expandir `src/types/index.ts`**
  - Agregar interfaces: `PlanTier`, `ComparisonFeature`, `ComparisonCategory`, `ScheduleClass`, `FacilityZone`, `FaqItem`, `TourBookingData`.
- [ ] **Step 3: Expandir `src/data/gymData.ts`**
  - Agregar datos completos para los 3 planes (Silver, Gold, Black VIP) con precios mensuales y anuales.
  - Agregar matriz comparativa de más de 12 beneficios técnicos.
  - Agregar parrilla de horarios con clases semanales y coaches.
  - Agregar zonas de instalaciones con fotografías y especificaciones.
  - Agregar preguntas frecuentes de membresía.
- [ ] **Step 4: Verificar compilación con `npm run build`**
- [ ] **Step 5: Commit de tipos y datos**

---

### Task 2: Componente Modal "Tour VIP & Pase de Cortesía" (`TourModal.tsx`)

**Files:**
- Create: `src/components/TourModal.tsx`
- Test: `npm run build`

**Interfaces:**
- Produces: `<TourModal isOpen={boolean} onClose={() => void} initialPlan?: string />`

- [ ] **Step 1: Crear `src/components/TourModal.tsx`**
  - Backdrop con blur (`bg-black/80 backdrop-blur-md`).
  - Selector de día y turno (Mañana 07:00 - 11:00, Tarde 12:00 - 17:00, Noche 18:00 - 21:00).
  - Formulario con Nombre, WhatsApp, Email y Objetivo (Fuerza, Pérdida de Grasa, Salud general).
  - Estado de éxito con generación de código de pase de cortesía (ej. `TRK-VIP-XXXX`).
  - Atajo de cierre con tecla `Escape` y accesibilidad ARIA.
- [ ] **Step 2: Verificar compilación con `npm run build`**
- [ ] **Step 3: Commit del componente TourModal**

---

### Task 3: Actualización del `Navbar` con Rutas Reales y Estado Activo

**Files:**
- Modify: `src/components/Navbar.tsx`
- Test: `npm run build`

**Interfaces:**
- Consumes: `Link`, `useLocation` de `react-router-dom`, callback `onOpenTourModal`
- Produces: `<Navbar onOpenTourModal={() => void} />` con enlaces a `/`, `/planes`, `/clases`, `/instalaciones`, indicador de ruta activa y botón *"PASE DE CORTESÍA"*.

- [ ] **Step 1: Actualizar `Navbar.tsx` usando `Link` y `useLocation()`**
  - Resaltar la ruta actual con `text-amber-400 font-bold border-b-2 border-amber-400`.
  - Botón CTA *"PASE DE CORTESÍA"* que invoca `onOpenTourModal()`.
  - Drawer móvil adaptado con enlaces de enrutamiento y cierre automático al navegar.
- [ ] **Step 2: Verificar compilación con `npm run build`**
- [ ] **Step 3: Commit de Navbar actualizado**

---

### Task 4: Refactorización de `Hero.tsx` y Creación de `HomePage.tsx`

**Files:**
- Modify: `src/components/Hero.tsx`
- Create: `src/pages/HomePage.tsx`
- Test: `npm run build`

**Interfaces:**
- Consumes: `Hero`, `FeatureBar`, `ProgramsSection`, `AboutSection`, `QuickInfoBar`
- Produces: `<HomePage onOpenTourModal={() => void} />` y Hero actualizado sin el botón "Ver Video", reemplazado por *"AGENDAR TOUR VIP"* y *"CONOCER INSTALACIONES"*.

- [ ] **Step 1: Actualizar `Hero.tsx`**
  - Reemplazar botón secundario por enlace a `/instalaciones` (*"CONOCER INSTALACIONES"*).
  - Botón primario *"AGENDAR TOUR VIP"* invoca `onOpenTourModal()`.
- [ ] **Step 2: Crear `src/pages/HomePage.tsx`**
  - Incluye `Hero`, `FeatureBar`, `ProgramsSection` (con CTA a `/clases`), `AboutSection` (con CTA a `/instalaciones`), sección teaser de membresías con enlace a `/planes`, y `QuickInfoBar`.
- [ ] **Step 3: Verificar compilación con `npm run build`**
- [ ] **Step 4: Commit de Hero refactorizado y HomePage**

---

### Task 5: Página de Planes y Membresías (`PlansPage.tsx`)

**Files:**
- Create: `src/pages/PlansPage.tsx`
- Test: `npm run build`

**Interfaces:**
- Consumes: `MEMBERSHIP_PLANS`, `PLAN_COMPARISON_CATEGORIES`, `MEMBERSHIP_FAQS` de `src/data/gymData.ts`
- Produces: `<PlansPage onSelectPlan={(planId) => void} />`

- [ ] **Step 1: Implementar `src/pages/PlansPage.tsx`**
  - Cabecera con título y badge de garantía.
  - Switch interactivo Mensual / Anual (con badge de descuento -20%).
  - 3 Tarjetas de planes (Silver, Gold Performance con realce en ámbar, Black VIP).
  - Matriz comparativa exhaustiva con iconos de check/cross y categorías técnicas.
  - Sección interactiva de preguntas frecuentes (FAQ) tipo acordeón.
- [ ] **Step 2: Verificar compilación con `npm run build`**
- [ ] **Step 3: Commit de PlansPage**

---

### Task 6: Página de Horarios y Clases (`SchedulePage.tsx`)

**Files:**
- Create: `src/pages/SchedulePage.tsx`
- Test: `npm run build`

**Interfaces:**
- Consumes: `SCHEDULE_DAYS`, `SCHEDULE_CLASSES` de `src/data/gymData.ts`
- Produces: `<SchedulePage onBookClass={(classId) => void} />`

- [ ] **Step 1: Implementar `src/pages/SchedulePage.tsx`**
  - Selector de días de la semana con feedback visual.
  - Filtro por categorías de disciplina (Todas, Fuerza, HIIT, Funcional, Boxeo, Movilidad).
  - Parrilla de tarjetas de clases con horarios, coach, nivel de intensidad y botón para agendar clase de prueba.
- [ ] **Step 2: Verificar compilación con `npm run build`**
- [ ] **Step 3: Commit de SchedulePage**

---

### Task 7: Página de Instalaciones y Zonas Deportivas (`FacilitiesPage.tsx`)

**Files:**
- Create: `src/pages/FacilitiesPage.tsx`
- Test: `npm run build`

**Interfaces:**
- Consumes: `FACILITY_ZONES` de `src/data/gymData.ts`
- Produces: `<FacilitiesPage onOpenTourModal={() => void} />`

- [ ] **Step 1: Implementar `src/pages/FacilitiesPage.tsx`**
  - Galería visual por zonas (Biomecánica, Peso Libre, Área Funcional, Recovery Spa).
  - Tarjetas de maquinaria con especificaciones (Hammer Strength, Eleiko, Concept2).
  - Lista de amenidades exclusivas (regaderas termorreguladas, toallas, casilleros inteligentes).
  - Banner inferior invitando al tour presencial.
- [ ] **Step 2: Verificar compilación con `npm run build`**
- [ ] **Step 3: Commit de FacilitiesPage**

---

### Task 8: Rediseño del `Footer` Corporativo y Ensamblaje en `App.tsx`

**Files:**
- Modify: `src/components/Footer.tsx`
- Modify: `src/App.tsx`
- Create: `src/components/ScrollToTop.tsx`
- Test: `npm run build`

**Interfaces:**
- Produces: `<Footer />` corporativo de élite de 4 columnas + newsletter y `<App />` con `BrowserRouter`, `Routes`, rutas `/`, `/planes`, `/clases`, `/instalaciones` y `TourModal`.

- [ ] **Step 1: Rediseñar `src/components/Footer.tsx`**
  - Sección newsletter "Trankilandia Insider".
  - 4 Columnas: El Club, Entrenamiento, Membresías, Concierge.
  - Sellos de certificación (Hammer Strength, Eleiko, InBody).
  - Badges de App Store / Google Play y bloque legal.
- [ ] **Step 2: Crear `src/components/ScrollToTop.tsx` para restablecer scroll en cada cambio de ruta**
- [ ] **Step 3: Integrar todo en `src/App.tsx` con `BrowserRouter` y `Routes`**
- [ ] **Step 4: Verificar compilación con `npm run build`**
- [ ] **Step 5: Commit de Footer y App con enrutamiento**

---

### Task 9: Auditoría Mecánica Impeccable y Verificación de Calidad

**Files:**
- Verify: Todos los archivos modificados
- Test: `npm run build`, `impeccable detect`

- [ ] **Step 1: Ejecutar compilación de producción `npm run build`**
- [ ] **Step 2: Ejecutar detector mecánico `impeccable detect` en todo `src/`**
- [ ] **Step 3: Subsanar cualquier hallazgo**
- [ ] **Step 4: Commit final del hito multipágina**
