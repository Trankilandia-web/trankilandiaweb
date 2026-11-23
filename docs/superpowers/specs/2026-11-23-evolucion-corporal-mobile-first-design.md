# Diseño: Experiencia Mobile-First de Evolución Corporal y Síntesis Visual

**Fecha:** 2026-11-23  
**Estado:** Aprobado para Implementación  
**Público Objetivo:** Socios de Trankilandia Gym que consultan su evolución corporal desde sus teléfonos móviles  
**Componente Principal:** `src/components/portal/EvolucionCorporalView.tsx` y motor `src/lib/bioimpedanceEngine.ts`

---

## 1. Contexto y Problema

Actualmente, la balanza inteligente EUROMAR® G78-BT genera hasta 19 indicadores biométricos (impedancia segmental, BMR, masa ósea, WHR, frecuencia muscular, etc.). 

Sin embargo:
1. **Sobrecarga de Datos:** La mayoría de los clientes acceden desde sus teléfonos móviles y no cuentan con formación médica o deportiva para interpretar 20 cifras aisladas.
2. **Falta de Síntesis:** La interfaz previa mostraba una tabla extensa de números fríos sin responder de inmediato a la pregunta crucial del socio: *«¿Estoy mejorando? ¿Gané músculo o perdí grasa? ¿Qué significa para mi salud?»*.
3. **Ausencia de Gráficos Visuales de Progreso:** No existían curvas de tendencia en el tiempo ni barras comparativas cara a cara (*Antes vs Hoy*).

---

## 2. Principios de Diseño Mobile-First

1. **Claridad Inmediata (Above the Fold):** Lo primero que ve el socio al entrar es un **Veredicto Claro y Motivante** en español cotidiano con su **Fit Score** sobre 100.
2. **Comparador Visual de Transformación (Antes vs Hoy):** Barras de progreso horizontales que enfrentan su primera medición (o mes anterior) contra el día de hoy, destacando kilos netos de grasa quemada y músculo ganado.
3. **Gráficos Táctiles No Saturados:** En pantallas de 360px a 430px, graficar 5 líneas superpuestas es ilegible. Se implementará un **gráfico de tendencia táctil con pestañas independientes** (`[Músculo 💪]`, `[Grasa 🔥]`, `[Peso ⚖️]`), con curvas suaves SVG y puntos táctiles que revelan la fecha y cifra exacta al pulsar con el dedo.
4. **Semáforos de Salud y Rendimiento:** Tarjetas visuales de alto impacto (Verde / Ámbar / Rojo) que traducen términos complejos:
   - *Grasa Visceral* $\rightarrow$ "Salud de tu Corazón y Órganos".
   - *BMR* $\rightarrow$ "Calorías que tu cuerpo quema solo existiendo gracias a tus músculos".
   - *Hidratación* $\rightarrow$ "Nivel de Agua y Consejo Diario".
5. **Reporte Técnico Plegable (Acordeón):** La tabla de los 19 indicadores y el análisis segmental de extremidades se mantienen intactos, pero agrupados en un acordeón desplegable (*"Ver reporte biométrico completo"*), evitando abrumar la vista principal.

---

## 3. Arquitectura y Componentes

```
┌─────────────────────────────────────────────────────────────┐
│ EvolucionCorporalView.tsx                                   │
│                                                             │
│ 1. Hero Card: Fecha + Veredicto + Fit Score (0-100)         │
│ 2. Selector de Fecha de Evaluación (Pills horizontales)     │
│ 3. Tarjeta "Tu Transformación" (Antes vs Hoy con barras)    │
│ 4. Gráfico SVG Táctil Mobile (Tabs: Músculo / Grasa / Peso) │
│ 5. Semáforo de Salud y Consejos en Lenguaje Cotidiano       │
│ 6. Botón Compartir en WhatsApp ("Mi Progreso")              │
│ 7. Acordeón Desplegable: Reporte Técnico Fitdays (19 datos) │
└─────────────────────────────────────────────────────────────┘
```

### 3.1. Mejoras en el Motor (`src/lib/bioimpedanceEngine.ts`)

Se incorporan funciones auxiliares para el cálculo móvil:
* `calcularProgresoAcumulado(primera: EvaluacionCorporal, actual: EvaluacionCorporal)`: Obtiene la variación total desde el día 1 en grasa (kg), músculo (kg), peso y grasa visceral.
* `generarInterpretacionSalud(evaluacion: EvaluacionCorporal)`: Genera diagnósticos en lenguaje coloquial para:
  * Grasa visceral (Rango Saludable / Alerta / Riesgo).
  * Metabolismo basal y gasto diario proyectado.
  * Meta hídrica diaria recomendada según su peso actual.

### 3.2. Gráfico SVG Mobile-First (`TrendChart`)
* Gráfico vectorial SVG nativo (sin dependencias pesadas que ralenticen la carga de la PWA en celulares).
* Pestañas para alternar métrica:
  * **Masa Muscular (kg):** Curva ascendente verde esmeralda con gradiente suave.
  * **% Grasa Corporal:** Curva descendente ámbar con gradiente cálido.
  * **Peso Total (kg):** Curva neutra en zinc/blanco.
* Puntos interactivos con tooltip táctil (`onTouchStart` / `onClick`) que muestra la fecha formateada (ej. *14 Nov*) y el valor exacto.

---

## 4. Plan de Pruebas y Verificación

1. **Pruebas Unitarias del Motor (`bioimpedanceEngine.test.ts`):**
   - Verificación de cálculos de progreso acumulado (primer día vs hoy).
   - Verificación de semáforos de grasa visceral y recomendaciones de hidratación.
2. **Pruebas del Componente (`EvolucionCorporalView.test.tsx`):**
   - Renderizado en viewport móvil.
   - Cambio fluido entre pestañas de gráficos (`Músculo`, `Grasa`, `Peso`).
   - Expansión y colapso del acordeón técnico.
   - Compartir en WhatsApp con el resumen legible.
3. **Verificación Visual y Compilación:**
   - `npm run build` sin errores de tipos TypeScript.
   - Despliegue en Vercel para validación en dispositivo móvil real.
