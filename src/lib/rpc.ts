import { RpcClient } from '@/worker/rpcClient'
import PipelineWorker from '@/worker/pipeline.worker?worker'

let client: RpcClient | null = null

function getClient(): RpcClient {
  client ??= new RpcClient(new PipelineWorker())
  return client
}

/** Única puerta de entrada al worker del pipeline — ningún componente llama `postMessage` directo. */
export const rpc = {
  extract: (file: ArrayBuffer) => getClient().call('extract', { file }),
}
