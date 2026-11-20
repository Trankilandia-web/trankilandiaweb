# Trankilandia Gym 🏋️‍♂️🥊

> **"Más que un gimnasio, somos familia"**  
> Sitio web oficial y portal de socios de **Trankilandia Gym** en Huamanga, Ayacucho, Perú.

---

## ⚡ Tecnologías

- **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Estilos & Diseño:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Física & Animaciones:** [Motion](https://motion.dev/) (motion/react)
- **Autenticación & Backend:** [Supabase](https://supabase.com/) (Google OAuth + Email)
- **Iconografía:** [Lucide React](https://lucide.dev/)
- **Despliegue:** Optimizado para [Vercel](https://vercel.com/) (`vercel.json` SPA routing)

---

## 🚀 Inicio Rápido

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/Trankilandia-web/trankilandiaweb.git
cd trankilandiaweb
npm install
```

### 2. Configurar variables de entorno

Copia el archivo `.env.example` a `.env`:

```bash
cp .env.example .env
```

Configura tus credenciales de Supabase:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### 3. Iniciar servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

---

## 📦 Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo local con recarga en caliente (HMR).
- `npm run build`: Compila TypeScript y genera el bundle de producción en `/dist`.
- `npm run preview`: Previsualiza localmente el build de producción.
- `npm test`: Ejecuta las pruebas unitarias con la red bloqueada y sin heredar la conexión de desarrollo.
- `npm run test:e2e`: Verifica navegación, acceso, solicitud de visita y vista móvil en un servidor local aislado.
- `npm run electron:dev`: Abre la terminal de escritorio en desarrollo.
- `npm run electron:build`: Genera el instalador de Windows con la interfaz actualizada.

El acceso requiere una cuenta real de Supabase Auth y un perfil autorizado. El DNI identifica al socio; no es una contraseña ni concede acceso por sí solo. El personal inicia sesión con correo y contraseña antes de verificar su PIN.

Las correcciones de permisos y transacciones requieren aplicar las migraciones al servidor antes de publicar esta versión. Consulta [configuración de cuentas y permisos](docs/auth-server-setup.md) y [pruebas y consistencia de caja](docs/pruebas-y-pos.md). Los scripts de migración no se ejecutan automáticamente ni al compilar ni al abrir la aplicación.

Las pruebas de integración HTTP son optativas y solo aceptan una instancia local de Supabase. No utilices datos o claves de producción en las pruebas.

---

## ☁️ Despliegue en Vercel

1. Importa este repositorio en tu cuenta de [Vercel](https://vercel.com/).
2. En la configuración del proyecto, agrega las variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Haz clic en **Deploy**. El archivo `vercel.json` ya incluye las reglas de reescritura para rutas SPA.

---

## 📍 Ubicación & Contacto

- **Sede:** Huamanga, Ayacucho, Perú
- **WhatsApp:** [+51 999 787 489](https://wa.me/51999787489)
- **Email:** trankilandiagymperu@gmail.com
- **Instagram:** [@trankilandiagym](https://www.instagram.com/trankilandiagym/)
