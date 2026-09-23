import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidatePipelineResult } from './invalidatePipelineResult'
import { rpc } from '@/lib/rpc'
import { sanitizeChapterHtml } from '@/lib/sanitize'

/**
 * Sanea en el hilo principal (dompurify necesita un DOM real, el worker no tiene) antes de
 * mandar el HTML — la única barrera, sin servidor de por medio (regla no negociable #5).
 */
export function useChapterOverride(jobId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ chapterKey, html }: { chapterKey: string; html: string }) =>
      rpc.saveOverride(jobId, chapterKey, sanitizeChapterHtml(html)),
    onSuccess: () => invalidatePipelineResult(queryClient, jobId),
  })

  return { save: mutation.mutateAsync, isPending: mutation.isPending }
}
