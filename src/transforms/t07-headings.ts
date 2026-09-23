import type { IRLine, IRPage } from '@/ir/schema'
import { computeStats } from '@/ir/stats'
import type { Transform } from './base'

const HEADING_SIZE_FACTOR = 1.15

function dominantSize(line: IRLine): number {
  const counts = new Map<number, number>()
  for (const span of line.spans) {
    const rounded = Math.round(span.size)
    counts.set(rounded, (counts.get(rounded) ?? 0) + span.text.length)
  }
  let best = 0
  let bestCount = -1
  for (const [size, count] of counts) {
    if (count > bestCount) {
      best = size
      bestCount = count
    }
  }
  return best
}

/** Un bloque es candidato a encabezado si todas sus líneas comparten el mismo tamaño de fuente
 * dominante y ese tamaño supera claramente el cuerpo del texto. */
function headingCandidateSize(lines: IRLine[], threshold: number): number | null {
  if (lines.length === 0) return null
  const sizes = lines.map(dominantSize)
  const first = sizes[0]
  if (first <= threshold) return null
  if (!sizes.every((size) => Math.abs(size - first) < 0.5)) return null
  return first
}

/**
 * Marca bloques de encabezado según su tamaño de fuente, relativo al cuerpo del texto
 * (bodyFontSize de computeStats). Los tamaños de encabezado distintos del documento se
 * ordenan de mayor a menor para asignar headingLevel: 1 (título), 2, 3...
 */
export const t07Headings: Transform = (pages) => {
  const { bodyFontSize } = computeStats(pages)
  const threshold = bodyFontSize * HEADING_SIZE_FACTOR

  const candidateSizes = new Set<number>()
  for (const page of pages) {
    for (const block of page.blocks) {
      if (block.type !== 'text' || !block.lines) continue
      const size = headingCandidateSize(block.lines, threshold)
      if (size !== null) candidateSizes.add(size)
    }
  }

  const levelBySize = new Map([...candidateSizes].sort((a, b) => b - a).map((size, index) => [size, index + 1]))
  let changed = 0

  const outputPages: IRPage[] = pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => {
      if (block.type !== 'text' || !block.lines) return block
      const size = headingCandidateSize(block.lines, threshold)
      if (size === null) return block
      changed++
      return { ...block, headingLevel: levelBySize.get(size) }
    }),
  }))

  return { pages: outputPages, report: { transform: 't07-headings', changed, warnings: [] } }
}
