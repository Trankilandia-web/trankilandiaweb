# Diseño: Simplificación de Pestañas del Portal del Cliente

- **Fecha:** 2026-11-23
- **Estado:** Propuesto para revisión
- **Objetivo:** Reducir la sobrecarga cognitiva y el desbordamiento horizontal en el Portal del Cliente (`ClientePortal.tsx`), consolidando las 6 opciones actuales en 4 pestañas limpias, ergonómicas y bien organizadas.

---

## 1. Contexto y Diagnóstico

Actualmente, la barra de navegación del cliente cuenta con 6 pestañas independientes:
1. `Mi Carnet`
2. `Mi Rutina`
3. `Mi Evolución`
4. `Mi Membresía`
5. `Mis Datos`
6. `Seguridad`

### Problemas identificados:
- **Sobrecarga visual y cognitiva:** 6 botones horizontales saturan la vista, especialmente en celulares y pantallas medianas, obligando al usuario a deslizar horizontalmente o comprimiendo los textos.
- **Fragmentación de la información de cuenta:** "Mis Datos" y "Seguridad" son aspectos de la misma entidad (el perfil del socio). Separarlos en 2 pestañas principales dispersa las configuraciones de usuario.
- **Separación innecesaria de Carnet y Membresía:** El carnet digital de ingreso y el estado del plan/vencimiento son complementarios. Un socio que consulta su carnet de acceso típicamente quiere ver al mismo tiempo la vigencia de su plan y sus marcas.

---

## 2. Solución de 4 Pestañas

Consolidamos el portal en **4 pestañas esenciales**:

```
[ 💳 Mi Carnet ]   [ 🔥 Mi Rutina ]   [ 📈 Mi Evolución ]   [ 👤 Mi Perfil ]
```

### Detalle de cada Pestaña:

### 1. 💳 Mi Carnet (`carnet`)
- **Pase Digital Estilo Apple Wallet:** Código QR / Código de barras 1D de acceso, logo oficial, estado ("SOCIO AL DÍA" / "CON ADELANTO" / "POR ACTIVAR"), descarga de carnet en PNG y botón para ver boleta térmica.
- **Horario y Coach:** Turno oficial (Mañana / Tarde / Noche) y Entrenador en sala asignado.
- **Detalle de Membresía Integrado:** Estado del plan, fecha de vencimiento, saldo pendiente, botón "Renovar o Cambiar Plan", y enlace directo a WhatsApp de recepción.
- **Marcas Personales (PRs):** Peso corporal, press de banca, sentadilla y peso muerto.

### 2. 🔥 Mi Rutina (`rutina`)
- Rutina semanal estructurada por días (Lunes a Sábado).
- Lista de ejercicios con series, repeticiones, descansos y notas técnicas del coach.
- Indicador de estado si la membresía está inactiva/bloqueada.

### 3. 📈 Mi Evolución (`evolucion`)
- Módulo completo de Bioimpedancia de 8 electrodos (`EvolucionCorporalView`).
- FitScore / 100 PTS con badge dinámico y mensaje motivacional.
- Story Card descargable/compartible.
- Métricas corporales (grasa, músculo, agua, masa ósea, etc.) e historial con gráficos.

### 4. 👤 Mi Perfil (`perfil`)
Unifica en una interfaz elegante con sub-selector tipo pill:
- **Sub-pestaña A: Mis Datos Personales**
  - DNI / Documento oficial (protegido/bloqueado por auditoría).
  - Correo electrónico (protegido si ya está asignado).
  - Nombre completo, teléfono WhatsApp, edad, género y notas/contacto de emergencia.
  - Botón "Guardar Cambios".
- **Sub-pestaña B: Seguridad & Acceso**
  - Cambio y actualización de contraseña (DNI inicial o clave personalizada).
  - Estado de cuenta Google vinculada (con botón de desvincular si aplica).
  - Historial de accesos y sesiones recientes.

---

## 3. Compatibilidad con Enlaces y Parámetros URL

Para garantizar compatibilidad hacia atrás con enlaces existentes (como el menú desplegable `UserProfileDropdown.tsx`):
- `?tab=carnet` o sin parámetro: abre la pestaña `Mi Carnet`.
- `?tab=membresia`: abre `Mi Carnet` y posiciona el foco en la sección de membresía.
- `?tab=rutina`: abre `Mi Rutina`.
- `?tab=evolucion`: abre `Mi Evolución`.
- `?tab=perfil`: abre `Mi Perfil` con la sub-pestaña de datos activos.
- `?tab=seguridad`: abre `Mi Perfil` con la sub-pestaña de seguridad y cambio de contraseña activa directamente.

---

## 4. Diseño Visual y Ergonomía UI/UX

- **Diseño Móvil Primero:** Con 4 pestañas, cada botón tiene suficiente ancho táctil (mínimo 44px de altura) y no requiere scroll horizontal apretado.
- **Indicador Activo:** Fondo amarillo ámbar (`bg-amber-400 text-black shadow-md font-bold`) para la pestaña activa, y texto zinc neutro con efecto hover para las inactivas.
- **Sub-pestañas en Mi Perfil:** Selector secundario estilizado con pills (`bg-zinc-950 p-1 rounded-xl border border-white/10`) para alternar limpiamente entre "Datos Personales" y "Seguridad".

---

## 5. Plan de Verificación

1. **Compilación TypeScript:** Ejecutar `npm run build` sin errores tipográficos ni warnings.
2. **Pruebas Automatizadas:** Ejecutar suite completa `npx vitest run` asegurando 100% de tests passing.
3. **Comportamiento Interactivo:**
   - Verificar navegación entre las 4 pestañas.
   - Probar selector interno de "Datos Personales" y "Seguridad" en "Mi Perfil".
   - Probar que `?tab=seguridad` abre directamente el formulario de contraseña en "Mi Perfil".
   - Probar que el Carnet incluye los datos del pase y el resumen del plan sin pérdida de funcionalidad.
