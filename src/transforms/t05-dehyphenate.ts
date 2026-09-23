import type { IRLine, IRPage, IRSpan } from '@/ir/schema'
import type { Transform } from './base'

function endsWithHyphen(text: string): boolean {
  if (text.length < 2) return false
  const last = text.at(-1)
  if (last !== '-' && last !== '­') return false
  return /\p{L}/u.test(text.at(-2) ?? '')
}

interface Merge {
  mergedSpan: IRSpan
  remainingNextSpans: IRSpan[]
}

/**
 * Solo une si la línea siguiente empieza con minúscula — una palabra cortada por el salto de
 * línea sigue en minúscula; un guion de puntuación seguido de una oración nueva empieza en
 * mayúscula. Deja pasar el caso raro de un nombre propio partido justo ahí (documentado, no
 * arreglado — igual que otras heurísticas del proyecto).
 */
function tryMerge(lastSpan: IRSpan, nextLine: IRLine): Merge | null {
  if (!endsWithHyphen(lastSpan.text)) return null
  const nextFirstSpan = nextLine.spans[0]
  if (!nextFirstSpan) return null

  const match = /^\p{L}+/u.exec(nextFirstSpan.text)
  const word = match?.[0]
  if (!word || !/^\p{Ll}/u.test(word)) return null

  const mergedSpan: IRSpan = { ...lastSpan, text: lastSpan.text.slice(0, -1) + word }
  const remainderText = nextFirstSpan.text.slice(word.length).replace(/^ /, '')
  const remainingNextSpans = remainderText
    ? [{ ...nextFirstSpan, text: remainderText }, ...nextLine.spans.slice(1)]
    : nextLine.spans.slice(1)

  return { mergedSpan, remainingNextSpans }
}

function dehyphenateLines(lines: IRLine[]): { lines: IRLine[]; changed: number } {
  const result: IRLine[] = []
  let changed = 0
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const next = lines[i + 1]
    const lastSpan = line.spans.at(-1)
    const merge = next && lastSpan ? tryMerge(lastSpan, next) : null

    if (merge) {
      result.push({ ...line, spans: [...line.spans.slice(0, -1), merge.mergedSpan] })
      if (merge.remainingNextSpans.length > 0) result.push({ ...next, spans: merge.remainingNextSpans })
      changed++
      i += 2
    } else {
      result.push(line)
      i += 1
    }
  }

  return { lines: result, changed }
}

/** Une palabras partidas por un guion de fin de línea ("informa-" + "ción" → "información"). */
export const t05Dehyphenate: Transform = (pages) => {
  let changed = 0

  const outputPages: IRPage[] = pages.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => {
      if (block.type !== 'text' || !block.lines) return block
      const { lines, changed: blockChanged } = dehyphenateLines(block.lines)
      changed += blockChanged
      return blockChanged === 0 ? block : { ...block, lines }
    }),
  }))

  return { pages: outputPages, report: { transform: 't05-dehyphenate', changed, warnings: [] } }
}
