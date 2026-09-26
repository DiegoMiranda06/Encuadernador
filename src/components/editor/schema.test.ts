// @vitest-environment jsdom
import Blockquote from '@tiptap/extension-blockquote'
import Bold from '@tiptap/extension-bold'
import BulletList from '@tiptap/extension-bullet-list'
import Document from '@tiptap/extension-document'
import HardBreak from '@tiptap/extension-hard-break'
import History from '@tiptap/extension-history'
import Italic from '@tiptap/extension-italic'
import ListItem from '@tiptap/extension-list-item'
import OrderedList from '@tiptap/extension-ordered-list'
import Text from '@tiptap/extension-text'
import { Editor } from '@tiptap/core'
import { describe, expect, it } from 'vitest'
import { sanitizeChapterHtml } from '@/lib/sanitize'
import { ChapterAside } from './extensions/aside'
import { ChapterHeading } from './extensions/heading'
import { ChapterImage } from './extensions/image'
import { ChapterParagraph } from './extensions/paragraph'

/**
 * El esquema completo del editor manual (ChapterEditor), instanciado sin React — Editor de
 * @tiptap/core funciona headless sobre un <div> de jsdom. Prueba de ida y vuelta: cargar HTML
 * como el que produce renderChapterBody(), sanear lo que devuelve getHTML() y confirmar que
 * nada se pierde — el bug real que encontró la revisión antes de este cambio.
 */
function makeEditor(content: string): Editor {
  return new Editor({
    element: document.createElement('div'),
    extensions: [
      Document,
      ChapterParagraph,
      Text,
      ChapterHeading.configure({ levels: [1, 2, 3] }),
      Bold,
      Italic,
      Blockquote,
      BulletList,
      OrderedList,
      ListItem,
      HardBreak,
      History,
      ChapterAside,
      ChapterImage.configure({ resolveHref: (id) => `blob:${id}` }),
    ],
    content,
  })
}

describe('esquema del editor manual — ida y vuelta sin pérdida', () => {
  it('conserva el id del encabezado y el xml:lang del párrafo', () => {
    const html = '<h1 id="p000b00" xml:lang="deu">Título</h1><p class="first" xml:lang="deu">Texto.</p>'
    const editor = makeEditor(html)
    const output = sanitizeChapterHtml(editor.getHTML())
    expect(output).toContain('id="p000b00"')
    expect(output).toContain('xml:lang="deu"')
    editor.destroy()
  })

  it('conserva la imagen como data-asset-id, sin la URL blob: de la vista de edición', () => {
    const html = '<div class="img-block"><img src="blob:img1" data-asset-id="img1" alt=""/></div>'
    const editor = makeEditor(html)
    const output = sanitizeChapterHtml(editor.getHTML())
    expect(output).toContain('data-asset-id="img1"')
    expect(output).not.toContain('blob:img1')
    expect(output).not.toContain('src=')
    editor.destroy()
  })

  it('conserva la nota al pie con su id (sin el prefijo fn-) y el epub:type', () => {
    const html = '<aside epub:type="footnote" id="fn-p003b01"><p>Nota al pie.</p></aside>'
    const editor = makeEditor(html)
    const output = sanitizeChapterHtml(editor.getHTML())
    expect(output).toContain('epub:type="footnote"')
    expect(output).toContain('id="fn-p003b01"')
    editor.destroy()
  })

  it('aplica y conserva la alineación de un párrafo como clase, nunca como style', () => {
    const editor = makeEditor('<p>Centrado.</p>')
    editor.chain().focus().updateAttributes('paragraph', { align: 'center' }).run()
    const output = sanitizeChapterHtml(editor.getHTML())
    expect(output).toContain('class="align-center"')
    expect(output).not.toContain('style=')
    editor.destroy()
  })

  it('un párrafo nuevo escrito por el usuario no trae xml:lang ni id — no hace falta que los tenga', () => {
    const editor = makeEditor('<p>Original.</p>')
    editor.commands.setContent('<p>Original.</p><p>Agregado a mano.</p>')
    const output = sanitizeChapterHtml(editor.getHTML())
    expect(output).toContain('Agregado a mano.')
    editor.destroy()
  })
})
