const LEVELS = 16
const STEP = 255 / (LEVELS - 1)

/** Cuantiza un canal 0-255 a uno de 16 tonos parejos — aparte de toKindleGrayscale() para poder testearla sin canvas. */
export function quantizeTo16Levels(value: number): number {
  return Math.round(Math.round(value / STEP) * STEP)
}

/** Escala de grises + cuantización a 16 tonos — cómo se ve la portada en la pantalla de un Kindle sin color. */
export async function toKindleGrayscale(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source)
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No se pudo crear el contexto 2D del canvas')
    ctx.drawImage(bitmap, 0, 0)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      const quantized = quantizeTo16Levels(gray)
      data[i] = quantized
      data[i + 1] = quantized
      data[i + 2] = quantized
    }
    ctx.putImageData(imageData, 0, 0)

    return await canvas.convertToBlob({ type: 'image/png' })
  } finally {
    bitmap.close()
  }
}
