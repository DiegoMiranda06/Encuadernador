import type { IRBlock, IRPage } from '@/ir/schema'
import { bandPosition } from '@/ir/stats'
import type { Transform } from './base'

const DECORATION = /[-–—.|•·\s]/g
const ROMAN_NUMERAL = /^[ivxlcdm]+$/i

/**
 * A diferencia de t03-runningHeads (que quita texto que se repite igual entre páginas), esto
 * detecta una línea aislada en la franja superior/inferior cuyo contenido es *solo* un número
 * de página — arábigo o romano, con o sin decoración ("- 42 -", "42 |") — sin necesitar que el
 * mismo patrón exacto se repita en el resto del documento.
 */
function isPageNumberLine(text: string): boolean {
  const stripped = text.replace(DECORATION, '')
  if (stripped.length === 0) return false
  if (/^\d+$/.test(stripped)) return true
  // Los numerales romanos de portadilla rara vez pasan de "xxxviii" — un tope evita
  // confundir con palabras reales cortas hechas solo de letras I/V/X/L/C/D/M.
  return stripped.length <= 8 && ROMAN_NUMERAL.test(stripped)
}

export const t04PageNumbers: Transform = (pages) => {
  let changed = 0

  const outputPages: IRPage[] = pages.map((page) => {
    const blocks: IRBlock[] = []

    for (const block of page.blocks) {
      if (block.type !== 'text' || !block.lines) {
        blocks.push(block)
        continue
      }

      const keptLines = block.lines.filter((line) => {
        const position = bandPosition(line.bbox[1], line.bbox[3], page.height)
        if (!position) return true
        const text = line.spans.map((span) => span.text).join('')
        const isPageNumber = isPageNumberLine(text)
        if (isPageNumber) changed++
        return !isPageNumber
      })

      if (keptLines.length > 0) blocks.push(keptLines.length === block.lines.length ? block : { ...block, lines: keptLines })
    }

    return blocks.length === page.blocks.length && blocks.every((b, i) => b === page.blocks[i])
      ? page
      : { ...page, blocks }
  })

  return { pages: outputPages, report: { transform: 't04-pageNumbers', changed, warnings: [] } }
}
