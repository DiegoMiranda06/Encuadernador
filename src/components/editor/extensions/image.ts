import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ImageNodeView } from './ImageNodeView'

export interface ChapterImageOptions {
  /** Resuelve un assetId a la URL que se muestra mientras se edita (`blob:` — igual que la preview). */
  resolveHref: (assetId: string) => string | undefined
}

/**
 * Imagen del capítulo — atómica (no se edita el contenido, solo se conserva o se borra). Lo
 * único que persiste `renderHTML` es `data-asset-id` y `alt`: nunca `src`, porque una URL
 * `blob:` no sobrevive a recargar la página ni tiene sentido en el XHTML final (regla del
 * sanitizador: `src` no está permitido, solo `data-asset-id` — ver lib/sanitize.ts). La imagen
 * real se resuelve y se muestra en el NodeView (ImageNodeView.tsx), separado de lo que se guarda.
 */
export const ChapterImage = Node.create<ChapterImageOptions>({
  name: 'chapterImage',
  group: 'block',
  atom: true,
  draggable: false,

  addOptions() {
    return { resolveHref: () => undefined }
  },

  addAttributes() {
    return {
      assetId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-asset-id'),
        renderHTML: () => ({}),
      },
      alt: {
        default: '',
        parseHTML: (element) => element.getAttribute('alt') ?? '',
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'img[data-asset-id]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes, { 'data-asset-id': node.attrs.assetId, alt: node.attrs.alt ?? '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
  },
})
