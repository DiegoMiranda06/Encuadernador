import type { IRPage } from '@/ir/schema'
import type { Transform } from './base'

/** Ligaduras tipográficas que algunos PDFs incrustan como un solo glifo — se expanden a ASCII/Latin. */
const LIGATURES: Record<string, string> = {
  'ﬀ': 'ff',
  'ﬁ': 'fi',
  'ﬂ': 'fl',
  'ﬃ': 'ffi',
  'ﬄ': 'ffl',
  'ﬅ': 'st',
  'ﬆ': 'st',
}

function normalizeText(text: string): string {
  let result = text.normalize('NFC')
  for (const [ligature, expansion] of Object.entries(LIGATURES)) {
    if (result.includes(ligature)) result = result.replaceAll(ligature, expansion)
  }
  return result
}

/** Normaliza a NFC y expande ligaduras (ﬁ→fi, ﬂ→fl, ...) — nunca toca estructura, solo texto. */
export const t01Unicode: Transform = (pages) => {
  let changed = 0

  const outputPages: IRPage[] = pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => {
      if (block.type !== 'text' || !block.lines) return block
      return {
        ...block,
        lines: block.lines.map((line) => ({
          ...line,
          spans: line.spans.map((span) => {
            const normalized = normalizeText(span.text)
            if (normalized === span.text) return span
            changed++
            return { ...span, text: normalized }
          }),
        })),
      }
    }),
  }))

  return {
    pages: outputPages,
    report: { transform: 't01-unicode', changed, warnings: [] },
  }
}
