import type { IRBlock } from '@/ir/schema'
import { sha256Hex } from '@/lib/hash'
import type { Chapter } from '@/model/document'
import type { TransformReport } from './base'

export interface ImagesResult {
  chapters: Chapter[]
  report: TransformReport
}

/**
 * Quita imágenes decorativas repetidas (logos de editorial, separadores) — una imagen cuyo
 * contenido byte a byte aparece 2 o más veces en todo el documento casi nunca es una foto o
 * ilustración real (esas no se repiten idénticas); se descartan todas sus ocurrencias, igual
 * que t03-runningHeads con texto recurrente.
 */
export async function t09Images(
  chapters: Chapter[],
  assets: Map<string, Uint8Array>,
  _params: Record<string, unknown>,
): Promise<ImagesResult> {
  const hashCache = new Map<string, string>()
  async function hashFor(assetId: string): Promise<string | null> {
    if (!hashCache.has(assetId)) {
      const bytes = assets.get(assetId)
      hashCache.set(assetId, bytes ? await sha256Hex(bytes) : '')
    }
    return hashCache.get(assetId) || null
  }

  const blockHashes = new Map<IRBlock, string>()
  const occurrences = new Map<string, number>()

  for (const chapter of chapters) {
    for (const block of chapter.blocks) {
      if (block.type !== 'image' || !block.assetId) continue
      const hash = await hashFor(block.assetId)
      if (!hash) continue
      blockHashes.set(block, hash)
      occurrences.set(hash, (occurrences.get(hash) ?? 0) + 1)
    }
  }

  let changed = 0
  const outputChapters: Chapter[] = chapters.map((chapter) => {
    const blocks = chapter.blocks.filter((block) => {
      const hash = blockHashes.get(block)
      const isRepeatedDecoration = hash !== undefined && (occurrences.get(hash) ?? 0) >= 2
      if (isRepeatedDecoration) changed++
      return !isRepeatedDecoration
    })
    return blocks.length === chapter.blocks.length ? chapter : { ...chapter, blocks }
  })

  return { chapters: outputChapters, report: { transform: 't09-images', changed, warnings: [] } }
}
