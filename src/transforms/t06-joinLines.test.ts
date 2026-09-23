import { describe, expect, it } from 'vitest'
import { extractDocument } from '@/ir/extract'
import { buildTestPdf } from '../../tests/fixtures/generate'
import { t06JoinLines } from './t06-joinLines'

function lineTexts(page: { blocks: { type: string; lines?: { spans: { text: string }[] }[] }[] }): string[] {
  return page.blocks
    .filter((block) => block.type === 'text')
    .flatMap((block) => block.lines ?? [])
    .map((line) => line.spans.map((span) => span.text).join(''))
}

describe('t06-joinLines', () => {
  it('une dos líneas de un mismo párrafo (gap normal, sin sangría, sin puntuación de cierre)', async () => {
    const pdf = await buildTestPdf([
      {
        width: 500,
        height: 600,
        items: [
          { text: 'Esta primera línea continúa normalmente en la', x: 40, y: 550 },
          { text: 'segunda línea del mismo párrafo sin cortes.', x: 40, y: 535 },
        ],
      },
    ])
    const { document } = await extractDocument(pdf, 'un-parrafo.pdf')
    const { pages, report } = t06JoinLines(document.pages, {})

    expect(lineTexts(pages[0])).toEqual([
      'Esta primera línea continúa normalmente en la segunda línea del mismo párrafo sin cortes.',
    ])
    expect(report.changed).toBe(1)
  })

  it('separa dos párrafos: línea corta que termina en punto + línea siguiente con sangría', async () => {
    const pdf = await buildTestPdf([
      {
        width: 500,
        height: 600,
        items: [
          { text: 'Este es un párrafo bastante largo que ocupa casi todo el ancho.', x: 40, y: 550 },
          { text: 'Sigue explicando la misma idea en una segunda línea completa.', x: 40, y: 535 },
          { text: 'Fin de la idea.', x: 40, y: 520 },
          { text: 'Aquí empieza un párrafo nuevo con sangría inicial y', x: 60, y: 505 },
          { text: 'continúa esta idea en una segunda línea del mismo párrafo.', x: 40, y: 490 },
        ],
      },
    ])
    const { document } = await extractDocument(pdf, 'dos-parrafos.pdf')
    const { pages, report } = t06JoinLines(document.pages, {})

    expect(lineTexts(pages[0])).toEqual([
      'Este es un párrafo bastante largo que ocupa casi todo el ancho. Sigue explicando la misma idea en una segunda línea completa. Fin de la idea.',
      'Aquí empieza un párrafo nuevo con sangría inicial y continúa esta idea en una segunda línea del mismo párrafo.',
    ])
    expect(report.changed).toBe(3)
  })

  it('separa dos párrafos por un hueco vertical grande, sin sangría ni puntuación', async () => {
    const pdf = await buildTestPdf([
      {
        width: 500,
        height: 600,
        items: [
          { text: 'Primera línea de un párrafo con interlineado normal', x: 40, y: 550 },
          { text: 'y una segunda línea seguida, normal también', x: 40, y: 535 },
          // Hueco mucho más grande que el interlineado normal (15pt) → separa párrafo.
          { text: 'Nuevo párrafo tras un espacio extra entre bloques', x: 40, y: 495 },
          { text: 'que sigue en una segunda línea sin sangría marcada', x: 40, y: 480 },
        ],
      },
    ])
    const { document } = await extractDocument(pdf, 'gap-grande.pdf')
    const { pages, report } = t06JoinLines(document.pages, {})

    expect(lineTexts(pages[0])).toEqual([
      'Primera línea de un párrafo con interlineado normal y una segunda línea seguida, normal también',
      'Nuevo párrafo tras un espacio extra entre bloques que sigue en una segunda línea sin sangría marcada',
    ])
    expect(report.changed).toBe(2)
  })
})
