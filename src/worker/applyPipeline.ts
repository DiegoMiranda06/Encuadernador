import { sha256Hex } from '@/lib/hash'
import type { LanguageCandidate, LanguageDecision } from '@/language/types'
import type { PipelineConfig } from '@/model/config'
import type { Chapter, DocModel } from '@/model/document'
import type { IRDocument, IRPage } from '@/ir/schema'
import type { Transform, TransformReport } from '@/transforms/base'
import type { TransformId } from '@/transforms/registry'
import { t01Unicode } from '@/transforms/t01-unicode'
import { t02Columns } from '@/transforms/t02-columns'
import { t03RunningHeads } from '@/transforms/t03-runningHeads'
import { t04PageNumbers } from '@/transforms/t04-pageNumbers'
import { t05Dehyphenate } from '@/transforms/t05-dehyphenate'
import { t06JoinLines } from '@/transforms/t06-joinLines'
import { t07Headings } from '@/transforms/t07-headings'
import { t08Chapters } from '@/transforms/t08-chapters'
import { t09Images } from '@/transforms/t09-images'
import { t10Footnotes } from '@/transforms/t10-footnotes'
import { t11Toc } from '@/transforms/t11-toc'
import { t12Language } from '@/transforms/t12-language'

export interface PipelineRunResult {
  metadata: DocModel['metadata']
  chapters: Chapter[]
  toc: DocModel['toc']
  languageCandidates: LanguageCandidate[]
  reports: Record<TransformId, TransformReport>
  warnings: string[]
  /** chapterKeys con un override guardado que ya no corresponde a ningún capítulo actual — nunca se borran solos (regla no negociable #8). */
  orphanedOverrides: string[]
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([key, v]) => `${JSON.stringify(key)}:${canonicalJson(v)}`).join(',')}}`
}

/** `configHash = sha256(irSha256 + configJsonCanónico)` — la clave de caché del Paso 5. */
export async function computeConfigHash(irSha256: string, config: PipelineConfig): Promise<string> {
  const payload = `${irSha256}:${canonicalJson(config)}`
  return sha256Hex(new TextEncoder().encode(payload))
}

const disabledReport = (transform: TransformId): TransformReport => ({ transform, changed: 0, warnings: [] })

function runPageTransform(
  id: TransformId,
  transform: Transform,
  pages: IRPage[],
  config: PipelineConfig,
  reports: Partial<Record<TransformId, TransformReport>>,
  warnings: string[],
): IRPage[] {
  const { enabled, params } = config[id]
  if (!enabled) {
    reports[id] = disabledReport(id)
    return pages
  }
  const result = transform(pages, params)
  reports[id] = result.report
  warnings.push(...result.report.warnings)
  return result.pages
}

/**
 * Aplica las decisiones ya tomadas en la Revisión de idioma (Paso 8): un bloque "confirmed"
 * recibe su `lang` (persiste aunque, tras un cambio de config, ya no vuelva a salir como
 * candidata); un bloque con cualquier decisión — confirmada o descartada — sale de la lista de
 * candidatas, para no volver a pedirle al usuario algo que ya revisó.
 */
function applyLanguageDecisions(
  chapters: Chapter[],
  candidates: LanguageCandidate[],
  languageDecisions: Map<string, LanguageDecision>,
): { chapters: Chapter[]; candidates: LanguageCandidate[] } {
  if (languageDecisions.size === 0) return { chapters, candidates }

  const outputChapters = chapters.map((chapter) => ({
    ...chapter,
    blocks: chapter.blocks.map((block) => {
      const decision = languageDecisions.get(block.id)
      return decision?.decision === 'confirmed' ? { ...block, lang: decision.language } : block
    }),
  }))
  const remainingCandidates = candidates.filter((candidate) => !languageDecisions.has(candidate.blockId))

  return { chapters: outputChapters, candidates: remainingCandidates }
}

/**
 * Cablea `registry.ts` (t01 a t12, en ese orden fijo) sobre un IRDocument ya extraído: aplica
 * las transforms activas, junta los overrides guardados y detecta los huérfanos. No toca
 * IndexedDB ni caché — eso es responsabilidad de `pipeline.worker.ts`, que sí conoce el jobId.
 */
export async function runPipeline(
  document: IRDocument,
  assets: Map<string, Uint8Array>,
  config: PipelineConfig,
  overridesByKey: Map<string, string>,
  languageDecisions: Map<string, LanguageDecision> = new Map(),
): Promise<PipelineRunResult> {
  const reports: Partial<Record<TransformId, TransformReport>> = {}
  const warnings: string[] = []

  let pages = document.pages
  pages = runPageTransform('t01-unicode', t01Unicode, pages, config, reports, warnings)
  pages = runPageTransform('t02-columns', t02Columns, pages, config, reports, warnings)
  pages = runPageTransform('t03-runningHeads', t03RunningHeads, pages, config, reports, warnings)
  pages = runPageTransform('t04-pageNumbers', t04PageNumbers, pages, config, reports, warnings)
  pages = runPageTransform('t05-dehyphenate', t05Dehyphenate, pages, config, reports, warnings)
  pages = runPageTransform('t06-joinLines', t06JoinLines, pages, config, reports, warnings)
  pages = runPageTransform('t07-headings', t07Headings, pages, config, reports, warnings)

  // t08 no se puede "saltar" (todo lo que sigue necesita Chapter[], no IRPage[]) — desactivarla
  // significa no partir por encabezados, es decir, un solo capítulo con todo el documento.
  const chaptersConfig = config['t08-chapters']
  const pagesForChapters = chaptersConfig.enabled
    ? pages
    : pages.map((page) => ({ ...page, blocks: page.blocks.map((block) => ({ ...block, headingLevel: undefined })) }))
  const fallbackTitle = document.metadata.title ?? 'Documento'
  const t08Result = await t08Chapters(pagesForChapters, chaptersConfig.params, fallbackTitle)
  reports['t08-chapters'] = t08Result.report
  warnings.push(...t08Result.report.warnings)
  let chapters = t08Result.chapters

  const imagesConfig = config['t09-images']
  if (imagesConfig.enabled) {
    const t09Result = await t09Images(chapters, assets, imagesConfig.params)
    chapters = t09Result.chapters
    reports['t09-images'] = t09Result.report
    warnings.push(...t09Result.report.warnings)
  } else {
    reports['t09-images'] = disabledReport('t09-images')
  }

  const footnotesConfig = config['t10-footnotes']
  if (footnotesConfig.enabled) {
    const t10Result = t10Footnotes(chapters, footnotesConfig.params)
    chapters = t10Result.chapters
    reports['t10-footnotes'] = t10Result.report
  } else {
    reports['t10-footnotes'] = disabledReport('t10-footnotes')
  }

  const tocConfig = config['t11-toc']
  let toc: DocModel['toc'] = []
  if (tocConfig.enabled) {
    const t11Result = t11Toc(chapters, tocConfig.params)
    chapters = t11Result.chapters
    toc = t11Result.toc
    reports['t11-toc'] = t11Result.report
  } else {
    reports['t11-toc'] = disabledReport('t11-toc')
  }

  const languageConfig = config['t12-language']
  const mainLanguage = (languageConfig.params.mainLanguage as string | undefined) ?? 'spa'
  let languageCandidates: LanguageCandidate[] = []
  if (languageConfig.enabled) {
    const t12Result = t12Language(chapters, { mainLanguage })
    languageCandidates = t12Result.candidates
    reports['t12-language'] = t12Result.report
  } else {
    reports['t12-language'] = disabledReport('t12-language')
  }

  ;({ chapters, candidates: languageCandidates } = applyLanguageDecisions(chapters, languageCandidates, languageDecisions))

  const currentKeys = new Set(chapters.map((chapter) => chapter.key))
  const orphanedOverrides = [...overridesByKey.keys()].filter((key) => !currentKeys.has(key))
  chapters = chapters.map((chapter) => {
    const overrideHtml = overridesByKey.get(chapter.key)
    return overrideHtml ? { ...chapter, overrideHtml } : chapter
  })

  return {
    metadata: { title: document.metadata.title, author: document.metadata.author, language: mainLanguage },
    chapters,
    toc,
    languageCandidates,
    reports: reports as Record<TransformId, TransformReport>,
    warnings,
    orphanedOverrides,
  }
}
