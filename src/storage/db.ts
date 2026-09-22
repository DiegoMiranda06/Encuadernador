import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { IRDocument } from '@/ir/schema'

/** El equivalente al manifiesto de un trabajo — v1 de la v1, adaptado a storage de navegador. */
export interface JobRecord {
  jobId: string
  status: 'extracting' | 'extracted' | 'error'
  createdAt: number
  filename: string
  pageCount: number
  /** PipelineConfig — se define en el Paso 4/5. */
  config?: unknown
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
}

let dbPromise: Promise<IDBPDatabase<EncuadernadorDB>> | null = null

export function openEncuadernadorDB(): Promise<IDBPDatabase<EncuadernadorDB>> {
  dbPromise ??= openDB<EncuadernadorDB>('encuadernador', 1, {
    upgrade(database) {
      database.createObjectStore('jobs', { keyPath: 'jobId' })
      database.createObjectStore('irDocuments')
      database.createObjectStore('assets')
      database.createObjectStore('overrides')
      database.createObjectStore('covers')
    },
  })
  return dbPromise
}
