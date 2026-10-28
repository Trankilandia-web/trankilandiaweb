### Task 7: Página de Instalaciones y Zonas Deportivas (`FacilitiesPage.tsx`)

**Files:**
- Create: `src/pages/FacilitiesPage.tsx`
- Test: `npm run build`

**Interfaces:**
- Consumes:
  - `FACILITY_ZONES` de `src/data/gymData.ts`
  - Tipo `FacilityZone` de `src/types/index.ts`
- Produces:
  ```typescript
  export interface FacilitiesPageProps {
    onOpenTourModal?: () => void;
  }
  export default function FacilitiesPage(props: FacilitiesPageProps): JSX.Element;
  ```

**Requirements & Exact Design:**
1. Cabecera de Página:
   - Eyebrow mono en ámbar: `ESPACIOS & BIOMECÁNICA DE ÉLITE`.
   - H1 imponente: `1,500 M² DISEÑADOS PARA EL RENDIMIENTO. <span className="text-amber-400">SIN COMPROMISOS.</span>`
   - Subtexto técnico y aspiracional en español.
   - 4 Píldoras de especificaciones: "1,500 m² Totales", "Maquinaria Oficial Hammer Strength & Eleiko", "Recovery Spa & Sauna", "Ambiente Climatizado y Acústico".
2. Showcase de Zonas Deportivas:
   - Mapear las 4 zonas de `FACILITY_ZONES`:
     1. Biomecánica Hammer Strength
     2. Plataformas Olímpicas Eleiko
     3. Turf & Pista Funcional
     4. Recovery Lounge & Sauna
   - Composición editorial elegante (grid de 2 columnas o split balanceado por cada zona):
     - Fotografía de alta fidelidad con `rounded-2xl border border-white/10 overflow-hidden` y badge de categoría en la imagen.
     - Título y descripción de la zona.
     - Bloque de "Especificaciones de Maquinaria / Equipamiento" con icono `Check` en ámbar.
     - Bloque de "Amenidades de la Zona" en badges oscuros con microbordes.
3. Cuadrícula de Amenidades del Club:
   - 4 Tarjetas de amenidades premium:
     - Vestuarios y regaderas de alta presión.
     - Casilleros con cerradura digital inteligente.
     - Estación de hidratación purificada alcalina.
     - Sistema de audio envolvente acústico y WiFi 6.
4. Banner de Conversión Inferior:
   - "¿Quieres sentir la energía de Trankilandia Gym en persona?"
   - Botón `"AGENDAR TOUR VIP PRIVADO →"` (`bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-8 py-4 rounded-xl text-sm sm:text-base tracking-wide inline-flex items-center gap-2 active:scale-[0.98] transition-all`) que invoca `onOpenTourModal`.
5. Verificación:
   - `npm run build` debe compilar exitosamente con 0 errores.
6. Commit:
   - `git add src/pages/FacilitiesPage.tsx && git commit -m "feat(facilities): create FacilitiesPage with zone gallery and machine specs"`
