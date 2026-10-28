### Task 6: Página de Horarios y Clases (`SchedulePage.tsx`)

**Files:**
- Create: `src/pages/SchedulePage.tsx`
- Test: `npm run build`

**Interfaces:**
- Consumes:
  - `SCHEDULE_DAYS`, `SCHEDULE_CLASSES` de `src/data/gymData.ts`
  - Tipo `ScheduleClass` de `src/types/index.ts`
- Produces:
  ```typescript
  export interface SchedulePageProps {
    onBookClass?: (classId: string) => void;
    onOpenTourModal?: () => void;
  }
  export default function SchedulePage(props: SchedulePageProps): JSX.Element;
  ```

**Requirements & Exact Design:**
1. Cabecera de Página:
   - Eyebrow mono en ámbar: `CALENDARIO & DISCIPLINAS`.
   - H1: `HORARIOS DE CLASES. <span className="text-amber-400">ENTRENA A TU RITMO.</span>`
   - Párrafo explicativo sobre entrenamiento grupal de alta exigencia técnica.
   - Píldoras de resumen: "20+ Clases Semanales", "Grupos Reducidos", "Coaches de Élite".
2. Barra Selectora de Días de la Semana:
   - Estado `selectedDay` (default `'Lunes'`).
   - Píldoras horizontales para los 7 días (`SCHEDULE_DAYS`).
   - Día activo con fondo ámbar `#FACC15` y texto negro bold.
3. Filtro por Categoría de Entrenamiento:
   - Estado `selectedCategory` (default `'Todas'`).
   - Categorías: `Todas`, `Fuerza`, `HIIT`, `Funcional`, `Boxeo`, `Movilidad`.
4. Cuadrícula de Clases Filtradas:
   - Filtrar `SCHEDULE_CLASSES` por `selectedDay` y opcionalmente por `selectedCategory`.
   - Tarjeta para cada clase:
     - Franja de horario (`time`) con icono `Clock` en monoespaciado.
     - Badge de categoría y badge de intensidad (`Media`, `Alta`, `Extrema`).
     - Título de la clase en bold blanco.
     - Nombre del coach asignado con icono `User`.
     - Indicador de cupos restantes en `font-mono`.
     - Botón interactivo `"RESERVAR CLASE DE PRUEBA"` que invoca `onOpenTourModal` o `onBookClass`.
   - Manejo de estado vacío si un día/categoría no tiene clases programadas.
5. Banner Inferior de Conversión:
   - "¿Primera vez en Trankilandia Gym? Asiste a una clase como invitado con tu pase de un día."
   - Botón `"AGENDAR TOUR & CLASE DE CORTESÍA →"` (`bg-amber-400 text-black font-extrabold`).
6. Verificación:
   - `npm run build` debe compilar exitosamente con 0 errores.
7. Commit:
   - `git add src/pages/SchedulePage.tsx && git commit -m "feat(schedule): create interactive SchedulePage with day filters and class booking"`
