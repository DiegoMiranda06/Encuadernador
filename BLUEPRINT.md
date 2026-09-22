# Encuadernador — Blueprint

> Generado por The Architect el 2026-09-22 (v2 — arquitectura 100% navegador)
> Arquetipo: Internal Tool (herramienta personal, cliente puro, sin backend)
> Idioma del proyecto: español (UI y comentarios de código en español, identificadores en inglés)

**Nota de versión:** esta es la segunda versión del blueprint. La v1 usaba Docker + Python/FastAPI como backend. Tras revisar las restricciones reales (laptop sin permisos de administrador, uso personal, prioridad por la privacidad de los libros) se pivotó a una **arquitectura enteramente en el navegador**: sin servidor, sin Docker, sin Node en tiempo de ejecución para el usuario final. El diseño del IR, el motor de transforms y el sistema visual de la v1 sobreviven casi intactos — solo cambian de Python a TypeScript y de proceso servidor a Web Worker.

---

## 1. Project Overview

### Visión

**Encuadernador** es una herramienta web personal que convierte PDFs a EPUB limpios y listos para Kindle, **enteramente en el navegador**. El usuario arrastra un PDF, la extracción corre en un Web Worker con WebAssembly, y una pantalla de ajustes permite corregir en vivo — con toggles, no reconvirtiendo — los tres problemas que arruinan toda conversión PDF→EPUB automática: párrafos partidos en líneas sueltas, cabeceras/pies incrustados en el texto, e imágenes descolocadas. Después se recorta y encuadra la portada, se revisan los pasajes en otro idioma detectados automáticamente, se previsualiza en blanco y negro tal como se vería en un Kindle real, y se descarga el `.epub`.

**El PDF nunca sale de la máquina del usuario.** No hay subida, no hay servidor, no hay cuenta. Todo el procesamiento —extracción, transforms, render, construcción del EPUB, recorte de imágenes— corre en el propio navegador. Esto no es solo una ventaja de privacidad: es lo que hace posible desplegar la herramienta como un sitio estático gratuito (GitHub Pages) sin infraestructura que mantener.

El envío al Kindle lo hace el usuario por su cuenta (Send to Kindle acepta EPUB directamente); esta herramienta solo garantiza que el archivo que entrega no dé problemas al llegar.

### Objetivos

- Convertir un PDF de texto nativo (300+ páginas) a EPUB legible en menos de 2 minutos en hardware de escritorio normal, sin que el PDF salga del navegador.
- Que cada ajuste del usuario se refleje en la preview en **menos de 300 ms**, sin reconvertir el PDF.
- Que el EPUB generado pase el validador propio y se abra correctamente en Calibre, Apple Books y un Kindle real.
- Que el usuario detecte, antes de descargar, tanto pasajes en otro idioma como imágenes que se degradan mal en la pantalla de 16 tonos de gris del Kindle.
- Que la app funcione como PWA instalable, sin conexión, tras la primera carga.

### Métricas de éxito

- **Tasa de intervención manual:** menos del 20% de las conversiones necesitan abrir el editor de capítulos.
- **Latencia de ajuste:** p95 por debajo de 300 ms entre mover un toggle y ver la preview actualizada.
- **Cero subidas:** verificable por inspección de red — la pestaña "Network" del navegador no debe mostrar ninguna petición con el contenido del PDF.
- **Extracción:** un PDF de 300 páginas se extrae en menos de 45 s.

### Fuera de alcance (v1)

PDFs escaneados / OCR · envío automático por email al Kindle · biblioteca o historial en la nube · multiusuario · cuentas · conversión a MOBI/AZW3 · formatos de entrada distintos de PDF · validación EPUB certificada (se sustituye por un validador propio, ver sección 5).

---

## 2. Tech Stack

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Framework | React 19 + Vite 6 | Vite compila rápido y su output es un sitio 100% estático — encaja directo con GitHub Pages. React da el estado compartido que necesita un panel de once toggles con preview reactiva |
| Lenguaje | TypeScript 5.7 (strict) | Un único lenguaje para todo el proyecto — extracción, transforms, UI. El IR es el contrato entre el worker y la UI; sin tipos se rompe a la semana |
| Estilos | Tailwind CSS v4 | Config en CSS, sin archivo de config aparte, build instantáneo |
| Componentes | shadcn/ui (Radix + Tailwind) | Copy-paste, sin dependencia de versiones. Dialog, Sheet, Tabs, Slider, Switch, Tooltip, Toast, Collapsible |
| Estado servidor | — (no aplica) | No hay servidor. El "estado remoto" es el Web Worker, gestionado con un cliente RPC propio (ver sección 6) |
| Estado UI | Zustand | El panel de ajustes es un objeto de config compartido por media docena de componentes |
| Extracción PDF | **mupdf.js (WASM)** | Build oficial de Artifex del motor MuPDF a WebAssembly. `toStructuredText().asJSON()` da bloques con bounding box, fuente y flags — igual que PyMuPDF en la v1 |
| Concurrencia | **Web Worker dedicado** | La extracción y las transforms corren fuera del hilo principal. La UI nunca se congela con un PDF de 300 páginas |
| Idioma de pasajes | **franc-min** | 82 idiomas, ~540 KB. Fiable desde 50 caracteres — nunca se usa sobre palabras sueltas (ver sección 4bis) |
| Idioma de palabras/frases | Listas de frecuencia propias (alemán, francés, latín, italiano) | Detecta secuencias de 2+ palabras extranjeras consecutivas. Complementa a franc, que falla en fragmentos cortos |
| EPUB (empaquetado) | **fflate** (ZIP sin dependencias nativas) | Un EPUB es un ZIP con reglas. `fflate` es la librería de compresión más rápida y ligera para WASM/navegador |
| EPUB (construcción) | Módulo propio (`lib/epub/`) | Genera manifest, spine, nav.xhtml y NCX a mano — mismo enfoque que ebooklib en la v1, sin dependencias pesadas |
| Validación | **Validador propio** (`lib/epub/validate.ts`) | epubcheck es Java, no corre en navegador. Se sustituye por una batería de comprobaciones estructurales (ver sección 5) + recomendación de verificar con Calibre portable de vez en cuando |
| Preview | `<iframe srcdoc>` por capítulo + Canvas para portada/imágenes en escala de grises | Aislamiento de CSS real, coste cero de librerías |
| Editor manual | TipTap 2, esquema restringido | Igual que en la v1: se edita prosa, el esquema impide HTML que rompa el EPUB |
| Recorte de portada | react-easy-crop + Canvas | Recorte en cliente, cuantización a 16 grises para la preview Kindle con `canvas.getImageData` |
| Persistencia | **IndexedDB** (vía `idb`) | El PDF de origen, el IR extraído y la config de trabajo se guardan localmente — sobrevive a recargar la pestaña. Se limpia manualmente o con TTL en `localStorage` |
| Service Worker | Vite PWA plugin (Workbox) | Cachea el bundle y el WASM de mupdf tras la primera carga → funciona sin conexión |
| Hosting | **GitHub Pages** | Gratis, sin servidor que mantener, HTTPS automático. Encaja con "solo necesito una URL de prueba" |
| CI/CD | GitHub Actions | Build de Vite → deploy a Pages en cada push a `main` |
| Gestor de paquetes | pnpm | Rápido, determinista. Solo hace falta para desarrollar — el resultado desplegado es HTML/CSS/JS estático |

