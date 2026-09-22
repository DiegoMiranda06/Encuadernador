import type { IRDocument } from '@/ir/schema'
import { openEncuadernadorDB, type JobRecord } from './db'

function collectAssetIds(document: IRDocument): string[] {
  const ids: string[] = []
  for (const page of document.pages) {
    for (const block of page.blocks) {
      if (block.assetId) ids.push(block.assetId)
    }
  }
  return ids
}

export async function saveExtractedJob(
  job: JobRecord,
  document: IRDocument,
  assets: Map<string, Uint8Array>,
): Promise<void> {
  const db = await openEncuadernadorDB()
  const tx = db.transaction(['jobs', 'irDocuments', 'assets'], 'readwrite')
  await Promise.all([
    tx.objectStore('jobs').put(job),
    tx.objectStore('irDocuments').put(document, job.jobId),
    ...Array.from(assets, ([assetId, bytes]) =>
      tx.objectStore('assets').put(new Blob([new Uint8Array(bytes)], { type: 'image/png' }), assetId),
    ),
    tx.done,
  ])
}

export async function getJob(jobId: string): Promise<JobRecord | undefined> {
  const db = await openEncuadernadorDB()
  return db.get('jobs', jobId)
}

export async function listJobs(): Promise<JobRecord[]> {
  const db = await openEncuadernadorDB()
  return db.getAll('jobs')
}

export async function getIRDocument(jobId: string): Promise<IRDocument | undefined> {
  const db = await openEncuadernadorDB()
  return db.get('irDocuments', jobId)
}

export async function deleteJob(jobId: string): Promise<void> {
  const db = await openEncuadernadorDB()
  const document = await db.get('irDocuments', jobId)
  const assetIds = document ? collectAssetIds(document) : []

  const tx = db.transaction(['jobs', 'irDocuments', 'assets', 'overrides', 'covers'], 'readwrite')
  const overridesStore = tx.objectStore('overrides')
  // Los overrides se indexan por `${jobId}:${chapterKey}` — se recorren por prefijo.
  let cursor = await overridesStore.openCursor()
  while (cursor) {
    if (typeof cursor.key === 'string' && cursor.key.startsWith(`${jobId}:`)) await cursor.delete()
    cursor = await cursor.continue()
  }
  await Promise.all([
    tx.objectStore('jobs').delete(jobId),
    tx.objectStore('irDocuments').delete(jobId),
    tx.objectStore('covers').delete(jobId),
    ...assetIds.map((assetId) => tx.objectStore('assets').delete(assetId)),
    tx.done,
  ])
}
