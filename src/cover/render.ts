export interface CropRect {
  /** Normalizado 0-1, relativo a la imagen fuente. */
  x: number
  y: number
  width: number
  height: number
}

/** El tamaño final de portada del blueprint — proporción 1:1.6. */
export const COVER_WIDTH = 1600
export const COVER_HEIGHT = 2560

/** Recorta `crop` de `source` y lo redimensiona a 1600×2560 vía OffscreenCanvas. */
export async function renderCover(source: Blob, crop: CropRect): Promise<Blob> {
  const bitmap = await createImageBitmap(source)
  try {
    const canvas = new OffscreenCanvas(COVER_WIDTH, COVER_HEIGHT)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No se pudo crear el contexto 2D del canvas')

    const sx = crop.x * bitmap.width
    const sy = crop.y * bitmap.height
    const sw = crop.width * bitmap.width
    const sh = crop.height * bitmap.height
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, COVER_WIDTH, COVER_HEIGHT)

    return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 })
  } finally {
    bitmap.close()
  }
}
