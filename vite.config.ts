import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const isElectron = process.env.IS_ELECTRON === 'true' || process.env.npm_lifecycle_event?.includes('electron');

// https://vite.dev/config/
export default defineConfig({
  base: isElectron ? './' : '/',
  plugins: [react(), tailwindcss()],
  envPrefix: ['VITE_'],
  build: {
    sourcemap: false,
  },
  server: {
    watch: {
      ignored: ['**/dist-electron/**', '**/dist/**', '**/.git/**'],
    },
  },
})
