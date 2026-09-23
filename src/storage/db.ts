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
  /** Candidata + rect normalizado (0-1) del recorte de portada ya confirmado (Paso 10). */
  coverCrop?: { candidateId: string; x: number; y: number; width: number; height: number }
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
  /**
   * El PDF crudo, tal cual se subió — lo único que se guarda dos veces (también vive, ya
   * procesado, en `irDocuments`/`assets`). Hace falta para volver a abrir el documento con
   * mupdf.js y renderizar la página 1 bajo demanda (Paso 10, `extractCoverCandidates`), que
   * puede llamarse mucho después de la extracción original, cuando el `Document` de mupdf ya
   * se destruyó.
   */
  sourceFiles: {
    key: string
    value: Blob
  }
}

let dbPromise: Promise<IDBPDatabase<EncuadernadorDB>> | null = null

export function openEncuadernadorDB(): Promise<IDBPDatabase<EncuadernadorDB>> {
  dbPromise ??= openDB<EncuadernadorDB>('encuadernador', 3, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('jobs')) database.createObjectStore('jobs', { keyPath: 'jobId' })
      if (!database.objectStoreNames.contains('irDocuments')) database.createObjectStore('irDocuments')
      if (!database.objectStoreNames.contains('assets')) database.createObjectStore('assets')
      if (!database.objectStoreNames.contains('overrides')) database.createObjectStore('overrides')
      if (!database.objectStoreNames.contains('covers')) database.createObjectStore('covers')
      if (!database.objectStoreNames.contains('languageDecisions')) database.createObjectStore('languageDecisions')
      if (!database.objectStoreNames.contains('sourceFiles')) database.createObjectStore('sourceFiles')
    },
  })
  return dbPromise
}
