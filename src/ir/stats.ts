import type { DocumentStats, IRBlock, IRPage, RecurringBand } from './schema'

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function mode(values: number[]): number {
  if (values.length === 0) return 0
  const counts = new Map<number, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  let best = values[0]
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }
  return best
}

/** Normaliza texto de candidatos a cabecera/pie: colapsa dígitos, para que "Página 12" y "Página 47" cuenten como la misma banda. Se reusa en t03-runningHeads para volver a calcular la misma clave. */
export function normalizeBandText(text: string): string {
  return text.trim().toLowerCase().replace(/\d+/g, '#')
}

/** Franja del 12% superior/inferior de la página — el mismo umbral que usa computeStats. */
export function bandPosition(y0: number, y1: number, pageHeight: number): 'top' | 'bottom' | null {
  if (y1 <= pageHeight * 0.12) return 'top'
  if (y0 >= pageHeight * 0.88) return 'bottom'
  return null
}

/**
 * El tamaño de fuente que ocupa más caracteres en total — se reusa en t07-headings y
 * t10-footnotes, que corren después de t08-chapters y ya no tienen IRPage[] a mano, solo
 * Chapter[] (bloques ya agrupados, sin la noción de página).
 */
export function computeBodyFontSize(blocks: IRBlock[]): number {
  const sizeCounts = new Map<number, number>()
  for (const block of blocks) {
    if (block.type !== 'text' || !block.lines) continue
    for (const line of block.lines) {
      for (const span of line.spans) {
        const rounded = Math.round(span.size)
        sizeCounts.set(rounded, (sizeCounts.get(rounded) ?? 0) + span.text.length)
      }
    }
  }

  let bodyFontSize = 0
  let bodyFontCount = 0
  for (const [size, count] of sizeCounts) {
    if (count > bodyFontCount) {
      bodyFontSize = size
      bodyFontCount = count
    }
  }
  return bodyFontSize || 12
}

export function computeStats(pages: IRPage[]): DocumentStats {
  const sizeCounts = new Map<number, number>()
  const lineHeights: number[] = []
  const lineGaps: number[] = []
  const lineX0s: number[] = []
  let textX0 = Infinity
  let textY0 = Infinity
  let textX1 = -Infinity
  let textY1 = -Infinity

  // Candidatos a banda recurrente: clave = posición + texto normalizado.
  const bandCandidates = new Map<
    string,
    { position: 'top' | 'bottom'; occurrences: number; bboxSum: [number, number, number, number]; sampleText: string }
  >()

  for (const page of pages) {
    let previousLineBottom: number | null = null

    for (const block of page.blocks) {
      if (block.type !== 'text' || !block.lines) continue
      textX0 = Math.min(textX0, block.bbox[0])
      textY0 = Math.min(textY0, block.bbox[1])
      textX1 = Math.max(textX1, block.bbox[2])
      textY1 = Math.max(textY1, block.bbox[3])

      for (const line of block.lines) {
        const [x0, y0, x1, y1] = line.bbox
        lineHeights.push(y1 - y0)
        lineX0s.push(Math.round(x0))
        if (previousLineBottom !== null) {
          const gap = y0 - previousLineBottom
          if (gap > 0) lineGaps.push(gap)
        }
        previousLineBottom = y1

        const lineText = line.spans.map((span) => span.text).join('')
        for (const span of line.spans) {
          const rounded = Math.round(span.size)
          sizeCounts.set(rounded, (sizeCounts.get(rounded) ?? 0) + span.text.length)
        }

        const position = bandPosition(y0, y1, page.height)
        if (position && lineText.trim()) {
          const key = `${position}:${normalizeBandText(lineText)}`
          const existing = bandCandidates.get(key)
          if (existing) {
            existing.occurrences += 1
            existing.bboxSum = [
              existing.bboxSum[0] + x0 / page.width,
              existing.bboxSum[1] + y0 / page.height,
              existing.bboxSum[2] + x1 / page.width,
              existing.bboxSum[3] + y1 / page.height,
            ]
          } else {
            bandCandidates.set(key, {
              position,
              occurrences: 1,
              bboxSum: [x0 / page.width, y0 / page.height, x1 / page.width, y1 / page.height],
              sampleText: lineText.trim(),
            })
          }
        }
      }
    }
  }

  let bodyFontSize = 0
  let bodyFontCount = 0
  for (const [size, count] of sizeCounts) {
    if (count > bodyFontCount) {
      bodyFontSize = size
      bodyFontCount = count
    }
  }

  const sizeHistogram: Record<string, number> = {}
  for (const [size, count] of sizeCounts) sizeHistogram[size] = count

  // Al menos 2 ocurrencias siempre — con pocas páginas, el 25% redondea a 1, y una línea que
  // aparece una sola vez no es "recurrente" por definición.
  const minOccurrences = Math.max(2, Math.ceil(pages.length * 0.25))
  const recurringBands: RecurringBand[] = []
  for (const candidate of bandCandidates.values()) {
    if (candidate.occurrences < minOccurrences) continue
    recurringBands.push({
      position: candidate.position,
      occurrences: candidate.occurrences,
      sampleText: candidate.sampleText,
      bbox: candidate.bboxSum.map((sum) => sum / candidate.occurrences) as [number, number, number, number],
    })
  }

  // Heurística simple para columnas: agrupa los x0 de línea en mitad izquierda/derecha de la
  // página. Si ambas mitades concentran suficientes líneas, se asume a dos columnas. Se afina
  // cuando exista t02-columns (Paso 4) contra PDFs reales a dos columnas.
  const pageWidths = pages.map((page) => page.width)
  const medianPageWidth = median(pageWidths)
  const leftHalf = lineX0s.filter((x0) => x0 < medianPageWidth * 0.5).length
  const rightHalf = lineX0s.filter((x0) => x0 >= medianPageWidth * 0.5).length
  const columnCount =
    lineX0s.length > 0 && leftHalf / lineX0s.length > 0.15 && rightHalf / lineX0s.length > 0.15 ? 2 : 1

  return {
    bodyFontSize: bodyFontSize || 12,
    sizeHistogram,
    medianLineHeight: median(lineHeights),
    medianLineGap: median(lineGaps),
    textBbox:
      textX0 === Infinity ? [0, 0, 0, 0] : [textX0, textY0, textX1, textY1],
    recurringBands,
    columnCount,
    indentBase: mode(lineX0s),
  }
}
