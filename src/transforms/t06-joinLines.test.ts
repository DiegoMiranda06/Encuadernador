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

  it('params.gapFactor es el único ajuste en vivo del Paso 7: subirlo tolera huecos más grandes', () => {
    // Fixture de bboxes a mano (no PDF real): un bloque con dos gaps de 10 y uno de 18 —
    // medianLineGap = 10. Con gapFactor por defecto (1.6, umbral 16) el gap de 18 sí separa
    // párrafo; con gapFactor 2 (umbral 20) el mismo gap ya no alcanza y todo se une.
    const span = (text: string) => ({
      text,
      font: 'Helvetica',
      size: 12,
      bold: false,
      italic: false,
      bbox: [40, 0, 300, 12] as [number, number, number, number],
    })
    const line = (y0: number, text: string) => ({ bbox: [40, y0, 300, y0 + 12] as [number, number, number, number], spans: [span(text)] })
    const page = {
      index: 0,
      width: 500,
      height: 600,
      rotation: 0,
      blocks: [
        {
          id: 'p000b00',
          type: 'text' as const,
          bbox: [40, 0, 300, 86] as [number, number, number, number],
          lines: [line(0, 'Línea uno'), line(22, 'Línea dos'), line(44, 'Línea tres'), line(74, 'Línea cuatro')],
        },
      ],
    }

    const withDefault = t06JoinLines([page], {})
    expect(withDefault.pages[0].blocks[0].lines).toHaveLength(2)
    expect(withDefault.report.changed).toBe(2)

    const withHigherFactor = t06JoinLines([page], { gapFactor: 2 })
    expect(withHigherFactor.pages[0].blocks[0].lines).toHaveLength(1)
    expect(withHigherFactor.report.changed).toBe(3)
  })
})
