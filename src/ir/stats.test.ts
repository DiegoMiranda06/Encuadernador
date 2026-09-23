import { describe, expect, it } from 'vitest'
import type { IRPage } from './schema'
import { computeStats } from './stats'

function makeHeaderPage(index: number, headerText: string): IRPage {
  return {
    index,
    width: 400,
    height: 600,
    rotation: 0,
    blocks: [
      {
        id: `p${index}b0`,
        type: 'text',
        bbox: [40, 10, 200, 30],
        lines: [{ bbox: [40, 10, 200, 30], spans: [{ text: headerText, font: 'Helvetica', size: 12, bold: false, italic: false, bbox: [40, 10, 200, 30] }] }],
      },
    ],
  }
}

describe('computeStats — recurringBands', () => {
  it('no marca como recurrente una línea que solo aparece una vez, aunque el documento tenga pocas páginas', () => {
    const pages = [makeHeaderPage(0, 'Título único de la primera página'), makeHeaderPage(1, 'Otra cosa completamente distinta')]
    const { recurringBands } = computeStats(pages)
    expect(recurringBands).toHaveLength(0)
  })

  it('sí marca como recurrente una línea que se repite en al menos dos páginas', () => {
    const pages = [makeHeaderPage(0, 'Mi Libro'), makeHeaderPage(1, 'Mi Libro'), makeHeaderPage(2, 'Contenido distinto')]
    const { recurringBands } = computeStats(pages)
    expect(recurringBands).toHaveLength(1)
    expect(recurringBands[0].occurrences).toBe(2)
  })

  it('no confunde un título de capítulo (tamaño de encabezado) en la franja del 12% con una cabecera repetida', () => {
    // Hallazgo de la calibración del Paso 7: "Capítulo 1", "Capítulo 2"... normalizan al mismo
    // texto ("capítulo #") y caen en la misma franja superior — sin el tamaño de fuente como
    // señal, se verían idénticos a una cabecera repetida real y t03-runningHeads los borraría.
    const bodyBbox: [number, number, number, number] = [40, 100, 300, 120]
    const bodyText =
      'Texto de cuerpo normal con bastante contenido para dominar el histograma de tamaños del documento entero.'

    function makePage(index: number, chapterNumber: number): IRPage {
      const headingBbox: [number, number, number, number] = [40, 10, 200, 34]
      return {
        index,
        width: 400,
        height: 600,
        rotation: 0,
        blocks: [
          {
            id: `p${index}b0`,
            type: 'text',
            bbox: headingBbox,
            lines: [
              {
                bbox: headingBbox,
                spans: [{ text: `Capítulo ${chapterNumber}`, font: 'Helvetica', size: 20, bold: true, italic: false, bbox: headingBbox }],
              },
            ],
          },
          {
            id: `p${index}b1`,
            type: 'text',
            bbox: bodyBbox,
            lines: [{ bbox: bodyBbox, spans: [{ text: bodyText, font: 'Helvetica', size: 12, bold: false, italic: false, bbox: bodyBbox }] }],
          },
        ],
      }
    }

    const pages = [makePage(0, 1), makePage(1, 2), makePage(2, 3)]
    const { recurringBands } = computeStats(pages)
    expect(recurringBands).toHaveLength(0)
  })
})
