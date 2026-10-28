# Trankilandia Gym Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la landing page visual de alta fidelidad para Trankilandia Gym basada en la maqueta de referencia y refinada con las directrices de taste, frontend_design e impeccable.

**Architecture:** Aplicación React 19 estructurada por componentes modulares en Vite con Tailwind CSS v4, desacoplando los contenidos y configuraciones en `src/data/gymData.ts` con tipado estricto en `src/types/index.ts`. Cada sección (`Navbar`, `Hero`, `FeatureBar`, `ProgramsSection`, `AboutSection`, `QuickInfoBar`, `Footer`) opera como un componente autocontenido y responsivo.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), Lucide React (`lucide-react`), Google Fonts (`Outfit` para display y `JetBrains Mono` para métricas).

## Global Constraints

- **Paleta bloqueada (1 solo acento):** Fondo base `#09090b` (`zinc-950`), tarjetas `#121215` (`zinc-900`), acento único ámbar `#FACC15` (`yellow-400` / `amber-400`). Sin degradados púrpuras ni cianes de IA.
- **Contraste WCAG AA:** Botón principal con texto negro `#09090b` sobre ámbar `#FACC15` (contraste > 11:1). Textos secundarios en `#A1A1AA` (`zinc-400`).
- **Disciplina del Hero:** `min-h-[100dvh]`, máximo 4 elementos de texto (eyebrow, titular de max 2 líneas, subtexto < 20 palabras, CTAs).
- **Consistencia de Botones:** `whitespace-nowrap`, sin saltos de línea de texto en botones en escritorio.
- **Tipografía:** Display en `Outfit` (pesos 800/900), cuerpo en sans-serif legible, métricas/horarios en `font-mono`.
- **Iconos:** Familia única `lucide-react` con `strokeWidth={1.75}` constante.

---

### Task 1: Scaffolding del Proyecto & Configuración de Tailwind CSS v4

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/index.css`, `src/App.tsx`
- Test: `npm run build`

**Interfaces:**
- Produces: Entorno funcional de desarrollo y compilación en Vite con Tailwind CSS v4 y fuentes configuradas.

- [ ] **Step 1: Inicializar `package.json` con dependencias requeridas**
  - Configurar dependencias: `react`, `react-dom`, `lucide-react`, `clsx`, `tailwind-merge`
  - DevDependencies: `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `tailwindcss`, `typescript`, `@types/react`, `@types/react-dom`
