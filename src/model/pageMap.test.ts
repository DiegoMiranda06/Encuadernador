import { describe, expect, it } from 'vitest'
import type { Chapter } from './document'
import { chapterIndexForPage, chapterStartPages } from './pageMap'

function chapter(key: string, blockIds: string[]): Chapter {
  return { key, title: key, blocks: blockIds.map((id) => ({ id, type: 'text', bbox: [0, 0, 0, 0] })) }
}

describe('chapterStartPages', () => {
  it('toma la página más chica entre los bloques de cada capítulo', () => {
    const chapters = [chapter('c1', ['p000b00', 'p000b01', 'p001b00']), chapter('c2', ['p003b00'])]
    expect(chapterStartPages(chapters)).toEqual([0, 3])
  })

  it('capítulo sin bloques con id reconocible arranca en la página 0', () => {
    expect(chapterStartPages([chapter('c1', [])])).toEqual([0])
  })
})

describe('chapterIndexForPage', () => {
  const startPages = [0, 3, 7]

  it('devuelve el capítulo cuyo inicio es el último ≤ la página pedida', () => {
    expect(chapterIndexForPage(startPages, 0)).toBe(0)
    expect(chapterIndexForPage(startPages, 2)).toBe(0)
    expect(chapterIndexForPage(startPages, 3)).toBe(1)
    expect(chapterIndexForPage(startPages, 5)).toBe(1)
    expect(chapterIndexForPage(startPages, 7)).toBe(2)
    expect(chapterIndexForPage(startPages, 100)).toBe(2)
  })
})
