import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { CoverCropper } from '@/components/cover/CoverCropper'
import { CoverPicker } from '@/components/cover/CoverPicker'
import { KindlePreview } from '@/components/cover/KindlePreview'
import { Button } from '@/components/ui/button'
import type { CropRect } from '@/cover/render'
import { useCoverCandidates } from '@/hooks/useCoverCandidates'
import { useCoverRender } from '@/hooks/useCoverRender'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { useSavedCover } from '@/hooks/useSavedCover'

const FULL_IMAGE_CROP: CropRect = { x: 0, y: 0, width: 1, height: 1 }

export function CoverPage() {
  const jobId = useParams<{ jobId: string }>().jobId ?? ''
  const { data: candidates, isLoading } = useCoverCandidates(jobId)
  const { data: savedCover } = useSavedCover(jobId)
  const { render, isPending, cover } = useCoverRender(jobId)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [crop, setCrop] = useState<CropRect>(FULL_IMAGE_CROP)

  const candidate = candidates?.find((c) => c.id === selectedId)
  const candidateUrl = useObjectUrl(candidate?.blob)
  const displayedCover = cover ?? savedCover

  function selectCandidate(id: string) {
    setSelectedId(id)
    setCrop(FULL_IMAGE_CROP)
  }

  async function handleSave() {
    if (!candidate) return
    await render({ candidateId: candidate.id, sourceBlob: candidate.blob, crop })
  }

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8 text-text">
      <h1 className="text-[18px] font-semibold">Portada</h1>
      <p className="mt-1 text-[13px] text-text-muted">
        Elegí una candidata, recortala en proporción 1:1.6 y confirmá — así se ve en un Kindle.
      </p>

      {isLoading && <p className="mt-6 text-[13px] text-text-muted">Buscando candidatas…</p>}

      {candidates && candidates.length > 0 && (
        <div className="mt-6">
          <CoverPicker candidates={candidates} selectedId={selectedId} onSelect={selectCandidate} />
        </div>
      )}

      {candidate && candidateUrl && (
        <div className="mt-6">
          <CoverCropper
            imageUrl={candidateUrl}
            candidateWidth={candidate.width}
            candidateHeight={candidate.height}
            onCropChange={setCrop}
          />
          <Button className="mt-3" disabled={isPending} onClick={handleSave}>
            Guardar portada
          </Button>
        </div>
      )}

      {displayedCover && (
        <div className="mt-8">
          <h2 className="mb-2 text-[15px] font-semibold">Vista previa</h2>
          <KindlePreview cover={displayedCover} />
        </div>
      )}
    </div>
  )
}
