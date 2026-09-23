import escapeHtml from 'escape-html'
import type { IRBlock, IRLine } from '@/ir/schema'
import type { Chapter } from '@/model/document'
import { KINDLE_STYLES } from './templates/kindleStyles'

export interface RenderChapterOptions {
  /** `xml:lang` del documento — el idioma principal confirmado (Paso 8 lo afina por bloque). */
  language: string
  /** Preview usa una `blob:` URL; el build final (Paso 11), una ruta relativa dentro del ZIP. */
  resolveAssetHref: (assetId: string) => string
}

function renderSpans(line: IRLine): string {
  return line.spans
    .map((span) => {
      let text = escapeHtml(span.text)
      if (span.bold) text = `<strong>${text}</strong>`
      if (span.italic) text = `<em>${text}</em>`
      return text
    })
    .join('')
}

function headingTag(level: number): 'h1' | 'h2' | 'h3' {
  if (level <= 1) return 'h1'
  if (level === 2) return 'h2'
  return 'h3'
}

/** ` xml:lang="..."` si el usuario confirmó un idioma distinto para este bloque (Paso 8) — nunca antes. */
function langAttr(block: IRBlock): string {
  return block.lang ? ` xml:lang="${escapeHtml(block.lang)}"` : ''
}

function renderTextBlock(block: IRBlock, paragraphState: { firstRendered: boolean }): string {
  const lines = block.lines ?? []
  const lang = langAttr(block)

  if (block.headingLevel) {
    const tag = headingTag(block.headingLevel)
    const text = lines.map(renderSpans).join(' ')
    return `<${tag}${lang}>${text}</${tag}>`
  }

  return lines
    .map((line) => {
      const text = renderSpans(line)
      // epub3 no exige un noteref emparejado: el marcador de la nota ya viene como texto normal
      // en el cuerpo (parte del PDF original) — esta es una simplificación consciente, documentada.
      if (block.isFootnote) return `<aside epub:type="footnote" id="fn-${block.id}"${lang}><p>${text}</p></aside>`

      const isFirst = !paragraphState.firstRendered
      paragraphState.firstRendered = true
      return isFirst ? `<p class="first"${lang}>${text}</p>` : `<p${lang}>${text}</p>`
    })
    .join('\n')
}

function renderImageBlock(block: IRBlock, resolveAssetHref: (assetId: string) => string): string {
  if (!block.assetId) return ''
  const href = escapeHtml(resolveAssetHref(block.assetId))
  return `<div class="img-block"><img src="${href}" alt=""/></div>`
}

function renderChapterBody(chapter: Chapter, options: RenderChapterOptions): string {
  const paragraphState = { firstRendered: false }
  return chapter.blocks
    .map((block) =>
      block.type === 'image'
        ? renderImageBlock(block, options.resolveAssetHref)
        : renderTextBlock(block, paragraphState),
    )
    .filter(Boolean)
    .join('\n')
}

/**
 * `Chapter` → XHTML. Compartida por la preview (iframe `srcDoc`) y el build final (Paso 11) —
 * la única diferencia entre ambos contextos es cómo `resolveAssetHref` resuelve la URL de cada
 * imagen. Cualquier otra divergencia entre preview y build es un bug crítico (regla no
 * negociable #4). Si el capítulo tiene un override manual guardado (Paso 9, ya saneado con
 * dompurify antes de persistir), se usa tal cual en vez de recalcular el cuerpo desde los blocks.
 */
export function renderChapterXhtml(chapter: Chapter, options: RenderChapterOptions): string {
  const title = escapeHtml(chapter.title)
  const body = chapter.overrideHtml ?? renderChapterBody(chapter, options)

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!DOCTYPE html>',
    `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${options.language}">`,
    '<head>',
    '<meta charset="utf-8"/>',
    `<title>${title}</title>`,
    `<style type="text/css">${KINDLE_STYLES}</style>`,
    '</head>',
    `<body>\n${body}\n</body>`,
    '</html>',
  ].join('\n')
}
