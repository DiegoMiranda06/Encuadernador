import { describe, expect, it } from 'vitest'
import { quantizeTo16Levels } from './grayscale'

describe('quantizeTo16Levels', () => {
  it('cuantiza a exactamente 16 valores posibles, entre 0 y 255', () => {
    const outputs = new Set<number>()
    for (let value = 0; value <= 255; value++) outputs.add(quantizeTo16Levels(value))
    expect(outputs.size).toBe(16)
    expect(Math.min(...outputs)).toBe(0)
    expect(Math.max(...outputs)).toBe(255)
  })

  it('valores dentro del mismo escalón (255/15 ≈ 17) caen en el mismo nivel', () => {
    expect(quantizeTo16Levels(5)).toBe(quantizeTo16Levels(0))
  })

  it('es monótona: un valor más alto nunca cuantiza a un nivel más bajo', () => {
    for (let value = 1; value <= 255; value++) {
      expect(quantizeTo16Levels(value)).toBeGreaterThanOrEqual(quantizeTo16Levels(value - 1))
    }
  })
})
