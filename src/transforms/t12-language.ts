import type { IRBlock } from '@/ir/schema'
import { detectPassageLanguage } from '@/language/passages'
import { detectPhraseCandidates } from '@/language/phrases'
import type { LanguageCandidate } from '@/language/types'
import type { Chapter } from '@/model/document'
import type { TransformReport } from './base'

const SAMPLE_LENGTH = 80

export interface LanguageResult {
  chapters: Chapter[]
  candidates: LanguageCandidate[]
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
 * Detecta idiomas distintos al principal en dos capas, sin marcar nada en silencio (regla no
 * negociable #8): solo produce `candidates` para que una pantalla de revisión posterior confirme
 * cada una — nunca reasigna el idioma de un bloque por su cuenta.
 *
 * Capa 1 (pasajes, franc-min): párrafos de al menos MIN_PASSAGE_LENGTH caracteres. Capa 2
 * (frases, listas propias): solo corre si la capa 1 no encontró nada en ese bloque — cubre las
 * citas cortas que franc-min no puede evaluar de forma confiable. Ambas exigen 2+ palabras
 * seguidas (regla no negociable #9): nunca un idioma marcado por una sola palabra.
 */
export function t12Language(chapters: Chapter[], params: { mainLanguage?: string }): LanguageResult {
  const mainLanguage = params.mainLanguage ?? 'spa'
  const candidates: LanguageCandidate[] = []

  for (const chapter of chapters) {
    for (const block of chapter.blocks) {
      if (block.type !== 'text' || !block.lines) continue
      const text = blockText(block)
      if (!text) continue

      const passageLanguage = detectPassageLanguage(text, mainLanguage)
      if (passageLanguage) {
        candidates.push({
          chapterKey: chapter.key,
          blockId: block.id,
          language: passageLanguage,
          layer: 'passage',
          sample: text.slice(0, SAMPLE_LENGTH),
        })
        continue
      }

      for (const match of detectPhraseCandidates(text, mainLanguage)) {
        candidates.push({
          chapterKey: chapter.key,
          blockId: block.id,
          language: match.language,
          layer: 'phrase',
          sample: match.phrase,
        })
      }
    }
  }

  return { chapters, candidates, report: { transform: 't12-language', changed: candidates.length, warnings: [] } }
}