### Lo que cambió respecto a la v1, y por qué

| Decisión v1 | Decisión v2 | Motivo |
|---|---|---|
| Python + FastAPI | Eliminado — todo TypeScript | Sin backend no hay razón para un segundo lenguaje |
| PyMuPDF | mupdf.js (mismo motor, compilado a WASM) | Mismo fitness para el trabajo, corre en el navegador |
| ebooklib | Módulo propio + fflate | ebooklib es Python. El formato EPUB no es complejo de generar a mano una vez se entiende |
| epubcheck (Java) | Validador propio + Calibre portable como respaldo manual | epubcheck no tiene build para navegador. Ver sección 5 para qué cubre el validador propio y qué no |
| Docker Compose | Ninguno | Sin servidor, no hay nada que contenerizar |
| Sin base de datos, jobs en disco con TTL | IndexedDB con TTL en `localStorage` | Mismo patrón, adaptado a almacenamiento de navegador |
| Vercel/self-hosted | GitHub Pages | Gratis, cero mantenimiento, encaja con "solo quiero una URL" |

### Lo que se evaluó y se descartó

- **pdf.js (Mozilla):** da posiciones de texto pero su extracción de imágenes y el manejo de fuentes incrustadas es más tosco que mupdf.js. mupdf.js gana en fidelidad, que es justo lo que necesita el motor de transforms.
- **JSZip para el EPUB:** más pesado y más lento que `fflate` sin ninguna ventaja para este caso de uso.
- **SharedArrayBuffer / múltiples workers:** un solo worker es suficiente para un documento a la vez, que es el caso de uso real (herramienta personal, un PDF cada vez). Añadir un pool de workers sería complejidad sin beneficio medible.

---

## 3. Directory Structure

```
encuadernador/
  .github/
    workflows/
      deploy.yml               # build de Vite → GitHub Pages en cada push a main
      ci.yml                   # lint + typecheck + tests en cada PR
  public/
    manifest.webmanifest       # PWA
    icons/                     # iconos de la PWA
  index.html                   # entry de Vite
  vite.config.ts               # incluye vite-plugin-pwa y el plugin de WASM
  package.json
  tsconfig.json

  src/
    main.tsx                   # bootstrap de React
    App.tsx                    # rutas (react-router, modo hash o basename para Pages)

    ir/                        # Extracción — corre DENTRO del worker
      schema.ts                # Tipos: IRDocument, IRPage, IRBlock, IRSpan (mismo modelo que la v1)
      extract.ts                # PDF (ArrayBuffer) → IRDocument, usando mupdf.js
      stats.ts                  # Histograma de fuentes, bandas recurrentes, medianas — igual que v1

    transforms/                # IR → DocModel. Funciones puras. Corren en el worker
      base.ts                  # Tipo Transform + TransformReport
      registry.ts               # Orden canónico — NO reordenar a la ligera
      t01-unicode.ts
      t02-columns.ts
      t03-runningHeads.ts
      t04-pageNumbers.ts
      t05-dehyphenate.ts
      t06-joinLines.ts          # LA transform clave — ver blueprint v1, sección 9, paso 4
      t07-headings.ts
      t08-chapters.ts
      t09-images.ts
      t10-footnotes.ts
      t11-toc.ts
      t12-language.ts           # NUEVA — detección de idioma en dos capas (sección 4bis)

    model/
      document.ts               # DocModel: Chapter[], Block[], Metadata
      config.ts                 # PipelineConfig — un toggle + params por transform

    epub/
      builder.ts                # DocModel → Uint8Array (el .epub como ZIP), con fflate
      render.ts                 # Block[] → XHTML. Compartido por preview y build final
      templates/
        kindleStyles.ts          # kindle.css como string TS — mismas reglas que la v1, sección 7
      validate.ts                # Validador estructural propio (sección 5)

    cover/
      extract.ts                 # Candidatas: página 1 renderizada + imágenes grandes del IR
      render.ts                  # Recorte + resize a 1600×2560 vía OffscreenCanvas
      grayscale.ts                # Cuantización a 16 tonos de gris para la preview Kindle

    language/
      passageDetect.ts           # franc-min sobre bloques de 50+ caracteres
      wordLists/
        de.ts fr.ts la.ts it.ts  # listas de frecuencia (top 5.000 palabras) por idioma
        phraseDetect.ts           # detecta secuencias de 2+ palabras extranjeras consecutivas

    worker/
      pipeline.worker.ts          # Entry del Web Worker. Recibe RPC, orquesta extract+transforms
      protocol.ts                 # Tipos de los mensajes RPC (request/response/progress)
      rpcClient.ts                 # Cliente en el hilo principal — Promesas sobre postMessage

    storage/
      db.ts                       # Apertura de IndexedDB (via `idb`), esquema de stores
      jobs.ts                      # CRUD de "trabajos" en IndexedDB — mismo concepto que v1
      cleanup.ts                   # Barrido TTL al arrancar la app (localStorage guarda el timestamp)

    components/
      upload/
        Dropzone.tsx
        ExtractionProgress.tsx     # Consume el progreso emitido por el worker
      settings/
        TransformPanel.tsx
        TransformToggle.tsx
        TransformParams.tsx
        PresetSelector.tsx
      preview/
        ChapterPreview.tsx         # iframe srcDoc con kindleStyles
        ChapterList.tsx
        GrayscaleToggle.tsx        # NUEVO — alterna preview color/B-N
      language/
        LanguageReview.tsx          # NUEVO — panel de confirmación de pasajes/frases detectadas
      editor/
        ChapterEditor.tsx
        EditorToolbar.tsx
      cover/
        CoverPicker.tsx
        CoverCropper.tsx
        KindlePreview.tsx           # mockup de parrilla, con modo escala de grises
      export/
        ValidationReport.tsx
        BookPreview.tsx              # lector con epub.js, solo en esta pantalla
        DownloadButton.tsx
      ui/                            # primitivas shadcn/ui

    lib/
      rpc.ts                         # helpers de tipado del canal worker↔UI
      utils.ts                       # cn(), formateo
    store/
      pipeline.ts                    # Zustand: config + dirty flag + debounce
    hooks/
      useJob.ts
      usePipeline.ts

  tests/
    fixtures/
      generate.ts                    # genera PDFs de prueba (pdf-lib), sin copyright
    transforms/                      # un archivo por transform, golden files
    epub.test.ts                     # el EPUB generado pasa el validador propio
    worker.test.ts                    # el pipeline completo corre en un entorno de test con Worker

  scripts/
    sample-pdfs.sh                    # descarga PDFs de dominio público para pruebas manuales
```

