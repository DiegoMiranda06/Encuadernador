// @vitest-environment jsdom
import { strToU8, unzipSync, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import type { IRBlock } from '@/ir/schema'
import type { Chapter, DocModel } from '@/model/document'
import { buildEpub } from './builder'
import { validateEpub } from './validate'

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

// Re-empaqueta un `files` editado a mano preservando mimetype STORED y primero, como hace
// buildEpub() — un zipSync({ ...files }) plano perdería ambas propiedades.
function zipFromFiles(files: Record<string, Uint8Array>): Uint8Array {
  const { mimetype, ...rest } = files
  return zipSync({ mimetype: [mimetype, { level: 0 }], ...rest })
}

function buildValidEpub(): Uint8Array {
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

  return buildEpub({
    metadata: { title: 'Mi Libro', author: 'Autora', language: 'spa' },
    chapters,
    toc,
    assets,
    cover,
  })
}

describe('validateEpub', () => {
  it('no reporta errores ni warnings para un EPUB válido recién construido', () => {
    const report = validateEpub(buildValidEpub())
    expect(report.errors).toEqual([])
    expect(report.warnings).toEqual([])
  })

  it('detecta que mimetype no es la primera entrada del ZIP', () => {
    const files = unzipSync(buildValidEpub())
    // Reordenamos insertando otra entrada antes de mimetype.
    const reordered: Record<string, Uint8Array> = { 'META-INF/container.xml': files['META-INF/container.xml'], ...files }
    const bytes = zipSync(reordered)
    const report = validateEpub(bytes)
    expect(report.errors).toContain('"mimetype" no es la primera entrada del ZIP.')
  })

  it('detecta que mimetype está comprimido en vez de STORED', () => {
    const files = unzipSync(buildValidEpub())
    const reordered: Record<string, Uint8Array | [Uint8Array, { level: 6 }]> = { mimetype: [files.mimetype, { level: 6 }] }
    for (const [path, data] of Object.entries(files)) {
      if (path !== 'mimetype') reordered[path] = data
    }
    const bytes = zipSync(reordered)
    const report = validateEpub(bytes)
    expect(report.errors).toContain('"mimetype" no está guardado sin comprimir (STORED).')
  })

  it('rechaza bytes que no son un ZIP', () => {
    const report = validateEpub(new Uint8Array([1, 2, 3, 4]))
    expect(report.errors).toContain('El archivo no empieza con un header de ZIP válido.')
  })

  it('detecta que falta META-INF/container.xml', () => {
    const files = unzipSync(buildValidEpub())
    delete files['META-INF/container.xml']
    const bytes = zipFromFiles(files)
    const report = validateEpub(bytes)
    expect(report.errors).toContain('Falta META-INF/container.xml.')
  })

  it('detecta que container.xml apunta a un OPF inexistente', () => {
    const files = unzipSync(buildValidEpub())
    files['META-INF/container.xml'] = strToU8(
      '<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/no-existe.opf"/></rootfiles></container>',
    )
    const bytes = zipFromFiles(files)
    const report = validateEpub(bytes)
    expect(report.errors).toContain('container.xml apunta a un OPF que no existe en el ZIP.')
  })

  it('detecta un item del manifest que no existe en el ZIP', () => {
    const files = unzipSync(buildValidEpub())
    const opfText = new TextDecoder().decode(files['OEBPS/content.opf'])
    const withGhostItem = opfText.replace(
      '</manifest>',
      '<item id="ghost" href="ghost.xhtml" media-type="application/xhtml+xml"/></manifest>',
    )
    files['OEBPS/content.opf'] = strToU8(withGhostItem)
    const bytes = zipFromFiles(files)
    const report = validateEpub(bytes)
    expect(report.errors).toContain('El manifest declara "ghost.xhtml" pero no existe en el ZIP.')
  })

  it('avisa (warning) de un archivo del ZIP no declarado en el manifest', () => {
    const files = unzipSync(buildValidEpub())
    files['OEBPS/huerfano.txt'] = strToU8('hola')
    const bytes = zipFromFiles(files)
    const report = validateEpub(bytes)
    expect(report.warnings).toContain('"OEBPS/huerfano.txt" existe en el ZIP pero no está declarado en el manifest.')
    expect(report.errors).toEqual([])
  })

  it('detecta un idref del spine que no está en el manifest', () => {
    const files = unzipSync(buildValidEpub())
    const opfText = new TextDecoder().decode(files['OEBPS/content.opf'])
    const withGhostRef = opfText.replace('</spine>', '<itemref idref="fantasma"/></spine>')
    files['OEBPS/content.opf'] = strToU8(withGhostRef)
    const bytes = zipFromFiles(files)
    const report = validateEpub(bytes)
    expect(report.errors).toContain('El spine referencia "fantasma", que no está en el manifest.')
  })

  it('detecta un XHTML de capítulo con XML inválido', () => {
    const files = unzipSync(buildValidEpub())
    files['OEBPS/chapters/chapter-0.xhtml'] = strToU8('<html><body><p>sin cerrar</body></html>')
    const bytes = zipFromFiles(files)
    const report = validateEpub(bytes)
    expect(report.errors).toContain('"OEBPS/chapters/chapter-0.xhtml" no es XML válido.')
  })

  it('detecta un src remoto en un capítulo', () => {
    const files = unzipSync(buildValidEpub())
    const chapterText = new TextDecoder().decode(files['OEBPS/chapters/chapter-0.xhtml'])
    const withRemote = chapterText.replace('<img src="../images/img1.png" alt=""/>', '<img src="https://example.com/x.png" alt=""/>')
    files['OEBPS/chapters/chapter-0.xhtml'] = strToU8(withRemote)
    const bytes = zipFromFiles(files)
    const report = validateEpub(bytes)
    expect(report.errors).toContain('"OEBPS/chapters/chapter-0.xhtml" tiene un src remoto: "https://example.com/x.png".')
  })

  it('detecta que falta el <nav epub:type="toc"> en nav.xhtml', () => {
    const files = unzipSync(buildValidEpub())
    files['OEBPS/nav.xhtml'] = strToU8('<html xmlns="http://www.w3.org/1999/xhtml"><body><p>vacío</p></body></html>')
    const bytes = zipFromFiles(files)
    const report = validateEpub(bytes)
    expect(report.errors).toContain('nav.xhtml no tiene un <nav epub:type="toc">.')
  })

  it('detecta un link de nav.xhtml que no resuelve a un item del manifest', () => {
    const files = unzipSync(buildValidEpub())
    const navText = new TextDecoder().decode(files['OEBPS/nav.xhtml'])
    const withGhostLink = navText.replace('</ol>', '<li><a href="chapters/no-existe.xhtml">Fantasma</a></li></ol>')
    files['OEBPS/nav.xhtml'] = strToU8(withGhostLink)
    const bytes = zipFromFiles(files)
    const report = validateEpub(bytes)
    expect(report.errors).toContain('nav.xhtml linkea a "chapters/no-existe.xhtml", que no está en el manifest.')
  })

  it('detecta que falta properties="cover-image" cuando sí hay <meta name="cover">', () => {
    const files = unzipSync(buildValidEpub())
    const opfText = new TextDecoder().decode(files['OEBPS/content.opf'])
    const withoutCoverProp = opfText.replace('properties="cover-image"', '')
    files['OEBPS/content.opf'] = strToU8(withoutCoverProp)
    const bytes = zipFromFiles(files)
    const report = validateEpub(bytes)
    expect(report.errors).toContain('Falta properties="cover-image" en el manifest para la portada.')
  })

  it('detecta que <meta name="cover"> y properties="cover-image" no apuntan al mismo id', () => {
    const files = unzipSync(buildValidEpub())
    const opfText = new TextDecoder().decode(files['OEBPS/content.opf'])
    const withMismatch = opfText.replace('<meta name="cover" content="cover-image"/>', '<meta name="cover" content="otro-id"/>')
    files['OEBPS/content.opf'] = strToU8(withMismatch)
    const bytes = zipFromFiles(files)
    const report = validateEpub(bytes)
    expect(report.errors).toContain('<meta name="cover"> no apunta al mismo id que properties="cover-image".')
  })
})
