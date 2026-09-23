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
  onExtractionProgress: (handler: (current: number, total: number) => void) =>
    getClient().onProgress((message) => {
      if (message.phase === 'extracting') handler(message.current, message.total)
    }),
}
