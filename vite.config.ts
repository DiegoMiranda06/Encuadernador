import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  base: '/Encuadernador/',
  plugins: [react()],
  test: {
    // Sin tests todavía (llegan en el Paso 4 del blueprint) — que no falle CI mientras tanto.
    passWithNoTests: true,
  },
})
