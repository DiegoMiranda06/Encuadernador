import type { CropRect } from '@/cover/render'
import type { LanguageDecision } from '@/language/types'
import type { PipelineConfig } from '@/model/config'
import { RpcClient } from '@/worker/rpcClient'
import PipelineWorker from '@/worker/pipeline.worker?worker'

let client: RpcClient | null = null

function getClient(): RpcClient {
  client ??= new RpcClient(new PipelineWorker())
  return client
}

/** Única puerta de entrada al worker del pipeline — ningún componente llama `postMessage` directo. */
export const rpc = {
  extract: (file: ArrayBuffer, filename: string) => getClient().call('extract', { file, filename }),
  applyPipeline: (jobId: string, config: PipelineConfig) => getClient().call('applyPipeline', { jobId, config }),
  renderChapter: (jobId: string, chapterIndex: number, configHash: string) =>
    getClient().call('renderChapter', { jobId, chapterIndex, configHash }),
  confirmLanguage: (jobId: string, decisions: { blockId: string; decision: LanguageDecision['decision']; language: string }[]) =>
    getClient().call('confirmLanguage', { jobId, decisions }),
  saveOverride: (jobId: string, chapterKey: string, html: string) =>
    getClient().call('saveOverride', { jobId, chapterKey, html }),
  extractCoverCandidates: (jobId: string) => getClient().call('extractCoverCandidates', { jobId }),
  renderCover: (jobId: string, candidateId: string, sourceBlob: Blob, crop: CropRect) =>
    getClient().call('renderCover', { jobId, candidateId, sourceBlob, crop }),
  build: (jobId: string, configHash: string) => getClient().call('build', { jobId, configHash }),
  onExtractionProgress: (handler: (current: number, total: number) => void) =>
    getClient().onProgress((message) => {
      if (message.phase === 'extracting') handler(message.current, message.total)
    }),
}
