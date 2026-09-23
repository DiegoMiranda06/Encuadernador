import type { IRBlock } from '@/ir/schema'
import type { TransformReport } from '@/transforms/base'

export interface Chapter {
  /** Hash estable del título normalizado — así sobreviven a que el pipeline reparta los capítulos distinto. */
  key: string
  title: string
  blocks: IRBlock[]
  /** HTML saneado del editor manual (Paso 9), aplicado por Paso 5 si hay uno guardado para esta key. */
  overrideHtml?: string
}

export interface DocModel {
  metadata: { title?: string; author?: string; language: string }
  chapters: Chapter[]
  /** `blockId` falta cuando el capítulo no tiene un bloque de encabezado real que ancle (el capítulo de respaldo, sin título propio) — el link va solo al archivo, sin ancla. */
  toc: { level: number; title: string; chapterKey: string; blockId?: string }[]
  reports: Record<string, TransformReport>
}
