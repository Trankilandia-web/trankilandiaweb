### Task 5: Página de Planes y Membresías (`PlansPage.tsx`)

**Files:**
- Create: `src/pages/PlansPage.tsx`
- Test: `npm run build`

**Interfaces:**
- Consumes:
  - `MEMBERSHIP_PLANS`, `PLAN_COMPARISON_CATEGORIES`, `MEMBERSHIP_FAQS` de `src/data/gymData.ts`
  - Tipos `PlanTier`, `ComparisonCategory`, `FaqItem` de `src/types/index.ts`
- Produces:
  ```typescript
  export interface PlansPageProps {
    onSelectPlan?: (planId: string) => void;
    onOpenTourModal?: () => void;
  }
  export default function PlansPage(props: PlansPageProps): JSX.Element;
  ```

**Requirements & Exact Design:**
1. Cabecera de Página:
   - Eyebrow mono en ámbar: `PLANES & TARIFAS TRANKILANDIA`.
   - H1 imponente: `INVIERTE EN TU MEJOR VERSIÓN. <span className="text-amber-400">SIN LETRAS CHICAS.</span>`
   - Subtexto transparente sobre beneficios, cancelación libre y garantía de satisfacción.
2. Toggle Interactivo Mensual / Anual:
   - Switch de 2 opciones: `Facturación Mensual` y `Facturación Anual`.
   - Badge destacado en la opción anual: `-20% OFF + MATRÍCULA GRATIS`.
   - Actualización de precio reactiva según el ciclo seleccionado.
3. 3 Tarjetas de Planes (Silver, Gold, Black):
   - Mapeadas desde `MEMBERSHIP_PLANS`.
   - Tarjeta Gold destacada con `border-2 border-amber-400`, badge `MÁS POPULAR`, botón ámbar con texto negro.
   - Lista de beneficios con icono `Check` en ámbar.
   - Botón CTA que dispara `onSelectPlan` o `onOpenTourModal`.
4. Matriz Comparativa Completa:
   - Mapeada desde `PLAN_COMPARISON_CATEGORIES`.
   - Cabecera fija con los 3 planes.
   - Agrupada por categorías (*Entrenamiento & Acceso*, *Clases & Coaching*, *Recuperación & Bienestar*, *Beneficios Exclusivos*).
   - Renderizado claro de booleanos (`Check` en ámbar / `Minus` o `X` en zinc) y valores de texto.
5. Preguntas Frecuentes (FAQ) en Acordeón:
   - Mapeadas desde `MEMBERSHIP_FAQS`.
   - Estado interactivo `openFaqIndex`.
   - Animación y chevron giratorio.
6. Banner CTA Inferior:
   - "¿Aún con dudas? Prueba las instalaciones sin costo antes de decidir."
   - Botón `"AGENDAR PASE DE CORTESÍA →"` que invoca `onOpenTourModal`.
7. Verificación:
   - `npm run build` debe compilar exitosamente con 0 errores.
8. Commit:
   - `git add src/pages/PlansPage.tsx && git commit -m "feat(plans): create rich PlansPage with billing toggle, comparison matrix and FAQ"`
