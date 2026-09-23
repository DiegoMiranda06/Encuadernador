import type { IRBlock, IRLine, IRPage } from '@/ir/schema'
import type { Transform } from './base'

type Side = 'left' | 'right' | 'full'

/**
 * mupdf agrupa por banda vertical: en un PDF a dos columnas, cada "fila" geométrica sale como
 * un solo bloque con dos líneas (una por columna), en el orden en que el PDF las pintó — que
 * puede ser fila-izquierda, fila-derecha, fila-izquierda... Esa secuencia lee mal: hace falta
 * separar cada bloque mixto en un bloque por columna y reordenar todo el contenido de la
 * página como izquierda completa (de arriba a abajo) seguida de derecha completa.
 */
function classify(bbox: [number, number, number, number], pageWidth: number): Side {
  if (bbox[2] - bbox[0] > pageWidth * 0.6) return 'full'
  return (bbox[0] + bbox[2]) / 2 < pageWidth / 2 ? 'left' : 'right'
}

function linesBBox(lines: IRLine[]): [number, number, number, number] {
  return [
    Math.min(...lines.map((l) => l.bbox[0])),
    Math.min(...lines.map((l) => l.bbox[1])),
    Math.max(...lines.map((l) => l.bbox[2])),
    Math.max(...lines.map((l) => l.bbox[3])),
  ]
}

/** Si un bloque de texto mezcla líneas de ambas columnas, lo parte en uno por columna. */
function splitMixedBlock(block: IRBlock, pageWidth: number, makeId: () => string): IRBlock[] {
  if (block.type !== 'text' || !block.lines) return [block]

  const sides = block.lines.map((line) => classify(line.bbox, pageWidth))
  if (!sides.includes('left') || !sides.includes('right')) return [block]

  // Las líneas "full" dentro de un bloque mixto son un caso raro (no debería darse en la
  // práctica) — se cuelan con la columna izquierda para no perderlas.
  const leftLines = block.lines.filter((_, i) => sides[i] !== 'right')
  const rightLines = block.lines.filter((_, i) => sides[i] === 'right')

  const result: IRBlock[] = []
  if (leftLines.length > 0) result.push({ ...block, id: makeId(), lines: leftLines, bbox: linesBBox(leftLines) })
  if (rightLines.length > 0) result.push({ ...block, id: makeId(), lines: rightLines, bbox: linesBBox(rightLines) })
  return result
}

export const t02Columns: Transform = (pages) => {
  let changed = 0

  const outputPages: IRPage[] = pages.map((page) => {
    let blockCounter = 0
    const makeId = () => `p${String(page.index).padStart(3, '0')}b${String(blockCounter++).padStart(2, '0')}c`

    const splitBlocks = page.blocks.flatMap((block) =>
      block.type === 'text' ? splitMixedBlock(block, page.width, makeId) : [block],
    )

    const units = splitBlocks.map((block) => ({ side: classify(block.bbox, page.width), y0: block.bbox[1], block }))
    const leftUnits = units.filter((u) => u.side === 'left')
    const rightUnits = units.filter((u) => u.side === 'right')

    // Menos de dos elementos por lado: no hay suficiente evidencia de que esto sea realmente
    // una página a dos columnas (evita reordenar de más una página a una sola columna con,
    // p.ej., una nota al margen suelta).
    if (leftUnits.length < 2 || rightUnits.length < 2) return page

    const fullUnits = units.filter((u) => u.side === 'full')
    const columnsMinY = Math.min(...leftUnits.map((u) => u.y0), ...rightUnits.map((u) => u.y0))

    const header = fullUnits.filter((u) => u.y0 < columnsMinY).sort((a, b) => a.y0 - b.y0)
    const footer = fullUnits.filter((u) => u.y0 >= columnsMinY).sort((a, b) => a.y0 - b.y0)
    leftUnits.sort((a, b) => a.y0 - b.y0)
    rightUnits.sort((a, b) => a.y0 - b.y0)

    const orderedBlocks = [...header, ...leftUnits, ...rightUnits, ...footer].map((u) => u.block)

    const wasReordered =
      orderedBlocks.length !== page.blocks.length ||
      orderedBlocks.some((block, i) => block.id !== page.blocks[i]?.id)
    if (wasReordered) changed++

    return { ...page, blocks: orderedBlocks }
  })

  return { pages: outputPages, report: { transform: 't02-columns', changed, warnings: [] } }
}
