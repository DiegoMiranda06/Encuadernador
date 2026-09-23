import { useState } from 'react'
import { Slider } from '@/components/ui/slider'

interface GapFactorControlProps {
  value: number
  onCommit: (value: number) => void
}

/**
 * `onValueCommit`, no `onValueChange` — el valor solo se manda al store (y de ahí, tras el
 * debounce, al worker) al soltar el slider, no en cada frame de arrastre.
 */
export function GapFactorControl({ value, onCommit }: GapFactorControlProps) {
  const [draft, setDraft] = useState(value)
  const [syncedValue, setSyncedValue] = useState(value)
  // Ajuste durante el render (no en un efecto) si `value` cambió por fuera — p.ej. al cargar otro trabajo.
  if (value !== syncedValue) {
    setSyncedValue(value)
    setDraft(value)
  }

  return (
    <div>
      <div className="flex items-center justify-between text-[12px] text-text-muted">
        <span>Sensibilidad de salto de párrafo</span>
        <span className="font-mono">{draft.toFixed(1)}×</span>
      </div>
      <Slider
        min={1}
        max={3}
        step={0.1}
        value={[draft]}
        onValueChange={([next]) => setDraft(next)}
        onValueCommit={([next]) => onCommit(next)}
      />
    </div>
  )
}
