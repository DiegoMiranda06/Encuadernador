/**
 * kindle.css como string TS, inyectado inline en cada XHTML — así preview (iframe `srcDoc`,
 * sin acceso a un archivo externo) y build final (ZIP) renderizan exactamente el mismo HTML,
 * sin ninguna rama que dependa del contexto (regla no negociable #4).
 *
 * Regla no negociable #2: nunca fijar font-family ni font-size en el body — pisaría las
 * preferencias del lector del Kindle.
 */
export const KINDLE_STYLES = `
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
`.trim()
