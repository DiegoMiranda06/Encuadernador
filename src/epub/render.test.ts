import { describe, expect, it } from 'vitest'
import type { IRBlock } from '@/ir/schema'
import type { Chapter } from '@/model/document'
import { renderChapterXhtml } from './render'

function textBlock(id: string, text: string, opts: Partial<IRBlock> = {}): IRBlock {
  const bbox: [number, number, number, number] = [0, 0, 100, 20]
  return {
    id,
    type: 'text',
    bbox,
    lines: [{ bbox, spans: [{ text, font: 'Helvetica', size: 12, bold: false, italic: false, bbox }] }],
    ...opts,
  }
}

const options = { language: 'es', resolveAssetHref: (assetId: string) => `blob:${assetId}` }

describe('renderChapterXhtml', () => {
  it('renderiza el bloque de título como h1 y el primer párrafo con class="first"', () => {
    const chapter: Chapter = {
      key: 'k1',
      title: 'Capítulo Uno',
      blocks: [textBlock('b0', 'Capítulo Uno', { headingLevel: 1 }), textBlock('b1', 'Primer párrafo.')],
    }

    const xhtml = renderChapterXhtml(chapter, options)

    expect(xhtml).toContain('<h1>Capítulo Uno</h1>')
    expect(xhtml).toContain('<p class="first">Primer párrafo.</p>')
  })

  it('un subencabezado nivel 2 se renderiza como h2', () => {
    const chapter: Chapter = {
      key: 'k1',
      title: 'Capítulo Uno',
      blocks: [textBlock('b0', 'Sección', { headingLevel: 2 })],
    }
    expect(renderChapterXhtml(chapter, options)).toContain('<h2>Sección</h2>')
  })

  it('envuelve las notas al pie en aside epub:type="footnote"', () => {
    const chapter: Chapter = {
      key: 'k1',
      title: 'Capítulo Uno',
      blocks: [textBlock('b3', 'Nota pequeña.', { isFootnote: true })],
    }
    expect(renderChapterXhtml(chapter, options)).toContain(
      '<aside epub:type="footnote" id="fn-b3"><p>Nota pequeña.</p></aside>',
    )
  })

  it('renderiza un bloque de imagen resolviendo su href y sin marcarlo como párrafo', () => {
    const chapter: Chapter = {
      key: 'k1',
      title: 'Capítulo Uno',
      blocks: [{ id: 'b4', type: 'image', bbox: [0, 0, 100, 100], assetId: 'img1' }],
    }
    expect(renderChapterXhtml(chapter, options)).toContain('<div class="img-block"><img src="blob:img1" alt=""/></div>')
  })

  it('envuelve negrita y cursiva, y escapa caracteres especiales', () => {
    const bbox: [number, number, number, number] = [0, 0, 100, 20]
    const chapter: Chapter = {
      key: 'k1',
      title: 'Capítulo <raro> & "único"',
      blocks: [
        {
          id: 'b0',
          type: 'text',
          bbox,
          lines: [
            {
              bbox,
              spans: [
                { text: 'normal ', font: 'Helvetica', size: 12, bold: false, italic: false, bbox },
                { text: 'negrita', font: 'Helvetica', size: 12, bold: true, italic: false, bbox },
                { text: ' & <raro>', font: 'Helvetica', size: 12, bold: false, italic: true, bbox },
              ],
            },
          ],
        },
      ],
    }

    const xhtml = renderChapterXhtml(chapter, options)
    expect(xhtml).toContain('<title>Capítulo &lt;raro&gt; &amp; &quot;único&quot;</title>')
    expect(xhtml).toContain('normal <strong>negrita</strong><em> &amp; &lt;raro&gt;</em>')
  })

  it('usa el override manual tal cual, sin recalcular desde los blocks', () => {
    const chapter: Chapter = {
      key: 'k1',
      title: 'Capítulo Uno',
      blocks: [textBlock('b0', 'Este texto no debería aparecer.', { headingLevel: 1 })],
      overrideHtml: '<p>Contenido editado a mano.</p>',
    }

    const xhtml = renderChapterXhtml(chapter, options)
    expect(xhtml).toContain('<body>\n<p>Contenido editado a mano.</p>\n</body>')
    expect(xhtml).not.toContain('Este texto no debería aparecer.')
  })

  it('nunca fija font-family ni font-size en el body — regla no negociable #2', () => {
    const chapter: Chapter = { key: 'k1', title: 'T', blocks: [] }
    const xhtml = renderChapterXhtml(chapter, options)
    expect(xhtml).not.toMatch(/body\s*\{[^}]*font-(family|size)/)
  })
})