---

## 4. Data Model

Sin base de datos. El "modelo de datos" son las mismas tres estructuras de la v1 — `IRDocument`, `PipelineConfig`, `DocModel` — ahora como tipos TypeScript, más el estado persistido en IndexedDB.

### 4.1 `IRDocument` — la extracción fiel del PDF

Idéntico en espíritu a la v1. Se genera una vez dentro del worker, se guarda en IndexedDB, y **nunca se modifica**.

```typescript
interface IRSpan {
  text: string;
  font: string;
  size: number;
  bold: boolean;
  italic: boolean;
  bbox: [number, number, number, number];
}

interface IRLine {
  bbox: [number, number, number, number];
  spans: IRSpan[];
}

interface IRBlock {
  id: string;                 // "p012b03" — estable, referenciable desde la UI
  type: "text" | "image";
  bbox: [number, number, number, number];
  lines?: IRLine[];           // solo si type === "text"
  assetId?: string;           // solo si type === "image": clave en el store de assets de IndexedDB
  sha256?: string;            // deduplicar logos repetidos
  width?: number;
  height?: number;
}

interface IRPage {
  index: number;
  width: number;
  height: number;
  rotation: number;
  blocks: IRBlock[];
}

interface IRDocument {
  version: 1;
  source: { filename: string; pageCount: number; sha256: string; fileSize: number };
  metadata: { title?: string; author?: string; subject?: string; creator?: string };
  outline: { level: number; title: string; page: number }[];
  pages: IRPage[];
  stats: DocumentStats;
}
```

`DocumentStats` es idéntico en propósito a la v1: `bodyFontSize`, `sizeHistogram`, `medianLineHeight`, `medianLineGap`, `textBbox`, `recurringBands`, `columnCount`, `indentBase`. Se calcula una vez en `ir/stats.ts` justo después de extraer.

**Diferencia clave respecto a la v1:** las imágenes no se guardan como archivos en disco, sino como `Blob` en un object store de IndexedDB (`assets`), referenciadas por `assetId`. Esto evita serializar bytes de imagen dentro del JSON del IR, que se volvería enorme.

### 4.2 `PipelineConfig` — igual que la v1, con una transform más

Mismo modelo (`transforms: Record<string, TransformConfig>` con `enabled` + `params`), con **`t12-language`** añadida:

| Transform | Parámetros nuevos/distintos |
|-----------|-----------|
| `language` | `passageMinChars` (50), `phraseMinWords` (2), `languages` (`["de","fr","la","it"]`), `autoAccept` (false) |

El resto de transforms (unicode, columns, runningHeads, pageNumbers, dehyphenate, joinLines, headings, chapters, images, footnotes, toc) conservan exactamente los mismos parámetros y valores por defecto que en la v1 — su lógica no depende de dónde corre, solo de datos puros.

### 4.3 `DocModel` — idéntico en forma a la v1

`Block`, `Chapter` (con `key` estable por hash del título), `DocModel` (metadata + chapters + toc + reports) — sin cambios de diseño. Se recalcula en el worker cada vez que cambia la config; el resultado vuelve al hilo principal por `postMessage`.

### 4bis. Detección de idioma — el módulo nuevo

Dos capas, como se acordó:

**Capa 1 — pasajes (automática).** `franc-min` sobre cada bloque de texto de 50+ caracteres tras aplicar `t06-joinLines` (para no evaluar líneas sueltas). Si el idioma detectado difiere del idioma principal del documento con confianza suficiente, el bloque se marca con `lang: "de"` (o el código correspondiente) en el `DocModel`, que se traduce a `xml:lang` en el XHTML final.

**Capa 2 — palabras y frases (asistida).** Sobre el texto ya unido, se buscan **secuencias de 2 o más palabras consecutivas** presentes en las listas de frecuencia de alemán/francés/latín/italiano y ausentes (o raras) en la del idioma principal. Nunca se marca una palabra aislada — el ejemplo del blueprint v1 sigue vigente: "die", "war", "so", "man" son válidas en alemán y en inglés, así que una palabra sola no es señal suficiente.

Cada coincidencia de capa 2 se acumula en `languageCandidates: { blockId, chapterId, phrase, lang, confidence }[]` y se presenta en `LanguageReview.tsx` como una lista para **confirmar en bloque o descartar** — nunca se aplica automáticamente sin que el usuario lo vea. Al confirmar, esos bloques reciben el mismo `xml:lang` que los detectados en capa 1.

### 4.4 IndexedDB — el "manifiesto" de la v1, adaptado

Base `encuadernador`, versión 1, con estos object stores:

| Store | Key | Contenido |
|-------|-----|-----------|
| `jobs` | `jobId` (string, uuid) | `{ status, createdAt, filename, pageCount, config, coverCrop, overrideKeys[] }` — equivalente al `manifest.json` de la v1 |
| `irDocuments` | `jobId` | El `IRDocument` completo, serializado (sin los blobs de imagen) |
| `assets` | `assetId` | `Blob` de cada imagen extraída |
| `overrides` | `${jobId}:${chapterKey}` | HTML saneado del editor manual |
| `covers` | `jobId` | `Blob` final de la portada renderizada |

