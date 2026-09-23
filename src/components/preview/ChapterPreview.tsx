import { useRef } from 'react'

interface ChapterPreviewProps {
  xhtml: string | undefined
  isLoading: boolean
}

/**
 * El iframe recarga entero cada vez que cambia `xhtml` (nuevo `srcDoc`) — sin este manejo, cada
 * ajuste en el panel te devuelve al principio del capítulo. El listener de scroll se reengancha
 * en cada `onLoad`, así el valor restaurado es siempre el último visto en el documento anterior.
 */
export function ChapterPreview({ xhtml, isLoading }: ChapterPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const scrollRef = useRef(0)

  const handleLoad = () => {
    const win = iframeRef.current?.contentWindow
    if (!win) return
    win.scrollTo(0, scrollRef.current)
    win.addEventListener('scroll', () => {
      scrollRef.current = win.scrollY
    })
  }

  return (
    <div className="flex-1 overflow-hidden bg-paper">
      {xhtml ? (
        <iframe
          ref={iframeRef}
          title="Vista previa del capítulo"
          srcDoc={xhtml}
          sandbox="allow-same-origin"
          onLoad={handleLoad}
          className="h-full w-full border-0"
        />
      ) : (
        <p className="p-4 text-[13px] text-text-muted">{isLoading ? 'Generando vista previa…' : 'Elegí un capítulo.'}</p>
      )}
    </div>
  )
}
