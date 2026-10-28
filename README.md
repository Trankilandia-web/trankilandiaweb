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
