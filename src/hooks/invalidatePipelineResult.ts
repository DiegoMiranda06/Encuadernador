import type { QueryClient } from '@tanstack/react-query'

/**
 * Cualquier mutación que invalide el resultado cacheado del worker para un jobId (confirmar
 * idioma, guardar un override) sin cambiar `config` — así que el configHash no cambia solo —
 * tiene que invalidar las dos familias de queries: `pipeline` (para que el panel de ajustes y
 * los reports se actualicen) y `chapterPreview` (su key no depende de nada de esto, así que sin
 * esto seguiría sirviendo el XHTML viejo desde caché aunque el worker ya haya recalculado).
 */
export function invalidatePipelineResult(queryClient: QueryClient, jobId: string): void {
  queryClient.invalidateQueries({ queryKey: ['pipeline', jobId] })
  queryClient.invalidateQueries({ queryKey: ['chapterPreview', jobId] })
}
