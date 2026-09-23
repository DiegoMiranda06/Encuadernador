import { useMutation } from '@tanstack/react-query'
import { validateEpub, type ValidationReport } from '@/epub/validate'
import { rpc } from '@/lib/rpc'

export interface ExportResult {
  blob: Blob
  report: ValidationReport
}

/** Arma el EPUB final (worker) y lo valida acá mismo — validateEpub es pura, no necesita el worker. */
export function useExportEpub(jobId: string) {
  const mutation = useMutation({
    mutationFn: async (configHash: string): Promise<ExportResult> => {
      const blob = await rpc.build(jobId, configHash)
      const bytes = new Uint8Array(await blob.arrayBuffer())
      return { blob, report: validateEpub(bytes) }
    },
  })

  return { build: mutation.mutateAsync, isPending: mutation.isPending, result: mutation.data, error: mutation.error }
}
