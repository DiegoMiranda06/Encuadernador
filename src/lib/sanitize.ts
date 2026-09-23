import DOMPurify from 'dompurify'

const ALLOWED_TAGS = ['p', 'h1', 'h2', 'h3', 'strong', 'em', 'blockquote', 'ul', 'ol', 'li', 'br']

/**
 * Única barrera contra HTML malicioso del editor manual (Paso 9) antes de escribir en
 * IndexedDB — no hay servidor que haga de segunda línea de defensa (regla no negociable #5),
 * así que el allowlist es estricto y coincide con el esquema restringido de TipTap: si el
 * editor no lo puede producir, tampoco se persiste. Sin atributos permitidos — nada de
 * `onerror`, `style` ni `href` con `javascript:`.
 */
export function sanitizeChapterHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR: [] })
}
