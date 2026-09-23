import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { LanguageDecision } from '@/language/types'
import { rpc } from '@/lib/rpc'

type Decision = { blockId: string; decision: LanguageDecision['decision']; language: string }

/**
 * Manda las decisiones al worker y, al terminar, invalida la query de `pipeline` para este
 * trabajo — el configHash no cambió (las decisiones no son config), así que sin esto React
 * Query no volvería a pedir `applyPipeline` y la UI seguiría mostrando candidatas ya resueltas.
 */
export function useLanguageReview(jobId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (decisions: Decision[]) => rpc.confirmLanguage(jobId, decisions),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline', jobId] }),
  })

  return {
    confirm: (blockIds: string[], language: string) =>
      mutation.mutateAsync(blockIds.map((blockId) => ({ blockId, decision: 'confirmed' as const, language }))),
    dismiss: (blockIds: string[], language: string) =>
      mutation.mutateAsync(blockIds.map((blockId) => ({ blockId, decision: 'dismissed' as const, language }))),
    isPending: mutation.isPending,
  }
}
