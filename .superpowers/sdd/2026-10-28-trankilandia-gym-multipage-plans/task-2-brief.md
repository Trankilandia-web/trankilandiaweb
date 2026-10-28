### Task 2: Componente Modal "Tour VIP & Pase de Cortesía" (`TourModal.tsx`)

**Files:**
- Create: `src/components/TourModal.tsx`
- Test: `npm run build`

**Interfaces:**
- Produces:
  ```typescript
  export interface TourModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialPlan?: string;
  }
  export default function TourModal(props: TourModalProps): JSX.Element | null;
  ```

**Requirements & Exact Design:**
1. Renderizado condicional: si `!isOpen`, retornar `null`.
2. Overlay y backdrop:
   - `fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md`
   - Bloqueo de scroll en `document.body` mientras esté abierto y liberación al desmontar/cerrar.
   - Cierre al presionar la tecla `Escape` o hacer clic en el backdrop.
3. Tarjeta del modal:
   - `relative w-full max-w-xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto`
   - Botón de cierre `X` en la esquina superior derecha (`p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors`).
4. Flujo de 2 Estados:
   - **Estado 1: Formulario de Registro:**
     - Cabecera con isotipo `Dumbbell` en badge ámbar `#FACC15` y titular: `"AGENDA TU TOUR VIP & PASE DE 1 DÍA"`.
     - Subtítulo descriptivo en español (*"Acceso libre de cortesía a todas las instalaciones por 24 horas y recorrido guiado con un coach certificado."*).
     - Selector de turno en 3 pills interactivos: `Mañana (06:00 - 12:00)`, `Tarde (12:00 - 18:00)`, `Noche (18:00 - 22:00)`.
     - Selector de fecha (por defecto fecha de hoy/mañana).
     - Campos de entrada:
       - Nombre completo (`placeholder="Ej. Carlos Mendoza"`, requerido)
       - WhatsApp / Teléfono (`placeholder="Ej. +52 55 1234 5678"`, requerido)
       - Correo electrónico (`placeholder="carlos@ejemplo.com"`, requerido)
       - Objetivo principal (`select` con opciones: Fuerza & Musculación, Pérdida de Grasa & HIIT, Rendimiento Funcional, Salud & Movilidad).
     - Botón de envío: `"CONFIRMAR PASE DE CORTESÍA →"` (`bg-amber-400 hover:bg-amber-300 text-black font-extrabold py-3.5 rounded-xl text-sm uppercase tracking-wider w-full active:scale-[0.98] transition-all`).
   - **Estado 2: Pase VIP Confirmado (Ticket Digital):**
     - Icono de check verde/ámbar animado.
     - Tarjeta con formato de boleto VIP:
       - Código de pase en `font-mono text-2xl font-black text-amber-400 tracking-widest` (ej. `TRK-VIP-${random}`).
       - Nombre del invitado y turno confirmado.
       - Guía de qué traer: Ropa deportiva, toalla, identificación oficial.
     - Botón `"ENTENDIDO, NOS VEMOS EN EL CLUB"` para cerrar el modal y restablecer el formulario.
5. Reglas de Accesibilidad y Taste:
   - Paleta estrictamente respetada (acento único ámbar `#FACC15`, texto negro puro en botón ámbar).
   - Atributos `aria-modal="true"`, `role="dialog"`, `aria-labelledby`.
6. Verificación:
   - `npm run build` debe compilar exitosamente con 0 errores.
7. Commit:
   - `git add src/components/TourModal.tsx && git commit -m "feat(modal): create interactive VIP Tour and Day Pass modal"`
