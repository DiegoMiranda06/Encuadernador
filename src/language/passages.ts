import { franc } from 'franc-min'

/**
 * Capa 1: pasajes largos vía franc-min (análisis estadístico de trigramas). Solo confiable con
 * varias docenas de caracteres — muy por encima de "una sola palabra" (regla no negociable #9),
 * así que un texto más corto que este umbral ni siquiera se le pasa a franc.
 */
export const MIN_PASSAGE_LENGTH = 40

/**
 * Detecta si un párrafo está en un idioma distinto al principal del documento. Devuelve el
 * código ISO 639-3 detectado, o null si el texto es muy corto, franc no logró determinarlo
 * ("und"), o coincide con el idioma principal.
 */
export function detectPassageLanguage(text: string, mainLanguage: string): string | null {
  const trimmed = text.trim()
  if (trimmed.length < MIN_PASSAGE_LENGTH) return null

  const detected = franc(trimmed, { minLength: MIN_PASSAGE_LENGTH })
  if (detected === 'und' || detected === mainLanguage) return null
  return detected
}
