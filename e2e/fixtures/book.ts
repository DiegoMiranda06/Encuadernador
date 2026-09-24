import { buildTestPdf, type PageSpec } from '../../tests/fixtures/generate.ts'

/**
 * Mismo párrafo alemán que src/language/passages.test.ts — ya probado contra franc-min,
 * así el E2E no depende de que la heurística de idioma acierte con texto inventado nuevo.
 */
export const GERMAN_PASSAGE =
  'Dies ist ein Test des deutschen Textes für die Spracherkennung, ein längerer Absatz mit vielen Wörtern und Sätzen.'

export const CHAPTER_1_TITLE = 'Capítulo uno'
export const CHAPTER_2_TITLE = 'Capítulo dos'
export const CHAPTER_1_BODY = 'Este es el texto del primer capítulo, en español, para la prueba de extremo a extremo.'
export const EDITED_SENTENCE = 'Esta frase la agregó la prueba automatizada.'

const BODY_SIZE = 12
const HEADING_SIZE = 22

// Páginas bien anchas para que mupdf nunca recorte una línea contra el borde del mediabox —
// nada que ver con un libro real, pero así cada oración cabe entera en una sola línea.
const PAGE_WIDTH = 1400
const PAGE_HEIGHT = 700

function chapterPage(title: string, body: string): PageSpec {
  return {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    items: [
      { text: title, x: 40, y: 560, size: HEADING_SIZE, bold: true },
      { text: body, x: 40, y: 500, size: BODY_SIZE },
    ],
  }
}

/** Libro de prueba: dos capítulos detectables por tamaño de fuente + un pasaje en alemán. */
export async function buildBookFixture(): Promise<ArrayBuffer> {
  return buildTestPdf([
    chapterPage(CHAPTER_1_TITLE, CHAPTER_1_BODY),
    { width: PAGE_WIDTH, height: PAGE_HEIGHT, items: [{ text: GERMAN_PASSAGE, x: 40, y: 560, size: BODY_SIZE }] },
    chapterPage(CHAPTER_2_TITLE, 'Este es el texto del segundo capítulo.'),
  ])
}
