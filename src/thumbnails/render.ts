import * as mupdf from 'mupdf'

export interface PageThumbnail {
  pageIndex: number
  blob: Blob
  width: number
  height: number
}

/** Bajitas a propósito — el panel de navegación no necesita más que reconocer la página de un vistazo. */
const THUMBNAIL_WIDTH = 140

/**
 * Miniaturas de un rango de páginas, estilo panel "Pages" de Adobe Acrobat. Reabre el PDF con
 * mupdf.js — igual que cover/extract.ts, el `Document` de la extracción original (Paso 3) ya
 * se destruyó para cuando el usuario llega a la pantalla de ajustes.
 */
export function renderPageThumbnails(sourceFile: ArrayBuffer, pageIndices: number[]): PageThumbnail[] {
  const doc = mupdf.Document.openDocument(sourceFile, 'application/pdf')
  try {
    return pageIndices.map((pageIndex) => {
      const page = doc.loadPage(pageIndex)
      try {
        const bounds = page.getBounds()
        const scale = THUMBNAIL_WIDTH / (bounds[2] - bounds[0])
        const pixmap = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false)
        try {
          return {
            pageIndex,
            blob: new Blob([new Uint8Array(pixmap.asPNG())], { type: 'image/png' }),
            width: pixmap.getWidth(),
            height: pixmap.getHeight(),
          }
        } finally {
          pixmap.destroy()
        }
      } finally {
        page.destroy()
      }
    })
  } finally {
    doc.destroy()
  }
}
