import type { IRLine, IRPage, IRSpan } from '@/ir/schema'
import { computeStats } from '@/ir/stats'
import type { Transform } from './base'

const DEFAULT_GAP_FACTOR = 1.6
const INDENT_THRESHOLD = 8
const SHORT_LINE_THRESHOLD = 20
const TERMINAL_PUNCTUATION = /[.!?:;»”"')\]]$/

/**
 * Tres señales de que la línea siguiente empieza un párrafo nuevo (no es la continuación
 * envuelta de la actual): un hueco vertical mayor al normal del documento, una sangría de
 * primera línea, o que la línea actual sea corta (no llega al margen derecho habitual del
 * bloque) y termine en puntuación de cierre de oración.
 */
function isParagraphBreak(
  prev: IRLine,
  next: IRLine,
  medianGap: number,
  blockRightEdge: number,
  gapFactor: number,
): boolean {
  const gap = next.bbox[1] - prev.bbox[3]
  if (medianGap > 0 && gap > medianGap * gapFactor) return true

  if (next.bbox[0] - prev.bbox[0] > INDENT_THRESHOLD) return true

  const prevText = prev.spans
    .map((span) => span.text)
    .join('')
    .trim()
  const isShort = blockRightEdge - prev.bbox[2] > SHORT_LINE_THRESHOLD
  return isShort && TERMINAL_PUNCTUATION.test(prevText)
}

function mergeLines(a: IRLine, b: IRLine): IRLine {
  const lastSpan = a.spans.at(-1)
  const spans: IRSpan[] = lastSpan
    ? [...a.spans.slice(0, -1), { ...lastSpan, text: `${lastSpan.text} ` }, ...b.spans]
    : [...b.spans]
  return {
    bbox: [
      Math.min(a.bbox[0], b.bbox[0]),
      Math.min(a.bbox[1], b.bbox[1]),
      Math.max(a.bbox[2], b.bbox[2]),
      Math.max(a.bbox[3], b.bbox[3]),
    ],
    spans,
  }
}

function joinBlockLines(
  lines: IRLine[],
  medianGap: number,
  gapFactor: number,
): { lines: IRLine[]; changed: number } {
  if (lines.length === 0) return { lines, changed: 0 }
  const rightEdge = Math.max(...lines.map((line) => line.bbox[2]))

  const result: IRLine[] = []
  let changed = 0
  let current = lines[0]

  for (let i = 1; i < lines.length; i++) {
    const next = lines[i]
    if (isParagraphBreak(current, next, medianGap, rightEdge, gapFactor)) {
      result.push(current)
      current = next
    } else {
      current = mergeLines(current, next)
      changed++
    }
  }
  result.push(current)

  return { lines: result, changed }
}

/**
 * La transform que justifica el proyecto: une las líneas que el PDF envolvió por ancho de
 * página en un solo párrafo fluido, y respeta los saltos de párrafo reales. Corre después de
 * t05-dehyphenate (las palabras cortadas por guion ya están unidas).
 *
 * `params.gapFactor` (por defecto 1.6): qué tan grande, relativo al hueco típico del documento,
 * tiene que ser un espacio vertical para leerse como salto de párrafo. El único ajuste en vivo
 * expuesto en el Paso 7 — subirlo une más líneas (menos párrafos falsos), bajarlo separa más.
 */
export const t06JoinLines: Transform = (pages, params) => {
  const { medianLineGap } = computeStats(pages)
  const gapFactor = typeof params.gapFactor === 'number' ? params.gapFactor : DEFAULT_GAP_FACTOR
  let changed = 0

  const outputPages: IRPage[] = pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => {
      if (block.type !== 'text' || !block.lines || block.lines.length < 2) return block
      const { lines, changed: blockChanged } = joinBlockLines(block.lines, medianLineGap, gapFactor)
      changed += blockChanged
      return blockChanged === 0 ? block : { ...block, lines }
    }),
  }))

  return { pages: outputPages, report: { transform: 't06-joinLines', changed, warnings: [] } }
}
