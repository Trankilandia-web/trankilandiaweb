# Especificación de Diseño: Trankilandia Gym - Plataforma Multipágina & Exposición de Planes

- **Fecha:** 2026-10-28
- **Estado:** Validado y Aprobado
- **Proyecto:** Trankilandia Gym
- **Alcance:** Evolución de Landing Page a Plataforma Multipágina Integral con Exposición de Planes, Horarios, Instalaciones, Modal de Tour VIP y Footer Corporativo de Élite.
- **Directrices Aplicadas:** `taste` (anti-slop), `impeccable`, `frontend_design`.

---

## 1. Objetivos y Visión del Producto

### 1.1 Propósito
Transformar el sitio web de **Trankilandia Gym** de una landing page monopágina a una plataforma web multipágina de club deportivo de alto rendimiento (inspirada en la experiencia de usuario y arquitectura digital de referentes mundiales como *Third Space London*, *Equinox* y *Gymshark Lifting Club*).

### 1.2 Principales Mejoras Solicitadas por el Usuario
1. **No ser monopágina:** Arquitectura de rutas reales (`react-router-dom`) con navegación fluida entre páginas dedicadas (`/`, `/planes`, `/clases`, `/instalaciones`).
2. **Exposición Integral de Planes:** Página dedicada con selector mensual/anual, 3 tiers detallados (*Silver*, *Gold Performance* [destacado], *Black VIP*), matriz comparativa técnica y preguntas frecuentes.
3. **Reemplazo del botón "Ver Video":** Sustitución por **"AGENDAR TOUR VIP / PASE DE CORTESÍA"**, que abre un modal interactivo con selección de fecha/hora, formulario y confirmación de pase de invitado.
4. **Horarios & Clases Interactivas:** Parrilla de horarios con filtrado por días de la semana y categorías deportivas.
5. **Footer Corporativo de Lujo:** Rediseñado con suscripción de miembros ("Trankilandia Insider"), navegación sitemap en 4 columnas, sellos de certificación de maquinaria (*Hammer Strength*, *Eleiko*, *InBody*) y enlaces a Member App.

---

## 2. Arquitectura de Navegación y Rutas (`react-router-dom`)

### 2.1 Rutas de la Aplicación
* `/` — **Home / El Club:**
  * Hero cinematográfico con nuevo CTA de alta conversión (*"AGENDAR TOUR VIP"*).
  * Barra de beneficios flotantes (`FeatureBar`).
  * Escaparate de programas fitness principales con enlaces a `/clases`.
  * Manifiesto y métricas del club con enlace a `/instalaciones`.
  * Teaser de membresías con enlace a `/planes`.
* `/planes` — **Membresías & Planes:**
  * Toggle dinámico Mensual / Anual (con badge `-20% de descuento + Matrícula gratis`).
  * 3 Tarjetas de membresía con beneficios pormenorizados.
  * Matriz comparativa exhaustiva (más de 12 puntos de comparación con checks visuales).
  * Calculadora / Simulador de valor.
  * Acordeón de preguntas frecuentes (FAQ) sobre contratación, congelamiento de membresía y cancelaciones sin letra chica.
* `/clases` — **Horarios & Disciplinas:**
  * Selector interactivo de días (Lunes a Domingo).
  * Filtro por tipo de entrenamiento (Fuerza, HIIT, Funcional, Boxeo, Movilidad).
  * Tarjetas de clases con horario de inicio/fin, coach asignado, nivel de intensidad y botón para apartar lugar en el tour de cortesía.
* `/instalaciones` — **Espacios & Equipamiento:**
  * Tour visual por zonas (*Área de Biomecánica Hammer Strength / Eleiko*, *Zona de Peso Libre*, *Área Funcional & Turf*, *Recovery Spa & Sauna*).
  * Fichas técnicas de equipamiento y amenidades (vestuarios premium, duchas con agua termorregulada, casilleros con cerradura digital).

---

## 3. Especificación Detallada de Componentes Nuevos y Mejorados

### 3.1 Modal Interactivo "Tour VIP / Pase de Cortesía" (`TourModal.tsx`)
* **Activadores:** Botón en el Navbar (*"PASE DE CORTESÍA"*), botón secundario del Hero y botones en tarjetas de planes.
* **Componentes del Modal:**
  * Backdrop con blur profundo (`bg-black/80 backdrop-blur-md z-50`).
  * Cabecera con isotipo de mancuerna en ámbar y título: *"AGENDA TU TOUR VIP & PASE DE UN DÍA"*.
  * Selector de fecha y horario preferido (Mañana, Tarde, Noche).
  * Formulario con validación en tiempo real (Nombre completo, Teléfono/WhatsApp, Correo electrónico, Objetivo principal).
  * Vista de confirmación con código de pase de invitado generado (ej. `TRK-VIP-8492`), instrucciones de llegada y botón de descarga/cierre.

