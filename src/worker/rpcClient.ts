import type { WorkerMethod, WorkerOutboundMessage, WorkerRequestMap } from './protocol'

type ProgressHandler = (message: Extract<WorkerOutboundMessage, { type: 'progress' }>) => void

interface PendingCall {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}

interface QueuedRequest {
  id: number
  method: WorkerMethod
  input: unknown
}

/** Cliente con Promesas sobre `postMessage`, en el hilo principal. */
export class RpcClient {
  private readonly worker: Worker
  private nextId = 0
  private ready = false
  private readonly queue: QueuedRequest[] = []
  private readonly pending = new Map<number, PendingCall>()
  private readonly progressHandlers = new Set<ProgressHandler>()

  constructor(worker: Worker) {
    this.worker = worker
    this.worker.addEventListener('message', this.handleMessage)
  }

  call<M extends WorkerMethod>(
    method: M,
    input: WorkerRequestMap[M]['input'],
  ): Promise<WorkerRequestMap[M]['output']> {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject })
      const request: QueuedRequest = { id, method, input }
      // El worker tarda en cargar mupdf/WASM — encolamos hasta su señal "ready"
      // para no perder mensajes mandados antes de que su listener exista.
      if (this.ready) {
        this.worker.postMessage({ type: 'request', ...request })
      } else {
        this.queue.push(request)
      }
    })
  }

  onProgress(handler: ProgressHandler): () => void {
    this.progressHandlers.add(handler)
    return () => this.progressHandlers.delete(handler)
  }

  private handleMessage = (event: MessageEvent<WorkerOutboundMessage>) => {
    const message = event.data
    if (message.type === 'ready') {
      this.ready = true
      for (const request of this.queue.splice(0)) {
        this.worker.postMessage({ type: 'request', ...request })
      }
      return
    }
    if (message.type === 'progress') {
      for (const handler of this.progressHandlers) handler(message)
      return
    }
    const call = this.pending.get(message.id)
    if (!call) return
    this.pending.delete(message.id)
    if (message.type === 'error') {
      call.reject(new Error(message.message))
    } else {
      call.resolve(message.output)
    }
  }
}
