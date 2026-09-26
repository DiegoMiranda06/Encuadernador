import { useEffect } from 'react'

interface KeyboardShortcuts {
  onPrev?: () => void
  onNext?: () => void
}

/**
 * ←/→ para moverse entre capítulos desde el panel de miniaturas o de ajustes. Se ignoran
 * mientras el foco está en un campo de texto o en contenido editable — la vista central es
 * editable siempre, así que esto es lo único que evita que mover el cursor con las flechas
 * dentro del texto navegue de capítulo por accidente (el editor maneja su propio ⌘S aparte).
 */
export function useKeyboardShortcuts({ onPrev, onNext }: KeyboardShortcuts) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable) return
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return

      if (event.key === 'ArrowLeft') onPrev?.()
      else if (event.key === 'ArrowRight') onNext?.()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onPrev, onNext])
}
