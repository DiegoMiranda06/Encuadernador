import { useQuery } from '@tanstack/react-query'
import { rpc } from '@/lib/rpc'

export function useCoverCandidates(jobId: string) {
  return useQuery({ queryKey: ['coverCandidates', jobId], queryFn: () => rpc.extractCoverCandidates(jobId) })
}
