// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { sanitizeChapterHtml } from './sanitize'

describe('sanitizeChapterHtml', () => {
  it('conserva las etiquetas del esquema restringido del editor', () => {
    const html = '<h2>Título</h2><p>Un párrafo con <strong>negrita</strong> y <em>cursiva</em>.</p><blockquote><p>Cita.</p></blockquote><ul><li>Uno</li><li>Dos</li></ul>'
    expect(sanitizeChapterHtml(html)).toBe(html)
  })

  it('quita <script> y su contenido por completo', () => {
    const html = '<p>Antes</p><script>alert("xss")</script><p>Después</p>'
    expect(sanitizeChapterHtml(html)).toBe('<p>Antes</p><p>Después</p>')
  })

  it('quita atributos de evento — nada de onerror ni onclick', () => {
    const html = '<p onclick="alert(1)">Texto</p>'
    expect(sanitizeChapterHtml(html)).toBe('<p>Texto</p>')
  })

  it('quita etiquetas fuera del allowlist (img, a, span, style) aunque no sean peligrosas por sí solas', () => {
    const html = '<p>Texto <img src="x" onerror="alert(1)"/> con <a href="javascript:alert(1)">link</a> y <span style="color:red">span</span>.</p>'
    expect(sanitizeChapterHtml(html)).toBe('<p>Texto  con link y span.</p>')
  })
})
