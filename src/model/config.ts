import { TRANSFORM_ORDER, type TransformId } from '@/transforms/registry'

export interface TransformConfig {
  enabled: boolean
  params: Record<string, unknown>
}

/** Un toggle + params por transform. Toda llamada al worker manda esta config completa. */
export type PipelineConfig = Record<TransformId, TransformConfig>

/** Todas las transforms activas, sin overrides de parámetros — el punto de partida de cualquier trabajo nuevo. */
export function createDefaultPipelineConfig(): PipelineConfig {
  const config = Object.fromEntries(
    TRANSFORM_ORDER.map((id) => [id, { enabled: true, params: {} }]),
  ) as PipelineConfig
  config['t12-language'].params = { mainLanguage: 'spa' }
  return config
}
