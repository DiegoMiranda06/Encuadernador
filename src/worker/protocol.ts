/** Tipos del protocolo RPC entre el hilo principal y el Web Worker del pipeline. */

export interface ExtractInput {
  file: ArrayBuffer
  filename: string
}

export interface ExtractOutput {
  jobId: string
  pageCount: number
  imageCount: number
}

/** Un método por entrada del pipeline. Se amplía en pasos futuros (applyPipeline, renderChapter, ...). */
export interface WorkerRequestMap {
  extract: { input: ExtractInput; output: ExtractOutput }
}

export type WorkerMethod = keyof WorkerRequestMap

export interface WorkerRequestMessage<M extends WorkerMethod = WorkerMethod> {
  type: 'request'
  id: number
  method: M
  input: WorkerRequestMap[M]['input']
}

export interface WorkerResponseMessage<M extends WorkerMethod = WorkerMethod> {
  type: 'response'
  id: number
  method: M
  output: WorkerRequestMap[M]['output']
}

export interface WorkerErrorMessage {
  type: 'error'
  id: number
  message: string
}

export interface WorkerProgressMessage {
  type: 'progress'
  phase: 'extracting' | 'building'
  current: number
  total: number
}

export interface WorkerReadyMessage {
  type: 'ready'
}

export type WorkerOutboundMessage =
  | WorkerResponseMessage
  | WorkerErrorMessage
  | WorkerProgressMessage
  | WorkerReadyMessage
