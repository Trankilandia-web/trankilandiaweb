# Plan de Implementación: Caja Unificada, Auditoría de Movimientos del Día y Ordenamiento Inteligente de Socios

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralizar el informe económico en el panel administrador con una pestaña principal ("Caja & Movimientos del Día") que consolide el arqueo de caja (efectivo vs digital), auditoría de ventas de productos y el feed cronológico de todos los movimientos del día, e implementar ordenamiento inteligente en la gestión de socios de recepción y padrón para priorizar a los recién inscritos o renovados por defecto.

**Architecture:** 
1. Capa de datos en `src/lib/supabaseDb.ts`: nueva función `obtenerReporteCajaMovimientos` que agrega en paralelo ingresos de membresías (`ingresos`) y ventas de mostrador (`ventas_pos` y cola offline), produciendo totales por método de pago y un feed cronológico unificado.
2. Capa de interfaz de socios en `HubReceptionSimple.tsx` y `AdminDashboard.tsx`: selector de ordenamiento con algoritmo que calcula la fecha de última acción (renovación / inscripción) para situar a los socios recién renovados o inscritos al inicio.
3. Capa de interfaz administrativa en `AdminDashboard.tsx`: nueva pestaña inicial destacada con selector de período (Hoy por defecto), 5 KPIs de arqueo, ranking de productos POS vendidos y tabla unificada de movimientos con filtros instantáneos.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Supabase Client, Vitest, Happy-DOM, Electron Builder.

## Global Constraints
- No usar `SELECT *` en Supabase; especificar columnas explícitas.
- Formateo de fecha y hora en zona horaria de Perú (`America/Lima`).
- Retrocompatibilidad 100% con modo offline / local storage.
- No romper las 102 pruebas existentes en la suite de Vitest.
- Commits atómicos por tarea.

---

### Task 1: Capa de Datos — `obtenerReporteCajaMovimientos` en `src/lib/supabaseDb.ts`

**Files:**
- Modify: `src/lib/supabaseDb.ts`
- Test: `src/tests/unit/cajaMovimientos.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface MovimientoCaja {
    id: string;
    fechaHora: string; // ISO string
    horaFormateada: string; // ej: "04:30 p. m."
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

  export async function obtenerReporteCajaMovimientos(
    fechaInicioISO?: string,
    fechaFinISO?: string
  ): Promise<ReporteCajaDiario>;
  ```

- [ ] **Step 1: Escribir la prueba unitaria fallida**

Crear `src/tests/unit/cajaMovimientos.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { obtenerReporteCajaMovimientos } from '../../lib/supabaseDb';

describe('Pruebas Unitarias · Reporte de Caja y Movimientos Unificados', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('retorna reporte con totales en cero y array de movimientos vacío cuando no hay transacciones', async () => {
    const reporte = await obtenerReporteCajaMovimientos('2026-11-17T00:00:00Z', '2026-11-17T23:59:59Z');
    expect(reporte).toBeDefined();
    expect(reporte.totalRecaudado).toBe(0);
    expect(reporte.totalEfectivo).toBe(0);
    expect(reporte.totalYape).toBe(0);
    expect(reporte.totalPlin).toBe(0);
    expect(reporte.totalTarjeta).toBe(0);
    expect(Array.isArray(reporte.movimientos)).toBe(true);
    expect(Array.isArray(reporte.resumenProductos)).toBe(true);
  });

  it('consolida ventas de cola offline e ingresos locales calculando arqueo exacto por método de pago', async () => {
    const fakeOfflineSale = [
      {
        id: 'sale-offline-1',
        numero_ticket: 'TICK-901',
        total: 12.5,
        metodo_pago: 'efectivo',
        cliente_nombre: 'Carlos Perez',
        cliente_dni: '45678912',
        fecha: '2026-11-17T14:30:00.000Z',
        items: [{ producto_id: 'BEB-001', cantidad: 2 }],
      },
      {
        id: 'sale-offline-2',
        numero_ticket: 'TICK-902',
        total: 8.5,
        metodo_pago: 'yape',
        cliente_nombre: 'Maria Gomez',
        cliente_dni: '78912345',
        fecha: '2026-11-17T15:15:00.000Z',
        items: [{ producto_id: 'ENE-001', cantidad: 1 }],
      },
    ];
    localStorage.setItem('trankilandia_ventas_offline', JSON.stringify(fakeOfflineSale));

    const reporte = await obtenerReporteCajaMovimientos('2026-11-17T00:00:00Z', '2026-11-17T23:59:59Z');
    expect(reporte.totalVentasPOS).toBe(21);
    expect(reporte.conteoVentasPOS).toBe(2);
    expect(reporte.totalEfectivo).toBe(12.5);
    expect(reporte.totalYape).toBe(8.5);
    expect(reporte.totalRecaudado).toBe(21);

    expect(reporte.movimientos.length).toBe(2);
    // Orden cronológico descendente (15:15 antes que 14:30)
    expect(reporte.movimientos[0].ticketOBoleta).toBe('TICK-902');
    expect(reporte.movimientos[1].ticketOBoleta).toBe('TICK-901');
  });
});
```

