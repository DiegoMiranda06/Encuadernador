interface ExtractionProgressProps {
  current: number
  total: number
}

export function ExtractionProgress({ current, total }: ExtractionProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="w-full">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-primary transition-surface" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-[13px] text-text-muted">
        Extrayendo… página {current} de {total}
      </p>
    </div>
  )
}
