### Task 3: Actualización del `Navbar` con Rutas Reales y Estado Activo

**Files:**
- Modify: `src/components/Navbar.tsx`
- Test: `npm run build`

**Interfaces:**
- Consumes: `Link`, `useLocation` de `react-router-dom`
- Produces:
  ```typescript
  export interface NavbarProps {
    onOpenTourModal?: () => void;
  }
  export default function Navbar(props: NavbarProps): JSX.Element;
  ```

**Requirements & Exact Design:**
1. Importar `Link` y `useLocation` de `react-router-dom`.
2. Definir enlaces de navegación multipágina:
   ```typescript
   const NAV_LINKS = [
     { label: 'Inicio', href: '/' },
     { label: 'Planes & Membresías', href: '/planes' },
     { label: 'Horarios & Clases', href: '/clases' },
     { label: 'Instalaciones', href: '/instalaciones' },
   ];
   ```
3. Estado activo:
   - Comparar `location.pathname === link.href`.
   - Activo: `text-amber-400 font-bold border-b-2 border-amber-400 pb-0.5`.
   - Inactivo: `text-zinc-300 hover:text-amber-400 transition-colors duration-200`.
4. Logo:
   - Debe ser un `<Link to="/" onClick={closeMenu}>` para regresar al inicio sin recarga.
5. Botón CTA:
   - Texto: `"PASE DE CORTESÍA"` (o `"TOUR VIP"`).
   - `type="button"`, al hacer clic invoca `props.onOpenTourModal?.()`.
   - Estilo: `bg-amber-400 hover:bg-amber-300 text-black font-extrabold px-5 py-2.5 rounded-xl text-sm whitespace-nowrap active:scale-[0.98] shadow-lg shadow-amber-400/10 transition-all duration-200`.
6. Menú móvil:
   - Usar `<Link to={link.href} onClick={closeMenu}>`.
   - Resaltar enlace activo con badge/borde ámbar.
   - Botón CTA móvil que ejecuta `props.onOpenTourModal?.()` y cierra el drawer.
7. Verificación:
   - `npm run build` debe compilar exitosamente sin errores.
8. Commit:
   - `git add src/components/Navbar.tsx && git commit -m "feat(nav): update Navbar with client routing and tour modal trigger"`
