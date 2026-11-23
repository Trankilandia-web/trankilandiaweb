# Plan de Implementación: Evolución Corporal Mobile-First y Síntesis Visual

**Objetivo:** Transformar la vista de "Mi Evolución" del portal del socio en una experiencia 100% optimizada para teléfonos móviles, sustituyendo la sobrecarga de números fríos por interpretaciones claras en español cotidiano, gráficos táctiles de tendencia y barras visuales de transformación (*Antes vs Hoy*).

---

## Estructura de Archivos

- **Modificar:** `src/lib/bioimpedanceEngine.ts` (Nuevas funciones de síntesis cotidiana, semáforos de salud y progreso acumulado).
- **Modificar:** `src/tests/unit/bioimpedanceEngine.test.ts` (Pruebas unitarias de las funciones de síntesis).
- **Crear:** `src/components/portal/EvolucionTrendChart.tsx` (Componente gráfico táctil nativo SVG mobile-first).
- **Modificar:** `src/components/portal/EvolucionCorporalView.tsx` (Rediseño visual mobile-first, acordeón técnico y comparativa de barras).
- **Modificar:** `src/tests/unit/EvolucionCorporalView.test.tsx` (Pruebas unitarias del componente y sus interacciones táctiles).

---

## Tareas

### Tarea 1: Motor de Interpretaciones Cotidianas y Progreso Acumulado
- [ ] Escribir pruebas unitarias en `src/tests/unit/bioimpedanceEngine.test.ts` para:
  - `calcularProgresoAcumulado(primera, actual)`
  - `generarSintesisSaludCotidiana(actual)`
- [ ] Implementar en `src/lib/bioimpedanceEngine.ts`:
  - `calcularProgresoAcumulado`: retorna deltas totales de grasa (kg), músculo (kg), peso, y porcentaje de avance hacia la meta.
  - `generarSintesisSaludCotidiana`: retorna semáforos claros para Grasa Visceral, Metabolismo (BMR) e Hidratación con consejos prácticos.
- [ ] Ejecutar vitest y verificar que pasen las pruebas.
- [ ] Commit de la Tarea 1.

### Tarea 2: Componente Gráfico Táctil Mobile-First (`EvolucionTrendChart.tsx`)
- [ ] Crear `src/components/portal/EvolucionTrendChart.tsx`:
  - Curvas SVG nativas con gradientes de color (esmeralda para músculo, ámbar para grasa, azul/blanco para peso).
  - Pestañas táctiles para alternar entre `Masa Muscular`, `Grasa Corporal` y `Peso`.
  - Puntos interactivos con tooltip táctil (`onTouchStart`/`onClick`) para ver fecha y cifra precisa.
- [ ] Integrar pruebas unitarias de renderizado.
- [ ] Commit de la Tarea 2.

### Tarea 3: Rediseño Mobile-First de `EvolucionCorporalView.tsx`
- [ ] Reestructurar la pantalla según el diseño mobile-first:
  1. **Hero Veredicto:** Título motivador claro en español cotidiano + Fit Score (0-100).
  2. **Selector de Historial:** Píldoras táctiles con scroll horizontal suave.
  3. **Tarjeta de Transformación "Antes vs Hoy":** Barras horizontales comparativas de grasa perdida y músculo ganado.
  4. **Gráfico Táctil:** Integración de `EvolucionTrendChart`.
  5. **Semáforos de Salud:** 3 tarjetas sencillas (Corazón/Visceral, Motor Metabólico, Hidratación).
  6. **Acordeón Plegable:** Reporte de 19 indicadores técnicos y análisis segmental dentro de un contenedor colapsable.
  7. **Compartir en WhatsApp:** Botón móvil adaptado con resumen limpio y motivante.
- [ ] Commit de la Tarea 3.

### Tarea 4: Verificación Completa y Despliegue
- [ ] Ejecutar todas las pruebas unitarias: `npx vitest run`.
- [ ] Compilar producción: `npm run build`.
- [ ] Desplegar a Vercel con `npx vercel --prod --yes` y git push.
- [ ] Confirmar resultado al usuario.
