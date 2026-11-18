# Especificación de Diseño: Caja Unificada, Auditoría de Movimientos del Día y Ordenamiento Inteligente de Socios

**Fecha:** 2026-11-17  
**Estado:** Aprobado para Planificación  
**Autor:** Antigravity AI Assistant & Equipo Trankilandia Gym  

---

## 1. Contexto y Problema

1. **Gestión de Socios en Recepción / Caja (`/caja`):**
   - Actualmente, en la pestaña de CRM / Gestión de Socios de Recepción (`HubReceptionSimple.tsx`), los socios se listan por defecto en orden de ID ascendente (`MEM-001`, `MEM-002`, ...), lo que relega a los socios recién inscritos o recién renovados (como Jesús Anaya `MEM-676` o Brigit Quispe `MEM-188`) al fondo de la lista o fuera de los primeros registros visibles.
   - El personal de recepción no dispone de filtros rápidos para ordenar por "Último Inscrito / Renovado", "Alfabético", "Próximo a Vencer" o "Con Deuda".

2. **Informe Económico y Cuadre de Caja en Panel Admin (`/admin`):**
   - La información financiera del día no estaba centralizada ni visible de inmediato.
   - No había una vista única donde el administrador pudiera ver en un solo lugar **todos los movimientos del día** (inscripciones, renovaciones, pagos de cuotas/deudas y ventas de mostrador POS de bebidas/suplementos).
   - Para auditar el turno de un encargado se requiere un reporte consolidado que indique con claridad meridiana:
     - **Efectivo en Caja Física:** Dinero exacto que debe entregar el encargado en el cajón.
     - **Billeteras Digitales:** Conciliación bancaria exacta (Yape, Plin, Tarjeta).
     - **Ventas de Productos POS:** Desglose de qué productos se vendieron en el turno.
     - **Flujo de Asientos Cronológicos:** Historial detallado minuto a minuto de cada cobro efectuado en el día.

---

## 2. Objetivos y Criterios de Aceptación

### A. Gestión de Socios en Recepción (`HubReceptionSimple.tsx`)
1. **Orden Predeterminado:** "Último Inscrito o Renovado Primero". Al abrir la pestaña de CRM/Socios o al registrar/renovar a un socio, este debe posicionarse inmediatamente en la parte superior.
2. **Selector de Ordenamiento:** Permitir al usuario alternar entre:
   - `recientes`: Más reciente (Inscrito / Renovado) — **Predeterminado**.
   - `alfabetico`: Nombre (A - Z).
   - `por_vencer`: Más próximos a vencer (orden cronológico de fecha de expiración).
   - `vencidos`: Vencidos primero.
   - `deuda`: Mayor saldo pendiente primero.
3. **Padrón en Admin (`AdminDashboard.tsx`):**
   - Mejorar el criterio de ordenamiento "Recientes" en el padrón de clientes para que priorice socios con inscripciones o renovaciones recientes (`updated_at` / `fecha_inicio` / `registeredAt`) y no únicamente el número estático de matrícula.

### B. Panel Administrador Centralizado (`AdminDashboard.tsx`)
1. **Pestaña Principal Destacada:**
   - La primera pestaña al iniciar sesión como Admin será **"Caja & Movimientos del Día"** (icono de billetera/caja, activa por defecto).
   - Filtro de fecha con selector directo: **Hoy (Predeterminado)**, Ayer, Últimos 7 Días, Mes Actual.
2. **Tarjetas de Cuadre de Arqueo (En Tiempo Real):**
   - 💵 **Total Efectivo en Caja:** Suma de membresías + productos cobrados en efectivo físico.
   - 📱 **Total Digitales (Yape / Plin / Tarjeta):** Suma desglosada para cuadre de cuentas.
   - 🏋️‍♂️ **Ingresos por Membresías:** Total recaudado y conteo de inscripciones/renovaciones.
   - 🥤 **Ventas POS (Mostrador):** Total recaudado en bebidas/suplementos y conteo de tickets.
   - 💰 **Total Recaudado en el Día:** Gran total consolidado.
3. **Auditoría de Productos Vendidos en el Turno:**
   - Visualización directa del ranking de productos vendidos (unidades vendidas, precio unitario, subtotal recaudado).
4. **Feed Centralizado de Todos los Movimientos del Día:**
   - Tabla cronológica ordenada de más reciente a más antiguo con las siguientes columnas:
     - `Hora`: Formato 12h (ej: 04:15 p. m.) en zona horaria Perú (`America/Lima`).
     - `Operación`: Badge distintivo (Membresía Nueva, Renovación, Abono Deuda, Venta POS).
     - `Cliente`: Nombre y DNI del socio o "Cliente Mostrador".
     - `Detalle / Concepto`: Plan adquirido o detalle del ticket (ej: "Plan 1 Mes - Mañana", "Ticket POS-1024: 2x Sporade, 1x Monster").
     - `Método de Pago`: Badge visual (Efectivo en verde, Yape en morado, Plin en celeste, Tarjeta en azul).
     - `Encargado`: Operador que registró la transacción (ej. "Recepción", "Admin").
     - `Monto`: En soles (S/.).
   - Buscador rápido por texto y filtros por Método de Pago y Tipo de Operación.
   - Botón de actualización manual y soporte para sincronización en tiempo real vía eventos de Supabase.

---

## 3. Arquitectura y Capa de Datos (`src/lib/supabaseDb.ts`)

