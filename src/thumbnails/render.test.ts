import { describe, expect, it } from 'vitest'
import { buildTestPdf } from '../../tests/fixtures/generate'
import { renderPageThumbnails } from './render'

describe('renderPageThumbnails', () => {
  it('renderiza una miniatura por página pedida, en el orden de los índices', async () => {
    const pdf = await buildTestPdf([
      { items: [{ text: 'Página uno', x: 40, y: 550 }] },
      { items: [{ text: 'Página dos', x: 40, y: 550 }] },
      { items: [{ text: 'Página tres', x: 40, y: 550 }] },
    ])

    const thumbnails = renderPageThumbnails(pdf, [2, 0])

    expect(thumbnails).toHaveLength(2)
    expect(thumbnails.map((t) => t.pageIndex)).toEqual([2, 0])
    for (const thumbnail of thumbnails) {
      expect(thumbnail.blob.type).toBe('image/png')
      expect(thumbnail.blob.size).toBeGreaterThan(0)
      expect(thumbnail.width).toBeGreaterThan(0)
      expect(thumbnail.height).toBeGreaterThan(0)
    }
  })

  it('mantiene la proporción de la página — más alta que ancha para una página vertical', async () => {
    const pdf = await buildTestPdf([{ width: 400, height: 600, items: [{ text: 'Texto', x: 40, y: 550 }] }])
    const [thumbnail] = renderPageThumbnails(pdf, [0])
    expect(thumbnail.height).toBeGreaterThan(thumbnail.width)
  })
})
