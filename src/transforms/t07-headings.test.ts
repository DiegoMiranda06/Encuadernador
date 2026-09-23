import { describe, expect, it } from 'vitest'
import { extractDocument } from '@/ir/extract'
import { buildTestPdf } from '../../tests/fixtures/generate'
import { t07Headings } from './t07-headings'

function headingLevels(page: { blocks: { type: string; headingLevel?: number; lines?: { spans: { text: string }[] }[] }[] }) {
  return page.blocks
    .filter((block) => block.type === 'text')
    .map((block) => ({
      text: (block.lines ?? []).flatMap((line) => line.spans).map((span) => span.text).join(''),
      headingLevel: block.headingLevel,
    }))
}

describe('t07-headings', () => {
  it('marca título y subtítulo con headingLevel según su tamaño, y deja el cuerpo sin marcar', async () => {
    // Mucho texto de cuerpo a 12pt para que domine el histograma y bodyFontSize salga en 12.
    const bodyLines = Array.from({ length: 6 }, (_, i) => ({
      text: `Línea de cuerpo número ${i + 1} con bastante texto de relleno para el histograma.`,
      x: 40,
      y: 500 - i * 15,
      size: 12,
    }))
    const pdf = await buildTestPdf([
      {
        width: 500,
        height: 600,
        items: [
          { text: 'Título del capítulo', x: 40, y: 570, size: 20, bold: true },
          { text: 'Un subtítulo interno', x: 40, y: 545, size: 16, bold: true },
          ...bodyLines,
        ],
      },
    ])
    const { document } = await extractDocument(pdf, 'encabezados.pdf')
    const { pages, report } = t07Headings(document.pages, {})

    const levels = headingLevels(pages[0])
    expect(levels.find((b) => b.text === 'Título del capítulo')?.headingLevel).toBe(1)
    expect(levels.find((b) => b.text === 'Un subtítulo interno')?.headingLevel).toBe(2)
    for (const line of bodyLines) {
      expect(levels.find((b) => b.text.startsWith(line.text.slice(0, 20)))?.headingLevel).toBeUndefined()
    }
    expect(report.changed).toBe(2)
  })

  it('no marca nada si todo el texto es del mismo tamaño', async () => {
    const pdf = await buildTestPdf([
      {
        width: 500,
        height: 600,
        items: [
          { text: 'Primera línea del documento.', x: 40, y: 550 },
          { text: 'Segunda línea, mismo tamaño.', x: 40, y: 535 },
        ],
      },
    ])
    const { document } = await extractDocument(pdf, 'sin-encabezados.pdf')
    const { pages, report } = t07Headings(document.pages, {})

    expect(headingLevels(pages[0]).every((b) => b.headingLevel === undefined)).toBe(true)
    expect(report.changed).toBe(0)
  })
})
