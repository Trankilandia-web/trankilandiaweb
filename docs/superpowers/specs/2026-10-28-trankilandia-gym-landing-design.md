# Especificación de Diseño: Trankilandia Gym Landing Page

- **Fecha:** 2026-10-28
- **Estado:** Validado y Aprobado
- **Proyecto:** Trankilandia Gym
- **Enfoque:** Frontend Visual de Alta Gama (Fase 1) con arquitectura modular desacoplada para futuras fases funcionales.
- **Directrices Aplicadas:** `brainstorming`, `taste` (anti-slop), `impeccable`, `frontend_design`.

---

## 1. Contexto y Objetivos

### 1.1 Propósito
Construir la interfaz visual de la landing page para **Trankilandia Gym**, tomando como referencia visual la maqueta "FitZone", pero elevando el estándar de diseño mediante las directrices de `taste`, `impeccable` y `frontend_design`. Se busca una presencia digital imponente, atlética, sofisticada y con cero estética genérica de IA.

### 1.2 Alcance de la Fase 1
* **Enfoque Exclusivamente Visual y de Experiencia:** Construcción completa de la interfaz en alta fidelidad (desktop y móvil).
* **Preparación para Fase 2:** Código desacoplado en componentes limpios y datos estructurados en archivos TypeScript (`src/data/gymData.ts`), de modo que la futura incorporación de pasarelas de pago, reservas o paneles de usuario no requiera refactorizar la UI.

---

## 2. Lectura de Diseño y Parámetros (Taste & Impeccable)

### 2.1 Design Read
> *Landing page deportiva de alto impacto para Trankilandia Gym, con un lenguaje visual oscuro, atlético y "gritty-premium" (estética editorial fitness con acabados de alta gama), evitando plantillas genéricas de IA mediante tipografía con carácter, microfísica táctil y una paleta monocromática con un único acento ámbar/dorado de alto voltaje.*

### 2.2 Diales de Configuración (Taste Engine)
* **`DESIGN_VARIANCE: 7`** — Ritmo dinámico, composición asimétrica y balance visual sin caer en cuadrículas monótonas repetitivas.
* **`MOTION_INTENSITY: 6`** — Microfísica táctil (`active:scale-[0.98]`), transiciones elásticas suaves en hover (`transition-all duration-300 ease-out`), sin bucles infinitos molestos.
* **`VISUAL_DENSITY: 4`** — Respiración visual generosa, jerarquía clara y primer viewport sin sobrecarga.

---

## 3. Sistema Visual, Tokens y Paleta de Color

### 3.1 Paleta de Color Bloqueada (1 Solo Acento)
Para evitar la dispersión cromática y los clichés de IA (como degradados morados o cianes aleatorios):
* **Fondo Base:** Negro carbón profundo `#09090b` (`zinc-950`).
* **Tarjetas y Superficies:** Grafito mate `#121215` (`zinc-900`) con microbordes refractivos `#27272a` (`zinc-800` / `border-white/10`).
* **Acento Único:** Ámbar de alto voltaje `#FACC15` (`yellow-400` / `amber-400`). Aplicado exclusivamente a CTAs principales, palabras clave de titulares y puntos de estado activo.
* **Tipografía Primaria:** Blanco puro `#FFFFFF` en titulares de alto contraste.
* **Tipografía Secundaria:** Gris neutro cálido `#A1A1AA` (`zinc-400`) para subtítulos legibles.
* **Regla de Accesibilidad de Botones (WCAG AA):**
  * Botón primario: Fondo ámbar `#FACC15` con texto negro `#09090b` (`font-bold`), garantizando un contraste superior a 11:1.
  * Botones secundarios / outline: Vidrio ahumado (`bg-white/5 hover:bg-white/10 text-white border border-white/15`).

