import { create } from 'zustand'
import { createDefaultPipelineConfig, type PipelineConfig } from '@/model/config'
import type { TransformId } from '@/transforms/registry'

interface PipelineStore {
  jobId: string | null
  config: PipelineConfig
  /** Reinicia la config a los valores por defecto para un trabajo recién abierto. */
  loadJob: (jobId: string) => void
  setEnabled: (id: TransformId, enabled: boolean) => void
  setParams: (id: TransformId, params: Record<string, unknown>) => void
}

/** Config + dirty flag (vía debounce en usePipeline) — el toggle de un componente actualiza esto al instante. */
export const usePipelineStore = create<PipelineStore>((set) => ({
  jobId: null,
  config: createDefaultPipelineConfig(),
  loadJob: (jobId) => set({ jobId, config: createDefaultPipelineConfig() }),
  setEnabled: (id, enabled) =>
    set((state) => ({ config: { ...state.config, [id]: { ...state.config[id], enabled } } })),
  setParams: (id, params) =>
    set((state) => ({ config: { ...state.config, [id]: { ...state.config[id], params } } })),
}))
