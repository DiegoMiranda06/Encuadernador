/// <reference lib="webworker" />
import { extractCoverCandidates } from '@/cover/extract'
import { renderCover } from '@/cover/render'
import { renderChapterXhtml } from '@/epub/render'
import { extractDocument } from '@/ir/extract'
import type { JobRecord } from '@/storage/db'
import {
  getAssetBlob,
  getAssetsForDocument,
  getIRDocument,
  getLanguageDecisionsForJob,
  getOverridesForJob,
  getSourceFile,
  saveCover,
  saveExtractedJob,
  saveJobCoverCrop,
  saveLanguageDecisions,
  saveOverride,
} from '@/storage/jobs'
import { computeConfigHash, runPipeline } from './applyPipeline'
import type { ApplyPipelineOutput, WorkerMethod, WorkerRequestMap, WorkerRequestMessage } from './protocol'

declare const self: DedicatedWorkerGlobalScope

type Handlers = {
  [M in WorkerMethod]: (
    input: WorkerRequestMap[M]['input'],
  ) => WorkerRequestMap[M]['output'] | Promise<WorkerRequestMap[M]['output']>
}

// Ambos se pierden al recargar la página — aceptable, recalcular es rápido (Paso 5 del blueprint).
const pipelineCache = new Map<string, ApplyPipelineOutput>()
// `blob:` URLs de imagen, por assetId — estables mientras dure la pestaña, para no crear una
// nueva por cada renderChapter (preview y build final resuelven igual, solo cambia esta URL).
const assetUrlCache = new Map<string, string>()

// Ni las decisiones de idioma ni los overrides cambian `config` — el configHash no se mueve
// solo, pero el resultado cacheado para ese jobId ya no vale (regla no negociable #8: nada se
// aplica en silencio, así que el próximo applyPipeline debe recalcular con lo recién guardado).
function invalidatePipelineCache(jobId: string): void {
  for (const key of pipelineCache.keys()) {
    if (key.startsWith(`${jobId}:`)) pipelineCache.delete(key)
  }
}

async function resolveAssetHrefs(assetIds: Iterable<string>): Promise<Map<string, string>> {
  const hrefByAssetId = new Map<string, string>()
  await Promise.all(
    [...assetIds].map(async (assetId) => {
      if (!assetUrlCache.has(assetId)) {
        const blob = await getAssetBlob(assetId)
        if (blob) assetUrlCache.set(assetId, URL.createObjectURL(blob))
      }
      const href = assetUrlCache.get(assetId)
      if (href) hrefByAssetId.set(assetId, href)
    }),
  )
  return hrefByAssetId
}

const handlers: Handlers = {
  async extract({ file, filename }) {
    const { document, assets } = await extractDocument(file, filename, (progress) => {
      self.postMessage({ type: 'progress', phase: 'extracting', ...progress })
    })

    const job: JobRecord = {
      jobId: crypto.randomUUID(),
      status: 'extracted',
      createdAt: Date.now(),
      filename,
      pageCount: document.source.pageCount,
      overrideKeys: [],
    }
    await saveExtractedJob(job, document, assets, file)

    return { jobId: job.jobId, pageCount: document.source.pageCount, imageCount: assets.size }
  },

  async applyPipeline({ jobId, config }) {
    const document = await getIRDocument(jobId)
    if (!document) throw new Error(`No se encontró el documento IR para el trabajo ${jobId}`)

    const configHash = await computeConfigHash(document.source.sha256, config)
    const cacheKey = `${jobId}:${configHash}`
    const cached = pipelineCache.get(cacheKey)
    if (cached) return cached

    const [assets, overrides, languageDecisions] = await Promise.all([
      getAssetsForDocument(document),
      getOverridesForJob(jobId),
      getLanguageDecisionsForJob(jobId),
    ])
    const result = await runPipeline(document, assets, config, overrides, languageDecisions)
    const output: ApplyPipelineOutput = { ...result, configHash }
    pipelineCache.set(cacheKey, output)
    return output
  },

  async confirmLanguage({ jobId, decisions }) {
    await saveLanguageDecisions(jobId, decisions)
    invalidatePipelineCache(jobId)
    return { ok: true }
  },

  async saveOverride({ jobId, chapterKey, html }) {
    await saveOverride(jobId, chapterKey, html)
    invalidatePipelineCache(jobId)
    return { ok: true }
  },

  async renderChapter({ jobId, chapterIndex, configHash }) {
    const cached = pipelineCache.get(`${jobId}:${configHash}`)
    if (!cached) throw new Error('No hay un resultado de pipeline cacheado para este configHash — llamá a applyPipeline primero.')

    const chapter = cached.chapters[chapterIndex]
    if (!chapter) throw new Error(`El trabajo ${jobId} no tiene un capítulo en el índice ${chapterIndex}`)

    const assetIds = new Set<string>()
    for (const block of chapter.blocks) {
      if (block.type === 'image' && block.assetId) assetIds.add(block.assetId)
    }
    const hrefByAssetId = await resolveAssetHrefs(assetIds)

    return renderChapterXhtml(chapter, {
      language: cached.metadata.language,
      resolveAssetHref: (assetId) => hrefByAssetId.get(assetId) ?? '',
    })
  },

  async extractCoverCandidates({ jobId }) {
    const [sourceFile, document] = await Promise.all([getSourceFile(jobId), getIRDocument(jobId)])
    if (!sourceFile) throw new Error(`No se encontró el PDF original del trabajo ${jobId}`)
    if (!document) throw new Error(`No se encontró el documento IR para el trabajo ${jobId}`)

    const assets = await getAssetsForDocument(document)
    const sourceBuffer = await sourceFile.arrayBuffer()
    return extractCoverCandidates(sourceBuffer, document, assets)
  },

  async renderCover({ jobId, candidateId, sourceBlob, crop }) {
    const cover = await renderCover(sourceBlob, crop)
    await Promise.all([saveCover(jobId, cover), saveJobCoverCrop(jobId, { candidateId, ...crop })])
    return cover
  },
}

self.addEventListener('message', async (event: MessageEvent<WorkerRequestMessage>) => {
  const { id, method, input } = event.data
  try {
    const output = await handlers[method](input as never)
    self.postMessage({ type: 'response', id, method, output })
  } catch (error) {
    self.postMessage({ type: 'error', id, message: error instanceof Error ? error.message : String(error) })
  }
})

// mupdf tarda en cargar su WASM — avisa al hilo principal cuando ya puede recibir llamadas,
// para que RpcClient no pierda mensajes mandados antes de que este listener exista.
self.postMessage({ type: 'ready' })
