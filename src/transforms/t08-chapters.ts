import type { IRBlock, IRPage } from '@/ir/schema'
import { sha256Hex } from '@/lib/hash'
import type { Chapter } from '@/model/document'
import type { TransformReport } from './base'

export interface ChapterResult {
  chapters: Chapter[]
  report: TransformReport
}

function blockText(block: IRBlock): string {
  return (block.lines ?? [])
    .flatMap((line) => line.spans)
    .map((span) => span.text)
    .join(' ')
    .trim()
}

/**
 * Rompe a propósito la forma que comparten t01 a t07 (IRPage[] → IRPage[]): agrupa las
 * páginas en capítulos, arrancando uno nuevo en cada bloque marcado headingLevel === 1 por
 * t07-headings. El contenido antes del primer título (o todo el documento, si no hay ninguno)
 * cae en un capítulo con `fallbackTitle`.
 */
export async function t08Chapters(
  pages: IRPage[],
  _params: Record<string, unknown>,
  fallbackTitle = 'Documento',
): Promise<ChapterResult> {
  const titleCounts = new Map<string, number>()

  async function makeKey(title: string): Promise<string> {
    const normalized = title.trim().toLowerCase()
    const count = (titleCounts.get(normalized) ?? 0) + 1
    titleCounts.set(normalized, count)
    // Desambigua títulos repetidos (dos capítulos "Introducción") sin cambiar el título visible.
    const seed = count === 1 ? normalized : `${normalized}#${count}`
    return sha256Hex(new TextEncoder().encode(seed))
  }

  const chapters: Chapter[] = []
  let currentBlocks: IRBlock[] = []
  let currentTitle: string | null = null

  async function flush() {
    if (currentBlocks.length === 0) return
    const title = currentTitle ?? fallbackTitle
    chapters.push({ key: await makeKey(title), title, blocks: currentBlocks })
  }

  for (const block of pages.flatMap((page) => page.blocks)) {
    if (block.headingLevel === 1) {
      await flush()
      currentBlocks = [block]
      currentTitle = blockText(block) || fallbackTitle
    } else {
      currentBlocks.push(block)
    }
  }
  await flush()

  return { chapters, report: { transform: 't08-chapters', changed: chapters.length, warnings: [] } }
}
