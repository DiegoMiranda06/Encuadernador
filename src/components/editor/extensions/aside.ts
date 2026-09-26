import { mergeAttributes, Node } from '@tiptap/core'

/**
 * Nota al pie (Paso 10 de las transforms: `t10-footnotes`). El `id` guardado es sin el
 * prefijo `fn-` que le agrega epub/render.ts al renderizar — se reconstruye en renderHTML.
 */
export const ChapterAside = Node.create({
  name: 'aside',
  group: 'block',
  content: 'paragraph+',
  defining: true,

  addAttributes() {
    return {
      footnoteId: {
        default: null,
        parseHTML: (element) => element.getAttribute('id')?.replace(/^fn-/, '') ?? null,
        renderHTML: () => ({}),
      },
      lang: {
        default: null,
        parseHTML: (element) => element.getAttribute('xml:lang'),
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'aside' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const extra: Record<string, string> = { 'epub:type': 'footnote' }
    if (node.attrs.footnoteId) extra.id = `fn-${node.attrs.footnoteId}`
    if (node.attrs.lang) extra['xml:lang'] = node.attrs.lang
    return ['aside', mergeAttributes(HTMLAttributes, extra), 0]
  },
})
