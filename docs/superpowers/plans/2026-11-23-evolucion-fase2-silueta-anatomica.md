# Evolución Corporal Fase 2: Silueta Anatómica Visual Interactiva — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar en el portal del cliente de Trankilandia Gym la Silueta Anatómica Visual Interactiva (SVG táctil con 5 zonas segmentales: brazos, piernas y tronco), con alternancia de vista calorífica (Masa Muscular vs Grasa Corporal), análisis de simetría bilateral (izq vs der), adaptación de género (M/F) y panel táctil interactivo con datos precisos por extremidad.

**Architecture:** Funciones puras en `bioimpedanceEngine.ts` para calcular simetría bilateral y niveles de calor por zona. Componente modular `SiluetaAnatomica.tsx` que dibuja la silueta humana nativa en SVG (viewBox adaptable) con paths independientes para cada extremidad, interactividad táctil para móvil, semáforos de color, y panel emergente con métricas de la zona seleccionada.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, Vitest, Testing Library.

## Global Constraints

- **Mobile First:** Totalmente optimizado para pantallas táctiles de 360px a 430px (pulgar friendly, zonas SVG grandes y fáciles de tocar).
- **Rendimiento:** SVG nativo puro, cero dependencias pesadas de modelado o 3D.
- **Lenguaje:** Español coloquial, directo y amigable (ej. *"Tus brazos están perfectamente equilibrados"*).
- **Estilo de Marca:** Tema oscuro Zinc/Negro, ámbar para grasa corporal (`text-amber-400`), esmeralda para masa muscular (`text-emerald-400`), cyan para hipertrofia superior (`text-cyan-400`).
- **TDD:** Pruebas unitarias para el motor de simetría y zonas de calor, y pruebas de componentes para la silueta interactiva.

---

## File Structure

```
src/
├── types/
│   └── evaluacion.ts              # Extensión con tipos AnalisisSimetria, ZonaCalorSilueta
├── lib/
│   └── bioimpedanceEngine.ts      # + analizarSimetriaCorporal(), + calcularZonasCalorSilueta()
├── components/portal/
│   ├── SiluetaAnatomica.tsx       # Componente visual interactivo con SVG humano y panel de zona
│   └── EvolucionCorporalView.tsx  # Integración en la vista principal
└── tests/unit/
    ├── siluetaEngine.test.ts      # Pruebas unitarias de simetría y clasificación de zonas
    └── SiluetaAnatomica.test.tsx  # Pruebas de render, interacción táctil y cambio de modo
```

---

### Task 1: Definición de Tipos para Simetría y Silueta

**Files:**
- Modify: `src/types/evaluacion.ts`

**Interfaces:**
- Produces: `AnalisisSimetria`, `ZonaCalorSilueta`, `ModoSilueta` ('musculo' | 'grasa')

- [ ] **Step 1: Extender `src/types/evaluacion.ts` con interfaces de simetría y silueta**
- [ ] **Step 2: Verificar compilación con `npx tsc --noEmit`**

---

### Task 2: Motor de Simetría y Clasificación de Calor (TDD)

**Files:**
- Test: `src/tests/unit/siluetaEngine.test.ts`
- Modify: `src/lib/bioimpedanceEngine.ts`

**Interfaces:**
- Produces: `analizarSimetriaCorporal(segmental: SegmentalData): AnalisisSimetria`
- Produces: `calcularZonasCalorSilueta(evaluacion: EvaluacionCorporal, modo: 'musculo' | 'grasa'): Record<string, ZonaCalorSilueta>`

- [ ] **Step 1: Escribir pruebas unitarias fallidas en `src/tests/unit/siluetaEngine.test.ts`**
  - Evalúa simetría de brazos con diferencia < 5% (equilibrado).
  - Evalúa desbalance notorio en piernas (> 10% de diferencia).
  - Determina colores y niveles de grasa (bajo, óptimo, elevado) y músculo (bajo, normal, desarrollado) por zona.
- [ ] **Step 2: Ejecutar test y confirmar fallo esperado**
- [ ] **Step 3: Implementar funciones en `src/lib/bioimpedanceEngine.ts`**
- [ ] **Step 4: Ejecutar test y verificar que pasen todas las pruebas**

---

### Task 3: Componente `SiluetaAnatomica.tsx`

**Files:**
- Create: `src/components/portal/SiluetaAnatomica.tsx`
- Test: `src/tests/unit/SiluetaAnatomica.test.tsx`

**Interfaces:**
- Props: `{ evaluacion: EvaluacionCorporal; }`

- [ ] **Step 1: Escribir pruebas de componente para `SiluetaAnatomica.tsx`**
  - Renderiza silueta SVG con 5 zonas (brazo izq, brazo der, tronco, pierna izq, pierna der).
  - Permite alternar entre modo Músculo y modo Grasa.
  - Al hacer clic o tocar una zona (ej. Tronco), actualiza el panel con los datos de esa zona.
  - Muestra tarjeta de análisis de simetría bilateral (brazos y piernas).
- [ ] **Step 2: Implementar componente `SiluetaAnatomica.tsx`**
  - Dibujo anatómico SVG optimizado y estilizado con paths vectoriales legibles.
  - Coloreado reactivo según el modo (Grasa: ámbar/naranja; Músculo: verde/esmeralda/cyan).
  - Efectos visuales de selección (`stroke`, resplandor, `filter: drop-shadow`).
  - Panel informativo inferior con datos detallados de la extremidad activa.
- [ ] **Step 3: Ejecutar pruebas y verificar éxito**

---

### Task 4: Integración en `EvolucionCorporalView.tsx` y Verificación en Producción

**Files:**
- Modify: `src/components/portal/EvolucionCorporalView.tsx`
- Modify: `src/tests/unit/EvolucionCorporalView.test.tsx`

- [ ] **Step 1: Integrar `SiluetaAnatomica` en `EvolucionCorporalView.tsx`**
  - Ubicación estratégica: entre "Tu Transformación Acumulada" y "Tus Medallas y Logros" o justo encima del Gráfico de Tendencia.
- [ ] **Step 2: Actualizar pruebas unitarias de `EvolucionCorporalView.test.tsx`**
- [ ] **Step 3: Ejecutar suite completa de tests (`npm test`)**
- [ ] **Step 4: Ejecutar build de producción (`npm run build`)**
- [ ] **Step 5: Git commit y despliegue a producción en Vercel**
- [ ] **Step 6: Verificación en vivo en `https://trankilandiagym.qatuweb.com/` / `https://trankilandia-gym.vercel.app/`**
