import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Chapter } from '@/model/document'
import { getAssetBlob } from '@/storage/jobs'

function collectAssetIds(chapter: Chapter | undefined): string[] {
  if (!chapter) return []
  const ids = new Set<string>()
  for (const block of chapter.blocks) {
    if (block.type === 'image' && block.assetId) ids.add(block.assetId)
  }
  return [...ids]
}

/**
 * `blob:` URLs para las imágenes de un capítulo, resueltas en el hilo principal — el editor
 * manual (ChapterEditor) las necesita para mostrarlas mientras se edita, igual que ya hace el
 * worker para la preview de solo lectura (pipeline.worker.ts#resolveAssetHrefs). IndexedDB es
 * accesible desde cualquier contexto del mismo origen, así que no hace falta una RPC nueva.
 */
export function useChapterAssetHrefs(chapter: Chapter | undefined): (assetId: string) => string | undefined {
  const assetIds = useMemo(() => collectAssetIds(chapter), [chapter])
  const assetIdsKey = assetIds.join(',')
  const [hrefs, setHrefs] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (assetIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHrefs(new Map())
      return
    }

    let cancelled = false
    const createdUrls: string[] = []

    void Promise.all(
      assetIds.map(async (assetId): Promise<[string, string] | null> => {
        const blob = await getAssetBlob(assetId)
        if (!blob) return null
        const url = URL.createObjectURL(blob)
        createdUrls.push(url)
        return [assetId, url]
      }),
    ).then((entries) => {
      if (cancelled) {
        for (const url of createdUrls) URL.revokeObjectURL(url)
        return
      }
      setHrefs(new Map(entries.filter((entry): entry is [string, string] => entry !== null)))
    })

    return () => {
      cancelled = true
      for (const url of createdUrls) URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetIdsKey])

  return useCallback((assetId: string) => hrefs.get(assetId), [hrefs])
}
