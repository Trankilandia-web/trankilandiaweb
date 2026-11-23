# Evolución Corporal Fase 1: Medallas de Logro y Simulador de Metas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar en el portal del cliente de Trankilandia Gym el sistema de Medallas de Logro (gamificación con 4 niveles y medallas secretas) y el Simulador de Metas interactivas (proyecciones de grasa/músculo con curva y fecha objetivo) optimizados para teléfonos móviles.

**Architecture:** Funciones matemáticas puras en `bioimpedanceEngine.ts` para evaluar hitos y calcular proyecciones basadas en deltas históricos y frecuencia semanal. Componentes React modulares (`MedallasLogro.tsx`, `SimuladorMetas.tsx`) con SVG nativo e interactividad táctil sin librerías pesadas externas, integrados armónicamente en `EvolucionCorporalView.tsx`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, Vitest, Testing Library.

## Global Constraints

- **Mobile First:** Diseño probado y pensado para pantallas de 360px a 430px de ancho.
- **Rendimiento:** Cero librerías externas de gráficos; gráficos renderizados con SVG nativo.
- **Lenguaje:** Español coloquial y motivador sin tecnicismos médicos en la UI de cara al socio.
- **Estilo de Marca:** Tema oscuro Zinc/Negro, acento ámbar (`#F59E0B` / `text-amber-400`), esmeralda (`text-emerald-400`) para progreso positivo, tipografía mono para datos numéricos.
- **TDD:** Pruebas unitarias para cada cálculo del motor y cada componente visual antes y después de su integración.

---

## File Structure

```
src/
├── types/
│   └── evaluacion.ts              # Extensión con tipos MedallaLogro, NivelMedalla, ProyeccionMeta
├── lib/
│   └── bioimpedanceEngine.ts      # + calcularMedallasSocio(), + calcularProyeccionMeta()
├── components/portal/
│   ├── MedallasLogro.tsx          # Colección de medallas, niveles, animaciones y compartir
│   ├── SimuladorMetas.tsx         # Selector de objetivos, frecuencia y curva de proyección SVG
│   └── EvolucionCorporalView.tsx  # Integración de ambos componentes
└── tests/unit/
    ├── medallasEngine.test.ts     # Pruebas unitarias del motor de medallas
    ├── simuladorEngine.test.ts    # Pruebas unitarias del motor de proyección
    ├── MedallasLogro.test.tsx     # Pruebas de render y filtros de medallas
    └── SimuladorMetas.test.tsx    # Pruebas de interactividad del simulador
```

---

### Task 1: Definición de Tipos para Medallas y Simulador

**Files:**
- Modify: `src/types/evaluacion.ts`

**Interfaces:**
- Produces: `NivelMedalla`, `CategoriaMedalla`, `MedallaLogro`, `ObjetivoSimulador`, `PuntoProyeccion`, `ProyeccionMeta`

- [ ] **Step 1: Extender `src/types/evaluacion.ts` con interfaces de medallas y simulador**
- [ ] **Step 2: Verificar compilación con `npx tsc --noEmit`**

---

### Task 2: Motor de Medallas de Logro (TDD)

**Files:**
- Test: `src/tests/unit/medallasEngine.test.ts`
- Modify: `src/lib/bioimpedanceEngine.ts`

**Interfaces:**
- Produces: `calcularMedallasSocio(evaluaciones: EvaluacionCorporal[]): MedallaLogro[]`

- [ ] **Step 1: Escribir pruebas unitarias fallidas para `calcularMedallasSocio`**
  - Evaluar primera evaluación (otorga medalla 'Primera Vez').
  - Evaluar reducción de grasa de 3.2 kg (otorga Quemador Plata).
  - Evaluar aumento de músculo de 1.8 kg (otorga Constructor Plata).
  - Evaluar grasa visceral baja sostenida (otorga Corazón Sano).
  - Evaluar medallas secretas (ej. Fit Score >= 85 activa 'Élite Corporal').
  - Evaluar medallas bloqueadas y progreso hacia el siguiente nivel.

- [ ] **Step 2: Ejecutar test y confirmar fallo esperado**
  - Comando: `npx vitest run src/tests/unit/medallasEngine.test.ts`

- [ ] **Step 3: Implementar `calcularMedallasSocio` en `src/lib/bioimpedanceEngine.ts`**
  - Definir matriz de medallas y reglas de niveles.
  - Calcular acumulados históricos y comparar contra umbrales.
  - Ordenar: desbloqueadas primero (más recientes arriba), luego próximas a desbloquear.

- [ ] **Step 4: Ejecutar test y verificar que pasen todas las pruebas**
  - Comando: `npx vitest run src/tests/unit/medallasEngine.test.ts`

---

### Task 3: Motor del Simulador de Metas (TDD)

**Files:**
- Test: `src/tests/unit/simuladorEngine.test.ts`
- Modify: `src/lib/bioimpedanceEngine.ts`

