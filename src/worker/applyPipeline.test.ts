import { describe, expect, it } from 'vitest'
import { computeStats } from '@/ir/stats'
import type { IRBlock, IRDocument, IRPage } from '@/ir/schema'
import { createDefaultPipelineConfig, type PipelineConfig } from '@/model/config'
import { TRANSFORM_ORDER } from '@/transforms/registry'
import { computeConfigHash, runPipeline } from './applyPipeline'

const GERMAN_PASSAGE =
  'Dies ist ein Test des deutschen Textes für die Spracherkennung, ein längerer Absatz mit vielen Wörtern und Sätzen.'

function textBlock(id: string, text: string, size: number, bbox: [number, number, number, number]): IRBlock {
  return {
    id,
    type: 'text',
    bbox,
    lines: [{ bbox, spans: [{ text, font: 'Helvetica', size, bold: false, italic: false, bbox }] }],
  }
}

function imageBlock(id: string, assetId: string, bbox: [number, number, number, number]): IRBlock {
  return { id, type: 'image', bbox, assetId }
}

function buildDocument(): IRDocument {
  const page: IRPage = {
    index: 0,
    width: 600,
    height: 800,
    rotation: 0,
    blocks: [
      textBlock('p000b00', 'Capítulo Uno', 20, [50, 50, 300, 75]),
      textBlock(
        'p000b01',
        'Este es el cuerpo del capítulo, con suficiente texto para dominar el histograma de tamaños del documento entero.',
        12,
        [50, 100, 550, 120],
      ),
      textBlock('p000b02', 'Sección Uno', 16, [50, 140, 250, 162]),
      textBlock('p000b03', 'Nota al pie con texto pequeño.', 9, [50, 180, 300, 195]),
      imageBlock('p000b04', 'img1', [50, 220, 150, 320]),
      imageBlock('p000b05', 'img1', [200, 220, 300, 320]),
      textBlock('p000b06', GERMAN_PASSAGE, 12, [50, 340, 550, 360]),
    ],
  }

  return {
    version: 1,
    source: { filename: 'prueba.pdf', pageCount: 1, sha256: 'sha-fixture', fileSize: 12345 },
    metadata: { title: 'Documento de prueba', author: 'Autora Test' },
    outline: [],
    pages: [page],
    stats: computeStats([page]),
  }
}

const makeConfig = createDefaultPipelineConfig

