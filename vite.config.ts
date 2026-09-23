import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  base: '/Encuadernador/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Encuadernador',
        short_name: 'Encuadernador',
        description: 'Convierte PDFs a EPUB para Kindle — 100% en el navegador, el PDF nunca sale de acá.',
        lang: 'es',
        theme_color: '#0b0c0e',
        background_color: '#0b0c0e',
        display: 'standalone',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        // El bundle (JS/CSS), las fuentes autohospedadas y el .wasm de mupdf.js — todo lo que
        // hace falta para procesar un PDF sin conexión tras la primera visita (Paso 13).
        globPatterns: ['**/*.{js,css,html,wasm,woff,woff2,svg}'],
        // mupdf-wasm.wasm pesa ~10.4 MB — el límite por defecto de workbox (2 MB) lo excluiría.
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
      },
    }),
  ],
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