### 3.2 Página de Planes y Membresías (`PlansPage.tsx`)
* **3 Niveles de Membresía:**
  1. **Plan Silver (Esencial):**
     * `$890 MXN / mes` (Facturación anual: `$710 MXN / mes`).
     * Acceso completo a zona de musculación y cardio, casillero de día, vestuarios y regaderas de alta presión.
  2. **Plan Gold (Performance - Destacado / Más Popular):**
     * `$1,450 MXN / mes` (Facturación anual: `$1,160 MXN / mes`).
     * Todo lo de Silver + Acceso ilimitado a todas las clases grupales guiadas, 1 escaneo corporal InBody mensual con análisis de composición, app con rutina personalizada y toallas premium en cada visita.
     * Borde iluminado en ámbar `#FACC15`, sombra tenue dorada y badge superior `"MÁS ELEGIDO"`.
  3. **Plan Black VIP (All-Access & Recovery):**
     * `$2,200 MXN / mes` (Facturación anual: `$1,760 MXN / mes`).
     * Todo lo de Gold + Acceso 24/7 ilimitado, 4 pases de invitado mensuales para amigos o pareja, acceso al Recovery Spa & Sauna, casillero privado asignado, 1 sesión mensual de entrenamiento personalizado y servicio de lavandería para ropa deportiva.
* **Matriz Comparativa Técnica:**
  * Tabla responsiva con columnas para cada plan, dividida por categorías: *Entrenamiento*, *Clases & Coaching*, *Recuperación & Spa*, *Beneficios Exclusivos*.
* **FAQ de Membresías:**
  * Preguntas frecuentes interactivas con apertura en acordeón:
    * "¿Puedo congelar mi membresía si salgo de viaje?" (Sí, hasta 30 días al año sin costo).
    * "¿Hay permanencia forzosa?" (No en planes mensuales; puedes cancelar con 5 días de aviso).
    * "¿Cómo funcionan los pases de cortesía para invitados?"
    * "¿Qué métodos de pago aceptan?" (Tarjeta de crédito, débito, transferencia y efectivo en recepción).

### 3.3 Página de Horarios y Clases (`SchedulePage.tsx`)
* **Selector de Días:** Barra horizontal de días (LUN, MAR, MIÉ, JUE, VIE, SÁB, DOM) con estado activo en ámbar.
* **Filtros por Categoría:** Todos, Fuerza & Hipertrofia, HIIT & Cardio, Funcional, Boxeo, Movilidad & Yoga.
* **Parrilla de Clases:** Tarjetas con hora (ej. `06:30 AM`), duración, nombre de la clase, coach asignado, badge de intensidad (Media, Alta, Máxima) y botón interactivo para agendar visita en esa clase.

### 3.4 Página de Instalaciones (`FacilitiesPage.tsx`)
* **Zonas Deportivas:**
  * *Zona de Biomecánica & Peso Integrado:* Máquinas de placas convergentes y divergentes Hammer Strength.
  * *Zona de Peso Libre Olímpico:* Plataformas de levantamiento Eleiko, mancuernas de uretano de 2 a 60 kg.
  * *Área Funcional & Turf de Alta Velocidad:* Césped artificial para trineos de empuje, cuerdas de batalla, assault bikes y remos Concept2.
  * *Recovery Lounge & Sauna Finlandés:* Sauna seco a 85°C, duchas de contraste y sala de crioterapia.

### 3.5 Rediseño Integral del Footer (`Footer.tsx`)
* **Barra de Suscripción:** *"TRANKILANDIA INSIDER"* — campo de entrada para newsletter con botón de suscripción táctil.
* **Sitemap en 4 Columnas:**
  1. *El Club:* Manifiesto, Instalaciones, Equipamiento Biomecánico, Horarios.
  2. *Programas:* Fuerza & Potencia, HIIT & Acondicionamiento, Rendimiento Funcional, Movilidad & Yoga.
  3. *Membresías:* Planes & Tarifas, Matriz Comparativa, Pase Corporativo, Preguntas Frecuentes.
  4. *Concierge & Contacto:* Dirección Matriz, Teléfono directo, WhatsApp Concierge, Horario de Atención.
* **Sellos de Calidad y Certificaciones:** Logotipos y menciones de *Hammer Strength Official Training Center*, *Eleiko Certified*, *InBody Body Composition*.
* **Descarga de App y Bloque Legal:** Enlaces a App Store / Google Play, copyright dinámico y enlaces a Políticas de Privacidad y Términos del Club.

---

## 4. Sistema Visual y Restricciones Globales (Taste & Impeccable)

* **Paleta bloqueada (1 solo acento):** Fondo base `#09090b` (`zinc-950`), tarjetas `#121215` (`zinc-900`), acento único ámbar `#FACC15` (`amber-400`).
* **Contraste de Botones:** Botones en ámbar siempre con texto negro puro (`text-black font-extrabold`) para un contraste accesible superior a 11:1.
* **Cero roturas de texto:** Botones con `whitespace-nowrap`.
* **Tipografía:** Display en `Outfit` (800/900), cuerpo en sans-serif legible, datos técnicos en `JetBrains Mono` (`font-mono`).
* **Detector Impeccable:** Ejecución y validación con 0 antipatrones.
