import { describe, expect, it } from 'vitest'
import { extractDocument } from '@/ir/extract'
import { buildTestPdf } from '../../tests/fixtures/generate'
import { t04PageNumbers } from './t04-pageNumbers'

function pageTexts(page: { blocks: { type: string; lines?: { spans: { text: string }[] }[] }[] }): string[] {
  return page.blocks
    .filter((block) => block.type === 'text')
    .flatMap((block) => block.lines ?? [])
    .map((line) => line.spans.map((span) => span.text).join(''))
}

describe('t04-pageNumbers', () => {
  it('quita un número de página arábigo suelto en el pie', async () => {
    const pdf = await buildTestPdf([
      { width: 400, height: 600, items: [{ text: 'Cuerpo del texto de la página.', x: 40, y: 300 }, { text: '42', x: 190, y: 15 }] },
    ])
    const { document } = await extractDocument(pdf, 'numero-arabigo.pdf')
    const { pages, report } = t04PageNumbers(document.pages, {})
    expect(pageTexts(pages[0])).toEqual(['Cuerpo del texto de la página.'])
    expect(report.changed).toBe(1)
  })

  it('quita un número de página con decoración ("- 12 -")', async () => {
    const pdf = await buildTestPdf([
      { width: 400, height: 600, items: [{ text: 'Cuerpo del texto de la página.', x: 40, y: 300 }, { text: '- 12 -', x: 180, y: 15 }] },
    ])
    const { document } = await extractDocument(pdf, 'numero-decorado.pdf')
    const { pages, report } = t04PageNumbers(document.pages, {})
    expect(pageTexts(pages[0])).toEqual(['Cuerpo del texto de la página.'])
    expect(report.changed).toBe(1)
  })

  it('quita un numeral romano suelto en el pie (portadilla)', async () => {
    const pdf = await buildTestPdf([
      { width: 400, height: 600, items: [{ text: 'Prefacio de la edición.', x: 40, y: 300 }, { text: 'xiv', x: 190, y: 15 }] },
    ])
    const { document } = await extractDocument(pdf, 'numeral-romano.pdf')
    const { pages, report } = t04PageNumbers(document.pages, {})
    expect(pageTexts(pages[0])).toEqual(['Prefacio de la edición.'])
    expect(report.changed).toBe(1)
  })

  it('no toca el cuerpo del texto ni un título en la franja superior', async () => {
    const pdf = await buildTestPdf([
      { width: 400, height: 600, items: [{ text: 'Introducción', x: 40, y: 580 }, { text: 'Cuerpo normal con palabras.', x: 40, y: 300 }] },
    ])
    const { document } = await extractDocument(pdf, 'sin-numero.pdf')
    const { pages, report } = t04PageNumbers(document.pages, {})
    expect(pageTexts(pages[0])).toEqual(['Introducción', 'Cuerpo normal con palabras.'])
    expect(report.changed).toBe(0)
  })
})
