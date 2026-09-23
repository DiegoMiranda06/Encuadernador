import { PDFDocument, StandardFonts } from 'pdf-lib'

export interface TextItem {
  text: string
  x: number
  y: number
  size?: number
  bold?: boolean
}

export interface PageSpec {
  width?: number
  height?: number
  /** Se dibujan en este orden — algunos PDFs reales no pintan de arriba a abajo. */
  items: TextItem[]
}

/** Genera un PDF de prueba con pdf-lib, con control total de la posición y el orden de pintado. */
export async function buildTestPdf(pages: PageSpec[]): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  for (const spec of pages) {
    const page = doc.addPage([spec.width ?? 400, spec.height ?? 600])
    for (const item of spec.items) {
      page.drawText(item.text, {
        x: item.x,
        y: item.y,
        size: item.size ?? 12,
        font: item.bold ? bold : regular,
      })
    }
  }

  const bytes = await doc.save()
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}
