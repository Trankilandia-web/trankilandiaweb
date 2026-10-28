### Task 4: Refactorización de `Hero.tsx` y Creación de `HomePage.tsx`

**Files:**
- Modify: `src/components/Hero.tsx`
- Create: `src/pages/HomePage.tsx`
- Test: `npm run build`

**Interfaces:**
- Produces:
  ```typescript
  export interface HeroProps {
    onOpenTourModal?: () => void;
  }
  export default function Hero(props: HeroProps): JSX.Element;

  export interface HomePageProps {
    onOpenTourModal?: () => void;
  }
  export default function HomePage(props: HomePageProps): JSX.Element;
  ```

**Requirements & Exact Design:**
1. `src/components/Hero.tsx`:
   - Eliminar por completo el botón "Ver Video".
   - Importar `Link` de `react-router-dom`.
   - Botón Primario: `"AGENDAR TOUR VIP"` con icono `ArrowRight`, `type="button"`, `onClick={props.onOpenTourModal}`.
     - Clase: `inline-flex items-center justify-center gap-3 bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-8 py-4 rounded-xl text-sm sm:text-base tracking-wide active:scale-[0.98] transition-all duration-200 shadow-xl shadow-amber-400/20 hover:shadow-amber-400/30 group whitespace-nowrap`.
   - Botón Secundario: `<Link to="/instalaciones">` con texto `"CONOCER INSTALACIONES"` e icono `Building2` o `Eye` de Lucide.
     - Clase: `inline-flex items-center justify-center gap-3 bg-white/10 hover:bg-white/15 text-white border border-white/15 hover:border-white/30 backdrop-blur-md font-semibold px-8 py-4 rounded-xl text-sm sm:text-base tracking-wide active:scale-[0.98] transition-all duration-200 group whitespace-nowrap`.
   - Mantener intacto el resto del Hero (`min-h-[100dvh]`, fondo de atleta, titular de 2 líneas, subtexto < 20 palabras y `<FeatureBar />`).
2. `src/pages/HomePage.tsx`:
   - Integrar en orden vertical:
     1. `<Hero onOpenTourModal={props.onOpenTourModal} />`
     2. `<ProgramsSection />` con botón de llamada hacia `/clases` para ver horarios completos.
     3. `<AboutSection />` con botón hacia `/instalaciones`.
     4. **Sección Teaser de Membresías (`MembershipTeaser`):**
        - Fondo `bg-zinc-950 py-20 border-t border-white/5`.
        - Eyebrow `MEMBRESÍAS TRANKILANDIA` en ámbar mono.
        - Titular: `"ENCUENTRA EL PLAN IDEAL PARA TUS METAS"`.
        - 3 Tarjetas resumen (Silver $890, Gold $1,450 [destacada], Black $2,200) mostrando precios y 3 puntos clave.
        - Botón CTA central hacia `/planes`: `"VER TODOS LOS PLANES & COMPARATIVA COMPLETA →"` (`bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-8 py-4 rounded-xl text-sm sm:text-base tracking-wide inline-flex items-center gap-2 active:scale-[0.98] transition-all`).
     5. `<QuickInfoBar />`
3. Verificación:
   - `npm run build` debe compilar exitosamente sin errores.
4. Commit:
   - `git add src/components/Hero.tsx src/pages/HomePage.tsx && git commit -m "feat(home): refactor Hero actions and create comprehensive HomePage"`
