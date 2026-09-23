import { describe, expect, it } from 'vitest'
import type { IRBlock } from '@/ir/schema'
import type { Chapter } from '@/model/document'
import { t12Language } from './t12-language'

let counter = 0
function makeBlock(text: string): IRBlock {
  return {
    id: `b${String(counter++).padStart(2, '0')}`,
    type: 'text',
    bbox: [0, 0, 100, 20],
    lines: [{ bbox: [0, 0, 100, 20], spans: [{ text, font: 'Helvetica', size: 12, bold: false, italic: false, bbox: [0, 0, 100, 20] }] }],
  }
}

const GERMAN_PASSAGE =
  'Dies ist ein Test des deutschen Textes für die Spracherkennung, ein längerer Absatz mit vielen Wörtern und Sätzen.'

describe('t12-language', () => {
  it('marca un párrafo largo en otro idioma como candidata de la capa de pasajes', () => {
    const chapters: Chapter[] = [
      { key: 'k1', title: 'Capítulo 1', blocks: [makeBlock('Un párrafo normal en español, sin nada raro por aquí.'), makeBlock(GERMAN_PASSAGE)] },
    ]

    const { chapters: outputChapters, candidates, report } = t12Language(chapters, { mainLanguage: 'spa' })

    expect(outputChapters).toBe(chapters) // no modifica los capítulos
    expect(candidates).toEqual([
      { chapterKey: 'k1', blockId: 'b01', language: 'deu', layer: 'passage', sample: GERMAN_PASSAGE.slice(0, 80) },
    ])
    expect(report.changed).toBe(1)
  })

  it('marca una cita corta como candidata de la capa de frases cuando el pasaje es muy corto para franc', () => {
    const chapters: Chapter[] = [
      { key: 'k1', title: 'Capítulo 1', blocks: [makeBlock('Como decían los clásicos, sed non est sunt tamen.')] },
    ]

    const { candidates } = t12Language(chapters, { mainLanguage: 'spa' })

    expect(candidates).toEqual([{ chapterKey: 'k1', blockId: 'b02', language: 'lat', layer: 'phrase', sample: 'sed non est sunt tamen' }])
  })

  it('no marca nada por una sola palabra suelta en otro idioma', () => {
    const chapters: Chapter[] = [{ key: 'k1', title: 'Capítulo 1', blocks: [makeBlock('El texto sigue und nada más raro por aquí.')] }]

    const { candidates, report } = t12Language(chapters, { mainLanguage: 'spa' })

    expect(candidates).toEqual([])
    expect(report.changed).toBe(0)
  })

  it('un documento sin capítulos no da candidatas', () => {
    const { candidates, report } = t12Language([], { mainLanguage: 'spa' })
    expect(candidates).toEqual([])
    expect(report.changed).toBe(0)
  })
})
