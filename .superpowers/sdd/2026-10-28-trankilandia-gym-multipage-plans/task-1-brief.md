### Task 1: Instalación de `react-router-dom`, Modelado de Tipos y Datos Expandidos

**Files:**
- Modify: `package.json`
- Modify: `src/types/index.ts`
- Modify: `src/data/gymData.ts`
- Test: `npm run build`

**Interfaces:**
- Produces: `react-router-dom` instalado, tipos para planes, matriz comparativa, horarios, instalaciones y preguntas frecuentes; constantes exportadas `MEMBERSHIP_PLANS`, `PLAN_COMPARISON_CATEGORIES`, `SCHEDULE_DAYS`, `SCHEDULE_CLASSES`, `FACILITY_ZONES`, `MEMBERSHIP_FAQS`.

**Requirements & Exact Content:**

1. Instalar `react-router-dom`:
   - Ejecutar `npm install react-router-dom`

2. `src/types/index.ts`:
   Conservar todos los tipos existentes (`NavItem`, `IconName`, `FeatureHighlight`, `Program`, `StatMetric`, `AboutData`, `GymContactInfo`) y agregar:
   ```typescript
   export interface PlanTier {
     id: 'silver' | 'gold' | 'black';
     name: string;
     tagline: string;
     monthlyPrice: number;
     annualPricePerMonth: number;
     isPopular: boolean;
     badge?: string;
     description: string;
     highlights: string[];
     ctaText: string;
   }

   export interface ComparisonFeature {
     name: string;
     silver: boolean | string;
     gold: boolean | string;
     black: boolean | string;
   }

   export interface ComparisonCategory {
     category: string;
     features: ComparisonFeature[];
   }

   export interface ScheduleClass {
     id: string;
     day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
     time: string;
     title: string;
     category: 'Fuerza' | 'HIIT' | 'Funcional' | 'Boxeo' | 'Movilidad';
     coach: string;
     intensity: 'Media' | 'Alta' | 'Extrema';
     spotsLeft: number;
   }

   export interface FacilityZone {
     id: string;
     title: string;
     badge: string;
     description: string;
     imageUrl: string;
     specs: string[];
     amenities: string[];
   }

   export interface FaqItem {
     question: string;
     answer: string;
     category: string;
   }

   export interface TourBookingData {
     name: string;
     phone: string;
     email: string;
     goal: string;
     preferredShift: 'morning' | 'afternoon' | 'evening';
     selectedDate: string;
     planInterest?: string;
   }
   ```

3. `src/data/gymData.ts`:
   - Expandir conservando todo lo anterior.
   - Definir y exportar `MEMBERSHIP_PLANS`:
     - `silver`: Esencial ($890/mes o $710 anual)
     - `gold`: Performance ($1,450/mes o $1,160 anual, `isPopular: true`, badge "MÁS POPULAR")
     - `black`: Black VIP ($2,200/mes o $1,760 anual, badge "EXPERIENCIA DEFINITIVA")
   - Definir y exportar `PLAN_COMPARISON_CATEGORIES`: 4 categorías con más de 12 características.
   - Definir y exportar `SCHEDULE_DAYS`: `['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']`.
   - Definir y exportar `SCHEDULE_CLASSES`: al menos 14 clases distribuidas en la semana con categorías, coaches e intensidades.
   - Definir y exportar `FACILITY_ZONES`: 4 zonas con imágenes Unsplash fitness oscuras de alta resolución.
   - Definir y exportar `MEMBERSHIP_FAQS`: al menos 4 preguntas clave sobre pagos, cancelaciones, congelamiento y pases de invitado.

4. Verificación:
   - `npm run build` debe completar sin errores (código de salida 0).
5. Commit:
   - `git add package.json package-lock.json src/types src/data && git commit -m "feat(multipage): install react-router-dom and define expanded domain models"`
