/**
 * Orden canónico de las doce transforms — NO reordenar a la ligera. Cada una asume que las
 * anteriores ya corrieron (p.ej. t06-joinLines necesita que t05-dehyphenate ya haya limpiado los
 * guiones de fin de línea). Se completa a medida que cada transform se implementa (Paso 4).
 */
export const TRANSFORM_ORDER = [
  't01-unicode',
  't02-columns',
  't03-runningHeads',
  't04-pageNumbers',
  't05-dehyphenate',
  't06-joinLines',
  't07-headings',
  't08-chapters',
  't09-images',
  't10-footnotes',
  't11-toc',
  't12-language',
] as const

export type TransformId = (typeof TRANSFORM_ORDER)[number]