- [ ] **Step 2: Ejecutar la prueba para verificar que falla**

Ejecutar: `npx vitest run src/tests/unit/cajaMovimientos.test.ts`
Resultado esperado: FAIL con "obtenerReporteCajaMovimientos is not a function" o no exportada.

- [ ] **Step 3: Implementar `obtenerReporteCajaMovimientos` en `src/lib/supabaseDb.ts`**

Definir interfaces `MovimientoCaja` y `ReporteCajaDiario`.
Implementar `obtenerReporteCajaMovimientos`:
- Determinar rango ISO para el período solicitado (por defecto fecha actual en Perú).
- Consultar `ingresos`: monto, metodo_pago, tipo, observacion, created_at, key_socio.
- Cruzar `key_socio` con datos del socio (nombre y DNI).
- Consultar `ventas_pos` y combinar con `trankilandia_ventas_offline` (deduplicando por `numero_ticket`).
- Formatear hora en `America/Lima` (ej. "04:30 p. m.").
- Clasificar tipo: `membresia_nueva`, `renovacion`, `abono_deuda`, `venta_pos`.
- Calcular totales: `totalEfectivo`, `totalYape`, `totalPlin`, `totalTarjeta`, `totalRecaudado`, `totalMembresias`, `totalVentasPOS`.
- Ordenar el array `movimientos` de más reciente a más antiguo (`fechaHora` descendente).
- Retornar objeto `ReporteCajaDiario`.

- [ ] **Step 4: Ejecutar prueba unitaria para verificar que pasa**

Ejecutar: `npx vitest run src/tests/unit/cajaMovimientos.test.ts`
Resultado esperado: PASS.

- [ ] **Step 5: Commit de Task 1**

```bash
git add src/lib/supabaseDb.ts src/tests/unit/cajaMovimientos.test.ts
git commit -m "feat: add obtenerReporteCajaMovimientos data layer with unified movements and cash totals"
```

---

### Task 2: Ordenamiento Inteligente de Socios en Recepción y Padrón

**Files:**
- Modify: `src/pages/portal/HubReceptionSimple.tsx`
- Modify: `src/pages/portal/AdminDashboard.tsx`
- Test: `src/tests/unit/sociosSorting.test.ts`

**Interfaces:**
- Consumes: `GymMember`
- Produces:
  - Estado `crmSortOrder`: `'recientes' | 'alfabetico' | 'por_vencer' | 'vencidos' | 'deuda'`
  - Algoritmo de ordenamiento `sortMembersByAction`:
    - Para `recientes`: compara marcas de tiempo de última acción (`updated_at` / `fecha_inicio` / `registeredAt` / `created_at`). Los socios que acaban de renovar o inscribirse quedan en el índice 0. Fallback numérico `MEM-XXX` descendente.
    - Para `alfabetico`: orden A-Z por `name`.
    - Para `por_vencer`: calcula días restantes respecto a hoy y ordena los menores primero (0 a 7 días).
    - Para `vencidos`: vencidos primero (días negativos primero).
    - Para `deuda`: `balanceDue` descendente.
  - Actualización reactiva tras guardar/renovar socio: asigna `updated_at: new Date().toISOString()` al socio en el estado de React para que se mantenga en la cima de la tabla.

- [ ] **Step 1: Escribir la prueba unitaria de ordenamiento de socios**

