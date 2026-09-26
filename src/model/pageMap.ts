import type { Chapter } from './document'

const BLOCK_ID_PAGE = /^p(\d+)b\d+$/

function blockPage(blockId: string): number | null {
  const match = BLOCK_ID_PAGE.exec(blockId)
  return match ? Number(match[1]) : null
}

/** La página (0-based, igual que ir/extract.ts) donde arranca cada capítulo — el menor número de página entre sus bloques. */
export function chapterStartPages(chapters: Chapter[]): number[] {
  return chapters.map((chapter) => {
    let min = Infinity
    for (const block of chapter.blocks) {
      const page = blockPage(block.id)
      if (page !== null && page < min) min = page
    }
    return min === Infinity ? 0 : min
  })
}

/**
 * El índice de capítulo que contiene esta página — el último cuyo inicio es ≤ pageIndex. Con
 * `startPages` ya ordenado (los capítulos salen en orden de lectura de t08-chapters), es una
 * búsqueda lineal simple; no hace falta binaria para la cantidad de capítulos que tiene un libro.
 */
export function chapterIndexForPage(startPages: number[], pageIndex: number): number {
  let result = 0
  for (let i = 0; i < startPages.length; i++) {
    if (startPages[i] <= pageIndex) result = i
    else break
  }
  return result
}
