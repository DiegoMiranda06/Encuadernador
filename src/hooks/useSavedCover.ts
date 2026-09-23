import { useQuery } from '@tanstack/react-query'
import { getCover } from '@/storage/jobs'

/** El último cover guardado (si el usuario ya lo confirmó antes) — lectura directa de IndexedDB. */
export function useSavedCover(jobId: string) {
  // React Query no acepta `undefined` como resultado válido — `null` es la forma correcta de
  // decir "no hay cover todavía", sin que se lea como un error de la query.
  return useQuery({ queryKey: ['cover', jobId], queryFn: async () => (await getCover(jobId)) ?? null })
}
