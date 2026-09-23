import { useNavigate, useParams } from 'react-router-dom'
import { ValidationReport } from '@/components/export/ValidationReport'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { useExportEpub } from '@/hooks/useExportEpub'
import { useJob } from '@/hooks/useJob'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { usePipeline } from '@/hooks/usePipeline'
import { cn } from '@/lib/utils'
import { deleteJob } from '@/storage/jobs'

function epubFilename(pdfFilename: string | undefined): string {
  const base = pdfFilename?.replace(/\.pdf$/i, '') || 'libro'
  return `${base}.epub`
}

export function ExportPage() {
  const jobId = useParams<{ jobId: string }>().jobId ?? ''
  const navigate = useNavigate()

  const { data: job } = useJob(jobId)
  const { result: pipelineResult } = usePipeline(jobId)
  const { build, isPending, result, error } = useExportEpub(jobId)
  const downloadUrl = useObjectUrl(result?.blob)

  const hasErrors = (result?.report.errors.length ?? 0) > 0

  async function handleBuild() {
    if (!pipelineResult) return
    await build(pipelineResult.configHash)
  }

  async function handleDelete() {
    if (!confirm('¿Borrar este trabajo ahora? El PDF, el IR y todo lo procesado se eliminan de este navegador y no se puede deshacer.')) {
      return
    }
    await deleteJob(jobId)
    navigate('/')
  }

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8 text-text">
      <h1 className="text-[18px] font-semibold">Exportar</h1>
      <p className="mt-1 text-[13px] text-text-muted">
        Construye el EPUB final con los ajustes actuales y lo valida antes de descargarlo.
      </p>

      <Button className="mt-6" disabled={!pipelineResult || isPending} onClick={handleBuild}>
        {isPending ? 'Construyendo…' : 'Construir EPUB'}
      </Button>

      {error && <p className="mt-3 text-[13px] text-destructive">No se pudo construir el EPUB: {error.message}</p>}

      {result && (
        <div className="mt-6 space-y-4">
          <ValidationReport report={result.report} />

          <div className="flex items-center gap-3">
            {hasErrors || !downloadUrl ? (
              <Button disabled>Descargar EPUB</Button>
            ) : (
              <a href={downloadUrl} download={epubFilename(job?.filename)} className={cn(buttonVariants())}>
                Descargar EPUB
              </a>
            )}
            <Button variant="outline" onClick={handleDelete}>
              Borrar ahora
            </Button>
          </div>

          {hasErrors && (
            <p className="text-[13px] text-text-muted">
              La descarga está bloqueada mientras haya errores — corregí los ajustes o el capítulo señalado y volvé a
              construir.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