### 3.2 Tipografía
* **Display / Titulares:** `Outfit` / `Cabinet Grotesk` (o Sans geométrica condensada deportiva), pesos `font-black` (900) y `font-extrabold` (800), con `tracking-tight` y estilo mayúsculas.
* **Cuerpo:** Sans-serif neutral moderno y limpio, garantizando legibilidad en fondos oscuros sin fatiga visual (`leading-relaxed max-w-[65ch]`).
* **Datos Técnicos y Horarios:** `Geist Mono` o `JetBrains Mono` (`font-mono`) para cifras de impacto (`1,500 m²`, `5:30 AM - 10:00 PM`).

---

## 4. Arquitectura de la Solución y Stack Tecnológico

### 4.1 Stack
* **Framework:** React 19 + Vite (TypeScript).
* **Estilos:** Tailwind CSS v4 con variables CSS nativas.
* **Iconografía:** Lucide React (con `strokeWidth={1.75}` consistente en todo el proyecto).
* **Animaciones y Microinteracciones:** Motion (`motion/react`) o CSS Transitions táctiles aceleradas por GPU.
* **Imágenes:** Fotografía fitness cinematográfica de alta resolución con tratamientos de iluminación dramática (rim light).

### 4.2 Estructura de Directorios
```
TrankilandiaGym/
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Hero.tsx
│   │   ├── FeatureBar.tsx
│   │   ├── ProgramsSection.tsx
│   │   ├── AboutSection.tsx
│   │   ├── QuickInfoBar.tsx
│   │   └── Footer.tsx
│   ├── data/
│   │   └── gymData.ts        # Datos desacoplados: programas, horarios, ventajas
│   ├── types/
│   │   └── index.ts          # Tipos TypeScript para toda la aplicación
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
└── vite.config.ts
```

---

## 5. Especificación Detallada de Componentes

### 5.1 `Navbar`
* **Layout:** Barra de navegación fija / sticky con blur de fondo (`backdrop-blur-md bg-zinc-950/80 border-b border-white/5`).
* **Altura:** `h-18` (72px), respetando el límite máximo de 80px de la directriz de taste.
* **Elementos:**
  1. Logo a la izquierda: Isotipo de mancuerna estilizada en ámbar + **TRANKILANDIA** en blanco bold y subtexto **GYM & FITNESS**.
  2. Enlaces centrales (desktop): *Inicio, Nosotros, Programas, Entrenadores, Membresías, Contacto*.
  3. CTA a la derecha: Botón ámbar **"ÚNETE AHORA"** en una sola línea (sin wrap).
  4. Menú móvil: Botón hamburguesa con drawer desplegable animado y accesible.

### 5.2 `Hero` (Regla del Primer Viewport)
* **Altura:** `min-h-[100dvh]` para evitar saltos de pantalla en dispositivos móviles.
* **Composición:** Split visual con fondo oscuro degradado y fotografía deportiva de impacto (atleta con mancuerna bajo iluminación dramática cenital).
* **Contenido textual (máximo 4 elementos para evitar sobrecarga):**
  1. *Etiqueta superior:* `TRANKILANDIA CLUB · EST. 2026` (micro-badge discreto).
  2. *Titular principal:* **"CONSTRUYE FUERZA. SUPERA TUS LÍMITES."** (palabras "TUS LÍMITES" en ámbar vibrante).
  3. *Subtexto:* *"Únete a la comunidad que te desafía, te respalda y forja la versión más fuerte de ti mismo."* (16 palabras, respetando el límite estricto de < 20 palabras).
  4. *Botones de acción:*
     * Primario: **"ÚNETE AHORA"** (ámbar brillante con feedback táctil).
     * Secundario: **"VER VIDEO"** (estilo vidrio translúcido con icono play).

### 5.3 `FeatureBar` (Ventajas Clave Flotantes)
* **Ubicación:** Barra de 4 tarjetas flotantes integradas al pie del Hero.
* **Tarjetas:**
  1. **Equipamiento de Élite:** Maquinaria de última generación para biomecánica óptima.
  2. **Coaches Certificados:** Entrenadores personales para maximizar tu progreso.
  3. **Planes a Medida:** Rutinas y nutrición adaptadas a tu nivel y metas.
  4. **Comunidad Activa:** Ambiente inspirador que potencia tu disciplina diaria.
