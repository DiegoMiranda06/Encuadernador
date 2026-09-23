import { useQuery } from '@tanstack/react-query'
import { rpc } from '@/lib/rpc'
import { usePipelineStore } from '@/store/pipeline'
import { useDebouncedValue } from './useDebouncedValue'

const DEBOUNCE_MS = 300

/**
 * El toggle actualiza `config` en Zustand al instante (UI reactiva sin esperar al worker);
 * `debouncedConfig` es lo que de verdad se manda a `applyPipeline`, 300ms después del último
 * cambio — así mover varios sliders seguidos no dispara un recálculo por cada uno.
 */
export function usePipeline(jobId: string) {
  const config = usePipelineStore((state) => state.config)
  const setEnabled = usePipelineStore((state) => state.setEnabled)
  const setParams = usePipelineStore((state) => state.setParams)
  const debouncedConfig = useDebouncedValue(config, DEBOUNCE_MS)

  const query = useQuery({
    queryKey: ['pipeline', jobId, JSON.stringify(debouncedConfig)],
    queryFn: () => rpc.applyPipeline(jobId, debouncedConfig),
  })

  return {
    config,
    setEnabled,
    setParams,
    result: query.data,
    isApplying: query.isFetching || config !== debouncedConfig,
    error: query.error,
  }
}
