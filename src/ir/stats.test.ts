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
})
