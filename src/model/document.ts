import type { IRBlock } from '@/ir/schema'
import type { TransformReport } from '@/transforms/base'

export interface Chapter {
  /** Hash estable del título normalizado — así sobreviven a que el pipeline reparta los capítulos distinto. */
  key: string
  title: string
  blocks: IRBlock[]
}

export interface DocModel {
  metadata: { title?: string; author?: string; language: string }
  chapters: Chapter[]
  toc: { level: number; title: string; chapterKey: string }[]
  reports: Record<string, TransformReport>
}
