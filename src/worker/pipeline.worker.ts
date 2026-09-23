/// <reference lib="webworker" />
import { extractDocument } from '@/ir/extract'
import type { JobRecord } from '@/storage/db'
import { getAssetsForDocument, getIRDocument, getOverridesForJob, saveExtractedJob } from '@/storage/jobs'
import { computeConfigHash, runPipeline } from './applyPipeline'
import type { ApplyPipelineOutput, WorkerMethod, WorkerRequestMap, WorkerRequestMessage } from './protocol'

declare const self: DedicatedWorkerGlobalScope

type Handlers = {
  [M in WorkerMethod]: (
    input: WorkerRequestMap[M]['input'],
  ) => WorkerRequestMap[M]['output'] | Promise<WorkerRequestMap[M]['output']>
}

// Se pierde al recargar la página — aceptable, el recálculo es rápido (Paso 5 del blueprint).
const pipelineCache = new Map<string, ApplyPipelineOutput>()

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
    await saveExtractedJob(job, document, assets)

    return { jobId: job.jobId, pageCount: document.source.pageCount, imageCount: assets.size }
  },

  async applyPipeline({ jobId, config }) {
    const document = await getIRDocument(jobId)
    if (!document) throw new Error(`No se encontró el documento IR para el trabajo ${jobId}`)

    const configHash = await computeConfigHash(document.source.sha256, config)
    const cacheKey = `${jobId}:${configHash}`
    const cached = pipelineCache.get(cacheKey)
    if (cached) return cached

    const [assets, overrides] = await Promise.all([getAssetsForDocument(document), getOverridesForJob(jobId)])
    const result = await runPipeline(document, assets, config, overrides)
    const output: ApplyPipelineOutput = { ...result, configHash }
    pipelineCache.set(cacheKey, output)
    return output
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
