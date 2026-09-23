import zlib from 'node:zlib'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { extractDocument } from '@/ir/extract'
import { extractCoverCandidates } from './extract'

// --- Encoder mínimo de PNG (sin dependencias), igual que en la calibración del Paso 7 ---
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()
function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}
function makePng(width: number, height: number, [r, g, b]: [number, number, number]): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  const raw = Buffer.alloc(height * (1 + width * 3))
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3)
    raw[rowStart] = 0
    for (let x = 0; x < width; x++) {
      const p = rowStart + 1 + x * 3
      raw[p] = r
      raw[p + 1] = g
      raw[p + 2] = b
    }
  }
  const idat = zlib.deflateSync(raw)
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

async function buildPdfWithImages(images: { bytes: Buffer; size: number }[]): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const page = doc.addPage([400, 600])
  page.drawText('Página de prueba', { x: 40, y: 560, size: 14, font })
  let y = 500
  for (const image of images) {
    const embedded = await doc.embedPng(image.bytes)
    page.drawImage(embedded, { x: 40, y: y - image.size, width: image.size, height: image.size })
    y -= image.size + 20
  }
  const bytes = await doc.save()
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

describe('extractCoverCandidates', () => {
  it('siempre incluye la página 1 renderizada, con buena resolución', async () => {
    const pdf = await buildPdfWithImages([])
    const { document, assets } = await extractDocument(pdf, 'prueba.pdf')

    const candidates = extractCoverCandidates(pdf, document, assets)

    expect(candidates).toHaveLength(1)
    expect(candidates[0].id).toBe('page-1')
    expect(candidates[0].width).toBeGreaterThanOrEqual(1600)
  })

  it('incluye imágenes grandes del IR como candidatas, pero no las chicas (íconos/separadores)', async () => {
    // El filtro mira las dimensiones en píxeles de la imagen fuente, no el tamaño con el que se
    // dibuja en la página — por eso el PNG "grande" mide 320×320 píxeles de verdad.
    const bigImage = makePng(320, 320, [200, 50, 50])
    const smallImage = makePng(40, 40, [50, 50, 200])
    const pdf = await buildPdfWithImages([
      { bytes: bigImage, size: 200 },
      { bytes: smallImage, size: 40 },
    ])
    const { document, assets } = await extractDocument(pdf, 'prueba.pdf')

    const candidates = extractCoverCandidates(pdf, document, assets)

    expect(candidates.filter((c) => c.id !== 'page-1')).toHaveLength(1)
    const imageCandidate = candidates.find((c) => c.id !== 'page-1')
    expect(imageCandidate?.width).toBeGreaterThanOrEqual(300)
  })
})
