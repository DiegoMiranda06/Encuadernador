import type { TransformId } from '@/transforms/registry'

export interface TransformConfig {
  enabled: boolean
  params: Record<string, unknown>
}

/** Un toggle + params por transform. Toda llamada al worker manda esta config completa. */
export type PipelineConfig = Record<TransformId, TransformConfig>