### 4.5 Ciclo de vida

Igual que la v1 en intención: cada trabajo tiene un TTL de 24 h desde `createdAt` (guardado también en `localStorage` para el barrido rápido al arrancar sin abrir IndexedDB entero). Al iniciar la app, `storage/cleanup.ts` recorre `jobs`, borra los vencidos y sus registros asociados en `irDocuments`, `assets`, `overrides` y `covers`. Un botón "borrar ahora" hace lo mismo bajo demanda. **A diferencia de la v1, aquí el usuario controla el disco de su propia máquina** — no hay un servidor cuyo espacio proteger, pero el TTL se mantiene porque IndexedDB para un PDF de 300 páginas con imágenes puede ocupar varios cientos de MB, y limpiar solo evita que el navegador acumule basura.

---

## 5. "API Design" → Protocolo Worker↔UI

No hay API HTTP. El equivalente arquitectónico es el **contrato de mensajes** entre el hilo principal (React) y el Web Worker que hace todo el trabajo pesado. Se define con tipos discriminados y se envuelve en un cliente RPC con Promesas, así los componentes llaman funciones normales (`await pipeline.extract(file)`) sin tocar `postMessage` directamente.

### Mensajes worker → UI (eventos)

```typescript
type WorkerEvent =
  | { type: "progress"; phase: "extracting" | "building"; current: number; total: number }
  | { type: "extracted"; stats: { chapters: number; images: number; warnings: number } }
  | { type: "error"; code: string; message: string };
```

### Llamadas UI → worker (RPC con respuesta)

| Método | Entrada | Salida | Equivalente en la v1 |
|--------|---------|--------|----------------------|
| `extract(file: ArrayBuffer)` | PDF crudo | `{ jobId, irSummary }` | `POST /jobs` |
| `applyPipeline(jobId, config)` | `PipelineConfig` completa | `{ configHash, chapters[], reports, warnings, orphanedOverrides }` | `POST /jobs/{id}/pipeline` |
| `renderChapter(jobId, index, configHash)` | — | XHTML string | `GET /preview/{chapter}` |
| `saveOverride(jobId, chapterKey, html)` | HTML del editor | `{ ok: true }` (tras sanear) | `PUT /chapters/{key}` |
| `extractCoverCandidates(jobId)` | — | `Blob[]` | `GET /cover/candidates` |
| `renderCover(jobId, crop)` | rect normalizado | `Blob` (JPEG 1600×2560) | `POST /cover` |
| `build(jobId)` | — | `{ epubBlob, validation }` | `POST /build` |
| `detectLanguage(jobId)` | — | `languageCandidates[]` | *(nuevo, sin equivalente v1)* |

**Regla que se conserva de la v1:** `applyPipeline` recibe siempre la config completa, nunca un parche parcial — evita divergencias entre lo que la UI cree que mandó y lo que el worker aplicó.

**Caché:** igual que en la v1, `configHash = sha256(irSha256 + configJsonCanónico)`. Si el worker ya calculó ese hash en esta sesión, devuelve el resultado cacheado en memoria en vez de recomputar — el salto de 300 ms a unos pocos milisegundos.

### Validador propio (`epub/validate.ts`)

Sustituye a epubcheck. Comprueba, sobre el ZIP ya construido:

1. `mimetype` es la primera entrada del ZIP y **no está comprimida** (STORED, no DEFLATE) — si esto falla, ningún lector abre el archivo.
2. `META-INF/container.xml` apunta a un OPF que existe dentro del ZIP.
3. Todo `item` del manifest del OPF existe como entrada real del ZIP, y viceversa (ningún archivo huérfano).
4. Todo `idref` del `spine` tiene su `item` correspondiente en el manifest.
5. **Cada XHTML generado parsea sin error con `DOMParser`** (`text/xml`) — esto caza el fallo más común: una etiqueta sin cerrar que salió de una transform o de un override manual mal saneado.
6. `nav.xhtml` contiene un `<nav epub:type="toc">` y todos sus `href` resuelven a un `item` del manifest.
7. La portada está declarada por las dos vías: `properties="cover-image"` en el manifest (EPUB3) y `<meta name="cover" content="...">` en la metadata (compatibilidad con lectores antiguos).
8. Ningún atributo `src` o `href` apunta a una URL remota (`http://`, `https://`) — todo debe ser interno al ZIP.

El informe se muestra en `ValidationReport.tsx` con la misma forma que la v1 (`errors[]`/`warnings[]`), y la descarga se bloquea si hay `errors`. **Lo que este validador NO cubre** (y se documenta así en la UI, sin fingir cobertura completa): conformidad estricta con el esquema OPF/OCF de IDPF, accesibilidad EPUB, ni los cientos de reglas de metadata que sí revisa epubcheck. Para eso, la recomendación en pantalla es clara: *"Para una validación completa, abre el EPUB descargado en Calibre (que trae su propio comprobador) o súbelo directamente a read.amazon.com."*

---

## 6. Frontend Architecture

### Rutas

Con `react-router` en modo `HashRouter` (evita configurar rewrites de servidor, que GitHub Pages no ofrece de forma nativa para rutas de History API):

| Ruta | Página | Qué ve el usuario |
|------|--------|-------------------|
| `#/` | Subida | Dropzone a pantalla completa |
| `#/job/:id` | **Ajustes** | Panel de toggles a la izquierda, preview a la derecha. Pantalla principal |
| `#/job/:id/idioma` | Revisión de idioma | Lista de pasajes/frases detectadas, confirmar o descartar |
| `#/job/:id/portada` | Portada | Candidatas, recortador, mockup de parrilla (color y B/N) |
| `#/job/:id/exportar` | Exportar | Metadata editable, informe de validación, lector epub.js, descarga |

### Jerarquía de componentes — pantalla de Ajustes

Misma estructura que la v1 (`TransformPanel` a la izquierda con `PresetSelector`, `WarningList`, `TransformToggle × 12` ahora — once transforms más el toggle de idioma —, `PreviewPane` a la derecha con `ChapterList`, `ChapterPreview` en iframe, y `GrayscaleToggle` nuevo en la barra de la preview).