Crear `src/tests/unit/sociosSorting.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { GymMember } from '../../types';

// Función utilitaria pura de ordenamiento para testear la lógica
export function sortGymMembers(
  members: GymMember[],
  order: 'recientes' | 'alfabetico' | 'por_vencer' | 'vencidos' | 'deuda',
  todayISO: string = '2026-11-17'
): GymMember[] {
  return [...members].sort((a, b) => {
    if (order === 'recientes') {
      const timeA = (a as any).updated_at || (a as any).updatedAt || a.registeredAt || '';
      const timeB = (b as any).updated_at || (b as any).updatedAt || b.registeredAt || '';
      if (timeA && timeB && timeA !== timeB) {
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      }
      const numA = parseInt(a.id?.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.id?.replace(/\D/g, '') || '0', 10);
      return numB - numA;
    }
    if (order === 'alfabetico') {
      return (a.name || '').localeCompare(b.name || '');
    }
    if (order === 'deuda') {
      return (b.balanceDue || 0) - (a.balanceDue || 0);
    }
    if (order === 'por_vencer' || order === 'vencidos') {
      const expA = a.expiresAt || todayISO;
      const expB = b.expiresAt || todayISO;
      return expA.localeCompare(expB);
    }
    return 0;
  });
}

describe('Pruebas Unitarias · Ordenamiento Inteligente de Socios', () => {
  const mockSocios: GymMember[] = [
    {
      id: 'MEM-001',
      name: 'Alberto Casas',
      dni: '11111111',
      plan: '1 MES',
      planPrice: 80,
      paymentType: 'full',
      advancePaid: 80,
      balanceDue: 0,
      paymentMethod: 'efectivo',
      receiptNumber: 'B001-001',
      membershipStatus: 'active',
      expiresAt: '2026-12-01',
      coachName: 'Marcos Rivas',
      registeredAt: '2026-01-10T10:00:00Z',
    },
    {
      id: 'MEM-188',
      name: 'Brigit Quispe Ramos',
      dni: '70223415',
      plan: '8 MESES',
      planPrice: 300,
      paymentType: 'partial',
      advancePaid: 150,
      balanceDue: 150,
      paymentMethod: 'yape',
      receiptNumber: 'B001-188',
      membershipStatus: 'active',
      expiresAt: '2027-07-17',
      coachName: 'Valeria Rivas',
      registeredAt: '2026-05-15T10:00:00Z',
      ...({ updated_at: '2026-11-17T18:30:00Z' } as any),
    },
    {
      id: 'MEM-676',
      name: 'Jesús Anaya Romero',
      dni: '61509957',
      plan: '1 MES',
      planPrice: 80,
      paymentType: 'full',
      advancePaid: 80,
      balanceDue: 0,
      paymentMethod: 'efectivo',
      receiptNumber: 'B001-676',
      membershipStatus: 'active',
      expiresAt: '2026-12-10',
      coachName: 'Marcos Rivas',
      registeredAt: '2026-09-10T10:00:00Z',
      ...({ updated_at: '2026-11-17T18:45:00Z' } as any),
    },
  ];

  it('coloca primero por defecto a los socios renovados o recién inscritos en orden "recientes"', () => {
    const ordenados = sortGymMembers(mockSocios, 'recientes');
    expect(ordenados[0].id).toBe('MEM-676'); // Renovado a las 18:45
    expect(ordenados[1].id).toBe('MEM-188'); // Renovada a las 18:30
    expect(ordenados[2].id).toBe('MEM-001'); // Antiguo
  });

  it('ordena correctamente en modo alfabetico', () => {
    const ordenados = sortGymMembers(mockSocios, 'alfabetico');
    expect(ordenados[0].name).toBe('Alberto Casas');
    expect(ordenados[1].name).toBe('Brigit Quispe Ramos');
    expect(ordenados[2].name).toBe('Jesús Anaya Romero');
  });

  it('ordena por mayor deuda primero', () => {
    const ordenados = sortGymMembers(mockSocios, 'deuda');
    expect(ordenados[0].id).toBe('MEM-188'); // Deuda 150
    expect(ordenados[0].balanceDue).toBe(150);
  });
});
```

- [ ] **Step 2: Ejecutar la prueba de ordenamiento para verificar funcionalidad**

Ejecutar: `npx vitest run src/tests/unit/sociosSorting.test.ts`
Resultado esperado: PASS.

- [ ] **Step 3: Integrar selector de ordenamiento en `HubReceptionSimple.tsx`**

