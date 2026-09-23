/** El IR: la extracción fiel del PDF. Se genera una vez y nunca se muta. */

export interface IRSpan {
  text: string
  font: string
  size: number
  bold: boolean
  italic: boolean
  bbox: [number, number, number, number]
}

export interface IRLine {
  bbox: [number, number, number, number]
  spans: IRSpan[]
}

export interface IRBlock {
  /** Estable y referenciable desde la UI, p.ej. "p012b03". */
  id: string
  type: 'text' | 'image'
  bbox: [number, number, number, number]
  lines?: IRLine[]
  /** Solo si type === "image": clave en el store `assets` de IndexedDB. */
  assetId?: string
  sha256?: string
  width?: number
  height?: number
  /** Marcado por t07-headings. 1 = el tamaño de encabezado más grande del documento, 2 el siguiente, etc. */
  headingLevel?: number
  /** Marcado por t10-footnotes: texto consistentemente más chico que el cuerpo del documento. */
  isFootnote?: boolean
}

export interface IRPage {
  index: number
  width: number
  height: number
  rotation: number
  blocks: IRBlock[]
}

export interface RecurringBand {
  /** Bbox normalizada a fracción de página (0-1), promedio de las ocurrencias. */
  bbox: [number, number, number, number]
  /** Franja del 12% superior o inferior de la página. */
  position: 'top' | 'bottom'
  /** Cuántas páginas comparten esta banda. */
  occurrences: number
  /** Texto de una ocurrencia representativa, para depurar/mostrar en la UI. */
  sampleText: string
}

export interface DocumentStats {
  bodyFontSize: number
  sizeHistogram: Record<string, number>
  medianLineHeight: number
  medianLineGap: number
  textBbox: [number, number, number, number]
  recurringBands: RecurringBand[]
  columnCount: number
  indentBase: number
}

export interface OutlineEntry {
  level: number
  title: string
  page: number
}

export interface IRDocument {
  version: 1
  source: { filename: string; pageCount: number; sha256: string; fileSize: number }
  metadata: { title?: string; author?: string; subject?: string; creator?: string }
  outline: OutlineEntry[]
  pages: IRPage[]
  stats: DocumentStats
}
