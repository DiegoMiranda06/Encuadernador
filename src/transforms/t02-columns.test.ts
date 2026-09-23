import { describe, expect, it } from 'vitest'
import { extractDocument } from '@/ir/extract'
import { buildTestPdf } from '../../tests/fixtures/generate'
import { t02Columns } from './t02-columns'

function readingOrderText(page: { blocks: { type: string; lines?: { spans: { text: string }[] }[] }[] }): string[] {
  return page.blocks
    .filter((block) => block.type === 'text')
    .flatMap((block) => block.lines ?? [])
    .map((line) => line.spans.map((span) => span.text).join(''))
}

describe('t02-columns', () => {
  it('reordena una página a dos columnas pintada fila por fila (peor caso)', async () => {
    const leftX = 40
    const rightX = 220
    const items = []
    for (let row = 1; row <= 4; row++) {
      const y = 550 - row * 20
      items.push({ text: `Izq ${row}`, x: leftX, y })
      items.push({ text: `Der ${row}`, x: rightX, y })
    }
    const pdf = await buildTestPdf([{ width: 400, height: 600, items }])
    const { document } = await extractDocument(pdf, 'columnas.pdf')

    const { pages, report } = t02Columns(document.pages, {})
    expect(readingOrderText(pages[0])).toEqual(['Izq 1', 'Izq 2', 'Izq 3', 'Izq 4', 'Der 1', 'Der 2', 'Der 3', 'Der 4'])
    expect(report.changed).toBe(1)
  })

  it('mantiene un título a todo lo ancho antes de las columnas', async () => {
    const items = [
      { text: 'Título del capítulo', x: 40, y: 570, size: 16, bold: true },
      { text: 'Izq 1', x: 40, y: 530 },
      { text: 'Der 1', x: 220, y: 530 },
      { text: 'Izq 2', x: 40, y: 510 },
      { text: 'Der 2', x: 220, y: 510 },
    ]
    const pdf = await buildTestPdf([{ width: 400, height: 600, items }])
    const { document } = await extractDocument(pdf, 'titulo-columnas.pdf')

    const { pages } = t02Columns(document.pages, {})
    expect(readingOrderText(pages[0])).toEqual(['Título del capítulo', 'Izq 1', 'Izq 2', 'Der 1', 'Der 2'])
  })

  it('no toca una página normal de una sola columna', async () => {
    const items = [
      { text: 'Primera línea de un párrafo normal.', x: 40, y: 550 },
      { text: 'Segunda línea, justo debajo.', x: 40, y: 530 },
      { text: 'Tercera línea, para cerrar el párrafo.', x: 40, y: 510 },
    ]
    const pdf = await buildTestPdf([{ width: 400, height: 600, items }])
    const { document } = await extractDocument(pdf, 'una-columna.pdf')

    const { pages, report } = t02Columns(document.pages, {})
    expect(readingOrderText(pages[0])).toEqual([
      'Primera línea de un párrafo normal.',
      'Segunda línea, justo debajo.',
      'Tercera línea, para cerrar el párrafo.',
    ])
    expect(report.changed).toBe(0)
  })
})
