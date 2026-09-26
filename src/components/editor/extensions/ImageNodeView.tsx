import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import type { ChapterImageOptions } from './image'

/**
 * Muestra la imagen resuelta (`blob:`, igual que la preview de solo lectura) mientras se edita
 * — lo que en verdad se persiste (`renderHTML` en image.ts) nunca incluye esa URL, solo
 * `data-asset-id`. Separar "cómo se ve" de "qué se guarda" es el propósito de un NodeView.
 */
export function ImageNodeView({ node, selected, extension }: ReactNodeViewProps) {
  const { resolveHref } = extension.options as ChapterImageOptions
  const assetId = node.attrs.assetId as string | null
  const href = assetId ? resolveHref(assetId) : undefined

  return (
    <NodeViewWrapper
      className={`img-block my-2 ${selected ? 'outline outline-2 outline-primary outline-offset-2' : ''}`}
      data-drag-handle
    >
      {href ? (
        <img src={href} alt={node.attrs.alt ?? ''} className="mx-auto max-w-full" contentEditable={false} />
      ) : (
        <p className="rounded-md border border-dashed border-border-strong p-3 text-center text-[12px] text-text-subtle">
          Imagen no disponible ({assetId ?? 'sin id'})
        </p>
      )}
    </NodeViewWrapper>
  )
}
