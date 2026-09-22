import type { IRPage } from '@/ir/schema'

/** Cuántos cambios hizo una transform — se muestra en la UI (regla no negociable #7). */
export interface TransformReport {
  transform: string
  changed: number
  warnings: string[]
}

export interface TransformResult {
  pages: IRPage[]
  report: TransformReport
}

/**
 * t01 a t07 comparten esta forma: reciben las páginas del IR (o el resultado de la transform
 * anterior) y devuelven páginas nuevas — el IR nunca se muta. t08-chapters rompe esta forma a
 * propósito (agrupa páginas en capítulos); su tipo se define junto con esa transform.
 */
export type Transform = (pages: IRPage[], params: Record<string, unknown>) => TransformResult
