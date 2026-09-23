import type { IRDocument } from '@/ir/schema'
import type { LanguageDecision } from '@/language/types'
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

/** Los bytes reales de cada imagen del documento — el IR solo guarda el assetId. */
export async function getAssetsForDocument(document: IRDocument): Promise<Map<string, Uint8Array>> {
  const db = await openEncuadernadorDB()
  const assets = new Map<string, Uint8Array>()
  await Promise.all(
    collectAssetIds(document).map(async (assetId) => {
      const blob = await db.get('assets', assetId)
      if (blob) assets.set(assetId, new Uint8Array(await blob.arrayBuffer()))
    }),
  )
  return assets
}

/** El Blob crudo de una imagen — para armar una `blob:` URL de preview sin pasar por Uint8Array. */
export async function getAssetBlob(assetId: string): Promise<Blob | undefined> {
  const db = await openEncuadernadorDB()
  return db.get('assets', assetId)
}

/** Overrides guardados del editor manual (Paso 9) para este trabajo, indexados por chapterKey. */
export async function getOverridesForJob(jobId: string): Promise<Map<string, string>> {
  const db = await openEncuadernadorDB()
  const overrides = new Map<string, string>()
  let cursor = await db.transaction('overrides').store.openCursor()
  while (cursor) {
    if (typeof cursor.key === 'string' && cursor.key.startsWith(`${jobId}:`)) {
      overrides.set(cursor.value.chapterKey, cursor.value.html)
    }
    cursor = await cursor.continue()
  }
  return overrides
}

/** Guarda decisiones de la Revisión de idioma (Paso 8) — nunca se aplica un candidato sin esto. */
export async function saveLanguageDecisions(
  jobId: string,
  decisions: { blockId: string; decision: 'confirmed' | 'dismissed'; language: string }[],
): Promise<void> {
  const db = await openEncuadernadorDB()
  const tx = db.transaction('languageDecisions', 'readwrite')
  await Promise.all([
    ...decisions.map((entry) =>
      tx.store.put(
        { jobId, blockId: entry.blockId, decision: entry.decision, language: entry.language },
        `${jobId}:${entry.blockId}`,
      ),
    ),
    tx.done,
  ])
}

/** Decisiones ya tomadas para este trabajo, indexadas por blockId. */
export async function getLanguageDecisionsForJob(jobId: string): Promise<Map<string, LanguageDecision>> {
  const db = await openEncuadernadorDB()
  const decisions = new Map<string, LanguageDecision>()
  let cursor = await db.transaction('languageDecisions').store.openCursor()
  while (cursor) {
    if (typeof cursor.key === 'string' && cursor.key.startsWith(`${jobId}:`)) {
      decisions.set(cursor.value.blockId, { decision: cursor.value.decision, language: cursor.value.language })
    }
    cursor = await cursor.continue()
  }
  return decisions
}

export async function deleteJob(jobId: string): Promise<void> {
  const db = await openEncuadernadorDB()
  const document = await db.get('irDocuments', jobId)
  const assetIds = document ? collectAssetIds(document) : []

  const tx = db.transaction(['jobs', 'irDocuments', 'assets', 'overrides', 'covers', 'languageDecisions'], 'readwrite')

  // Overrides y decisiones de idioma se indexan por `${jobId}:...` — se recorren por prefijo.
  const overridesStore = tx.objectStore('overrides')
  let overrideCursor = await overridesStore.openCursor()
  while (overrideCursor) {
    if (typeof overrideCursor.key === 'string' && overrideCursor.key.startsWith(`${jobId}:`)) await overrideCursor.delete()
    overrideCursor = await overrideCursor.continue()
  }

  const languageDecisionsStore = tx.objectStore('languageDecisions')
  let decisionCursor = await languageDecisionsStore.openCursor()
  while (decisionCursor) {
    if (typeof decisionCursor.key === 'string' && decisionCursor.key.startsWith(`${jobId}:`)) await decisionCursor.delete()
    decisionCursor = await decisionCursor.continue()
  }

  await Promise.all([
    tx.objectStore('jobs').delete(jobId),
    tx.objectStore('irDocuments').delete(jobId),
    tx.objectStore('covers').delete(jobId),
    ...assetIds.map((assetId) => tx.objectStore('assets').delete(assetId)),
    tx.done,
  ])
}
