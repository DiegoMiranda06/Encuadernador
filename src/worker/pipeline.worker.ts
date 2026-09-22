/// <reference lib="webworker" />
import * as mupdf from 'mupdf'
import type { WorkerMethod, WorkerRequestMap, WorkerRequestMessage } from './protocol'

declare const self: DedicatedWorkerGlobalScope

type Handlers = {
  [M in WorkerMethod]: (
    input: WorkerRequestMap[M]['input'],
  ) => WorkerRequestMap[M]['output'] | Promise<WorkerRequestMap[M]['output']>
}

const handlers: Handlers = {
  extract({ file }) {
    const document = mupdf.Document.openDocument(file, 'application/pdf')
    try {
      return { pageCount: document.countPages() }
    } finally {
      document.destroy()
    }
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
