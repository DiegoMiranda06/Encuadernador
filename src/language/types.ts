/** Lo que producen las dos capas de detección de idioma — nunca marcan un bloque en silencio. */
export interface LanguageCandidate {
  chapterKey: string
  blockId: string
  /** Código ISO 639-3 (p.ej. "deu", "fra", "ita", "lat", o lo que devuelva franc-min). */
  language: string
  /** "passage": franc-min sobre un párrafo largo. "phrase": lista propia sobre 2+ palabras seguidas. */
  layer: 'passage' | 'phrase'
  /** Fragmento de texto que disparó la candidata, para que la UI de revisión se lo muestre al usuario. */
  sample: string
}

/** Lo que decide el usuario en la Revisión de idioma (Paso 8) sobre una candidata — nunca automático. */
export interface LanguageDecision {
  decision: 'confirmed' | 'dismissed'
  language: string
}