* **Estilo:** Fondo `bg-zinc-900/90` con bordes sutiles `border border-white/10` e iconos en ámbar con contenedor circular suave.

### 5.4 `ProgramsSection` (Nuestros Programas)
* **Cabecera:** Eyebrow `NUESTROS PROGRAMAS` en ámbar + Titular `ENTRENA. ENFÓCATE. CONQUISTA.`
* **Grid:** 4 tarjetas asimétricas y responsivas (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6`).
* **Tarjetas:**
  1. *Fuerza & Musculación:* Construye masa muscular magra y potencia absoluta.
  2. *Pérdida de Grasa & HIIT:* Quema calorías eficiente con circuitos de alta intensidad.
  3. *Entrenamiento Funcional:* Mejora movilidad, resistencia y rendimiento diario.
  4. *Movilidad & Bienestar:* Equilibra cuerpo y mente con yoga y estiramiento activo.
* **Interactividad:** Efecto zoom suave en la imagen al hacer hover, badge de icono en ámbar y enlace **"CONOCE MÁS →"** con transición suave.

### 5.5 `AboutSection` (Más que un Gimnasio, una Comunidad)
* **Composición:** Split 50/50 asimétrico.
  * *Lado Izquierdo:* Fotografía de alta calidad del piso del gimnasio con máquinas profesionales, iluminación industrial y logotipo ambiental.
  * *Lado Derecho:*
    * Eyebrow `SOBRE NOSOTROS`.
    * Titular: **"MÁS QUE UN GIMNASIO, SOMOS UNA COMUNIDAD."**
    * Manifiesto: *"En Trankilandia Gym entendemos el fitness como un estilo de vida sustentable. No importa tu punto de partida, nuestro compromiso es brindarte la guía, el espacio y la motivación para alcanzar tu mejor versión."*
    * 3 Métricas de autoridad (en `font-mono`):
      * `1,500 m²` Espacio de entrenamiento
      * `15+` Coaches especializados
      * `1,200+` Miembros activos
    * CTA: **"FORMA PARTE DEL CLUB →"**

### 5.6 `QuickInfoBar` & `Footer`
* **Barra de Información de Contacto Directo:**
  * Dirección: Av. Principal Trankilandia, Zona Fitness (icono MapPin).
  * Teléfono: +52 (55) 1234-5678 (icono Phone).
  * Email: contacto@trankilandiagym.com (icono Mail).
  * Horarios: Lun - Sáb: 5:30 AM - 10:00 PM | Dom: 6:00 AM - 2:00 PM (icono Clock).
* **Footer:** Enlaces legales, copyright y enlaces a redes sociales (Instagram, YouTube, TikTok) con microinteracciones en hover.

---

## 6. Reglas de Accesibilidad, Rendimiento y Calidad

1. **Cumplimiento WCAG AA:**
   * Contraste mínimo de 4.5:1 en textos estándar y 3:1 en textos grandes.
   * Botón primario con texto negro sobre ámbar (`text-zinc-950 bg-amber-400 font-bold`) para garantizar más de 11:1 de contraste.
2. **Estabilidad de Viewport:**
   * Uso obligatorio de `min-h-[100dvh]` en el Hero para compatibilidad con la barra de direcciones de navegadores móviles (iOS Safari / Chrome Android).
3. **Cero Salto de Línea en Botones:**
   * Todos los botones principales tienen `whitespace-nowrap` y padding calibrado para evitar roturas de texto.
4. **Respeto a `prefers-reduced-motion`:**
   * Todas las animaciones y transiciones se desactivan o suavizan para usuarios con preferencias de movimiento reducido.

---

## 7. Preparación para Futuras Fases (Hoja de Ruta)

* **Fase 1 (Actual):** Maquetación visual completa de la landing page, componentes limpios, tipografía y diseño responsivo.
* **Fase 2 (Próxima):** Modales interactivos (reproductor de video modal, modal de pre-registro con validación de formulario).
* **Fase 3:** Sistema de planes y membresías (selector de planes mensual/anual y checkout simulado o real).
* **Fase 4:** Panel de usuario / reservas de clases funcionales.
