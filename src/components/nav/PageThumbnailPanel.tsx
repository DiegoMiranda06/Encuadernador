import { useEffect, useMemo, useRef, useState } from 'react'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { usePageThumbnails } from '@/hooks/usePageThumbnails'
import { cn } from '@/lib/utils'
import type { Chapter } from '@/model/document'
import { chapterIndexForPage, chapterStartPages } from '@/model/pageMap'
import type { PageThumbnailData } from '@/worker/protocol'

/** Páginas por tanda — un libro de cientos de páginas no las renderiza todas de una. */
const BATCH_SIZE = 16

function PageThumbnailButton({
  pageIndex,
  thumbnail,
  selected,
  onSelect,
}: {
  pageIndex: number
  thumbnail: PageThumbnailData | undefined
  selected: boolean
  onSelect: () => void
}) {
  const url = useObjectUrl(thumbnail?.blob)
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col items-center gap-1 rounded-md border-2 p-1.5 transition-surface',
        selected ? 'border-primary bg-primary/10' : 'border-transparent hover:border-border-strong',
      )}
    >
      <span className="flex aspect-[1/1.4] w-full items-center justify-center overflow-hidden rounded-sm bg-paper">
        {url ? (
          <img src={url} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="text-[10px] text-text-subtle">…</span>
        )}
      </span>
      <span className="text-[11px] text-text-subtle">{pageIndex + 1}</span>
    </button>
  )
}

interface PageThumbnailPanelProps {
  jobId: string
  pageCount: number
  chapters: Chapter[]
  selectedChapterIndex: number
  onSelectChapter: (index: number) => void
}

/**
 * Panel de navegación a la izquierda, estilo el panel "Pages" de Adobe Acrobat: miniaturas
 * reales de cada página del PDF, numeradas, que al hacer clic llevan al capítulo que la
 * contiene (epub no tiene "páginas" — el link va al capítulo más cercano). Carga en tandas
 * (IntersectionObserver sobre un centinela al final) para no renderizar cientos de páginas de
 * una — un libro largo tarda en completarse pero nunca bloquea la pantalla.
 */
export function PageThumbnailPanel({ jobId, pageCount, chapters, selectedChapterIndex, onSelectChapter }: PageThumbnailPanelProps) {
  const [loadedCount, setLoadedCount] = useState(Math.min(BATCH_SIZE, pageCount))
  const sentinelRef = useRef<HTMLDivElement>(null)

  const pageIndices = useMemo(() => Array.from({ length: loadedCount }, (_, i) => i), [loadedCount])
  const { data: thumbnails } = usePageThumbnails(jobId, pageIndices)
  const thumbnailByPage = useMemo(() => new Map((thumbnails ?? []).map((t) => [t.pageIndex, t])), [thumbnails])
  const startPages = useMemo(() => chapterStartPages(chapters), [chapters])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || loadedCount >= pageCount) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setLoadedCount((count) => Math.min(count + BATCH_SIZE, pageCount))
      },
      { rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadedCount, pageCount])

  return (
    <nav className="flex w-[140px] shrink-0 flex-col gap-2 overflow-y-auto border-r border-border bg-surface p-2">
      {pageIndices.map((pageIndex) => (
        <PageThumbnailButton
          key={pageIndex}
          pageIndex={pageIndex}
          thumbnail={thumbnailByPage.get(pageIndex)}
          selected={chapterIndexForPage(startPages, pageIndex) === selectedChapterIndex}
          onSelect={() => onSelectChapter(chapterIndexForPage(startPages, pageIndex))}
        />
      ))}
      {loadedCount < pageCount && <div ref={sentinelRef} className="h-4 shrink-0" />}
    </nav>
  )
}
