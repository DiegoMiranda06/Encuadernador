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

  it('quita etiquetas fuera del allowlist (a, span, style) aunque no sean peligrosas por sí solas', () => {
    const html = '<p>Texto con <a href="javascript:alert(1)">link</a> y <span style="color:red">span</span>.</p>'
    expect(sanitizeChapterHtml(html)).toBe('<p>Texto con link y span.</p>')
  })

  it('permite <img> solo con data-asset-id y alt — nunca src, aunque venga con onerror', () => {
    const html = '<img data-asset-id="abc123" alt="" src="https://evil.example/x.png" onerror="alert(1)"/>'
    const result = sanitizeChapterHtml(html)
    expect(result).toContain('data-asset-id="abc123"')
    expect(result).not.toContain('src=')
    expect(result).not.toContain('onerror')
  })

  it('autocierra <br> e <img> — XML válido, no HTML de string crudo', () => {
    const html = '<p>Línea uno<br>Línea dos</p><img data-asset-id="x" alt=""/>'
    const result = sanitizeChapterHtml(html)
    expect(result).toMatch(/<br\s*\/>/)
    expect(result).not.toContain('<br>')
  })

  it('conserva id, class y xml:lang en encabezados y párrafos', () => {
    const html = '<h1 id="p000b00" xml:lang="deu">Título</h1><p class="first" xml:lang="deu">Texto.</p>'
    expect(sanitizeChapterHtml(html)).toBe(html)
  })

  it('conserva <aside epub:type="footnote"> con su id', () => {
    const html = '<aside epub:type="footnote" id="fn-p003b01"><p>Nota al pie.</p></aside>'
    expect(sanitizeChapterHtml(html)).toBe(html)
  })
})