En `HubReceptionSimple.tsx`:
1. Agregar estado:
   ```typescript
   const [crmSortOrder, setCrmSortOrder] = useState<'recientes' | 'alfabetico' | 'por_vencer' | 'vencidos' | 'deuda'>('recientes');
   ```
2. Modificar `crmSociosFiltrados` para que aplique el ordenamiento:
   - Ordenar por `crmSortOrder` (por defecto `'recientes'`).
3. En la barra de herramientas de la pestaña `crm` (`activeTab === 'crm'`), añadir el `<select>` con diseño estilizado:
   - "Orden: Más Reciente (Inscrito/Renovado)"
   - "Orden: Alfabético (A - Z)"
   - "Orden: Próximos a Vencer"
   - "Orden: Vencidos Primero"
   - "Orden: Mayor Saldo / Deuda"
4. Al completar una renovación en el modal o inscripción, actualizar el socio en la lista con `updated_at: new Date().toISOString()` para que se mueva inmediatamente arriba.

- [ ] **Step 4: Actualizar ordenamiento en `AdminDashboard.tsx` (Padrón)**

En `AdminDashboard.tsx`:
- Modificar el cálculo de ordenamiento cuando `sortOrder === 'matricula'` para que primero revise marcas de tiempo recientes (`updated_at`, `fecha_inicio`, `registeredAt`) antes de caer en el fallback numérico de matrícula.
- Añadir opciones explícitas en el selector del Padrón:
  - `<option value="matricula">Orden: Recientes (Inscrito / Renovado)</option>`
  - `<option value="alfabetico">Orden: Alfabético (A - Z)</option>`
  - `<option value="deuda">Orden: Mayor Deuda</option>`

- [ ] **Step 5: Ejecutar pruebas de regresión**

Ejecutar: `npx vitest run src/tests/unit/sociosSorting.test.ts src/tests/unit/hubReceptionCrash.test.tsx`
Resultado esperado: PASS.

- [ ] **Step 6: Commit de Task 2**

```bash
git add src/pages/portal/HubReceptionSimple.tsx src/pages/portal/AdminDashboard.tsx src/tests/unit/sociosSorting.test.ts
git commit -m "feat: smart sorting in reception and admin dashboard prioritizing recently registered or renewed members"
```

---

### Task 3: Nueva Pestaña Principal "Caja & Movimientos del Día" en `AdminDashboard.tsx`

**Files:**
- Modify: `src/pages/portal/AdminDashboard.tsx`
- Test: `src/tests/unit/adminCajaMovimientosView.test.tsx`

**Interfaces:**
- Consumes: `obtenerReporteCajaMovimientos` de `src/lib/supabaseDb.ts`
- Produces:
  - Pestaña `'caja_dia'` añadida a `validTabs` y establecida como pestaña inicial por defecto.
  - Componente de visualización con:
    - Selector de rango de fecha: Hoy (por defecto), Ayer, Últimos 7 Días, Mes Actual.
    - 5 Cards de Arqueo de Caja:
      1. **Total Efectivo en Caja:** S/. (indicador de cuadre físico de billetes y monedas).
      2. **Total Digitales (Yape / Plin / Tarjeta):** S/. (con detalle de cada canal).
      3. **Ingresos Membresías:** S/. y número de cobros.
      4. **Ventas POS Mostrador:** S/. y número de tickets.
      5. **Total Recaudado:** S/. gran total consolidado.
    - Panel de Auditoría POS: Top de productos vendidos en el período.
    - Tabla del Feed de Movimientos del Día:
      - Columnas: Hora, Tipo (Membresía, Renovación, Abono, POS), Cliente / DNI, Concepto / Detalle, Método de Pago (Badge con color), Encargado y Monto en S/.
      - Filtros de un solo clic: Todos, Efectivo, Digitales, Membresías, Ventas POS.
      - Buscador en tiempo real de movimientos.

- [ ] **Step 1: Escribir prueba de render para la pestaña "Caja & Movimientos"**

