import { describe, expect, it } from 'vitest'
import { extractDocument } from '@/ir/extract'
import { buildTestPdf } from '../../tests/fixtures/generate'
import { t05Dehyphenate } from './t05-dehyphenate'

function lineTexts(page: { blocks: { type: string; lines?: { spans: { text: string }[] }[] }[] }): string[] {
  return page.blocks
    .filter((block) => block.type === 'text')
    .flatMap((block) => block.lines ?? [])
    .map((line) => line.spans.map((span) => span.text).join(''))
}

describe('t05-dehyphenate', () => {
  it('une una palabra cortada por un guion de fin de línea', async () => {
    const pdf = await buildTestPdf([
      {
        width: 400,
        height: 600,
        items: [
          { text: 'Esta es una explica-', x: 40, y: 550 },
          { text: 'ción del funcionamiento.', x: 40, y: 535 },
        ],
      },
    ])
    const { document } = await extractDocument(pdf, 'guion.pdf')
    const { pages, report } = t05Dehyphenate(document.pages, {})

    expect(lineTexts(pages[0])).toEqual(['Esta es una explicación', 'del funcionamiento.'])
    expect(report.changed).toBe(1)
  })

  it('no une si la línea siguiente empieza con mayúscula (fin de oración, no palabra cortada)', async () => {
    const pdf = await buildTestPdf([
      {
        width: 400,
        height: 600,
        items: [
          { text: 'Aquí termina la idea-', x: 40, y: 550 },
          { text: 'Nueva oración que empieza acá.', x: 40, y: 535 },
        ],
      },
    ])
    const { document } = await extractDocument(pdf, 'sin-union.pdf')
    const { pages, report } = t05Dehyphenate(document.pages, {})

    expect(lineTexts(pages[0])).toEqual(['Aquí termina la idea-', 'Nueva oración que empieza acá.'])
    expect(report.changed).toBe(0)
  })

  it('no toca un párrafo normal sin guiones de corte', async () => {
    const pdf = await buildTestPdf([
      {
        width: 400,
        height: 600,
        items: [
          { text: 'Primera línea sin cortes.', x: 40, y: 550 },
          { text: 'Segunda línea, normal también.', x: 40, y: 535 },
        ],
      },
    ])
    const { document } = await extractDocument(pdf, 'normal.pdf')
    const { pages, report } = t05Dehyphenate(document.pages, {})

    expect(lineTexts(pages[0])).toEqual(['Primera línea sin cortes.', 'Segunda línea, normal también.'])
    expect(report.changed).toBe(0)
  })
})
