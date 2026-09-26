import { mergeAttributes } from '@tiptap/core'
import Heading from '@tiptap/extension-heading'

/**
 * Encabezado con `id` (ancla del nav.xhtml/toc.ncx del build — epub/builder.ts) y `xml:lang`.
 * Un encabezado sin `id` original (uno nuevo que el usuario tipea al editar) simplemente no
 * ancla nada en el índice — limitación conocida, documentada en el reporte de esta tarea.
 */
export const ChapterHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('id'),
        renderHTML: () => ({}),
      },
      lang: {
        default: null,
        parseHTML: (element) => element.getAttribute('xml:lang'),
        renderHTML: () => ({}),
      },
    }
  },

  renderHTML({ node, HTMLAttributes }) {
    const level = this.options.levels.includes(node.attrs.level) ? node.attrs.level : this.options.levels[0]
    const tag = `h${level}`
    const extra: Record<string, string> = {}
    if (node.attrs.id) extra.id = node.attrs.id
    if (node.attrs.lang) extra['xml:lang'] = node.attrs.lang
    return [tag, mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, extra), 0]
  },
})