### Nueva Función Centralizada: `obtenerReporteCajaMovimientos`
```typescript
export interface MovimientoCaja {
  id: string;
  fechaHora: string; // ISO
  horaFormateada: string; // "04:30 p. m."
  tipo: 'membresia_nueva' | 'renovacion' | 'abono_deuda' | 'venta_pos';
  tipoEtiqueta: string;
  clienteNombre: string;
  clienteDni?: string;
  concepto: string;
  metodoPago: 'efectivo' | 'yape' | 'plin' | 'tarjeta';
  monto: number;
  operador: string;
  ticketOBoleta?: string;
}

export interface ReporteCajaDiario {
  fechaInicio: string;
  fechaFin: string;
  totalRecaudado: number;
  totalEfectivo: number;
  totalYape: number;
  totalPlin: number;
  totalTarjeta: number;
  totalMembresias: number;
  conteoMembresias: number;
  totalVentasPOS: number;
  conteoVentasPOS: number;
  movimientos: MovimientoCaja[];
  resumenProductos: ResumenProductoVendido[];
}
```

#### Reglas de Agregación:
1. **Ingresos de Membresías y Abonos (`ingresos`):**
   - Se consultan de la tabla `ingresos` filtrando por el rango de fechas (`created_at >= inicio AND created_at <= fin`).
   - Se vincula el `key_socio` con la tabla `socios` para obtener nombre y DNI del cliente.
   - Se clasifica el tipo: si la observación o tipo menciona "Renovación", es `renovacion`; si menciona "Adelanto" o "Abono", es `abono_deuda`; si no, es `membresia_nueva`.
2. **Ventas POS Mostrador:**
   - Se consultan desde la tabla `ventas_pos` y `items_venta_pos` en Supabase.
   - Si no hay conexión o se registraron ventas en cola offline (`trankilandia_ventas_offline`), se combinan y deduplican por número de ticket.
3. **Cálculo de Cuadre de Caja:**
   - `totalEfectivo` = Suma de movimientos donde `metodoPago === 'efectivo'`.
   - `totalYape` = Suma de movimientos donde `metodoPago === 'yape'`.
   - `totalPlin` = Suma de movimientos donde `metodoPago === 'plin'`.
   - `totalTarjeta` = Suma de movimientos donde `metodoPago === 'tarjeta'`.
   - `totalRecaudado` = `totalEfectivo + totalYape + totalPlin + totalTarjeta`.

---

## 4. Diseño de la Interfaz de Usuario

### 4.1. Panel Caja (`HubReceptionSimple.tsx` - Pestaña CRM)
- Encabezado con barra de herramientas:
  - Buscador de socios (Nombre, DNI, Celular).
  - Selector de Filtros de Estado: `Todos`, `Vencidos`, `Por Vencer 7 Días`, `Con Saldo Pendiente`.
  - **Nuevo Selector de Orden:**
    - `Más Reciente (Inscrito/Renovado)` (Predeterminado).
    - `Nombre (A - Z)`.
    - `Próximo a Vencer`.
    - `Vencidos Primero`.
    - `Mayor Saldo Pendiente`.
- Actualización reactiva: cuando se complete una renovación o inscripción en recepción, el estado local del socio actualiza su timestamp para que se mantenga en la cima de la lista.

### 4.2. Panel Admin (`AdminDashboard.tsx`)
- Barra de pestañas:
  1. 💵 **Caja & Movimientos del Día** (`caja_dia`) — *Nueva pestaña inicial*
  2. 👥 **Padrón de Socios** (`padron`)
  3. 📊 **Métricas Globales** (`kpis`)
  4. 🏷️ **Planes & Tarifas** (`planes`)
  5. 📦 **Inventario POS** (`inventario`)
  6. 🛡️ **Personal & Turnos** (`personal`)
- Contenido de la Pestaña "Caja & Movimientos del Día":
  - Selector de período rápido: Hoy (por defecto) | Ayer | Últimos 7 Días | Mes Actual.
  - Grid de 5 KPIs financieros de alto impacto con colores contrastantes para arqueo rápido.
  - Sección expandible/colapsable: **Auditoría de Productos POS** (ranking de artículos vendidos).
  - Sección principal: **Registro Central de Movimientos del Día**:
    - Barra de búsqueda y filtros rápidos por método de pago.
    - Tabla responsiva con bordes nítidos, badges legibles y tipografía mono para montos y horas.
    - Indicador de última hora de sincronización y botón para recargar al instante.

---

## 5. Plan de Pruebas y Validación

1. **Pruebas Unitarias (`vitest`):**
   - Validar que `obtenerReporteCajaMovimientos` agrupa correctamente ingresos de membresías, abonos y ventas POS tanto en memoria como con datos de Supabase.
   - Validar que el ordenamiento de socios en recepción coloca a los recién inscritos o renovados en la posición 0 por defecto.
   - Validar que el selector de orden alterna correctamente entre alfabético, deudas y vencimientos.
2. **Pruebas de Componentes React:**
   - Renderizado limpio de la pestaña "Caja & Movimientos del Día" en `AdminDashboard.tsx`.
   - Renderizado limpio del selector de orden en `HubReceptionSimple.tsx`.
3. **Construcción y Verificación de Compilación:**
   - Verificación TypeScript estricta (`npm run build`).
   - Generación del paquete Electron actualizado (`npm run electron:build`).

---

## 6. Manejo de Errores y Casos Borde

- **Modo Offline:** Si la red se desconecta en el gimnasio, el arqueo de caja lee de la memoria local y de la cola de ventas offline para que el encargado pueda cuadrar su turno sin fallos.
- **Socios sin fecha de actualización explícita:** Si un socio antiguo no tiene `updated_at`, se usa el valor numérico descendente de su ID o `created_at` como fallback.
- **Monto cero:** Las transacciones con monto S/ 0 (pases de cortesía o registros sin cobro) se etiquetan adecuadamente sin alterar las sumas contables de caja.
