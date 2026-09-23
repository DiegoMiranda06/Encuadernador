import { describe, expect, it } from 'vitest'
import type { IRBlock } from '@/ir/schema'
import type { Chapter } from '@/model/document'
import { t09Images } from './t09-images'

function makeImageBlock(id: string, assetId: string): IRBlock {
  return { id, type: 'image', bbox: [0, 0, 50, 50], assetId, width: 50, height: 50 }
}

describe('t09-images', () => {
  it('quita una imagen que se repite idéntica en varios capítulos, y deja las únicas', async () => {
    const logo = new Uint8Array([1, 2, 3, 4])
    const photoA = new Uint8Array([10, 20, 30])
    const photoB = new Uint8Array([40, 50, 60])

    const chapters: Chapter[] = [
      { key: 'k1', title: 'Cap 1', blocks: [makeImageBlock('b1', 'logo-1'), makeImageBlock('b2', 'photo-a')] },
      { key: 'k2', title: 'Cap 2', blocks: [makeImageBlock('b3', 'logo-2'), makeImageBlock('b4', 'photo-b')] },
    ]
    const assets = new Map([
      ['logo-1', logo],
      ['logo-2', logo], // mismos bytes que logo-1, distinto assetId (aparece en otra página)
      ['photo-a', photoA],
      ['photo-b', photoB],
    ])

    const { chapters: output, report } = await t09Images(chapters, assets, {})

    expect(output[0].blocks.map((b) => b.id)).toEqual(['b2'])
    expect(output[1].blocks.map((b) => b.id)).toEqual(['b4'])
    expect(report.changed).toBe(2)
  })

  it('no toca nada si todas las imágenes son distintas', async () => {
    const chapters: Chapter[] = [
      { key: 'k1', title: 'Cap 1', blocks: [makeImageBlock('b1', 'a'), makeImageBlock('b2', 'b')] },
    ]
    const assets = new Map([
      ['a', new Uint8Array([1, 2, 3])],
      ['b', new Uint8Array([4, 5, 6])],
    ])

    const { chapters: output, report } = await t09Images(chapters, assets, {})
    expect(output[0].blocks.map((b) => b.id)).toEqual(['b1', 'b2'])
    expect(report.changed).toBe(0)
  })
})
