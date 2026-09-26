import { useQuery } from '@tanstack/react-query'
import { rpc } from '@/lib/rpc'

/** Miniaturas de página bajo demanda — el worker cachea por página, así que pedir un rango que
 * ya incluye páginas conocidas solo renderiza las nuevas (pipeline.worker.ts#thumbnailCache). */
export function usePageThumbnails(jobId: string, pageIndices: number[]) {
  return useQuery({
    queryKey: ['pageThumbnails', jobId, pageIndices],
    queryFn: () => rpc.renderPageThumbnails(jobId, pageIndices),
    enabled: pageIndices.length > 0,
  })
}
