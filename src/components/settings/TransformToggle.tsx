import type { ReactNode } from 'react'
import { Switch } from '@/components/ui/switch'
import type { TransformReport } from '@/transforms/base'

interface TransformToggleProps {
  label: string
  description: string
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  report?: TransformReport
  children?: ReactNode
}

/** Un toggle + su TransformReport — regla no negociable #7, nada de arreglos invisibles. */
export function TransformToggle({ label, description, enabled, onEnabledChange, report, children }: TransformToggleProps) {
  return (
    <div className="border-b border-border py-3 first:pt-0 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-text">{label}</p>
          <p className="mt-0.5 text-[13px] text-text-muted">{description}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>
      {report && (
        <p className="mt-1.5 font-mono text-[12px] text-text-subtle">
          {report.changed === 0 ? 'Sin cambios' : `${report.changed} cambio${report.changed === 1 ? '' : 's'}`}
          {report.warnings.length > 0 && ` · ${report.warnings.length} aviso${report.warnings.length === 1 ? '' : 's'}`}
        </p>
      )}
      {enabled && children && <div className="mt-2">{children}</div>}
    </div>
  )
}
