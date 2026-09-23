import type { PipelineConfig } from '@/model/config'
import type { TransformReport } from '@/transforms/base'
import { TRANSFORM_ORDER, type TransformId } from '@/transforms/registry'
import { GapFactorControl } from './GapFactorControl'
import { TransformToggle } from './TransformToggle'

const LABELS: Record<TransformId, { label: string; description: string }> = {
  't01-unicode': { label: 'Normalización Unicode', description: 'Unifica acentos y ligaduras (ﬁ, ﬂ) a su forma estándar.' },
  't02-columns': { label: 'Columnas', description: 'Reordena páginas a dos columnas en el orden de lectura correcto.' },
  't03-runningHeads': {
    label: 'Cabeceras y pies repetidos',
    description: 'Quita encabezados y pies de página que se repiten en todo el documento.',
  },
  't04-pageNumbers': { label: 'Números de página', description: 'Quita líneas que son solo un número de página.' },
  't05-dehyphenate': { label: 'Guiones de fin de línea', description: 'Une palabras cortadas por guion al final de una línea.' },
  't06-joinLines': {
    label: 'Unir líneas en párrafos',
    description: 'Une las líneas que el PDF envolvió por ancho de página en párrafos fluidos.',
  },
  't07-headings': { label: 'Detección de encabezados', description: 'Marca títulos y subtítulos según su tamaño de fuente.' },
  't08-chapters': { label: 'División en capítulos', description: 'Separa el documento en capítulos por cada encabezado principal.' },
  't09-images': { label: 'Imágenes duplicadas', description: 'Quita imágenes decorativas que se repiten (logos, separadores).' },
  't10-footnotes': { label: 'Notas al pie', description: 'Marca texto con tamaño de nota al pie.' },
  't11-toc': { label: 'Tabla de contenidos', description: 'Arma el índice a partir de capítulos y subencabezados.' },
  't12-language': { label: 'Idiomas distintos', description: 'Detecta pasajes y frases en un idioma distinto al principal.' },
}

interface TransformPanelProps {
  config: PipelineConfig
  reports?: Partial<Record<TransformId, TransformReport>>
  onSetEnabled: (id: TransformId, enabled: boolean) => void
  onSetParams: (id: TransformId, params: Record<string, unknown>) => void
}

/** Panel de ajustes de 360px fijos — un toggle por transform, en el orden canónico de registry.ts. */
export function TransformPanel({ config, reports, onSetEnabled, onSetParams }: TransformPanelProps) {
  return (
    <div className="flex h-full w-[360px] shrink-0 flex-col overflow-y-auto border-r border-border bg-surface p-4">
      <h2 className="mb-2 text-[15px] font-semibold text-text">Ajustes</h2>
      {TRANSFORM_ORDER.map((id) => {
        const { label, description } = LABELS[id]
        const gapFactor = typeof config[id].params.gapFactor === 'number' ? config[id].params.gapFactor : 1.6

        return (
          <TransformToggle
            key={id}
            label={label}
            description={description}
            enabled={config[id].enabled}
            onEnabledChange={(enabled) => onSetEnabled(id, enabled)}
            report={reports?.[id]}
          >
            {id === 't06-joinLines' && (
              <GapFactorControl value={gapFactor} onCommit={(value) => onSetParams(id, { gapFactor: value })} />
            )}
          </TransformToggle>
        )
      })}
    </div>
  )
}
