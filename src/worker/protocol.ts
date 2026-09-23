/** Tipos del protocolo RPC entre el hilo principal y el Web Worker del pipeline. */
import type { LanguageDecision } from '@/language/types'
import type { PipelineConfig } from '@/model/config'
import type { PipelineRunResult } from './applyPipeline'

export interface ExtractInput {
  file: ArrayBuffer
  filename: string
}

export interface ExtractOutput {
  jobId: string
  pageCount: number
  imageCount: number
}

export interface ApplyPipelineInput {
  jobId: string
  config: PipelineConfig
}

export type ApplyPipelineOutput = PipelineRunResult & { configHash: string }

export interface RenderChapterInput {
  jobId: string
  chapterIndex: number
  configHash: string
}

export type RenderChapterOutput = string

export interface ConfirmLanguageInput {
  jobId: string
  decisions: { blockId: string; decision: LanguageDecision['decision']; language: string }[]
}

export type ConfirmLanguageOutput = { ok: true }

export interface SaveOverrideInput {
  jobId: string
  chapterKey: string
  /** Ya saneado con dompurify en el hilo principal (regla no negociable #5) antes de llegar acá. */
  html: string
}

export type SaveOverrideOutput = { ok: true }

/** Un método por entrada del pipeline. Se amplía en pasos futuros. */
export interface WorkerRequestMap {
  extract: { input: ExtractInput; output: ExtractOutput }
  applyPipeline: { input: ApplyPipelineInput; output: ApplyPipelineOutput }
  renderChapter: { input: RenderChapterInput; output: RenderChapterOutput }
  confirmLanguage: { input: ConfirmLanguageInput; output: ConfirmLanguageOutput }
  saveOverride: { input: SaveOverrideInput; output: SaveOverrideOutput }
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
