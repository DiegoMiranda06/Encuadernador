import DOMPurify from 'dompurify'

const ALLOWED_TAGS = ['p', 'h1', 'h2', 'h3', 'strong', 'em', 'blockquote', 'ul', 'ol', 'li', 'br', 'img', 'aside']
// Sin `style`, `src` ni `href` — nada que apunte fuera del documento o pise el CSS del EPUB.
// `xml:lang` (no `lang`): así sale directo, sin traducir, hacia el XHTML final (epub/render.ts).
const ALLOWED_ATTR = ['class', 'id', 'xml:lang', 'epub:type', 'alt', 'data-asset-id']

/**
 * Única barrera contra HTML malicioso del editor manual (Paso 9) antes de escribir en
 * IndexedDB — no hay servidor que haga de segunda línea de defensa (regla no negociable #5),
 * así que el allowlist es estricto y coincide con el esquema restringido de TipTap (Paso "vista
 * central editable"): si el editor no lo puede producir, tampoco se persiste. `img` solo puede
 * traer `data-asset-id` (nunca `src`: apuntaría fuera del asset ya embebido) y `alt`.
 *
 * Se sanea como fragmento DOM y se serializa con XMLSerializer, no como string — así los `<br>`
 * y `<img>` quedan autocerrados (`<br/>`, `<img .../>`) y el resultado es XML válido para ir
 * directo dentro de un `.xhtml`. Serializar como string (el default de DOMPurify) deja `<br>`
 * sin cerrar, que rompe el parser XML del EPUB.
 */
const XHTML_NS = 'http://www.w3.org/1999/xhtml'

export function sanitizeChapterHtml(html: string): string {
  const fragment = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    RETURN_DOM_FRAGMENT: true,
  })

  // Serializar el fragmento directamente hace que XMLSerializer repita `xmlns="…xhtml"` en cada
  // elemento de primer nivel (no hay un ancestro namespaced del que "heredarlo"). Envolverlo en un
  // <div> con el namespace declarado una sola vez evita esa repetición — el <html> del documento
  // final ya lo declara, así que acá alcanza con no redundarlo capítulo por capítulo.
  const wrapper = document.createElementNS(XHTML_NS, 'div')
  wrapper.appendChild(fragment)
  const serialized = new XMLSerializer().serializeToString(wrapper)
  return serialized.replace(/^<div[^>]*>/, '').replace(/<\/div>$/, '')
}
