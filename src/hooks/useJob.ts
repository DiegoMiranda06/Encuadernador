import { useQuery } from '@tanstack/react-query'
import { getJob } from '@/storage/jobs'

/** Metadata del trabajo (filename, pageCount…) — lectura directa de IndexedDB, sin pasar por el worker. */
export function useJob(jobId: string) {
  return useQuery({ queryKey: ['job', jobId], queryFn: () => getJob(jobId) })
}
