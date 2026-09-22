import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  base: '/Encuadernador/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  worker: {
    // mupdf.js solo se distribuye como ESM (usa top-level await) — el worker no puede ser IIFE.
    format: 'es',
  },
  test: {
    // Sin tests todavía (llegan en el Paso 4 del blueprint) — que no falle CI mientras tanto.
    passWithNoTests: true,
  },
})
