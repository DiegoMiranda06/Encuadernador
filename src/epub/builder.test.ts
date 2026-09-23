import { unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import type { IRBlock } from '@/ir/schema'
import type { Chapter, DocModel } from '@/model/document'
import { buildEpub } from './builder'

function u8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

function textBlock(id: string, text: string, opts: Partial<IRBlock> = {}): IRBlock {
  const bbox: [number, number, number, number] = [0, 0, 100, 20]
  return {
    id,
    type: 'text',
    bbox,
    lines: [{ bbox, spans: [{ text, font: 'Helvetica', size: 12, bold: false, italic: false, bbox }] }],
    ...opts,
  }
}

describe('buildEpub', () => {
  const chapters: Chapter[] = [
    {
      key: 'k1',
      title: 'Capítulo Uno',
      blocks: [
        textBlock('b0', 'Capítulo Uno', { headingLevel: 1 }),
        textBlock('b1', 'Cuerpo del primer capítulo.'),
        textBlock('b2', 'Sección 1.1', { headingLevel: 2 }),
        { id: 'b3', type: 'image', bbox: [0, 0, 10, 10], assetId: 'img1' },
      ],
    },
    { key: 'k2', title: 'Capítulo Dos', blocks: [textBlock('b4', 'Capítulo Dos', { headingLevel: 1 })] },
  ]
  const toc: DocModel['toc'] = [
    { level: 1, title: 'Capítulo Uno', chapterKey: 'k1', blockId: 'b0' },
    { level: 2, title: 'Sección 1.1', chapterKey: 'k1', blockId: 'b2' },
    { level: 1, title: 'Capítulo Dos', chapterKey: 'k2', blockId: 'b4' },
  ]
  const assets = new Map([['img1', new Uint8Array([1, 2, 3, 4])]])
  const cover = new Uint8Array([9, 9, 9])

  const bytes = buildEpub({
    metadata: { title: 'Mi Libro <raro>', author: 'Autora & Cía', language: 'spa' },
    chapters,
    toc,
    assets,
    cover,
  })

  it('mimetype es la primera entrada del ZIP y no está comprimida (STORED)', () => {
    // El header local del primer archivo empieza en el byte 0 — leemos sus campos directo,
    // sin pasar por unzipSync (que descomprime todo igual, sea STORED o DEFLATE).
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    expect(view.getUint32(0, true)).toBe(0x04034b50) // firma de local file header
    expect(view.getUint16(8, true)).toBe(0) // compression method: 0 = stored
    const nameLength = view.getUint16(26, true)
    const name = new TextDecoder().decode(bytes.slice(30, 30 + nameLength))
    expect(name).toBe('mimetype')
  })

  it('el ZIP completo se puede leer y contiene todas las partes esperadas', () => {
    const files = unzipSync(bytes)
    expect(Object.keys(files).sort()).toEqual(
      [
        'mimetype',
        'META-INF/container.xml',
        'OEBPS/content.opf',
        'OEBPS/nav.xhtml',
        'OEBPS/toc.ncx',
        'OEBPS/chapters/chapter-0.xhtml',
        'OEBPS/chapters/chapter-1.xhtml',
        'OEBPS/images/img1.png',
        'OEBPS/images/cover.jpg',
      ].sort(),
    )
  })

  it('container.xml apunta a content.opf', () => {
    const files = unzipSync(bytes)
    expect(u8(files['META-INF/container.xml'])).toContain('full-path="OEBPS/content.opf"')
  })

  it('content.opf tiene el título/autor escapados, dc:language correcto y la portada declarada dos veces', () => {
    const files = unzipSync(bytes)
    const opf = u8(files['OEBPS/content.opf'])
    expect(opf).toContain('<dc:title>Mi Libro &lt;raro&gt;</dc:title>')
    expect(opf).toContain('<dc:creator>Autora &amp; Cía</dc:creator>')
    expect(opf).toContain('<dc:language>es</dc:language>')
    expect(opf).toContain('properties="cover-image"')
    expect(opf).toContain('<meta name="cover" content="cover-image"/>')
    expect(opf).toContain('<itemref idref="chapter-0"/>')
    expect(opf).toContain('<itemref idref="chapter-1"/>')
  })

  it('nav.xhtml anida la sección bajo su capítulo, con el ancla del subencabezado', () => {
    const files = unzipSync(bytes)
    const nav = u8(files['OEBPS/nav.xhtml'])
    expect(nav).toContain('<a href="chapters/chapter-0.xhtml#b0">Capítulo Uno</a>')
    expect(nav).toContain('<a href="chapters/chapter-0.xhtml#b2">Sección 1.1</a>')
    expect(nav).toContain('<a href="chapters/chapter-1.xhtml#b4">Capítulo Dos</a>')
  })

  it('cada capítulo es su propio XHTML, con la misma renderChapterXhtml() de la preview', () => {
    const files = unzipSync(bytes)
    const chapter0 = u8(files['OEBPS/chapters/chapter-0.xhtml'])
    expect(chapter0).toContain('<h1 id="b0">Capítulo Uno</h1>')
    expect(chapter0).toContain('<img src="../images/img1.png" alt=""/>')
  })

  it('el cover se guarda tal cual, sin recomprimir', () => {
    const files = unzipSync(bytes)
    expect(files['OEBPS/images/cover.jpg']).toEqual(cover)
  })
})
