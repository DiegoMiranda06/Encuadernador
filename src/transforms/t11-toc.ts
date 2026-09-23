import type { IRBlock } from '@/ir/schema'
import type { Chapter, DocModel } from '@/model/document'
import type { TransformReport } from './base'

export interface TocResult {
  chapters: Chapter[]
  toc: DocModel['toc']
  report: TransformReport
}

function blockText(block: IRBlock): string {
  return (block.lines ?? [])
    .flatMap((line) => line.spans)
    .map((span) => span.text)
    .join(' ')
    .trim()
}

/**
 * Arma la tabla de contenidos: una entrada de nivel 1 por capítulo (su propio título), más una
 * entrada por cada subencabezado (headingLevel > 1, marcado por t07-headings) dentro de sus
 * bloques. No modifica los capítulos, solo deriva el `toc` del DocModel.
 */
export function t11Toc(chapters: Chapter[], _params: Record<string, unknown>): TocResult {
  const toc: DocModel['toc'] = []

  for (const chapter of chapters) {
    // El capítulo de respaldo (sin encabezado real, todo antes del primer título) no tiene
    // bloque al que anclar — su entrada de nivel 1 linkea solo al archivo, sin ancla.
    const firstBlock = chapter.blocks[0]
    const chapterBlockId = firstBlock?.type === 'text' && firstBlock.headingLevel === 1 ? firstBlock.id : undefined
    toc.push({ level: 1, title: chapter.title, chapterKey: chapter.key, blockId: chapterBlockId })

    for (const block of chapter.blocks) {
      if (block.type !== 'text' || !block.headingLevel || block.headingLevel <= 1) continue
      const title = blockText(block)
      if (title) toc.push({ level: block.headingLevel, title, chapterKey: chapter.key, blockId: block.id })
    }
  }

  return { chapters, toc, report: { transform: 't11-toc', changed: toc.length, warnings: [] } }
}