### Cliente RPC como capa de estado "de servidor"

Donde la v1 usaba TanStack Query contra el backend HTTP, aquí el mismo patrón se aplica contra el worker:

```typescript
// hooks/usePipeline.ts
const { data, mutate, isPending } = useMutation({
  mutationFn: (config: PipelineConfig) => rpc.applyPipeline(jobId, config),
  onSuccess: (result) => queryClient.setQueryData(["preview", jobId], result),
});
```

TanStack Query sigue siendo útil aquí no por hacer HTTP, sino por dar caché, invalidación y estados de carga sobre **cualquier fuente asíncrona** — y una llamada RPC al worker es asíncrona igual que un fetch.

### Flujo de estado (sin cambios de fondo respecto a la v1)

- **Config del pipeline:** store Zustand. El toggle escribe de inmediato (respuesta visual instantánea) y un debounce de 300 ms dispara `rpc.applyPipeline`.
- **Preview:** `rpc.renderChapter` devuelve XHTML que se inyecta como `srcDoc` de un iframe — mismo aislamiento de CSS que en la v1, ahora sin necesidad de servidor de por medio.
- **Nada de DocModel duplicado en el cliente.** La lista de capítulos y los reports vienen siempre de la respuesta del worker.
- **Persistencia:** cada cambio de config relevante también se escribe en IndexedDB (`jobs` store), así recargar la pestaña no pierde el trabajo — sustituye al `manifest.json` en disco de la v1.

### Preview en escala de grises — el añadido de esta versión

`GrayscaleToggle` aplica `filter: grayscale(1)` al iframe para el texto (coste cero), y para las imágenes invoca `cover/grayscale.ts`, que lee los píxeles con `getImageData`, los cuantiza a 16 niveles (`Math.round(luminance / 17) * 17`) y repinta — replicando de forma aproximada la pantalla e-ink de un Kindle Paperwhite. El mismo módulo se reutiliza en `KindlePreview.tsx` para la portada.

---

## 7. Design System

Sin cambios respecto a la v1 — el sistema visual no depende de dónde corre el backend. Se reproduce aquí completo porque este documento debe ser autocontenido.

Estética: **oscuro, denso, sin adornos.** Panel de control con una preview grande; la personalidad visual la aporta el libro, no la app.

### Colores

| Rol | Hex | Uso |
|-----|-----|-----|
| Background | `#0B0C0E` | Fondo de la aplicación |
| Surface | `#141619` | Paneles, cabecera, barra lateral |
| Surface-2 | `#1C1F24` | Campos, hover, filas activas |
| Border | `#272B31` | Todas las separaciones, sustituye a las sombras |
| Border-strong | `#3A404A` | Foco, bordes activos |
| Text | `#E6E8EB` | Texto principal |
| Text-muted | `#8A9099` | Etiquetas, descripciones, reports |
| Text-subtle | `#5B6169` | Placeholders, texto deshabilitado |
| Primary | `#5B8CFF` | Acción principal, toggles activos, foco |
| Primary-hover | `#7BA3FF` | Hover de la acción principal |
| Success | `#3FB950` | Validación correcta |
| Warning | `#D29922` | Avisos accionables |
| Destructive | `#F85149` | Errores de validación, borrar |
| Paper | `#FBF7EF` | Fondo de la preview |
| Paper-text | `#1A1A1A` | Texto de la preview |

Foco visible siempre: `outline: 2px solid #5B8CFF; outline-offset: 2px`.

### Tipografía

| Rol | Fuente | Tamaño | Peso |
|-----|--------|--------|------|
| Títulos de la app | Inter Variable | 15/18/22px | 600 |
| Cuerpo de la app | Inter Variable | 13px | 400 |
| Etiquetas y reports | Inter Variable | 12px | 400–500 |
| Números y hashes | JetBrains Mono | 12px | 400 |
| Preview del libro | Literata | 16px base | 400 |

### Espaciado y layout

Escala 4px (4, 8, 12, 16, 24, 32, 48) · radio 6px general / 8px paneles / 4px badges · panel de ajustes 360px fijos · preview `flex-1` con `max-width: 760px` · breakpoints `md` 768 / `lg` 1024 / `xl` 1280. Densidad para escritorio; usable pero no optimizada por debajo de 1024px.

### Estilo de componentes

Sin sombras salvo overlays (`0 16px 48px rgba(0,0,0,0.6)`). Bordes de 1px definen las superficies. Botones sólidos para la acción principal, `ghost` para el resto. Transiciones de 120 ms `ease-out` solo en `background-color`, `border-color`, `opacity`.

### CSS del EPUB (`kindleStyles.ts`) — mismas reglas duras que la v1

```css
/* NUNCA fijar font-family ni font-size en body: pisa las preferencias del lector */
body { margin: 0; padding: 0; text-align: justify; }
p { margin: 0; text-indent: 1.2em; line-height: 1.5; }
p.first, h1 + p, h2 + p, h3 + p, blockquote + p { text-indent: 0; }
h1, h2, h3 { text-align: left; page-break-after: avoid; margin: 1.2em 0 0.6em; }
h1 { font-size: 1.6em; page-break-before: always; }
h2 { font-size: 1.3em; }
h3 { font-size: 1.1em; }
div.img-block { text-align: center; margin: 1em 0; page-break-inside: avoid; }
div.img-block img { max-width: 100%; height: auto; }
figcaption { font-size: 0.85em; font-style: italic; text-align: center; margin-top: 0.4em; }
blockquote { margin: 1em 2em; font-style: italic; }
```

---

## 8. Authentication & Authorization

**No aplica.** No hay servidor, no hay cuentas, no hay sesión que proteger — todo corre en la pestaña del navegador del usuario.

### Lo que sí hay que cuidar, sin servidor de por medio

