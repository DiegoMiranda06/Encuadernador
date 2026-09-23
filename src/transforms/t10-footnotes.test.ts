import { describe, expect, it } from 'vitest'
import type { IRBlock } from '@/ir/schema'
import type { Chapter } from '@/model/document'
import { t10Footnotes } from './t10-footnotes'

let blockCounter = 0
function makeBlock(text: string, size: number): IRBlock {
  const id = `b${String(blockCounter++).padStart(2, '0')}`
  return {
    id,
    type: 'text',
    bbox: [0, 0, 100, 20],
    lines: [{ bbox: [0, 0, 100, 20], spans: [{ text, font: 'Helvetica', size, bold: false, italic: false, bbox: [0, 0, 100, 20] }] }],
  }
}

describe('t10-footnotes', () => {
  it('marca como nota al pie el texto consistentemente más chico que el cuerpo', () => {
    const bodyBlocks = Array.from({ length: 6 }, (_, i) => makeBlock(`Línea de cuerpo número ${i + 1}, tamaño normal.`, 12))
    const footnote = makeBlock('1. Esta es una nota al pie, en letra chica.', 9)
    const chapters: Chapter[] = [{ key: 'k1', title: 'Cap 1', blocks: [...bodyBlocks, footnote] }]

    const { chapters: output, report } = t10Footnotes(chapters, {})
    const outputBlocks = output[0].blocks
    expect(outputBlocks.find((b) => b.id === footnote.id)?.isFootnote).toBe(true)
    for (const body of bodyBlocks) {
      expect(outputBlocks.find((b) => b.id === body.id)?.isFootnote).toBeUndefined()
    }
    expect(report.changed).toBe(1)
  })

  it('no marca nada si todo el texto es del mismo tamaño', () => {
    const chapters: Chapter[] = [
      { key: 'k1', title: 'Cap 1', blocks: [makeBlock('Primera línea.', 12), makeBlock('Segunda línea.', 12)] },
    ]
    const { chapters: output, report } = t10Footnotes(chapters, {})
    expect(output[0].blocks.every((b) => b.isFootnote === undefined)).toBe(true)
    expect(report.changed).toBe(0)
  })
})