describe('runPipeline', () => {
  it('cablea las doce transforms en orden y arma chapters + toc + languageCandidates', async () => {
    const document = buildDocument()
    const assets = new Map([['img1', new Uint8Array([1, 2, 3, 4])]])
    const config = makeConfig()

    const result = await runPipeline(document, assets, config, new Map())

    expect(Object.keys(result.reports)).toEqual([...TRANSFORM_ORDER])

    expect(result.chapters).toHaveLength(1)
    const chapter = result.chapters[0]
    expect(chapter.title).toBe('Capítulo Uno')

    // t09-images: las dos imágenes idénticas se quitan.
    expect(chapter.blocks.some((block) => block.type === 'image')).toBe(false)
    expect(result.reports['t09-images'].changed).toBe(2)

    // t10-footnotes: la nota al pie queda marcada.
    const footnote = chapter.blocks.find((block) => block.lines?.[0]?.spans[0]?.text === 'Nota al pie con texto pequeño.')
    expect(footnote?.isFootnote).toBe(true)

    // t11-toc: una entrada de nivel 1 (el capítulo) y una de nivel 2 (la sección).
    expect(result.toc).toEqual([
      { level: 1, title: 'Capítulo Uno', chapterKey: chapter.key, blockId: 'p000b00' },
      { level: 2, title: 'Sección Uno', chapterKey: chapter.key, blockId: 'p000b02' },
    ])

    // t12-language: el párrafo en alemán se detecta contra el idioma principal (español).
    expect(result.languageCandidates).toEqual([
      expect.objectContaining({ chapterKey: chapter.key, language: 'deu', layer: 'passage' }),
    ])

    expect(result.metadata).toEqual({ title: 'Documento de prueba', author: 'Autora Test', language: 'spa' })
    expect(result.orphanedOverrides).toEqual([])
  })

  it('aplica un override guardado y reporta los huérfanos sin borrarlos', async () => {
    const document = buildDocument()
    const assets = new Map([['img1', new Uint8Array([1, 2, 3, 4])]])
    const config = makeConfig()

    const first = await runPipeline(document, assets, config, new Map())
    const realKey = first.chapters[0].key

    const overrides = new Map([
      [realKey, '<p>Override manual</p>'],
      ['clave-huerfana', '<p>Ya no corresponde a ningún capítulo</p>'],
    ])

    const result = await runPipeline(document, assets, config, overrides)

    expect(result.chapters[0].overrideHtml).toBe('<p>Override manual</p>')
    expect(result.orphanedOverrides).toEqual(['clave-huerfana'])
  })

  it('confirmar un candidato le pone xml:lang al bloque y lo saca de languageCandidates; descartar solo lo saca', async () => {
    const document = buildDocument()
    const assets = new Map([['img1', new Uint8Array([1, 2, 3, 4])]])
    const config = makeConfig()

    const confirmed = await runPipeline(
      document,
      assets,
      config,
      new Map(),
      new Map([['p000b06', { decision: 'confirmed', language: 'deu' }]]),
    )
    expect(confirmed.languageCandidates).toEqual([])
    const germanBlock = confirmed.chapters[0].blocks.find((block) => block.id === 'p000b06')
    expect(germanBlock?.lang).toBe('deu')

    const dismissed = await runPipeline(
      document,
      assets,
      config,
      new Map(),
      new Map([['p000b06', { decision: 'dismissed', language: 'deu' }]]),
    )
    expect(dismissed.languageCandidates).toEqual([])
    const dismissedBlock = dismissed.chapters[0].blocks.find((block) => block.id === 'p000b06')
    expect(dismissedBlock?.lang).toBeUndefined()
  })

  it('una transform desactivada no cambia nada y su reporte queda en cero', async () => {
    const document = buildDocument()
    const assets = new Map([['img1', new Uint8Array([1, 2, 3, 4])]])
    const config = makeConfig()
    config['t09-images'].enabled = false

    const result = await runPipeline(document, assets, config, new Map())

    expect(result.reports['t09-images']).toEqual({ transform: 't09-images', changed: 0, warnings: [] })
    expect(result.chapters[0].blocks.filter((block) => block.type === 'image')).toHaveLength(2)
  })

  it('t08-chapters desactivada no parte por encabezados: un solo capítulo con todo', async () => {
    const document = buildDocument()
    const assets = new Map([['img1', new Uint8Array([1, 2, 3, 4])]])
    const config = makeConfig()
    config['t08-chapters'].enabled = false

    const result = await runPipeline(document, assets, config, new Map())

    expect(result.chapters).toHaveLength(1)
    expect(result.chapters[0].title).toBe('Documento de prueba')
  })
})

describe('computeConfigHash', () => {
  it('es determinista para el mismo irSha256 + config', async () => {
    const config = makeConfig()
    const [a, b] = await Promise.all([computeConfigHash('sha-fixture', config), computeConfigHash('sha-fixture', config)])
    expect(a).toBe(b)
  })

  it('cambia si cambia la config, aunque el orden de las llaves sea distinto', async () => {
    const config = makeConfig()
    const reordered: PipelineConfig = JSON.parse(JSON.stringify(config))
    const hashA = await computeConfigHash('sha-fixture', config)
    const hashB = await computeConfigHash('sha-fixture', reordered)
    expect(hashA).toBe(hashB) // mismo contenido, JSON.parse no garantiza el mismo orden de props

    config['t01-unicode'].enabled = false
    const hashC = await computeConfigHash('sha-fixture', config)
    expect(hashC).not.toBe(hashA)
  })

  it('cambia si cambia el irSha256, aunque la config sea igual', async () => {
    const config = makeConfig()
    const hashA = await computeConfigHash('sha-fixture-1', config)
    const hashB = await computeConfigHash('sha-fixture-2', config)
    expect(hashA).not.toBe(hashB)
  })
})
