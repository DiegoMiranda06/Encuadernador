import { computeBodyFontSize } from '@/ir/stats'
import type { Chapter } from '@/model/document'
import type { TransformReport } from './base'

const FOOTNOTE_SIZE_FACTOR = 0.85

export interface FootnotesResult {
  chapters: Chapter[]
  report: TransformReport
}

/**
 * Marca bloques de nota al pie: texto consistentemente más chico que el cuerpo (≤ 0.85x
 * bodyFontSize), la misma convención tipográfica en casi todo libro. A diferencia de
 * t07-headings no se basa en la posición en la página — para cuando esta transform corre
 * (después de t08-chapters) los bloques ya perdieron su página de origen, solo queda el
 * tamaño de fuente como señal fiable.
 */
export function t10Footnotes(chapters: Chapter[], _params: Record<string, unknown>): FootnotesResult {
  const bodyFontSize = computeBodyFontSize(chapters.flatMap((chapter) => chapter.blocks))
  const threshold = bodyFontSize * FOOTNOTE_SIZE_FACTOR

  let changed = 0
  const outputChapters: Chapter[] = chapters.map((chapter) => ({
    ...chapter,
    blocks: chapter.blocks.map((block) => {
      if (block.type !== 'text' || !block.lines || block.lines.length === 0) return block
      const sizes = block.lines.flatMap((line) => line.spans.map((span) => Math.round(span.size)))
      const isFootnote = sizes.length > 0 && sizes.every((size) => size <= threshold)
      if (!isFootnote) return block
      changed++
      return { ...block, isFootnote: true }
    }),
  }))

  return { chapters: outputChapters, report: { transform: 't10-footnotes', changed, warnings: [] } }
}
