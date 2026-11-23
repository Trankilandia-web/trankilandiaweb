# Evolución Corporal Fase 3: Story Card Generator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar un generador de tarjetas gráficas exportables de alta resolución (9:16 para Instagram Stories/WhatsApp Status y 1:1 para feed) utilizando HTML5 Canvas nativo, con selección de 3 plantillas estéticas (Minimal Dark, Gradient Fire, Neon Gym), detección automática del dato más impactante (grasa quemada o músculo ganado), inclusión de la medalla de mayor prestigio y soporte de descarga directa o Web Share API.

**Architecture:** Función de apoyo en `bioimpedanceEngine.ts` para destilar las métricas de mayor impacto publicitario del socio. Módulo de renderizado sobre HTML5 Canvas (`storyCardCanvasRenderer.ts`) con tipografías nativas, gradientes y trazados vectoriales. Componente React interactivo `StoryCardModal.tsx` que ofrece previsualización en vivo, controles de estilo y botón de compartir nativo o descarga.

**Tech Stack:** React 18, TypeScript, HTML5 Canvas API, Web Share API, Tailwind CSS, Lucide React, Vitest.

## Global Constraints

- **Mobile First:** Previsualización adaptada al viewport del móvil con renderizado de canvas a 1080x1920 (9:16) y 1080x1080 (1:1) sin pixelación.
- **Rendimiento:** Cero librerías externas de exportación (sin html2canvas pesado). Canvas 2D nativo directo de alta velocidad.
- **Marca:** Branding oficial "TRANKILANDIA GYM", colores ámbar dorado (`#F59E0B`), esmeralda (`#10B981`) y negro azabache (`#09090B`).
- **Compatibilidad:** Si el navegador móvil no soporta `navigator.canShare({ files })`, degrada automáticamente a descarga directa del archivo `.png`.
- **TDD:** Pruebas unitarias para la extracción de métricas de story y pruebas de componente para el modal.

---

## File Structure

```
src/
├── types/
│   └── evaluacion.ts                     # + Tipos StoryCardConfig, DatosStoryCard, TemplateStory
├── lib/
│   ├── bioimpedanceEngine.ts             # + prepararDatosStoryCard()
│   └── storyCardCanvasRenderer.ts        # Renderizado 2D en Canvas (Minimal Dark, Gradient Fire, Neon Gym)
├── components/portal/
│   ├── StoryCardModal.tsx                # Modal con preview, selector de template, switch 9:16 / 1:1 y botones de acción
│   └── EvolucionCorporalView.tsx         # Botón 'Crear Story Card' e integración del modal
└── tests/unit/
    ├── storyCardEngine.test.ts           # Pruebas unitarias de selección de datos para Story Card
    └── StoryCardModal.test.tsx           # Pruebas del modal, switches y triggers de exportación
```

---

### Task 1: Definición de Tipos para Story Card

**Files:**
- Modify: `src/types/evaluacion.ts`

**Interfaces:**
- Produces: `TemplateStory` ('minimal_dark' | 'gradient_fire' | 'neon_gym')
- Produces: `FormatoStory` ('story_9_16' | 'post_1_1')
- Produces: `DatosStoryCard`, `ConfigStoryCard`

- [ ] **Step 1: Extender `src/types/evaluacion.ts` con tipos de Story Card**
- [ ] **Step 2: Verificar compilación con `npx tsc --noEmit`**

---

### Task 2: Motor de Destilación de Métricas para Story Card (TDD)

**Files:**
- Test: `src/tests/unit/storyCardEngine.test.ts`
- Modify: `src/lib/bioimpedanceEngine.ts`

**Interfaces:**
- Produces: `prepararDatosStoryCard(evaluacion: EvaluacionCorporal, medallas: MedallaLogro[], acumulado: ProgresoAcumulado): DatosStoryCard`

