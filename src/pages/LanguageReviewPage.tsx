import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useLanguageReview } from '@/hooks/useLanguageReview'
import { usePipeline } from '@/hooks/usePipeline'
import type { LanguageCandidate } from '@/language/types'

const LANGUAGE_NAMES: Record<string, string> = {
  deu: 'alemán',
  fra: 'francés',
  ita: 'italiano',
  lat: 'latín',
  eng: 'inglés',
  por: 'portugués',
  cat: 'catalán',
  spa: 'español',
}

function languageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code
}

function groupByLanguage(candidates: LanguageCandidate[]): [string, LanguageCandidate[]][] {
  const map = new Map<string, LanguageCandidate[]>()
  for (const candidate of candidates) {
    const list = map.get(candidate.language) ?? []
    list.push(candidate)
    map.set(candidate.language, list)
  }
  return [...map.entries()]
}

/**
 * Lista de pasajes (capa 1) y frases (capa 2) detectados por t12-language — nunca se aplica
 * nada sin pasar por acá, ni siquiera la capa de pasajes (regla no negociable #9, reforzada por
 * un hallazgo real de la calibración del Paso 7: franc-min marcó como portugués una oración en
 * español perfectamente correcta).
 */
export function LanguageReviewPage() {
  const jobId = useParams<{ jobId: string }>().jobId ?? ''
  const { result } = usePipeline(jobId)
  const { confirm, dismiss, isPending } = useLanguageReview(jobId)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const groups = useMemo(() => groupByLanguage(result?.languageCandidates ?? []), [result?.languageCandidates])

  function toggle(blockId: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(blockId)) next.delete(blockId)
      else next.add(blockId)
      return next
    })
  }

  function clearChecked(ids: string[]) {
    setChecked((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.delete(id)
      return next
    })
  }

  async function withErrorToast(action: () => Promise<unknown>) {
    try {
      await action()
    } catch (cause) {
      toast.error('No se pudo aplicar la decisión de idioma', {
        description: cause instanceof Error ? cause.message : String(cause),
      })
    }
  }

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8 text-text">
      <Link to={`/job/${jobId}`} className="text-[12px] text-primary hover:text-primary-hover">
        ← Ajustes
      </Link>
      <h1 className="mt-3 text-[18px] font-semibold">Revisión de idioma</h1>
      <p className="mt-1 text-[13px] text-text-muted">
        Nada se aplica sin que lo confirmes acá — ni los pasajes largos ni las frases cortas.
      </p>

      {groups.length === 0 && <p className="mt-6 text-[13px] text-text-muted">No hay candidatas pendientes.</p>}

      {groups.map(([language, items]) => {
        const ids = items.map((item) => item.blockId)
        const selectedIds = ids.filter((id) => checked.has(id))

        return (
          <section key={language} className="mt-6 rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold capitalize">{languageName(language)}</h2>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => withErrorToast(() => confirm(ids, language))}
              >
                Confirmar todo en {languageName(language)}
              </Button>
            </div>

            <ul className="mt-3 divide-y divide-border">
              {items.map((item) => (
                <li key={item.blockId} className="flex items-start gap-3 py-2">
                  <input
                    type="checkbox"
                    className="mt-1 accent-primary"
                    checked={checked.has(item.blockId)}
                    onChange={() => toggle(item.blockId)}
                  />
                  <div className="flex-1">
                    <p className="text-[13px] text-text">{item.sample}</p>
                    <p className="mt-0.5 text-[12px] text-text-subtle">{item.layer === 'passage' ? 'Pasaje' : 'Frase'}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                disabled={isPending || selectedIds.length === 0}
                onClick={() =>
                  withErrorToast(async () => {
                    await confirm(selectedIds, language)
                    clearChecked(selectedIds)
                  })
                }
              >
                Confirmar seleccionadas
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending || selectedIds.length === 0}
                onClick={() =>
                  withErrorToast(async () => {
                    await dismiss(selectedIds, language)
                    clearChecked(selectedIds)
                  })
                }
              >
                Descartar seleccionadas
              </Button>
            </div>
          </section>
        )
      })}
    </div>
  )
}
