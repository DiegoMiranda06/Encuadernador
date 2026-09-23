import { useQuery } from '@tanstack/react-query'
import { rpc } from '@/lib/rpc'

/** El XHTML de un capítulo ya renderizado — depende del configHash, así que se invalida solo cuando cambia. */
export function useChapterPreview(jobId: string, chapterIndex: number | null, configHash: string | undefined) {
  return useQuery({
    queryKey: ['chapterPreview', jobId, chapterIndex, configHash],
    queryFn: () => rpc.renderChapter(jobId, chapterIndex as number, configHash as string),
    enabled: chapterIndex !== null && configHash !== undefined,
  })
}