| Riesgo | Mitigación |
|--------|-----------|
| XSS vía HTML del editor manual | Saneado con allowlist **en el hilo principal, antes de guardar en IndexedDB** (usar `dompurify`, ya que no hay servidor que haga de segunda barrera). El iframe de preview usa `sandbox="allow-same-origin"`, sin `allow-scripts` |
| XSS vía metadata del PDF | Título y autor se escapan antes de insertarse en el XHTML y el OPF — igual que en la v1, ahora con `escape-html` en el cliente |
| PDF malformado que cuelgue el worker | Timeout de extracción (45 s) gestionado desde el hilo principal con `Worker.terminate()` si se excede |
| Consumo de cuota de IndexedDB | TTL de 24 h + `navigator.storage.estimate()` para avisar si queda poco espacio antes de aceptar una subida |
| Fuga de datos del PDF a terceros | **Ninguna petición de red sale con contenido del PDF** — es una propiedad arquitectónica (no hay backend al que enviarlo), no una política a mantener. El único tráfico de red de la app es la carga inicial del bundle y el WASM, servidos de forma estática |
| Content Security Policy | `default-src 'self'; worker-src 'self' blob:; connect-src 'self'` en meta tag o en la config de Pages — ningún dominio externo debería poder recibir datos |

---

## 9. Build Order

Se conserva el espíritu de la v1: cada paso deja algo funcionando y verificable. El orden cambia porque desaparecen los pasos de Docker/API y aparecen los de despliegue estático.

---

**Paso 1 — Andamiaje, Vite y primer despliegue a Pages**

```bash
pnpm create vite@latest encuadernador -- --template react-ts
cd encuadernador
pnpm add tailwindcss @tailwindcss/vite zustand @tanstack/react-query \
  react-router-dom mupdf fflate idb franc-min dompurify escape-html
pnpm add -D vite-plugin-pwa vitest @playwright/test
pnpm dlx shadcn@latest init
```

Configurar `vite.config.ts` con `base: '/encuadernador/'` (o el nombre real del repo — obligatorio para que los assets resuelvan en GitHub Pages, que sirve desde un subpath). Crear `.github/workflows/deploy.yml` que compile con `pnpm build` y publique `dist/` a Pages usando `actions/deploy-pages`.

**Entregable — el más importante de este paso:** hacer push a `main` y comprobar que `https://<usuario>.github.io/encuadernador/` sirve la página de Vite por defecto. **Confirmar esto ahora**, antes de escribir ninguna lógica: es la prueba de que el pipeline de despliegue funciona, y todo lo que sigue se construye encima con confianza.

---

**Paso 2 — Worker, protocolo RPC y extracción con mupdf.js**

Implementar `worker/protocol.ts`, `worker/rpcClient.ts`, `worker/pipeline.worker.ts` con un `extract()` mínimo que solo cuenta páginas. Verificar que mupdf.js carga su WASM correctamente dentro de un Worker (requiere que Vite copie el `.wasm` como asset — comprobar con `?url` o el plugin correspondiente).

Entregable: subir un PDF por el Dropzone y ver en consola `{ pageCount: N }` calculado dentro del worker.

---

**Paso 3 — IR completo con coordenadas, fuentes e imágenes**

`ir/schema.ts`, `ir/extract.ts` con `toStructuredText().asJSON()`, `ir/stats.ts`. Guardar el resultado en IndexedDB (`irDocuments` store) y las imágenes como `Blob` en `assets`.

Claves de implementación (heredadas de la v1, adaptadas a la API de mupdf.js):
- Negrita/cursiva: mupdf.js expone flags similares a PyMuPDF en los spans del JSON estructurado — verificar el nombre exacto del campo en la versión instalada y, si falta, complementar detectando `"Bold"`/`"Black"` en el nombre de fuente.
- Imágenes: **este es el punto de mayor riesgo técnico del proyecto.** Intentar primero la extracción nativa de imágenes embebidas; si mupdf.js no las expone de forma fiable para un PDF dado, hacer *fallback* renderizando la región del bbox a 2× con el propio renderer de mupdf.js a un canvas y recortando. Aceptar que esto es una degradación consciente de calidad, documentada, no un bug.
- `stats.recurringBands`: mismo algoritmo que la v1 — franjas del 12% superior/inferior de cada página, normalizadas, presentes en ≥25% de las páginas.
- Emitir eventos `progress` cada 10 páginas vía `postMessage`.

Entregable: extraer un PDF de 300 páginas en menos de 45 s, con el IR completo inspeccionable desde DevTools (IndexedDB tab).

---

**Paso 4 — Transforms, con tests primero**

Igual que la v1: generar fixtures controlados primero (`tests/fixtures/generate.ts` con `pdf-lib`, el equivalente en JS a ReportLab), luego implementar las doce transforms en el orden de `registry.ts`. **`t06-joinLines` sigue siendo la transform que justifica el proyecto** — mismo algoritmo de corte de párrafo que en la v1 (hueco vertical vs. `medianLineGap`, sangría de línea siguiente, línea corta que termina en puntuación).

Añadir aquí `t12-language.ts` con las dos capas descritas en la sección 4bis, con sus propios tests: frases claramente en alemán/francés detectadas, palabras ambiguas ("die", "so", "man") explícitamente **no** marcadas cuando aparecen solas.

Entregable: suite de tests en verde para las doce transforms, corriendo con Vitest en Node (las transforms son funciones puras sin dependencia del DOM, así que no necesitan un navegador para testearse).

---

**Paso 5 — Pipeline completo dentro del worker, con caché**

Cablear `registry.ts` en `pipeline.worker.ts`: recibir `applyPipeline(jobId, config)`, leer el IR de IndexedDB, aplicar las transforms activas, aplicar los overrides guardados, devolver `DocModel` + reports + warnings. Cachear por `configHash` en un `Map` en memoria del worker (se pierde al recargar, que es aceptable — el recalculo es rápido).

Entregable: desde la consola del navegador, invocar `rpc.applyPipeline(jobId, config)` dos veces con la misma config y comprobar que la segunda es prácticamente instantánea.

---

**Paso 6 — Renderizador XHTML y preview**

`epub/render.ts` (Block[] → XHTML) y `epub/templates/kindleStyles.ts`. **Regla inviolable heredada de la v1:** preview y build final usan exactamente la misma función `renderChapter()`.

Entregable: `rpc.renderChapter(jobId, 0, configHash)` devuelve XHTML legible, inyectable directamente en un iframe.

---

**Paso 7 — Frontend: subida, progreso y pantalla de ajustes completa**

Dropzone, `ExtractionProgress` sobre los eventos del worker, y la pantalla de Ajustes completa (panel + preview) con Zustand y debounce de 300 ms. Cuidar: restaurar el scroll del iframe tras cada refetch, `onValueCommit` en los sliders (no `onValueChange`), skeleton en los reports en vez de parpadeo.

