import { useEffect } from 'react'

interface KeyboardShortcuts {
  onPrev?: () => void
  onNext?: () => void
  onEdit?: () => void
}

/**
 * Atajos del panel de ajustes: ←/→ para moverse entre capítulos, E para abrir el editor.
 * Se ignoran mientras el foco está en un campo de texto o en contenido editable, para no
 * interferir con escribir (el editor de capítulos maneja su propio ⌘S por separado).
 */
export function useKeyboardShortcuts({ onPrev, onNext, onEdit }: KeyboardShortcuts) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable) return
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return

      if (event.key === 'ArrowLeft') onPrev?.()
      else if (event.key === 'ArrowRight') onNext?.()
      else if (event.key.toLowerCase() === 'e') onEdit?.()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onPrev, onNext, onEdit])
}