- [ ] **Step 2: Crear configuración de TypeScript (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`) y Vite (`vite.config.ts`)**
- [ ] **Step 3: Crear `index.html` con títulos, metadatos y fuentes Google (`Outfit` y `JetBrains Mono`)**
- [ ] **Step 4: Configurar `src/index.css` con directivas de Tailwind v4 y estilos base oscuros**
- [ ] **Step 5: Crear punto de entrada `src/main.tsx` y placeholder limpio `src/App.tsx`**
- [ ] **Step 6: Ejecutar `npm install` y verificar `npm run build`**
- [ ] **Step 7: Commit inicial de scaffolding**

---

### Task 2: Modelado de Datos y Tipos TypeScript

**Files:**
- Create: `src/types/index.ts`
- Create: `src/data/gymData.ts`
- Test: `npx tsc --noEmit`

**Interfaces:**
- Produces:
  - Tipos: `NavItem`, `FeatureHighlight`, `Program`, `StatMetric`, `GymContactInfo`
  - Constantes exportadas: `NAV_ITEMS`, `FEATURE_HIGHLIGHTS`, `PROGRAMS_DATA`, `ABOUT_DATA`, `GYM_CONTACT`

- [ ] **Step 1: Crear `src/types/index.ts` con definiciones de interfaces**
- [ ] **Step 2: Crear `src/data/gymData.ts` con todos los textos, imágenes en alta resolución de Unsplash y enlaces**
- [ ] **Step 3: Ejecutar `npx tsc --noEmit` para verificar tipos válidos sin errores**
- [ ] **Step 4: Commit de types y data**

---

### Task 3: Componente `Navbar` y Menú Móvil Responsivo

**Files:**
- Create: `src/components/Navbar.tsx`
- Modify: `src/App.tsx`
- Test: `npm run build`

**Interfaces:**
- Consumes: `NAV_ITEMS` de `src/data/gymData.ts`
- Produces: `<Navbar />` con soporte de scroll sticky, blur de fondo, isotipo de mancuerna estilizada en ámbar, navegación en una línea y menú móvil accesible.

- [ ] **Step 1: Implementar `src/components/Navbar.tsx` con soporte desktop y mobile drawer**
- [ ] **Step 2: Integrar en `src/App.tsx`**
- [ ] **Step 3: Compilar con `npm run build` para asegurar cero errores de tipos/sintaxis**
- [ ] **Step 4: Commit del componente Navbar**

---

### Task 4: Componente `Hero` y `FeatureBar` (Ventajas Flotantes)

**Files:**
- Create: `src/components/Hero.tsx`
- Create: `src/components/FeatureBar.tsx`
- Modify: `src/App.tsx`
- Test: `npm run build`

**Interfaces:**
- Consumes: `FEATURE_HIGHLIGHTS` de `src/data/gymData.ts`
- Produces: `<Hero />` cumpliendo la regla de altura `min-h-[100dvh]`, fotografía de atleta con iluminación cenital, titular de 2 líneas con acento ámbar, subtexto conciso, botones de acción y la barra `<FeatureBar />` con 4 tarjetas de beneficios.

- [ ] **Step 1: Implementar `src/components/FeatureBar.tsx` con iconos en ámbar y tarjetas en `zinc-900` con microbordes**
- [ ] **Step 2: Implementar `src/components/Hero.tsx` con imagen de fondo optimizada, overlay degradado y llamadas a la acción**
- [ ] **Step 3: Integrar ambos componentes en `src/App.tsx`**
- [ ] **Step 4: Verificar compilación con `npm run build`**
- [ ] **Step 5: Commit del Hero y FeatureBar**

---

### Task 5: Componente `ProgramsSection` (Nuestros Programas)

**Files:**
- Create: `src/components/ProgramsSection.tsx`
- Modify: `src/App.tsx`
- Test: `npm run build`

**Interfaces:**
- Consumes: `PROGRAMS_DATA` de `src/data/gymData.ts`
- Produces: `<ProgramsSection />` con cuadrícula responsiva (1 col en móvil, 2 en tablet, 4 en desktop), tarjetas de programas fitness con zoom en hover, badges de categoría y botón táctil "CONOCE MÁS →".

- [ ] **Step 1: Implementar `src/components/ProgramsSection.tsx`**
- [ ] **Step 2: Integrar en `src/App.tsx`**
- [ ] **Step 3: Verificar compilación con `npm run build`**
- [ ] **Step 4: Commit del componente ProgramsSection**

---

### Task 6: Componente `AboutSection` (Sobre Nosotros y Métricas)

**Files:**
- Create: `src/components/AboutSection.tsx`
- Modify: `src/App.tsx`
- Test: `npm run build`

**Interfaces:**
- Consumes: `ABOUT_DATA` de `src/data/gymData.ts`
- Produces: `<AboutSection />` con layout split 50/50: imagen de las instalaciones del gimnasio a la izquierda, y a la derecha el manifiesto, 3 tarjetas de métricas numéricas (`1,500 m²`, `15+ Coaches`, `1,200+ Atletas`) en `font-mono` y CTA "FORMA PARTE DEL CLUB →".

- [ ] **Step 1: Implementar `src/components/AboutSection.tsx`**
- [ ] **Step 2: Integrar en `src/App.tsx`**
- [ ] **Step 3: Verificar compilación con `npm run build`**
- [ ] **Step 4: Commit del componente AboutSection**

---

### Task 7: Componentes `QuickInfoBar` y `Footer`

**Files:**
- Create: `src/components/QuickInfoBar.tsx`
- Create: `src/components/Footer.tsx`
- Modify: `src/App.tsx`
- Test: `npm run build`

**Interfaces:**
- Consumes: `GYM_CONTACT` de `src/data/gymData.ts`
- Produces:
  - `<QuickInfoBar />` con las 4 tarjetas de datos de contacto (Ubicación, Teléfono, Correo, Horarios de atención).
  - `<Footer />` con logotipo, derechos reservados, enlaces legales y redes sociales.

- [ ] **Step 1: Implementar `src/components/QuickInfoBar.tsx`**
- [ ] **Step 2: Implementar `src/components/Footer.tsx`**
- [ ] **Step 3: Integrar en `src/App.tsx` unificando la landing page completa**
- [ ] **Step 4: Verificar compilación con `npm run build`**
- [ ] **Step 5: Commit de QuickInfoBar y Footer**

---

### Task 8: Verificación Final, Calidad y Detector Impeccable

**Files:**
- Modify: Ajustes finales en CSS o componentes si la auditoría detecta detalles
- Test: `npm run build`, `impeccable.cmd detect`

**Interfaces:**
- Produces: Proyecto listo para producción, verificado tanto en escritorio como en móvil, y auditado mecánicamente con la herramienta de diseño de Impeccable.

- [ ] **Step 1: Compilar la aplicación en modo producción (`npm run build`)**
- [ ] **Step 2: Ejecutar el detector de Impeccable (`impeccable.cmd detect`) para auditar contraste, fuentes y buenas prácticas**
- [ ] **Step 3: Subsanar cualquier observación detectada**
- [ ] **Step 4: Commit final del release visual v1.0**
