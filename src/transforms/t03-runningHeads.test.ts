import { describe, expect, it } from 'vitest'
import { extractDocument } from '@/ir/extract'
import { buildTestPdf, type PageSpec } from '../../tests/fixtures/generate'
import { t03RunningHeads } from './t03-runningHeads'

function pageTexts(page: { blocks: { type: string; lines?: { spans: { text: string }[] }[] }[] }): string[] {
  return page.blocks
    .filter((block) => block.type === 'text')
    .flatMap((block) => block.lines ?? [])
    .map((line) => line.spans.map((span) => span.text).join(''))
}

describe('t03-runningHeads', () => {
  it('quita la cabecera y el pie que se repiten en casi todas las páginas', async () => {
    const pages: PageSpec[] = []
    for (let n = 1; n <= 4; n++) {
      pages.push({
        width: 400,
        height: 600,
        items: [
          { text: `Mi Libro — Capítulo ${n}`, x: 40, y: 580 }, // cabecera, cerca del borde superior visual
          { text: `Párrafo único de la página ${n}, con contenido real.`, x: 40, y: 300 },
          { text: 'Editorial Encuadernador', x: 40, y: 15 }, // pie, cerca del borde inferior visual
        ],
      })
    }
    const pdf = await buildTestPdf(pages)
    const { document } = await extractDocument(pdf, 'cabeceras.pdf')

    const { pages: output, report } = t03RunningHeads(document.pages, {})

    for (let i = 0; i < output.length; i++) {
      const texts = pageTexts(output[i])
      expect(texts).toEqual([`Párrafo único de la página ${i + 1}, con contenido real.`])
    }
    expect(report.changed).toBe(8) // 4 cabeceras + 4 pies
  })

  it('no toca una línea que solo aparece una vez, aunque esté en la franja superior/inferior', async () => {
    const pages: PageSpec[] = [
      { width: 400, height: 600, items: [{ text: 'Título del libro', x: 40, y: 580 }] },
      { width: 400, height: 600, items: [{ text: 'Primera frase del capítulo, arriba de todo.', x: 40, y: 580 }] },
      { width: 400, height: 600, items: [{ text: 'Otra página distinta, sin nada repetido.', x: 40, y: 580 }] },
    ]
    const pdf = await buildTestPdf(pages)
    const { document } = await extractDocument(pdf, 'sin-repeticion.pdf')

    const { pages: output, report } = t03RunningHeads(document.pages, {})
    expect(pageTexts(output[0])).toEqual(['Título del libro'])
    expect(pageTexts(output[1])).toEqual(['Primera frase del capítulo, arriba de todo.'])
    expect(pageTexts(output[2])).toEqual(['Otra página distinta, sin nada repetido.'])
    expect(report.changed).toBe(0)
  })
})
