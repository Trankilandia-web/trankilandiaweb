# Diseño: Mejoras de UX en Padrón de Clientes y Auditoría de Ventas POS en Panel Administrador

**Fecha:** 2026-11-17  
**Estado:** Aprobado para Planificación  
**Componente Principal:** `src/pages/portal/AdminDashboard.tsx`, `src/lib/supabaseDb.ts`

---

## 1. Problema y Objetivos

### 1.1 Problemas Actuales
1. **Padrón de Clientes Incompleto en Pantalla:**
   - En resoluciones de recepción o laptops (1366x768), la tabla del padrón de 8 columnas se desborda y corta la columna de acciones (Editar, Gestionar, Eliminar) o aplasta los datos.
2. **Buscador Complicado y Reducido:**
   - La caja de texto actual es estrecha (`max-w-md`), con padding mínimo (`py-2 text-xs`) y difícil de cliquear. No tiene botón para limpiar el texto en 1 clic.
3. **Falta de Auditoría de Ventas POS en Economía:**
   - Cuando se queda un encargado o se cierra turno, el administrador solo ve una cifra agregada general (`POS: S/. 150`), sin saber qué productos se vendieron, a qué hora, cuántas unidades, qué método de pago se usó ni quién atendió.

### 1.2 Objetivos
- Rediseñar el buscador del padrón para que sea amplio, ergonómico, con botón `X` de limpieza instantánea y foco inmediato.
- Garantizar que la tabla del padrón se vea completa al 100%, con ancho mínimo garantizado (`min-w-[1050px]`) y columna de **Acciones adhesiva (sticky)** a la derecha para que los botones nunca se pierdan al hacer scroll horizontal.
- Integrar en la pestaña **Economía / Arqueo** el nuevo módulo de **Auditoría Detallada de Ventas POS del Día / Periodo**:
  - Resumen consolidado por producto (Producto, Unidades vendidas, Monto total recaudado).
  - Libro cronológico de operaciones/tickets (Hora, N° Ticket, Productos vendidos, Encargado/Operador, Método de pago, Total).
  - Selector de fecha sincronizado con el periodo seleccionado (Hoy, 7 Días, Mes, etc.).

---

## 2. Arquitectura de Datos e Integración

### 2.1 Backend / Supabase (`src/lib/supabaseDb.ts`)
Crear la función `obtenerAuditoriaVentasPOS(fechaInicio?: string, fechaFin?: string)`:
- Consulta la tabla `public.ventas` con join a `public.venta_items` (o tabla `public.ingresos` con tipo `'Venta POS Productos'`).
- Si Supabase está en modo offline o fallback, complementa con las ventas almacenadas en `LOCAL_OFFLINE_SALES_KEY` (`trankilandia_ventas_offline`).
- Retorna:
  ```ts
  export interface AuditoriaVentaItem {
    id: string | number;
    numeroTicket: string;
    fecha: string;
    hora: string;
    clienteNombre: string;
    clienteDni?: string;
    metodoPago: string;
    total: number;
    items: {
      nombreProducto: string;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
    }[];
  }

  export interface ResumenVentasPorProducto {
    productoId: string;
    nombre: string;
    cantidadTotal: number;
    totalRecaudado: number;
  }

  export interface AuditoriaVentasPOSResponse {
    ventas: AuditoriaVentaItem[];
    resumenPorProducto: ResumenVentasPorProducto[];
    totalVendido: number;
    totalUnidades: number;
  }
  ```

### 2.2 Padrón de Clientes en `AdminDashboard.tsx`
- **Barra de Búsqueda de Alto Contraste:**
  - Área de clic amplia con padding `py-3 px-4 text-sm`.
  - Icono de búsqueda visualmente claro.
  - Botón de limpieza rápida `X` cuando hay texto escrito.
  - Indicador visual del número de coincidencias instantáneo.
- **Tabla con Columna de Acciones Adhesiva (`sticky right-0`):**
  - Contenedor con `overflow-x-auto` y tabla con `min-w-[1050px]`.
  - Columna de Acciones con fondo oscuro sólido (`bg-zinc-950` / `bg-zinc-900`) y sombra lateral suave, de modo que al navegar por los socios, los botones de *Editar Ficha* y *Acciones* siempre permanezcan visibles en pantalla.
  - Ajuste de anchos fijos proporcionales para DNI, Rol, Turno, Coach y Plan.

### 2.3 Módulo de Auditoría POS en Pestaña Economía (`AdminDashboard.tsx`)
Debajo del desglose por método de pago en `activeTab === 'kpis'`, se agrega la tarjeta de **Auditoría de Ventas POS y Control de Caja**:
1. **Encabezado con métricas clave del periodo:**
   - Total Ventas POS (S/.)
   - Unidades Totales Vendidas
   - Total de Tickets Emitidos
2. **Pestaña dual o vista dividida:**
   - **Vista 1: Ranking de Productos Vendidos:** Lista ordenada por cantidad vendida con barra de porcentaje visual.
   - **Vista 2: Registro de Tickets del Turno:** Tabla detallada con desglose de productos por ticket, hora exacta, método de pago y cliente/encargado.
3. **Estado vacío elegante:** Si en el periodo no hubo ventas POS, muestra un mensaje informativo claro con icono de inventario.

---

## 3. Plan de Verificación y Testing
- Unit tests para `obtenerAuditoriaVentasPOS` comprobando agregación correcta de totales por producto y tickets.
- Verificación de renderizado en `AdminDashboard.tsx` sin desbordes ni errores de TypeScript (`npm run build`).
- Pruebas de suite completa (`npm run test`).
