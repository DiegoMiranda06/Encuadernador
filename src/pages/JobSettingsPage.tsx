import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChapterList } from '@/components/preview/ChapterList'
import { ChapterPreview } from '@/components/preview/ChapterPreview'
import { TransformPanel } from '@/components/settings/TransformPanel'
import { useChapterPreview } from '@/hooks/useChapterPreview'
import { useJob } from '@/hooks/useJob'
import { usePipeline } from '@/hooks/usePipeline'

export function JobSettingsPage() {
  const jobId = useParams<{ jobId: string }>().jobId ?? ''
  const [selectedChapter, setSelectedChapter] = useState(0)

  const { data: job } = useJob(jobId)
  const { config, setEnabled, setParams, result, isApplying } = usePipeline(jobId)

  const chapterCount = result?.chapters.length ?? 0
  const chapterIndex = chapterCount > 0 ? Math.min(selectedChapter, chapterCount - 1) : null
  const { data: xhtml, isLoading: isRenderLoading } = useChapterPreview(jobId, chapterIndex, result?.configHash)

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
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <TransformPanel config={config} reports={result?.reports} onSetEnabled={setEnabled} onSetParams={setParams} />
        <ChapterList
          titles={result?.chapters.map((chapter) => chapter.title) ?? []}
          selectedIndex={chapterIndex ?? 0}
          onSelect={setSelectedChapter}
        />
        <ChapterPreview xhtml={xhtml} isLoading={isRenderLoading} />
      </div>
    </div>
  )
}
