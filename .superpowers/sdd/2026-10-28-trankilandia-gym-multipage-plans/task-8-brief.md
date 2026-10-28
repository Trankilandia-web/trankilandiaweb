### Task 8: Rediseño del `Footer` Corporativo y Ensamblaje en `App.tsx`

**Files:**
- Modify: `src/components/Footer.tsx`
- Create: `src/components/ScrollToTop.tsx`
- Modify: `src/App.tsx`
- Test: `npm run build`

**Interfaces:**
- Produces:
  - `<Footer onOpenTourModal?: () => void />`
  - `<ScrollToTop />`
  - `<App />` con todas las rutas (`/`, `/planes`, `/clases`, `/instalaciones`), control centralizado de `TourModal` y navegación completa.

**Requirements & Exact Design:**
1. `src/components/ScrollToTop.tsx`:
   - Componente que escucha `useLocation().pathname` y ejecuta `window.scrollTo({ top: 0, left: 0, behavior: 'instant' })`.
2. `src/components/Footer.tsx`:
   - Reemplazar el footer anterior por el Footer Corporativo de Lujo:
     - **Barra de Suscripción ("Trankilandia Insider"):**
       - Titular: `"TRANKILANDIA INSIDER"`
       - Subtítulo: *"Invitaciones a masterclasses privadas, planes de nutrición deportiva y novedades de membresías."*
       - Input de correo electrónico con botón de envío `"SUSCRIBIRME →"` (`bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-6 py-3 rounded-xl`).
       - Manejo de estado de suscripción con mensaje de confirmación amigable.
     - **Sitemap en 4 Columnas:**
       - Usar `<Link>` de `react-router-dom`:
         - *Col 1: El Club* (Inicio `/`, Instalaciones `/instalaciones`, Horarios `/clases`, Manifiesto).
         - *Col 2: Disciplinas* (Fuerza & Hipertrofia, HIIT & Cardio, Funcional, Yoga & Movilidad, Ver Horarios `/clases`).
         - *Col 3: Membresías* (Planes & Tarifas `/planes`, Comparativa Técnica `/planes`, Preguntas Frecuentes `/planes`, Solicitar Pase de Cortesía).
         - *Col 4: Concierge & Sedes* (Dirección, Teléfono interactivo `tel:`, Correo `mailto:`, Horarios de apertura).
     - **Sellos de Certificación de Maquinaria:**
       - Insignias sobrias y estilizadas para:
         - `Hammer Strength Official Training Center`
         - `Eleiko Certified Powerlifting & Olympic Facility`
         - `InBody Precision Body Composition Partner`
     - **Member App Download Teaser:**
       - Badges simulados para App Store y Google Play con microbordes y tipografía limpia.
     - **Barra Legal Inferior:**
       - Copyright dinámico `{new Date().getFullYear()} Trankilandia Gym & Fitness Club. Todos los derechos reservados.`
       - Enlaces legales: Aviso de Privacidad, Términos del Servicio, Código de Conducta.
       - Enlaces a redes sociales con hover en ámbar.
3. `src/App.tsx`:
   - Estado para `isTourModalOpen` y `tourInitialPlan`.
   - Renderizar:
     - `<BrowserRouter>`
     - `<ScrollToTop />`
     - `<Navbar onOpenTourModal={() => handleOpenTour()} />`
     - `<main className="flex-1">`
       - `<Routes>`
         - `<Route path="/" element={<HomePage onOpenTourModal={() => handleOpenTour()} />} />`
         - `<Route path="/planes" element={<PlansPage onSelectPlan={(id) => handleOpenTour(id)} onOpenTourModal={() => handleOpenTour()} />} />`
         - `<Route path="/clases" element={<SchedulePage onBookClass={() => handleOpenTour()} onOpenTourModal={() => handleOpenTour()} />} />`
         - `<Route path="/instalaciones" element={<FacilitiesPage onOpenTourModal={() => handleOpenTour()} />} />`
       - `</Routes>`
     - `<Footer onOpenTourModal={() => handleOpenTour()} />`
     - `<TourModal isOpen={isTourModalOpen} onClose={handleCloseTour} initialPlan={tourInitialPlan} />`
4. Verificación:
   - `npm run build` debe compilar exitosamente sin errores.
5. Commit:
   - `git add src/components/Footer.tsx src/components/ScrollToTop.tsx src/App.tsx && git commit -m "feat(app): assemble full multipage platform with elite Footer, ScrollToTop and TourModal"`
