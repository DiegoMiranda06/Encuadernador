import { useEffect, useState } from 'react'
import { toKindleGrayscale } from '@/cover/grayscale'
import { Button } from '@/components/ui/button'
import { useObjectUrl } from '@/hooks/useObjectUrl'

interface KindlePreviewProps {
  cover: Blob
}

/** Mockup de parrilla Kindle, con toggle color/escala de grises — la pantalla real no tiene color. */
export function KindlePreview({ cover }: KindlePreviewProps) {
  const [grayscale, setGrayscale] = useState(false)
  const [grayscaleBlob, setGrayscaleBlob] = useState<Blob | null>(null)

  useEffect(() => {
    let cancelled = false
    void toKindleGrayscale(cover).then((blob) => {
      if (!cancelled) setGrayscaleBlob(blob)
    })
    return () => {
      cancelled = true
    }
  }, [cover])

  const displayed = grayscale ? (grayscaleBlob ?? cover) : cover
  const url = useObjectUrl(displayed)

  return (
    <div>
      <div className="w-[200px] rounded-md border border-border-strong bg-surface-2 p-3">
        <div className="aspect-[1/1.6] overflow-hidden rounded-sm bg-bg">
          {url && <img src={url} alt="" className="h-full w-full object-cover" />}
        </div>
      </div>
      <Button size="sm" variant="outline" className="mt-2" onClick={() => setGrayscale((g) => !g)}>
        {grayscale ? 'Ver a color' : 'Ver en blanco y negro'}
      </Button>
    </div>
  )
}
