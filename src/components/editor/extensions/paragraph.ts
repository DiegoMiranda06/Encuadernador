import { mergeAttributes } from '@tiptap/core'
import Paragraph from '@tiptap/extension-paragraph'

const ALIGN_CLASS = /align-(left|center|right|justify)/

/**
 * Párrafo con `class="first"` (sangría inicial, ver kindleStyles.ts), alineación por clase
 * (`align-center`, nunca `style` — el sanitizador no permite `style`) y `xml:lang` por bloque
 * (Paso 8 de idioma). Todo se renderiza a mano en `renderHTML` en vez de dejar que cada
 * atributo escriba `class` por separado — ProseMirror pisa (no mezcla) si dos atributos
 * intentan devolver la misma clave desde `addAttributes`.
 */
export const ChapterParagraph = Paragraph.extend({
  addAttributes() {
    return {
      first: {
        default: false,
        parseHTML: (element) => element.classList.contains('first'),
        renderHTML: () => ({}),
      },
      align: {
        default: null,
        parseHTML: (element) => ALIGN_CLASS.exec(element.getAttribute('class') ?? '')?.[1] ?? null,
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
    const classes = [node.attrs.first ? 'first' : null, node.attrs.align ? `align-${node.attrs.align}` : null].filter(
      Boolean,
    )
    const extra: Record<string, string> = {}
    if (classes.length > 0) extra.class = classes.join(' ')
    if (node.attrs.lang) extra['xml:lang'] = node.attrs.lang
    return ['p', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, extra), 0]
  },
})
