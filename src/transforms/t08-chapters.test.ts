import { describe, expect, it } from 'vitest'
import type { IRBlock, IRPage } from '@/ir/schema'
import { t08Chapters } from './t08-chapters'

let blockCounter = 0
function makeBlock(text: string, headingLevel?: number): IRBlock {
  const id = `p000b${String(blockCounter++).padStart(2, '0')}`
  const size = headingLevel ? 20 : 12
  return {
    id,
    type: 'text',
    bbox: [0, 0, 100, 20],
    headingLevel,
    lines: [
      {
        bbox: [0, 0, 100, 20],
        spans: [{ text, font: 'Helvetica', size, bold: Boolean(headingLevel), italic: false, bbox: [0, 0, 100, 20] }],
      },
    ],
  }
}

function makePages(blocks: IRBlock[]): IRPage[] {
  return [{ index: 0, width: 400, height: 600, rotation: 0, blocks }]
}

describe('t08-chapters', () => {
  it('arranca un capítulo nuevo en cada bloque headingLevel 1', async () => {
    const pages = makePages([
      makeBlock('Capítulo 1', 1),
      makeBlock('Texto del capítulo 1.'),
      makeBlock('Capítulo 2', 1),
      makeBlock('Texto del capítulo 2.'),
    ])

    const { chapters, report } = await t08Chapters(pages, {})
    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('Capítulo 1')
    expect(chapters[1].title).toBe('Capítulo 2')
    expect(chapters[0].blocks).toHaveLength(2)
    expect(chapters[1].blocks).toHaveLength(2)
    expect(chapters[0].key).not.toBe(chapters[1].key)
    expect(report.changed).toBe(2)
  })

  it('agrupa todo en un capítulo con el título de respaldo si no hay ningún headingLevel 1', async () => {
    const pages = makePages([makeBlock('Primera línea.'), makeBlock('Segunda línea.')])
    const { chapters } = await t08Chapters(pages, {}, 'Sin título')
    expect(chapters).toHaveLength(1)
    expect(chapters[0].title).toBe('Sin título')
    expect(chapters[0].blocks).toHaveLength(2)
  })

  it('desambigua dos capítulos con el mismo título — distinto key, mismo título visible', async () => {
    const pages = makePages([
      makeBlock('Introducción', 1),
      makeBlock('Primer texto.'),
      makeBlock('Introducción', 1),
      makeBlock('Segundo texto.'),
    ])
    const { chapters } = await t08Chapters(pages, {})
    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('Introducción')
    expect(chapters[1].title).toBe('Introducción')
    expect(chapters[0].key).not.toBe(chapters[1].key)
  })
})
