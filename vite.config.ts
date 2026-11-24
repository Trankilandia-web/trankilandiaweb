import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
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
