import { useState } from 'react'
import { rpc } from '@/lib/rpc'
import type { PipelineConfig } from '@/model/config'
import type { TransformId } from '@/transforms/registry'
import { usePipeline } from './usePipeline'

/**
 * Envuelve usePipeline: antes de aplicar un cambio de ajuste mientras hay capítulos editados a
 * mano, simula el pipeline candidato (applyPipeline es pura y ya está cacheada por
 * configHash — no tiene costo real de más) y compara los huérfanos resultantes contra los
 * actuales. Si el cambio generaría un huérfano NUEVO — un capítulo editado que dejaría de
 * reflejar la corrección manual — no lo aplica todavía: lo deja pendiente para que la UI
 * confirme antes (regla no negociable #8, pero antes del hecho, no después).
 */
export function useGuardedPipeline(jobId: string) {
  const pipeline = usePipeline(jobId)
  const [pendingApply, setPendingApply] = useState<(() => void) | null>(null)

  const hasEditedChapters = (pipeline.result?.chapters ?? []).some((chapter) => chapter.overrideHtml)
  const currentOrphans = new Set(pipeline.result?.orphanedOverrides ?? [])

  async function guard(candidateConfig: PipelineConfig, apply: () => void) {
    if (!hasEditedChapters || !pipeline.result) {
      apply()
      return
    }
    const candidate = await rpc.applyPipeline(jobId, candidateConfig)
    const wouldOrphanSomething = candidate.orphanedOverrides.some((key) => !currentOrphans.has(key))
    if (wouldOrphanSomething) setPendingApply(() => apply)
    else apply()
  }

  function setEnabled(id: TransformId, enabled: boolean) {
    const candidate = { ...pipeline.config, [id]: { ...pipeline.config[id], enabled } }
    void guard(candidate, () => pipeline.setEnabled(id, enabled))
  }

  function setParams(id: TransformId, params: Record<string, unknown>) {
    const candidate = { ...pipeline.config, [id]: { ...pipeline.config[id], params } }
    void guard(candidate, () => pipeline.setParams(id, params))
  }

  return {
    ...pipeline,
    setEnabled,
    setParams,
    hasPendingChange: pendingApply !== null,
    confirmPendingChange: () => {
      pendingApply?.()
      setPendingApply(null)
    },
    cancelPendingChange: () => setPendingApply(null),
  }
}
