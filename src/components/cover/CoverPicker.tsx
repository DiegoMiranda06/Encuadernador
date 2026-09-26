import { Upload } from 'lucide-react'
import type { ChangeEvent } from 'react'
import type { CoverCandidate } from '@/cover/extract'
import { cn } from '@/lib/utils'
import { useObjectUrl } from '@/hooks/useObjectUrl'

function CandidateThumbnail({ candidate, selected, onSelect }: { candidate: CoverCandidate; selected: boolean; onSelect: () => void }) {
  const url = useObjectUrl(candidate.blob)
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'aspect-[1/1.6] overflow-hidden rounded-md border-2 transition-surface',
        selected ? 'border-primary' : 'border-border hover:border-border-strong',
      )}
    >
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
    </button>
  )
}

interface UploadTileProps {
  hasUpload: boolean
  onUpload: (file: File) => void
}

/** Última tarjeta de la grilla — subir una imagen propia como candidata, además de las extraídas del PDF. */
function UploadTile({ hasUpload, onUpload }: UploadTileProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) onUpload(file)
    event.target.value = ''
  }

  return (
    <label
      className={cn(
        'flex aspect-[1/1.6] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed p-2 text-center transition-surface',
        'border-border-strong text-text-muted hover:border-primary hover:text-text',
      )}
    >
      <Upload className="h-5 w-5" />
      <span className="text-[11px] leading-tight">{hasUpload ? 'Reemplazar imagen' : 'Subir imagen'}</span>
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleChange} className="hidden" />
    </label>
  )
}

interface CoverPickerProps {
  candidates: CoverCandidate[]
  selectedId: string | null
  onSelect: (id: string) => void
  onUpload: (file: File) => void
}

/** Candidatas: la página 1 renderizada, siempre primero, cualquier imagen grande del IR, y la subida propia al final. */
export function CoverPicker({ candidates, selectedId, onSelect, onUpload }: CoverPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {candidates.map((candidate) => (
        <CandidateThumbnail
          key={candidate.id}
          candidate={candidate}
          selected={candidate.id === selectedId}
          onSelect={() => onSelect(candidate.id)}
        />
      ))}
      <UploadTile hasUpload={candidates.some((c) => c.id === 'upload')} onUpload={onUpload} />
    </div>
  )
}
