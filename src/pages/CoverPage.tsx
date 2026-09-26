import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CoverCropper } from '@/components/cover/CoverCropper'
import { CoverPicker } from '@/components/cover/CoverPicker'
import { KindlePreview } from '@/components/cover/KindlePreview'
import { Button } from '@/components/ui/button'
import type { CoverCandidate } from '@/cover/extract'
import type { CropRect } from '@/cover/render'
import { useCoverCandidates } from '@/hooks/useCoverCandidates'
import { useCoverRender } from '@/hooks/useCoverRender'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { useSavedCover } from '@/hooks/useSavedCover'

const FULL_IMAGE_CROP: CropRect = { x: 0, y: 0, width: 1, height: 1 }
const UPLOAD_CANDIDATE_ID = 'upload'

export function CoverPage() {
  const jobId = useParams<{ jobId: string }>().jobId ?? ''
  const { data: extractedCandidates, isLoading } = useCoverCandidates(jobId)
  const { data: savedCover } = useSavedCover(jobId)
  const { render, isPending, cover } = useCoverRender(jobId)

  const [uploadedCandidate, setUploadedCandidate] = useState<CoverCandidate | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [crop, setCrop] = useState<CropRect>(FULL_IMAGE_CROP)

  const candidates = uploadedCandidate ? [...(extractedCandidates ?? []), uploadedCandidate] : extractedCandidates
  const candidate = candidates?.find((c) => c.id === selectedId)
  const candidateUrl = useObjectUrl(candidate?.blob)
  const displayedCover = cover ?? savedCover

  function selectCandidate(id: string) {
    setSelectedId(id)
    setCrop(FULL_IMAGE_CROP)
  }

  async function handleUpload(file: File) {
    try {
      const bitmap = await createImageBitmap(file)
      const { width, height } = bitmap
      bitmap.close()
      setUploadedCandidate({ id: UPLOAD_CANDIDATE_ID, blob: file, width, height })
      selectCandidate(UPLOAD_CANDIDATE_ID)
    } catch {
      toast.error('No se pudo leer la imagen', { description: 'Probá con un PNG, JPEG o WebP válido.' })
    }
  }

  async function handleSave() {
    if (!candidate) return
    try {
      await render({ candidateId: candidate.id, sourceBlob: candidate.blob, crop })
      toast.success('Portada guardada')
    } catch (cause) {
      toast.error('No se pudo guardar la portada', {
        description: cause instanceof Error ? cause.message : String(cause),
      })
    }
  }

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8 text-text">
      <Link to={`/job/${jobId}`} className="text-[12px] text-primary hover:text-primary-hover">
        ← Ajustes
      </Link>
      <h1 className="mt-3 text-[18px] font-semibold">Portada</h1>
      <p className="mt-1 text-[13px] text-text-muted">
        Elegí una candidata, recortala en proporción 1:1.6 y confirmá — así se ve en un Kindle.
      </p>

      {isLoading && <p className="mt-6 text-[13px] text-text-muted">Buscando candidatas…</p>}

      {candidates && candidates.length > 0 && (
        <div className="mt-6">
          <CoverPicker candidates={candidates} selectedId={selectedId} onSelect={selectCandidate} onUpload={handleUpload} />
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