- [ ] **Step 1: Escribir pruebas unitarias en `src/tests/unit/storyCardEngine.test.ts`**
  - Prioriza "Grasa Quemada" si el socio perdió más de 1 kg de grasa.
  - Prioriza "Masa Muscular Ganada" si el socio ganó músculo preponderante.
  - Destaca la medalla desbloqueada de mayor nivel (Diamante > Oro > Plata > Bronce).
  - Incluye hashtags de Trankilandia Gym y fecha formateada.
- [ ] **Step 2: Ejecutar test y confirmar fallo esperado**
- [ ] **Step 3: Implementar `prepararDatosStoryCard` en `src/lib/bioimpedanceEngine.ts`**
- [ ] **Step 4: Ejecutar test y verificar que pasen todas las pruebas**

---

### Task 3: Renderizador Canvas 2D de Alta Resolución

**Files:**
- Create: `src/lib/storyCardCanvasRenderer.ts`

**Interfaces:**
- Produces: `renderizarStoryCard(canvas: HTMLCanvasElement, datos: DatosStoryCard, config: ConfigStoryCard): Promise<void>`

- [ ] **Step 1: Implementar funciones de trazado en Canvas 2D:**
  - Configuración de dimensiones (1080x1920 para 9:16 o 1080x1080 para 1:1).
  - Renderizado de fondos según plantilla:
    - *Minimal Dark:* Fondo negro azabache con marco ámbar sutil y tipografía display.
    - *Gradient Fire:* Gradiente radial oscuro a naranja-ámbar con efectos de llamarada.
    - *Neon Gym:* Estilo oscuro con bordes y líneas de circuito en cian y esmeralda neón.
  - Dibujo de cabecera con branding oficial `TRANKILANDIA GYM`.
  - Dibujo de Fit Score grande en círculo o cápsula iluminada.
  - Dibujo de la métrica de mayor impacto (destacada en tamaño XXL).
  - Bloque de métricas secundarias (músculo, grasa, visceral, fecha).
  - Insignia de medalla desbloqueada con icono y nivel.
  - Pie de imagen con hashtag `#TrankilandiaGym #MiEvolución`.

---

### Task 4: Componente `StoryCardModal.tsx`

**Files:**
- Create: `src/components/portal/StoryCardModal.tsx`
- Test: `src/tests/unit/StoryCardModal.test.tsx`

**Interfaces:**
- Props: `{ isOpen: boolean; onClose: () => void; evaluacion: EvaluacionCorporal; medallas: MedallaLogro[]; acumulado: ProgresoAcumulado; socioNombre?: string; }`

- [ ] **Step 1: Escribir pruebas de componente para `StoryCardModal.tsx`**
  - Renderiza controles de selección de plantilla y formato.
  - Despliega el preview del canvas en pantalla.
  - Ofrece botones de "Compartir en Historia" y "Descargar Imagen".
- [ ] **Step 2: Implementar componente `StoryCardModal.tsx`**
  - Modal mobile-friendly con preview escalado para teléfono.
  - Selector de plantillas táctil.
  - Selector de formato (9:16 vs 1:1).
  - Lógica de `navigator.share` con archivo Blob PNG y fallback a descarga con `a[download]`.
- [ ] **Step 3: Ejecutar pruebas y verificar éxito**

---

### Task 5: Integración en `EvolucionCorporalView.tsx` y Pruebas Globales

**Files:**
- Modify: `src/components/portal/EvolucionCorporalView.tsx`
- Modify: `src/tests/unit/EvolucionCorporalView.test.tsx`

- [ ] **Step 1: Añadir botón de acción "📸 Crear Mi Story Card" en la cabecera de `EvolucionCorporalView.tsx`**
- [ ] **Step 2: Conectar el modal con los datos de evaluación, medallas y acumulado**
- [ ] **Step 3: Actualizar y ejecutar suite completa de pruebas (`npm test`)**
- [ ] **Step 4: Ejecutar build de producción (`npm run build`)**
- [ ] **Step 5: Git commit y despliegue a producción en Vercel**
- [ ] **Step 6: Verificación en vivo en `https://trankilandiagym.qatuweb.com/`**
