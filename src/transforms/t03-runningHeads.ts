import { bandPosition, computeStats, normalizeBandText } from '@/ir/stats'
import type { IRBlock, IRPage } from '@/ir/schema'
import type { Transform } from './base'

/**
 * Quita cabeceras y pies de página recurrentes (título del libro, "Capítulo N", numeración...)
 * detectados por computeStats — texto que aparece en la misma franja (12% superior/inferior)
 * en al menos el 25% de las páginas, con los dígitos colapsados para agrupar variantes.
 */
export const t03RunningHeads: Transform = (pages) => {
  const { recurringBands } = computeStats(pages)
  if (recurringBands.length === 0) {
    return { pages, report: { transform: 't03-runningHeads', changed: 0, warnings: [] } }
  }

  const recurringKeys = new Set(recurringBands.map((band) => `${band.position}:${normalizeBandText(band.sampleText)}`))
  let changed = 0

  const outputPages: IRPage[] = pages.map((page) => {
    const blocks: IRBlock[] = []

    for (const block of page.blocks) {
      if (block.type !== 'text' || !block.lines) {
        blocks.push(block)
        continue
      }

      const keptLines = block.lines.filter((line) => {
        const position = bandPosition(line.bbox[1], line.bbox[3], page.height)
        if (!position) return true
        const text = line.spans.map((span) => span.text).join('')
        const isRunningHead = recurringKeys.has(`${position}:${normalizeBandText(text)}`)
        if (isRunningHead) changed++
        return !isRunningHead
      })

      if (keptLines.length > 0) blocks.push(keptLines.length === block.lines.length ? block : { ...block, lines: keptLines })
    }

    return blocks.length === page.blocks.length && blocks.every((b, i) => b === page.blocks[i])
      ? page
      : { ...page, blocks }
  })

  return { pages: outputPages, report: { transform: 't03-runningHeads', changed, warnings: [] } }
}
