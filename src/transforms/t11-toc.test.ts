import { describe, expect, it } from 'vitest'
import type { IRBlock } from '@/ir/schema'
import type { Chapter } from '@/model/document'
import { t11Toc } from './t11-toc'

let counter = 0
function makeBlock(text: string, headingLevel?: number): IRBlock {
  return {
    id: `b${String(counter++).padStart(2, '0')}`,
    type: 'text',
    bbox: [0, 0, 100, 20],
    headingLevel,
    lines: [{ bbox: [0, 0, 100, 20], spans: [{ text, font: 'Helvetica', size: 12, bold: false, italic: false, bbox: [0, 0, 100, 20] }] }],
  }
}

describe('t11-toc', () => {
  it('arma una entrada de nivel 1 por capítulo, más una por cada subencabezado', () => {
    const chapters: Chapter[] = [
      {
        key: 'k1',
        title: 'Capítulo 1',
        blocks: [makeBlock('Capítulo 1', 1), makeBlock('Cuerpo normal.'), makeBlock('Sección 1.1', 2)],
      },
      {
        key: 'k2',
        title: 'Capítulo 2',
        blocks: [makeBlock('Capítulo 2', 1), makeBlock('Otro cuerpo.')],
      },
    ]

    const { toc, chapters: outputChapters, report } = t11Toc(chapters, {})

    expect(toc).toEqual([
      { level: 1, title: 'Capítulo 1', chapterKey: 'k1', blockId: 'b00' },
      { level: 2, title: 'Sección 1.1', chapterKey: 'k1', blockId: 'b02' },
      { level: 1, title: 'Capítulo 2', chapterKey: 'k2', blockId: 'b03' },
    ])
    expect(outputChapters).toBe(chapters) // no modifica los capítulos
    expect(report.changed).toBe(3)
  })

  it('un documento sin capítulos da un toc vacío', () => {
    const { toc, report } = t11Toc([], {})
    expect(toc).toEqual([])
    expect(report.changed).toBe(0)
  })

  it('el capítulo de respaldo (sin encabezado real) no tiene blockId para anclar', () => {
    const chapters: Chapter[] = [{ key: 'k1', title: 'Documento', blocks: [makeBlock('Texto suelto sin título.')] }]
    const { toc } = t11Toc(chapters, {})
    expect(toc).toEqual([{ level: 1, title: 'Documento', chapterKey: 'k1', blockId: undefined }])
  })
})
