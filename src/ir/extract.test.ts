import { PDFDocument, StandardFonts } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { extractDocument } from './extract'

async function makeTwoColumnPdf(reversePaintOrder: boolean): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const page = doc.addPage([400, 600])
  const leftX = 40
  const rightX = 220
  let y = 550
  for (let row = 1; row <= 3; row++) {
    const left = { x: leftX, y, size: 12, font }
    const right = { x: rightX, y, size: 12, font }
    if (reversePaintOrder) {
      page.drawText(`Col-der ${row}`, right)
      page.drawText(`Col-izq ${row}`, left)
    } else {
      page.drawText(`Col-izq ${row}`, left)
      page.drawText(`Col-der ${row}`, right)
    }
    y -= 20
  }
  const bytes = await doc.save()
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

async function makeSingleColumnPdf(): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const page = doc.addPage([400, 600])
  page.drawText('Esta es una línea normal de una sola columna.', { x: 40, y: 550, size: 12, font })
  page.drawText('Y esta es otra línea, justo debajo de la anterior.', { x: 40, y: 530, size: 12, font })
  const bytes = await doc.save()
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function lineTexts(spans: { text: string }[]): string {
  return spans.map((span) => span.text).join('')
}

function allLines(document: Awaited<ReturnType<typeof extractDocument>>['document']) {
  return document.pages.flatMap((page) => page.blocks.flatMap((block) => block.lines ?? []))
}

describe('extractDocument — separación de columnas en la misma banda vertical', () => {
  // Investigando t02-columns se sospechó que mupdf mezclaba ambas columnas en una sola
  // IRLine cuando comparten altura — un script de diagnóstico que ignoraba los límites reales
  // de beginLine/endLine hizo parecer eso. Revisando los eventos con cuidado, mupdf ya separa
  // cada columna en su propia línea (y hasta en su propio bloque) de forma nativa, incluso si
  // el PDF las pinta en orden invertido. No hizo falta ningún cambio en extract.ts — estos
  // tests documentan y protegen ese comportamiento correcto.
  it('nunca mezcla dos columnas en una misma IRLine (orden de pintado normal)', async () => {
    const pdf = await makeTwoColumnPdf(false)
    const { document } = await extractDocument(pdf, 'dos-columnas.pdf')
    const lines = allLines(document)
    expect(lines).toHaveLength(6) // 3 filas × 2 columnas, nunca fusionadas

    for (const line of lines) {
      const text = lineTexts(line.spans)
      expect(text.includes('Col-izq') && text.includes('Col-der')).toBe(false)
    }
  })

  it('tampoco mezcla columnas cuando el PDF las pinta en orden invertido (derecha→izquierda)', async () => {
    const pdf = await makeTwoColumnPdf(true)
    const { document } = await extractDocument(pdf, 'dos-columnas-invertido.pdf')
    const lines = allLines(document)
    expect(lines).toHaveLength(6)

    for (const line of lines) {
      const text = lineTexts(line.spans)
      expect(text.includes('Col-izq') && text.includes('Col-der')).toBe(false)
    }
  })

  it('no fragmenta de más un párrafo normal de una sola columna', async () => {
    const pdf = await makeSingleColumnPdf()
    const { document } = await extractDocument(pdf, 'una-columna.pdf')
    const lines = allLines(document)
    expect(lines).toHaveLength(2)
    expect(lineTexts(lines[0].spans)).toBe('Esta es una línea normal de una sola columna.')
    expect(lineTexts(lines[1].spans)).toBe('Y esta es otra línea, justo debajo de la anterior.')
  })
})
