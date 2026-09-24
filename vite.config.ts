import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { configDefaults, defineConfig } from 'vitest/config'

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
        description: 'PDF → EPUB para Kindle, 100% en el navegador.',
        start_url: '/Encuadernador/',
        scope: '/Encuadernador/',
        display: 'standalone',
        background_color: '#0B0C0E',
        theme_color: '#0B0C0E',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        // El .wasm de mupdf.js pesa ~10 MB — muy por encima del límite por defecto de workbox (2 MB).
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,wasm,woff,woff2,svg,png}'],
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
    // e2e/ corre con Playwright (pnpm test:e2e), no con Vitest.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
