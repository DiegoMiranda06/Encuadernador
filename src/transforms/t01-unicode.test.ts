import { describe, expect, it } from 'vitest'
import type { IRBlock, IRPage, IRSpan } from '@/ir/schema'
import { t01Unicode } from './t01-unicode'

function makeSpan(text: string): IRSpan {
  return { text, font: 'Helvetica', size: 12, bold: false, italic: false, bbox: [0, 0, 10, 10] }
}

function makeTextPage(spansPerLine: string[][]): IRPage[] {
  const block: IRBlock = {
    id: 'p000b00',
    type: 'text',
    bbox: [0, 0, 100, 100],
    lines: spansPerLine.map((texts) => ({
      bbox: [0, 0, 100, 10] as [number, number, number, number],
      spans: texts.map(makeSpan),
    })),
  }
  return [{ index: 0, width: 400, height: 600, rotation: 0, blocks: [block] }]
}

describe('t01-unicode', () => {
  it('expande ligaduras tipográficas comunes', () => {
    const pages = makeTextPage([['ﬁle', 'ﬂow']])
    const { pages: output, report } = t01Unicode(pages, {})
    expect(output[0].blocks[0].lines?.[0].spans.map((s) => s.text)).toEqual(['file', 'flow'])
    expect(report.changed).toBe(2)
  })

  it('normaliza a NFC caracteres acentuados descompuestos', () => {
    const decomposed = 'café' // "café" con acento como carácter combinante separado
    const pages = makeTextPage([[decomposed]])
    const { pages: output, report } = t01Unicode(pages, {})
    expect(output[0].blocks[0].lines?.[0].spans[0].text).toBe('café')
    expect(output[0].blocks[0].lines?.[0].spans[0].text.length).toBe(4)
    expect(report.changed).toBe(1)
  })

  it('no toca texto ya normalizado (mismo objeto, changed en 0)', () => {
    const pages = makeTextPage([['texto normal']])
    const originalSpan = pages[0].blocks[0].lines?.[0].spans[0]
    const { pages: output, report } = t01Unicode(pages, {})
    expect(output[0].blocks[0].lines?.[0].spans[0]).toBe(originalSpan)
    expect(report.changed).toBe(0)
  })

  it('deja pasar bloques de imagen sin tocarlos', () => {
    const imageBlock: IRBlock = { id: 'p000b00', type: 'image', bbox: [0, 0, 50, 50], assetId: 'a1' }
    const pages: IRPage[] = [{ index: 0, width: 400, height: 600, rotation: 0, blocks: [imageBlock] }]
    const { pages: output, report } = t01Unicode(pages, {})
    expect(output[0].blocks[0]).toBe(imageBlock)
    expect(report.changed).toBe(0)
  })
})
