import { lazy, Suspense, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageThumbnailPanel } from '@/components/nav/PageThumbnailPanel'
import { OverrideConflictDialog } from '@/components/settings/OverrideConflictDialog'
import { TransformPanel } from '@/components/settings/TransformPanel'
import { renderChapterBody } from '@/epub/render'
import { useChapterAssetHrefs } from '@/hooks/useChapterAssetHrefs'
import { useChapterOverride } from '@/hooks/useChapterOverride'
import { useGuardedPipeline } from '@/hooks/useGuardedPipeline'
import { useJob } from '@/hooks/useJob'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import type { SaveStatus } from '@/components/editor/ChapterEditor'

// TipTap + ProseMirror pesan bastante (~400 kB) — solo hacen falta una vez que hay un capítulo
// para mostrar, no en el resto de la app.
const ChapterEditor = lazy(() => import('@/components/editor/ChapterEditor').then((m) => ({ default: m.ChapterEditor })))

const STATUS_LABEL: Record<SaveStatus, string | null> = {
  saved: null,
  saving: 'Guardando…',
  dirty: 'Cambios sin guardar',
}

export function JobSettingsPage() {
  const jobId = useParams<{ jobId: string }>().jobId ?? ''
  const [selectedChapter, setSelectedChapter] = useState(0)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')

  const { data: job } = useJob(jobId)
  const {
    config,
    setEnabled,
    setParams,
    result,
    isApplying,
    error: pipelineError,
    hasPendingChange,
    confirmPendingChange,
    cancelPendingChange,
  } = useGuardedPipeline(jobId)
  const { save: saveOverride } = useChapterOverride(jobId)

  const chapterCount = result?.chapters.length ?? 0
  const chapterIndex = chapterCount > 0 ? Math.min(selectedChapter, chapterCount - 1) : null
  const chapter = chapterIndex !== null ? result?.chapters[chapterIndex] : undefined
  const resolveAssetHref = useChapterAssetHrefs(chapter)

  useKeyboardShortcuts({
    onPrev: () => setSelectedChapter((index) => Math.max(0, index - 1)),
    onNext: () => setSelectedChapter((index) => Math.min(chapterCount - 1, index + 1)),
  })

  async function handleSaveOverride(html: string) {
    if (!chapter) return
    try {
      await saveOverride({ chapterKey: chapter.key, html })
    } catch (cause) {
      toast.error('No se pudo guardar el capítulo', {
        description: cause instanceof Error ? cause.message : String(cause),
      })
      throw cause
    }
  }

  const statusLabel = STATUS_LABEL[saveStatus]

  return (
    <div className="flex h-screen flex-col bg-bg text-text">
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <h1 className="text-[15px] font-semibold">{job?.filename ?? 'Encuadernador'}</h1>
        <div className="flex items-center gap-3">
          {isApplying && <span className="text-[12px] text-text-muted">Aplicando…</span>}
          {statusLabel && (
            <span className={saveStatus === 'dirty' ? 'text-[12px] text-warning' : 'text-[12px] text-text-muted'}>
              {statusLabel}
            </span>
          )}
          {chapter?.overrideHtml && (
            <span className="rounded-[4px] bg-warning/15 px-1.5 py-0.5 text-[11px] text-warning">Editado a mano</span>
          )}
          {(result?.languageCandidates.length ?? 0) > 0 && (
            <Link to={`/job/${jobId}/idioma`} className="text-[12px] text-primary hover:text-primary-hover">
              Revisar idioma ({result?.languageCandidates.length})
            </Link>
          )}
          <Link to={`/job/${jobId}/portada`} className="text-[12px] text-primary hover:text-primary-hover">
            Portada
          </Link>
          <Link to={`/job/${jobId}/exportar`} className="text-[12px] text-primary hover:text-primary-hover">
            Exportar
          </Link>
        </div>
      </header>

      {pipelineError && (
        <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-[12px] text-destructive">
          No se pudo aplicar el pipeline: {pipelineError instanceof Error ? pipelineError.message : String(pipelineError)}
        </div>
      )}

      {(result?.orphanedOverrides.length ?? 0) > 0 && (
        <div className="border-b border-warning/40 bg-warning/10 px-4 py-2 text-[12px] text-warning">
          {result?.orphanedOverrides.length} edición manual guardada ya no corresponde a ningún capítulo actual — no se
          borró, pero convendría revisarla si volvés a mover ese contenido.
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <TransformPanel config={config} reports={result?.reports} onSetEnabled={setEnabled} onSetParams={setParams} />
        {job && result && (
          <PageThumbnailPanel
            jobId={jobId}
            pageCount={job.pageCount}
            chapters={result.chapters}
            selectedChapterIndex={chapterIndex ?? 0}
            onSelectChapter={setSelectedChapter}
          />
        )}
        <div className="flex-1 overflow-hidden bg-paper">
          {chapter ? (
            <Suspense fallback={<p className="p-6 text-[13px] text-text-muted">Cargando editor…</p>}>
              <ChapterEditor
                key={chapter.key}
                initialHtml={
                  chapter.overrideHtml ??
                  renderChapterBody(chapter, {
                    language: result?.metadata.language ?? 'spa',
                    resolveAssetHref: (assetId) => resolveAssetHref(assetId) ?? '',
                  })
                }
                onSave={handleSaveOverride}
                onStatusChange={setSaveStatus}
                resolveAssetHref={resolveAssetHref}
              />
            </Suspense>
          ) : (
            <p className="p-6 text-[13px] text-text-muted">Preparando el documento…</p>
          )}
        </div>
      </div>

      <OverrideConflictDialog open={hasPendingChange} onConfirm={confirmPendingChange} onCancel={cancelPendingChange} />
    </div>
  )
}
