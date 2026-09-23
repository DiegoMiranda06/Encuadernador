import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { IRDocument } from '@/ir/schema'
import type { LanguageDecision } from '@/language/types'
import type { PipelineConfig } from '@/model/config'

/** El equivalente al manifiesto de un trabajo — v1 de la v1, adaptado a storage de navegador. */
export interface JobRecord {
  jobId: string
  status: 'extracting' | 'extracted' | 'error'
  createdAt: number
  filename: string
  pageCount: number
  config?: PipelineConfig
  /** Rect normalizado del recorte de portada — se define en el Paso 10. */
  coverCrop?: unknown
  overrideKeys: string[]
  error?: string
}

interface EncuadernadorDB extends DBSchema {
  jobs: {
    key: string
    value: JobRecord
  }
  irDocuments: {
    key: string
    value: IRDocument
  }
  assets: {
    key: string
    value: Blob
  }
  overrides: {
    key: string
    value: { jobId: string; chapterKey: string; html: string }
  }
  covers: {
    key: string
    value: Blob
  }
  /** Decisiones de la Revisión de idioma (Paso 8) — nunca se aplica un candidato sin esto. */
  languageDecisions: {
    key: string
    value: LanguageDecision & { jobId: string; blockId: string }
  }
}

let dbPromise: Promise<IDBPDatabase<EncuadernadorDB>> | null = null

export function openEncuadernadorDB(): Promise<IDBPDatabase<EncuadernadorDB>> {
  dbPromise ??= openDB<EncuadernadorDB>('encuadernador', 2, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('jobs')) database.createObjectStore('jobs', { keyPath: 'jobId' })
      if (!database.objectStoreNames.contains('irDocuments')) database.createObjectStore('irDocuments')
      if (!database.objectStoreNames.contains('assets')) database.createObjectStore('assets')
      if (!database.objectStoreNames.contains('overrides')) database.createObjectStore('overrides')
      if (!database.objectStoreNames.contains('covers')) database.createObjectStore('covers')
      if (!database.objectStoreNames.contains('languageDecisions')) database.createObjectStore('languageDecisions')
    },
  })
  return dbPromise
}
