import { cn } from '@/lib/utils'

interface ChapterListProps {
  titles: string[]
  selectedIndex: number
  onSelect: (index: number) => void
}

export function ChapterList({ titles, selectedIndex, onSelect }: ChapterListProps) {
  return (
    <nav className="w-[200px] shrink-0 overflow-y-auto border-r border-border">
      {titles.map((title, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(index)}
          className={cn(
            'block w-full truncate border-b border-border px-3 py-2 text-left text-[13px] transition-surface hover:bg-surface-2',
            index === selectedIndex ? 'bg-surface-2 text-text' : 'text-text-muted',
          )}
        >
          {title}
        </button>
      ))}
    </nav>
  )
}
