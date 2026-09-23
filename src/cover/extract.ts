import * as mupdf from 'mupdf'
import type { IRDocument } from '@/ir/schema'

export interface CoverCandidate {
  id: string
  blob: Blob
  width: number
  height: number
}

/** Imágenes más chicas que esto (icono, viñeta, separador) no valen como candidata de portada. */
const MIN_CANDIDATE_DIMENSION = 300
/** Ancho objetivo al renderizar la página 1 — de sobra para recortar y bajar a 1600×2560 después. */
const PAGE_RENDER_WIDTH = 1600

function renderFirstPage(sourceFile: ArrayBuffer): CoverCandidate {
  const doc = mupdf.Document.openDocument(sourceFile, 'application/pdf')
  try {
    const page = doc.loadPage(0)
    try {
      const bounds = page.getBounds()
      const scale = PAGE_RENDER_WIDTH / (bounds[2] - bounds[0])
      const pixmap = page.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB, false)
      try {
        return {
          id: 'page-1',
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
  } finally {
    doc.destroy()
  }
}

/**
 * Candidatas a portada: la página 1 renderizada (siempre) + cualquier imagen ya extraída por
 * ir/extract.ts que sea lo bastante grande como para ser una ilustración real y no un ícono o
 * separador decorativo. Reabre el PDF con mupdf.js — para cuando el usuario llega a esta
 * pantalla (Paso 10), el `Document` de la extracción original (Paso 3) ya se destruyó.
 */
export function extractCoverCandidates(
  sourceFile: ArrayBuffer,
  document: IRDocument,
  assets: Map<string, Uint8Array>,
): CoverCandidate[] {
  const candidates: CoverCandidate[] = [renderFirstPage(sourceFile)]

  for (const page of document.pages) {
    for (const block of page.blocks) {
      if (block.type !== 'image' || !block.assetId || !block.width || !block.height) continue
      if (block.width < MIN_CANDIDATE_DIMENSION || block.height < MIN_CANDIDATE_DIMENSION) continue
      const bytes = assets.get(block.assetId)
      if (!bytes) continue
      candidates.push({
        id: block.assetId,
        blob: new Blob([new Uint8Array(bytes)], { type: 'image/png' }),
        width: block.width,
        height: block.height,
      })
    }
  }

  return candidates
}
