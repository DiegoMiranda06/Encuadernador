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

interface CoverPickerProps {
  candidates: CoverCandidate[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/** Candidatas: la página 1 renderizada, siempre primero, más cualquier imagen grande del IR. */
export function CoverPicker({ candidates, selectedId, onSelect }: CoverPickerProps) {
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
    </div>
  )
}
