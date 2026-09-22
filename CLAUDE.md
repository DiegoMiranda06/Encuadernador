# Encuadernador

Herramienta web personal, 100% navegador, que convierte PDFs a EPUB limpios y listos para Kindle: pantalla de ajustes en vivo para saltos de línea e imágenes, detección de idiomas distintos al principal, y editor de portada. Sin backend — el PDF nunca sale del navegador.

## Commands

- `pnpm dev` — Servidor de desarrollo (localhost:5173)
- `pnpm build` — Build de producción a `dist/`
- `pnpm preview` — Sirve `dist/` localmente (así se ve el build real de Pages)
- `pnpm test` — Vitest (transforms y lógica pura)
- `pnpm exec playwright test` — E2E completo
- `pnpm typecheck` — `tsc --noEmit` en modo estricto
- `pnpm lint` — ESLint

## Tech Stack

React 19 + Vite 6 + TypeScript (strict) + Tailwind v4 + shadcn/ui + mupdf.js (WASM, en Web Worker) + fflate + IndexedDB (vía `idb`) + GitHub Pages. Sin servidor, sin base de datos, sin Docker.

## Architecture

### La decisión que lo explica todo

    PDF → [Web Worker: EXTRACCIÓN lenta, 1 vez, mupdf.js] → IR (IndexedDB)
        → [Web Worker: TRANSFORMS puras, ms] → DocModel → XHTML/EPUB

La extracción corre una sola vez dentro de un Web Worker y se guarda en IndexedDB. Cada arreglo que el usuario activa es una función pura sobre ese IR, también ejecutada en el worker. Por eso mover un toggle actualiza la preview en milisegundos y la UI nunca se congela. **Todo el pipeline corre en el navegador del usuario — no hay servidor al que enviar el PDF, y esa propiedad no debe romperse nunca.**

### Directorios

- `src/ir/` — Extracción con mupdf.js. `extract.ts` corre dentro del worker
- `src/transforms/` — Doce transforms IR→DocModel puras. `registry.ts` fija el orden
- `src/model/` — `DocModel` y `PipelineConfig`
- `src/epub/` — `render.ts` (compartido por preview y build), `builder.ts` (fflate), `validate.ts` (validador propio)
- `src/cover/` — Extracción de candidatas, recorte, cuantización a escala de grises
- `src/language/` — Detección de idioma en dos capas (pasajes con franc-min, frases con listas propias)
- `src/worker/` — `pipeline.worker.ts` (entry del worker), `protocol.ts` (tipos RPC), `rpcClient.ts` (cliente con Promesas en el hilo principal)
- `src/storage/` — IndexedDB. `jobs.ts` es el equivalente al manifiesto de un trabajo
- `src/components/settings/` y `preview/` — La pantalla principal

### Flujo de datos

Subida → `ArrayBuffer` pasado al worker (nunca a un servidor) → extracción → IR en IndexedDB → el usuario mueve un toggle → Zustand actualiza al instante → debounce 300 ms → RPC `applyPipeline` al worker → el worker lee el IR, aplica transforms activas + overrides, cachea por `configHash`, devuelve `DocModel` + reports → la UI invalida la query de preview → el iframe recarga el XHTML del capítulo (misma función de render que usará el build final).

### Patrones clave

- **El IR es inmutable.** Se genera una vez; las transforms devuelven estructuras nuevas
- **Preview y build comparten `renderChapter()`.** Si divergen, el usuario ajusta contra una mentira
- **Los overrides se indexan por `chapter.key`** (hash del título normalizado), nunca por índice — sobreviven a que el pipeline reparta los capítulos distinto
- **Toda llamada al worker manda el `PipelineConfig` completo**, nunca un parche parcial
- **Toda transform devuelve un `TransformReport`** con cuántos cambios hizo — se muestra en la UI
- **El idioma nunca se marca por una sola palabra.** Siempre secuencias de 2+ palabras, y con confirmación del usuario para la capa de frases

## Code Organization Rules

1. **Un módulo por transform**, con su test y golden files. Máximo 200 líneas
2. **Componentes de máximo 300 líneas.** Extraer subcomponentes si crecen
3. **Alias `@/`** para `src/`
4. **Sin barrel exports.** Importar del archivo de origen
5. **Todo mensaje al worker pasa por `lib/rpc.ts`.** Ningún `postMessage` suelto en componentes
6. **Todo HTML persistido se sanea con `dompurify` antes de escribir en IndexedDB** — no hay servidor que haga de segunda barrera
7. **Textos de UI en español**, identificadores de código en inglés

## Design System

### Colores
`--bg #0B0C0E` · `--surface #141619` · `--surface-2 #1C1F24` · `--border #272B31` · `--border-strong #3A404A` · `--text #E6E8EB` · `--text-muted #8A9099` · `--text-subtle #5B6169` · `--primary #5B8CFF` · `--primary-hover #7BA3FF` · `--success #3FB950` · `--warning #D29922` · `--destructive #F85149` · `--paper #FBF7EF` · `--paper-text #1A1A1A`

### Tipografía
- UI: Inter Variable — 13px base, títulos 15/18/22px peso 600
- Mono: JetBrains Mono 12px
- Preview del libro: Literata 16px

### Estilo
- Radio: 6px general, 8px paneles, 4px badges
- Espaciado base 4px: 4, 8, 12, 16, 24, 32, 48
- Sin sombras salvo overlays. Bordes de 1px definen las superficies
- Transiciones 120 ms solo en `background-color`, `border-color`, `opacity`
- Foco siempre visible: `outline: 2px solid var(--primary); outline-offset: 2px`
- Panel de ajustes 360px fijos, preview `flex-1` con `max-width: 760px`

## Environment Variables

| Variable | Descripción |
|----------|-------------|
| `VITE_JOB_TTL_HOURS` | Horas hasta que un trabajo se borra de IndexedDB (24) |
| `VITE_EXTRACTION_TIMEOUT_S` | Timeout del worker de extracción (45) |
| `VITE_MAX_UPLOAD_MB` | Umbral de aviso en UI, no un límite duro (150) |

Ninguna es secreta — es un sitio estático sin backend.

## Reglas No Negociables

1. **El PDF nunca sale del navegador.** Ninguna petición de red debe llevar contenido del PDF. Es la propiedad que hace posible desplegar esto gratis en GitHub Pages y la que más valor le da al usuario
2. **Nunca fijar `font-family` ni `font-size` en el `body` del CSS del EPUB.** Pisa las preferencias del lector del Kindle
3. **El IR no se muta jamás.** Cada transform devuelve una estructura nueva
4. **Preview y build usan la misma función de render.** Cualquier divergencia es un bug crítico
5. **Todo HTML del editor se sanea con `dompurify` antes de persistir.** Sin excepciones, sin "es solo para mí"
6. **Cero backend.** Si aparece la tentación de un endpoint, una API o un servidor, el diseño se ha desviado
7. **Toda transform tiene toggle y `TransformReport`.** Nada de arreglos invisibles
8. **Los overrides manuales nunca se borran en silencio.** Si quedan huérfanos al recalcular, se reportan y el usuario decide
9. **El idioma nunca se marca por una palabra suelta**, solo por secuencias de 2+ palabras, y la capa de frases siempre pide confirmación
10. **`tsc --noEmit` en strict, sin `any`.**
11. **Los PDFs de test se generan con `pdf-lib`**, nunca se commitean PDFs descargados
12. **El TTL se respeta.** Los trabajos se borran de verdad de IndexedDB a las 24 horas