**Este es el paso más valioso del proyecto, igual que en la v1.** No avanzar al 8 sin calibrar los valores por defecto contra al menos cinco PDFs reales y distintos (novela, ensayo, manual técnico, paper a dos columnas, libro ilustrado).

---

**Paso 8 — Revisión de idioma**

`LanguageReview.tsx`: lista de pasajes (capa 1) y frases (capa 2) detectados, con checkbox de confirmación y "confirmar todo lo de este idioma". Al confirmar, el worker regenera el `DocModel` con los `xml:lang` aplicados.

Entregable: un PDF con una cita en alemán la marca correctamente; una frase con "die" y "so" sueltas en contexto en inglés **no** se marca.

---

**Paso 9 — Editor de capítulos**

TipTap con el mismo esquema restringido de la v1, en un `Sheet`. Saneado con `dompurify` (allowlist equivalente a `bleach` en la v1) **antes de escribir en IndexedDB** — aquí no hay servidor que haga de segunda línea de defensa, así que este saneado es la única barrera y debe ser estricto.

Lógica de overrides huérfanos: idéntica a la v1— nunca se borran en silencio al recalcular el pipeline.

---

**Paso 10 — Portada, con preview en escala de grises**

`cover/extract.ts` (candidatas: página 1 renderizada + imágenes grandes del IR), `cover/render.ts` (recorte + resize a 1600×2560 vía `OffscreenCanvas`), `cover/grayscale.ts` (cuantización a 16 niveles). Frontend: `CoverPicker`, `CoverCropper` (react-easy-crop, ratio 1:1.6), `KindlePreview` con toggle color/B-N.

---

**Paso 11 — Constructor de EPUB**

`epub/builder.ts` con `fflate`. Mismos requisitos que la v1: EPUB3 con `nav.xhtml` + NCX heredado, portada declarada dos veces, UUID único, `dc:language` correcto, un XHTML por capítulo, notas al pie con `epub:type="footnote"`.

Entregable: un `.epub` que se abre en Calibre y Apple Books con índice navegable y portada visible. Verificar también en un Kindle real si se tiene acceso a uno — sigue siendo la prueba que más vale la pena de todo el proyecto.

---

**Paso 12 — Validador propio y descarga**

`epub/validate.ts` con las ocho comprobaciones de la sección 5. `ValidationReport.tsx` bloquea la descarga si hay `errors`, no si solo hay `warnings`. Botón de descarga con "borrar ahora" al lado.

---

**Paso 13 — PWA y almacenamiento offline**

`vite-plugin-pwa` con `registerType: 'autoUpdate'`, cacheando el bundle y el `.wasm` de mupdf. `storage/cleanup.ts` ejecutándose al arrancar. Verificar que la app carga y procesa un PDF **sin conexión** tras la primera visita.

---

**Paso 14 — Pulido**

Estados de carga y vacíos, error boundaries, atajos de teclado (`←`/`→`, `E`, `⌘S`), toasts con `sonner`, navegación por teclado en el panel de toggles. Textos de error en español, concretos y accionables.

---

**Paso 15 — Tests E2E y CI**

Playwright sobre el flujo completo: subir fixture → esperar extracción → cambiar toggles → confirmar idioma → editar capítulo → recortar portada → construir → validar → descargar → comprobar que el `.epub` pasa el validador propio. `.github/workflows/ci.yml` corre esto en cada PR; `deploy.yml` solo despliega desde `main` tras CI en verde.

---

## 10. Environment Setup

### Prerrequisitos

- Un navegador moderno (Chrome, Edge, Firefox, Safari recientes) — es todo lo que necesita el **usuario final**, y no requiere ningún permiso especial.
- Para **desarrollar**: Node 20+ y pnpm. Ninguno de los dos requiere permisos de administrador:
  - Windows: `fnm` (binario único, sin instalador) o el `.zip` portable de Node descomprimido en la carpeta de usuario.
  - macOS: `nvm` instala en `~/.nvm`, sin `sudo`.
  - Alternativa sin instalar nada localmente: desarrollar dentro de **StackBlitz** o **CodeSandbox** (WebContainers — Node corriendo dentro del propio navegador), o directamente en una sesión de Claude Code en la nube, empujando a GitHub desde ahí.

### Variables de entorno

Ninguna es obligatoria para producción — es un sitio estático. Para desarrollo, opcional:

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `VITE_JOB_TTL_HOURS` | Horas antes de que `cleanup.ts` borre un trabajo | `24` |
| `VITE_EXTRACTION_TIMEOUT_S` | Timeout del worker de extracción | `45` |
| `VITE_MAX_UPLOAD_MB` | Aviso en UI si el PDF supera este tamaño (no es un límite duro — depende de la memoria del navegador) | `150` |

### Comandos de arranque

```bash
git clone https://github.com/<usuario>/encuadernador
cd encuadernador
pnpm install
pnpm dev          # http://localhost:5173
```

Build y verificación local del build de producción:

```bash
pnpm build
pnpm preview      # sirve dist/ localmente, para probar el resultado exacto de Pages
```

Tests:

```bash
pnpm test              # Vitest — transforms y lógica pura
pnpm exec playwright test   # E2E completo
pnpm typecheck          # tsc --noEmit, strict
```

---

## 11. Dependencies

### Core

| Paquete | Para qué |
|---------|----------|
| `react` / `react-dom` | UI |
| `react-router-dom` | Rutas (modo hash, por Pages) |
| `zustand` | Estado del panel de ajustes |
| `@tanstack/react-query` | Caché y estados de carga sobre las llamadas RPC al worker |
| `mupdf` | Extracción de PDF con coordenadas, fuentes e imágenes (WASM) |
| `fflate` | Compresión ZIP para construir el `.epub` |
| `idb` | Wrapper ergonómico sobre IndexedDB |
| `franc-min` | Detección de idioma por pasaje (capa 1) |
| `dompurify` | Saneado del HTML del editor antes de persistir |
| `escape-html` | Escapado de metadata (título, autor) antes de insertarla en XHTML/OPF |
| `react-dropzone` | Subida por arrastre |
| `react-easy-crop` | Recorte de portada |
| `@tiptap/react` + `@tiptap/starter-kit` | Editor de capítulos |
| `epubjs` | Lector del EPUB final en la pantalla de exportar |
| `@radix-ui/*` (vía shadcn) | Primitivas de componentes |
| `lucide-react` | Iconos |
| `sonner` | Toasts |
| `zod` | Validación de los mensajes RPC en el límite worker↔UI |

