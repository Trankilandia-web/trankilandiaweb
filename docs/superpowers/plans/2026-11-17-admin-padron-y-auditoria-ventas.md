# Plan de Implementación: Mejoras de UX en Padrón de Clientes y Auditoría de Ventas POS

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la experiencia de búsqueda y visualización del Padrón de Clientes e integrar un módulo completo de Auditoría de Ventas POS en la pestaña de Arqueo/Economía del Panel Administrador.

**Architecture:** Servicio centralizado `obtenerAuditoriaVentasPOS` en `supabaseDb.ts` que recopila ventas en línea de Supabase (`ventas`, `venta_items`) y ventas locales de contingencia (`trankilandia_ventas_offline`). En `AdminDashboard.tsx`, rediseño del buscador con área expandida y botón `X`, tabla de padrón con columna de acciones adhesiva (`sticky right-0`), y nuevo módulo de auditoría de ventas de productos con doble vista (Ranking por Producto y Registro Detallado de Tickets para cuadre de encargados).

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Vitest, Supabase.

---

### Task 1: Servicio `obtenerAuditoriaVentasPOS` y Pruebas Unitarias

**Files:**
- Create: `src/tests/unit/posSalesAudit.test.ts`
- Modify: `src/lib/supabaseDb.ts`

**Interfaces:**
- Produces:
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

  export async function obtenerAuditoriaVentasPOS(
    fechaInicio?: string,
    fechaFin?: string
  ): Promise<AuditoriaVentasPOSResponse>;
  ```

- [ ] **Step 1: Escribir prueba unitaria inicial en `src/tests/unit/posSalesAudit.test.ts`**
  - Validar que calcula correctamente `totalVendido` y `totalUnidades`.
  - Validar que agrupa correctamente los productos en `resumenPorProducto`.
  - Validar que incluye ventas offline de `LOCAL_OFFLINE_SALES_KEY`.

- [ ] **Step 2: Ejecutar vitest para confirmar falla inicial**
  `npx vitest run src/tests/unit/posSalesAudit.test.ts`

- [ ] **Step 3: Implementar `obtenerAuditoriaVentasPOS` en `src/lib/supabaseDb.ts`**
  - Consultar `public.ventas` con join a `public.venta_items` ordenados por `created_at desc`.
  - Si Supabase responde error o está vacío, consultar `LOCAL_OFFLINE_SALES_KEY` como respaldo.
  - Normalizar formato de fecha y hora local de Perú.
  - Calcular ranking de productos y devolver `AuditoriaVentasPOSResponse`.

- [ ] **Step 4: Ejecutar vitest y verificar que la prueba pase al 100%**
  `npx vitest run src/tests/unit/posSalesAudit.test.ts`

- [ ] **Step 5: Commit Task 1**
  ```bash
  git add src/lib/supabaseDb.ts src/tests/unit/posSalesAudit.test.ts
  git commit -m "feat(audit): implement obtenerAuditoriaVentasPOS with grouping and tests"
  ```

---

### Task 2: Rediseño Ergonómico del Padrón de Clientes en `AdminDashboard.tsx`

**Files:**
- Modify: `src/pages/portal/AdminDashboard.tsx` (sección `activeTab === 'padron'`)

**Interfaces:**
- Utiliza: `members`, `searchTerm`, `setSearchTerm`, `filteredMembers`.

- [ ] **Step 1: Rediseñar la barra de búsqueda y filtros**
  - Aumentar tamaño de input a `py-3 px-4 text-sm`, expandir ancho para evitar clics fallidos.
  - Agregar botón de limpieza instantánea `X` visible únicamente cuando `searchTerm.length > 0`.
  - Añadir contador claro de resultados: `"X coincidencias"`.

- [ ] **Step 2: Ajustar tabla de Padrón para visualización completa**
  - Establecer contenedor con scroll horizontal fluido y ancho mínimo `min-w-[1100px]`.
  - Convertir la columna `Acciones` en columna adhesiva (`sticky right-0 bg-zinc-950 z-10 shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.6)]`) tanto en `thead` como en cada celda `td`.
  - Fijar anchos proporcionales para evitar desbordes o textos aplastados.

- [ ] **Step 3: Compilar y verificar que no haya errores de TypeScript**
  `npm run build`

- [ ] **Step 4: Commit Task 2**
  ```bash
  git add src/pages/portal/AdminDashboard.tsx
  git commit -m "feat(admin): enhance padron search ergonomics and sticky actions column"
  ```

---

### Task 3: Módulo de Auditoría de Ventas POS en Economía / Arqueo

**Files:**
- Modify: `src/pages/portal/AdminDashboard.tsx` (sección `activeTab === 'kpis'`)

**Interfaces:**
- Consume: `obtenerAuditoriaVentasPOS` de `../../lib/supabaseDb`.

- [ ] **Step 1: Agregar estado y carga de auditoría POS en `AdminDashboard.tsx`**
  - `const [auditoriaPOS, setAuditoriaPOS] = useState<AuditoriaVentasPOSResponse | null>(null);`
  - `const [isLoadingAuditoria, setIsLoadingAuditoria] = useState(false);`
  - `const [vistaAuditoria, setVistaAuditoria] = useState<'ranking' | 'tickets'>('ranking');`
  - Disparar `cargarAuditoriaPOS(dateRange)` cada vez que cambie `dateRange` o al hacer clic en recalcular métricas.

- [ ] **Step 2: Renderizar componente de Auditoría de Ventas POS en la pestaña Arqueo**
  - Ubicarlo inmediatamente debajo del desglose de métodos de cobro.
  - Tarjetas de resumen: Total POS S/., Unidades vendidas, N° de tickets.
  - Selector de vista: `[Ranking de Productos Vendidos]` y `[Libro Diario de Tickets del Turno]`.
  - **Ranking de Productos:** Tabla con Barra de porcentaje, Producto, Unidades, Ingreso Total S/., Precio unitario promedio.
  - **Libro de Tickets:** Tabla con Hora, Ticket, Items desglosados, Encargado/Cliente, Método (Efectivo/Yape), Total.
  - Estado vacío amigable cuando no hay ventas en el periodo.

- [ ] **Step 3: Compilar y verificar**
  `npm run build`

- [ ] **Step 4: Commit Task 3**
  ```bash
  git add src/pages/portal/AdminDashboard.tsx
  git commit -m "feat(admin): add POS sales audit and cashier shift tracking to economy tab"
  ```

---

### Task 4: Verificación Integral del Sistema

- [ ] **Step 1: Ejecutar suite completa de pruebas**
  `npm run test`
- [ ] **Step 2: Ejecutar build de producción**
  `npm run build`
- [ ] **Step 3: Commit o Merge de la rama**