Crear `src/tests/unit/adminCajaMovimientosView.test.tsx`:
```typescript
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminDashboard from '../../pages/portal/AdminDashboard';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', email: 'admin@trankilandia.com', role: 'admin' },
    role: 'admin',
    logout: vi.fn(),
  }),
}));

describe('AdminDashboard · Pestaña Caja & Movimientos del Día', () => {
  it('renderiza la pestaña Caja & Movimientos por defecto y muestra los indicadores de arqueo', async () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminDashboard />
      </MemoryRouter>
    );

    // Debe mostrar la pestaña destacada
    expect(await screen.findByText(/Caja & Movimientos/i)).toBeInTheDocument();
    // Debe mostrar el botón del filtro de fecha Hoy
    expect(screen.getByText('Hoy')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Ejecutar la prueba para verificar que falla**

Ejecutar: `npx vitest run src/tests/unit/adminCajaMovimientosView.test.tsx`
Resultado esperado: FAIL (la pestaña aún no se llama "Caja & Movimientos" o no es la predeterminada).

- [ ] **Step 3: Implementar la pestaña "Caja & Movimientos" en `AdminDashboard.tsx`**

1. Actualizar `validTabs`:
   ```typescript
   const validTabs: Array<'caja_dia' | 'padron' | 'kpis' | 'planes' | 'inventario' | 'personal'> = [
     'caja_dia',
     'padron',
     'kpis',
     'planes',
     'inventario',
     'personal',
   ];
   ```
2. Inicializar `activeTab`:
   ```typescript
   const [activeTab, setActiveTab] = useState<'caja_dia' | 'padron' | 'kpis' | 'planes' | 'inventario' | 'personal'>(() => {
     if (queryTab && validTabs.includes(queryTab as any)) return queryTab as any;
     return 'caja_dia';
   });
   ```
3. Agregar estados para el reporte de caja:
   ```typescript
   const [reporteCaja, setReporteCaja] = useState<ReporteCajaDiario | null>(null);
   const [filtroMetodoMovimiento, setFiltroMetodoMovimiento] = useState<'todos' | 'efectivo' | 'digitales' | 'membresias' | 'pos'>('todos');
   const [searchMovimiento, setSearchMovimiento] = useState('');
   const [cajaDateRange, setCajaDateRange] = useState<'hoy' | 'ayer' | '7dias' | 'mes'>('hoy');
   ```
4. Renderizar la barra de navegación con la pestaña `Caja & Movimientos` en primera posición con icono de billetera/caja registradora.
5. Renderizar la sección completa `{activeTab === 'caja_dia' && (...)}`:
   - Selector de fecha: Hoy | Ayer | Últimos 7 Días | Mes Actual.
   - 5 KPI Cards con colores de alto contraste.
   - Auditoría de Ventas POS (Ranking de productos).
   - Feed de Movimientos del Día con buscador, botones de filtro y tabla completa.

- [ ] **Step 4: Ejecutar la prueba de componente para verificar que pasa**

Ejecutar: `npx vitest run src/tests/unit/adminCajaMovimientosView.test.tsx`
Resultado esperado: PASS.

- [ ] **Step 5: Commit de Task 3**

```bash
git add src/pages/portal/AdminDashboard.tsx src/tests/unit/adminCajaMovimientosView.test.tsx
git commit -m "feat: add primary Caja y Movimientos del Dia tab with cash drawer audit and live feed"
```

---

### Task 4: Verificación Integral, Build de Producción y Generación del Nuevo Instalador

**Files:**
- None (ejecución de suite completa de pruebas y empaquetado)

- [ ] **Step 1: Ejecutar la suite completa de pruebas unitarias y de integración**

Ejecutar: `npx vitest run`
Resultado esperado: 100% de pruebas aprobadas (104+ pruebas, 0 fallos).

- [ ] **Step 2: Ejecutar comprobación de tipos y build de Vite**

Ejecutar: `npm run build`
Resultado esperado: Generación exitosa de `dist/` sin advertencias críticas de TypeScript.

- [ ] **Step 3: Empaquetar el instalador ejecutable de Electron**

Ejecutar: `npm run electron:build`
Resultado esperado: Generación de `dist-electron/Trankilandia Hub Setup 1.0.0.exe`.

- [ ] **Step 4: Verificar existencia y tamaño del archivo ejecutable generado**

Ejecutar: `Get-Item "dist-electron\Trankilandia Hub Setup 1.0.0.exe"`
Resultado esperado: Archivo presente con fecha actual y tamaño ~128MB.

- [ ] **Step 5: Sincronizar commits con GitHub**

Ejecutar: `git push origin main`
Resultado esperado: Rama sincronizada exitosamente con el repositorio remoto.