### Dev

| Paquete | Para qué |
|---------|----------|
| `vite` + `@vitejs/plugin-react` | Build |
| `vite-plugin-pwa` | Service worker, manifest, caché offline |
| `typescript` | Tipos en modo estricto |
| `vitest` | Tests unitarios de transforms |
| `@playwright/test` | E2E |
| `pdf-lib` | Genera los PDFs de fixture — sin copyright, reproducibles |
| `eslint` + `eslint-config-react` | Lint |
| `prettier` + `prettier-plugin-tailwindcss` | Formato |

---

## 12. Deployment Strategy

### Hosting

**GitHub Pages**, sitio estático servido directamente desde `dist/`. Sin servidor, sin contenedor, sin variable de entorno secreta que gestionar — el `HTTPS` y el certificado los da GitHub.

### CI/CD

```
push a main → ci.yml: typecheck + lint + tests + build
            → deploy.yml: build de producción → sube dist/ como Pages artifact → despliega
PR → ci.yml corre, sin desplegar (Pages no tiene "preview deploys" nativos sin plan de pago;
     para previsualizar una rama, correr `pnpm build && pnpm preview` en local)
```

`deploy.yml` de referencia:

```yaml
name: Deploy a GitHub Pages
on:
  push: { branches: [main] }
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

En el repositorio, **Settings → Pages → Source: GitHub Actions** (no "Deploy from a branch") — es lo que habilita que este workflow sea el que publica.

### Dominio

El dominio por defecto `https://<usuario>.github.io/encuadernador/` es suficiente para uso personal. Si se quiere un dominio propio, GitHub Pages soporta `CNAME` sin coste adicional de hosting (solo el registro del dominio).

### Entornos

Uno solo: producción, servida desde `main`. Sin staging — es una herramienta personal de un solo desarrollador; `pnpm preview` en local cumple ese papel cuando hace falta.

---

## 13. Testing Strategy

Igual que en la v1, la calidad del producto **es** la calidad de las transforms — esta sección no ha cambiado de filosofía, solo de runtime.

### Tests unitarios (Vitest)

Un archivo por transform, golden files generados con `pdf-lib`, mismos casos límite que la v1 (guion en nombre propio partido, línea corta de diálogo, cabecera en páginas pares, imagen decorativa repetida, número de página en romanos). Nuevo: tests de `t12-language` con casos de frases claras y de palabras ambiguas que deliberadamente no deben dispararse.

### Tests de integración

Como no hay HTTP, la integración se prueba invocando el worker real desde un entorno de test con soporte de `Worker` (Vitest con `environment: 'happy-dom'` más un shim, o directamente Playwright component testing si `happy-dom` no soporta bien los Workers — decidir en el paso 2 según lo que dé menos fricción). Flujo probado: extraer → aplicar dos configs distintas y comprobar reports diferentes → guardar override → construir → comprobar que el override aparece en el EPUB final.

**Test obligatorio:** el EPUB construido a partir de cada fixture pasa las ocho comprobaciones del validador propio.

### E2E (Playwright)

Un test del flujo feliz completo (paso 15), corriendo contra `pnpm preview` en CI — así se prueba el build real de producción, no el servidor de desarrollo.

### Lo que no se testea

Rendimiento con PDFs gigantes (a mano), compatibilidad real con Kindle físico (a mano antes de cerrar el paso 11), exactitud de la simulación de escala de grises frente al panel e-ink real (aproximación deliberada, no ciencia exacta).

---

## 14. Skills to Use During Build

| Skill | Cuándo usarla | Por qué |
|-------|---------------|---------|
| `/shadcn-ui` | Paso 1 y Paso 7 | Instalar y adaptar Switch, Slider, Sheet, Tabs, Tooltip, Collapsible, Dialog |
| `/frontend-design` | Paso 7 y Paso 10 | La pantalla de ajustes y la de portada son UI densa con bucle de feedback en tiempo real |
| `/ui-ux-pro-max` | Paso 7, antes de escribir CSS | Refinar el sistema oscuro de la sección 7 |
| `/playwright-cli` | Paso 15 | Montar el E2E y depurar selectores |
| `/pdf` | Pasos 3 y 4 | Inspeccionar PDFs problemáticos a mano |
| `/code-review` | Tras los pasos 4, 11 y 12 | Las transforms y el builder de EPUB son donde se esconden los bugs sutiles |
| `/security-review` | Antes del paso 15 | Repasar el saneado de HTML del editor y la CSP |

---

## 15. CLAUDE.md for Target Project

```markdown
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
```

---

## 16. Reglas No Negociables (del blueprint)

1. **No arrancar el paso 7 (frontend de ajustes) antes de tener las doce transforms con tests en verde.** La UI sin heurísticas decentes es una carcasa vacía.
2. **El paso 1 (primer despliegue a Pages) se verifica antes de escribir ninguna lógica de negocio.** Es la prueba de que "tener una dirección web para probar" funciona, y todo lo demás se construye con esa confianza ya ganada.
3. **`t06-joinLines` es la transform crítica.** Merece más tests que ninguna otra.
4. **La extracción de imágenes (paso 3) es el punto de mayor riesgo técnico.** Si mupdf.js no da una extracción nativa fiable para un PDF dado, el *fallback* a rasterizado por canvas se documenta como degradación consciente, no se oculta.
5. **El idioma nunca se marca por una palabra suelta.** Repetido a propósito: es el error que convertiría una función útil en una molestia de falsos positivos.
6. **Nunca fijar tipografía en el `body` del EPUB.**
7. **Sin backend, sin base de datos, sin cuentas, sin biblioteca en la nube.** Las cuatro parecerán buena idea a mitad del build. Están fuera de alcance por decisión de diseño.
8. **El PDF no sale del navegador.** Ninguna llamada de red lleva su contenido. Verificar esto por inspección de la pestaña Network antes de dar cualquier paso por cerrado.
9. **Verificar el EPUB en Calibre y, si es posible, en un Kindle físico** antes de cerrar el paso 11 — el validador propio no sustituye a epubcheck, solo cubre lo más común.