**Interfaces:**
- Produces: `calcularProyeccionMeta(evaluaciones: EvaluacionCorporal[], params: ObjetivoSimulador): ProyeccionMeta`

- [ ] **Step 1: Escribir pruebas unitarias fallidas para `calcularProyeccionMeta`**
  - Proyección de pérdida de grasa de 25% a 18% con ritmo histórico.
  - Proyección con una sola evaluación (uso de ritmo estándar fisiológico seguro: 0.35 kg - 0.7 kg de grasa/semana según frecuencia).
  - Ajuste de semanas según frecuencia de entrenamiento (2x más lento vs 4x más rápido).
  - Generación de puntos de curva con fechas futuras reales formateadas.
  - Mensaje motivacional personalizado en lenguaje cotidiano.

- [ ] **Step 2: Ejecutar test y confirmar fallo esperado**
  - Comando: `npx vitest run src/tests/unit/simuladorEngine.test.ts`

- [ ] **Step 3: Implementar `calcularProyeccionMeta` en `src/lib/bioimpedanceEngine.ts`**
  - Fórmulas fisiológicas seguras (máximo recomendado por la ACSM de 0.5-1% de peso en grasa/semana).
  - Cálculo de semanas, checkpoints calendáricos y generación de array de proyección.

- [ ] **Step 4: Ejecutar test y verificar que pasen todas las pruebas**
  - Comando: `npx vitest run src/tests/unit/simuladorEngine.test.ts`

---

### Task 4: Componente `MedallasLogro.tsx`

**Files:**
- Create: `src/components/portal/MedallasLogro.tsx`
- Test: `src/tests/unit/MedallasLogro.test.tsx`

**Interfaces:**
- Props: `{ medallas: MedallaLogro[]; socioNombre?: string; }`

- [ ] **Step 1: Escribir pruebas de componente para `MedallasLogro.tsx`**
  - Renderiza lista de medallas y contador (ej. "4 de 12 Desbloqueadas").
  - Filtrado por pestañas: Todas, Músculo, Grasa, Salud, Constancia.
  - Muestra insignia destacada para la medalla más reciente con animación de brillo.
  - Botón de compartir en WhatsApp para medallas individuales.
  - Medallas bloqueadas muestran candado y porcentaje de avance.
  - Medallas secretas no revelan título a menos que estén desbloqueadas.

- [ ] **Step 2: Implementar componente `MedallasLogro.tsx`**
  - Grid responsivo (2 columnas en móvil, 3 en desktop).
  - Paleta de niveles: Bronce (`amber-700`), Plata (`zinc-300`), Oro (`amber-400`), Diamante (`cyan-400`).
  - Botón "Compartir Logro" con enlace directo a WhatsApp.

- [ ] **Step 3: Ejecutar pruebas y verificar éxito**
  - Comando: `npx vitest run src/tests/unit/MedallasLogro.test.tsx`

---

### Task 5: Componente `SimuladorMetas.tsx`

**Files:**
- Create: `src/components/portal/SimuladorMetas.tsx`
- Test: `src/tests/unit/SimuladorMetas.test.tsx`

**Interfaces:**
- Props: `{ evaluaciones: EvaluacionCorporal[]; currentEval: EvaluacionCorporal; }`

- [ ] **Step 1: Escribir pruebas de componente para `SimuladorMetas.tsx`**
  - Renderiza switch de objetivo (Bajar Grasa / Subir Músculo).
  - Botones de presets rápidos (Conservador, Ideal, Élite).
  - Selector de frecuencia semanal (2x, 3x, 4x, 5x).
  - Renderiza el gráfico SVG de proyección con línea continua (historia) y punteada (meta).
  - Despliega tarjeta con fecha estimada de logro y mensaje motivacional.

- [ ] **Step 2: Implementar componente `SimuladorMetas.tsx`**
  - Controles táctiles mobile-friendly (pills grandes para tocar con el pulgar).
  - SVG viewBox adaptable con gradientes y puntos interactivos.
  - Línea punteada animada hacia la bandera de meta.
  - Tarjeta de veredicto con cálculo en tiempo real al mover parámetros.

- [ ] **Step 3: Ejecutar pruebas y verificar éxito**
  - Comando: `npx vitest run src/tests/unit/SimuladorMetas.test.tsx`

---

### Task 6: Integración en `EvolucionCorporalView.tsx` y Pruebas Globales

**Files:**
- Modify: `src/components/portal/EvolucionCorporalView.tsx`
- Modify: `src/tests/unit/EvolucionCorporalView.test.tsx`

- [ ] **Step 1: Integrar `MedallasLogro` y `SimuladorMetas` en `EvolucionCorporalView.tsx`**
- [ ] **Step 2: Actualizar pruebas unitarias de `EvolucionCorporalView.test.tsx`**
- [ ] **Step 3: Ejecutar suite completa de tests (`npm test`)**
- [ ] **Step 4: Ejecutar build de producción (`npm run build`)**
- [ ] **Step 5: Git commit y despliegue a producción en Vercel**
