import * as mupdf from 'mupdf'
import type { Quad, Rect } from 'mupdf'
import { sha256Hex } from '@/lib/hash'
import { computeStats } from './stats'
import type { IRBlock, IRDocument, IRLine, IRPage, IRSpan, OutlineEntry } from './schema'

export interface ExtractProgress {
  current: number
  total: number
}

export interface ExtractResult {
  document: IRDocument
  /** PNG por assetId — se guardan como Blob en el store `assets` de IndexedDB, fuera del IR. */
  assets: Map<string, Uint8Array>
}

interface OutlineNode {
  title?: string
  page?: number
  down?: OutlineNode[]
}

function rectToBBox(rect: Rect): [number, number, number, number] {
  return [rect[0], rect[1], rect[2], rect[3]]
}

function quadBounds(quad: Quad): [number, number, number, number] {
  const xs = [quad[0], quad[2], quad[4], quad[6]]
  const ys = [quad[1], quad[3], quad[5], quad[7]]
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

function flattenOutline(items: OutlineNode[] | null, level = 0): OutlineEntry[] {
  if (!items) return []
  const entries: OutlineEntry[] = []
  for (const item of items) {
    if (item.title && item.page !== undefined) {
      entries.push({ level, title: item.title, page: item.page })
    }
    if (item.down) entries.push(...flattenOutline(item.down, level + 1))
  }
  return entries
}

function extractPage(page: mupdf.Page, pageIndex: number, assets: Map<string, Uint8Array>): IRPage {
  const bounds = page.getBounds()
  const width = bounds[2] - bounds[0]
  const height = bounds[3] - bounds[1]
  // "preserve-images": sin esta opción, toStructuredText() no incluye bloques de imagen —
  // se descubrió con un smoke test real, un PDF con imagen embebida no disparaba onImageBlock.
  const stext = page.toStructuredText('preserve-images')

  const blocks: IRBlock[] = []
  let blockIndex = 0

  let blockLines: IRLine[] | null = null
  let blockBBox: [number, number, number, number] | null = null
  let lineSpans: IRSpan[] | null = null
  let lineBBox: [number, number, number, number] | null = null
  let openSpan: IRSpan | null = null

  const nextBlockId = () => `p${String(pageIndex).padStart(3, '0')}b${String(blockIndex++).padStart(2, '0')}`

  function flushSpan() {
    if (openSpan && lineSpans) lineSpans.push(openSpan)
    openSpan = null
  }

  try {
    stext.walk({
      onImageBlock(bbox, _transform, image) {
        const assetId = crypto.randomUUID()
        const pixmap = image.toPixmap()
        try {
          assets.set(assetId, pixmap.asPNG())
        } finally {
          pixmap.destroy()
        }
        blocks.push({
          id: nextBlockId(),
          type: 'image',
          bbox: rectToBBox(bbox),
          assetId,
          width: image.getWidth(),
          height: image.getHeight(),
        })
      },
      beginTextBlock(bbox) {
        blockLines = []
        blockBBox = rectToBBox(bbox)
      },
      beginLine(bbox) {
        lineSpans = []
        lineBBox = rectToBBox(bbox)
      },
      onChar(c, _origin, font, size, quad) {
        if (!lineSpans) return
        const fontName = font.getName()
        const bold = font.isBold()
        const italic = font.isItalic()
        const charBBox = quadBounds(quad)
        if (openSpan && openSpan.font === fontName && openSpan.size === size && openSpan.bold === bold && openSpan.italic === italic) {
          openSpan.text += c
          openSpan.bbox = [
            Math.min(openSpan.bbox[0], charBBox[0]),
            Math.min(openSpan.bbox[1], charBBox[1]),
            Math.max(openSpan.bbox[2], charBBox[2]),
            Math.max(openSpan.bbox[3], charBBox[3]),
          ]
        } else {
          flushSpan()
          openSpan = { text: c, font: fontName, size, bold, italic, bbox: charBBox }
        }
      },
      endLine() {
        flushSpan()
        if (blockLines && lineBBox && lineSpans) blockLines.push({ bbox: lineBBox, spans: lineSpans })
        lineSpans = null
        lineBBox = null
      },
      endTextBlock() {
        if (blockBBox && blockLines) blocks.push({ id: nextBlockId(), type: 'text', bbox: blockBBox, lines: blockLines })
        blockLines = null
        blockBBox = null
      },
    })
  } finally {
    stext.destroy()
  }

  return { index: pageIndex, width, height, rotation: 0, blocks }
}

/** PDF (ArrayBuffer) → IRDocument, corriendo dentro del worker. Se llama una sola vez por trabajo. */
export async function extractDocument(
  file: ArrayBuffer,
  filename: string,
  onProgress?: (progress: ExtractProgress) => void,
): Promise<ExtractResult> {
  const fileHash = await sha256Hex(file)
  const doc = mupdf.Document.openDocument(file, 'application/pdf')
  const assets = new Map<string, Uint8Array>()

  try {
    const pageCount = doc.countPages()
    const metadata = {
      title: doc.getMetaData(mupdf.Document.META_INFO_TITLE),
      author: doc.getMetaData(mupdf.Document.META_INFO_AUTHOR),
      subject: doc.getMetaData(mupdf.Document.META_INFO_SUBJECT),
      creator: doc.getMetaData(mupdf.Document.META_INFO_CREATOR),
    }
    const outline = flattenOutline(doc.loadOutline())

    const pages: IRPage[] = []
    for (let index = 0; index < pageCount; index++) {
      const page = doc.loadPage(index)
      try {
        pages.push(extractPage(page, index, assets))
      } finally {
        page.destroy()
      }
      if ((index + 1) % 10 === 0 || index === pageCount - 1) {
        onProgress?.({ current: index + 1, total: pageCount })
      }
    }

    const document: IRDocument = {
      version: 1,
      source: { filename, pageCount, sha256: fileHash, fileSize: file.byteLength },
      metadata,
      outline,
      pages,
      stats: computeStats(pages),
    }

    return { document, assets }
  } finally {
    doc.destroy()
  }
}
