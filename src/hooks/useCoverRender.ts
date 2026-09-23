import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CropRect } from '@/cover/render'
import { rpc } from '@/lib/rpc'

export function useCoverRender(jobId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ candidateId, sourceBlob, crop }: { candidateId: string; sourceBlob: Blob; crop: CropRect }) =>
      rpc.renderCover(jobId, candidateId, sourceBlob, crop),
    onSuccess: (cover) => queryClient.setQueryData(['cover', jobId], cover),
  })

  return { render: mutation.mutateAsync, isPending: mutation.isPending, cover: mutation.data }
}
