import { lazy, Suspense, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChapterList } from '@/components/preview/ChapterList'
import { ChapterPreview } from '@/components/preview/ChapterPreview'
import { TransformPanel } from '@/components/settings/TransformPanel'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { renderChapterBody } from '@/epub/render'
import { useChapterOverride } from '@/hooks/useChapterOverride'
import { useChapterPreview } from '@/hooks/useChapterPreview'
import { useJob } from '@/hooks/useJob'
import { usePipeline } from '@/hooks/usePipeline'

// TipTap + ProseMirror pesan bastante (~400 kB) — solo hacen falta si el usuario abre el editor.
const ChapterEditor = lazy(() => import('@/components/editor/ChapterEditor').then((m) => ({ default: m.ChapterEditor })))

export function JobSettingsPage() {
  const jobId = useParams<{ jobId: string }>().jobId ?? ''
  const [selectedChapter, setSelectedChapter] = useState(0)
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  const { data: job } = useJob(jobId)
  const { config, setEnabled, setParams, result, isApplying } = usePipeline(jobId)
  const { save: saveOverride, isPending: isSavingOverride } = useChapterOverride(jobId)

  const chapterCount = result?.chapters.length ?? 0
  const chapterIndex = chapterCount > 0 ? Math.min(selectedChapter, chapterCount - 1) : null
  const chapter = chapterIndex !== null ? result?.chapters[chapterIndex] : undefined
  const { data: xhtml, isLoading: isRenderLoading } = useChapterPreview(jobId, chapterIndex, result?.configHash)

  async function handleSaveOverride(html: string) {
    if (!chapter) return
    await saveOverride({ chapterKey: chapter.key, html })
    setIsEditorOpen(false)
  }

  return (
    <div className="flex h-screen flex-col bg-bg text-text">
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <h1 className="text-[15px] font-semibold">{job?.filename ?? 'Encuadernador'}</h1>
        <div className="flex items-center gap-3">
          {isApplying && <span className="text-[12px] text-text-muted">Aplicando…</span>}
          {(result?.languageCandidates.length ?? 0) > 0 && (
            <Link to={`/job/${jobId}/idioma`} className="text-[12px] text-primary hover:text-primary-hover">
              Revisar idioma ({result?.languageCandidates.length})
            </Link>
          )}
          {chapter && (
            <Button size="sm" variant="outline" onClick={() => setIsEditorOpen(true)}>
              Editar capítulo
            </Button>
          )}
          <Link to={`/job/${jobId}/portada`} className="text-[12px] text-primary hover:text-primary-hover">
            Portada
          </Link>
        </div>
      </header>

      {(result?.orphanedOverrides.length ?? 0) > 0 && (
        <div className="border-b border-warning/40 bg-warning/10 px-4 py-2 text-[12px] text-warning">
          {result?.orphanedOverrides.length} edición manual guardada ya no corresponde a ningún capítulo actual — no se
          borró, pero convendría revisarla si volvés a mover ese contenido.
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <TransformPanel config={config} reports={result?.reports} onSetEnabled={setEnabled} onSetParams={setParams} />
        <ChapterList
          titles={result?.chapters.map((c) => c.title) ?? []}
          selectedIndex={chapterIndex ?? 0}
          onSelect={setSelectedChapter}
        />
        <ChapterPreview xhtml={xhtml} isLoading={isRenderLoading} />
      </div>

      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent>
          <SheetTitle className="mb-3 text-[15px] font-semibold">Editar «{chapter?.title}»</SheetTitle>
          {chapter && (
            <Suspense fallback={<p className="text-[13px] text-text-muted">Cargando editor…</p>}>
              <ChapterEditor
                key={chapter.key}
                initialHtml={
                  chapter.overrideHtml ??
                  renderChapterBody(chapter, { language: result?.metadata.language ?? 'spa', resolveAssetHref: () => '' })
                }
                onSave={handleSaveOverride}
                onCancel={() => setIsEditorOpen(false)}
                isSaving={isSavingOverride}
              />
            </Suspense>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
