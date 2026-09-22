/// <reference lib="webworker" />
import { extractDocument } from '@/ir/extract'
import type { JobRecord } from '@/storage/db'
import { saveExtractedJob } from '@/storage/jobs'
import type { WorkerMethod, WorkerRequestMap, WorkerRequestMessage } from './protocol'

declare const self: DedicatedWorkerGlobalScope

type Handlers = {
  [M in WorkerMethod]: (
    input: WorkerRequestMap[M]['input'],
  ) => WorkerRequestMap[M]['output'] | Promise<WorkerRequestMap[M]['output']>
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
    await saveExtractedJob(job, document, assets)

    return { jobId: job.jobId, pageCount: document.source.pageCount, imageCount: assets.size }
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
