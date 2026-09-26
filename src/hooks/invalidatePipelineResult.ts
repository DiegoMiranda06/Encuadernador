import type { QueryClient } from '@tanstack/react-query'

/**
 * Cualquier mutación que invalide el resultado cacheado del worker para un jobId (confirmar
 * idioma, guardar un override) sin cambiar `config` — así que el configHash no cambia solo —
 * tiene que invalidar la query `pipeline`, para que el panel de ajustes, los reports y el
 * contenido que se edita se actualicen con lo recién guardado.
 */
export function invalidatePipelineResult(queryClient: QueryClient, jobId: string): void {
  queryClient.invalidateQueries({ queryKey: ['pipeline', jobId] })
}
