import { describe, expect, it } from 'vitest'
import { detectPhraseCandidates } from './phrases'

describe('detectPhraseCandidates', () => {
  it('detecta una secuencia de 2+ palabras seguidas del mismo idioma', () => {
    const text = 'Como decían los clásicos, sed non est sunt tamen, y el capítulo continúa.'
    const matches = detectPhraseCandidates(text, 'spa')
    expect(matches).toEqual([{ language: 'lat', phrase: 'sed non est sunt tamen' }])
  })

  it('no marca una sola palabra suelta — regla no negociable #9', () => {
    const text = 'El texto continúa und nada más en alemán por aquí.'
    expect(detectPhraseCandidates(text, 'spa')).toEqual([])
  })

  it('no marca nada si no hay coincidencias', () => {
    expect(detectPhraseCandidates('Un párrafo enteramente en español, sin nada raro.', 'spa')).toEqual([])
  })

  it('ignora coincidencias del propio idioma principal del documento', () => {
    // "und dass" es una racha válida de 2+ palabras en la lista alemana, pero el documento
    // ya está en alemán — no hay nada que señalar.
    const text = 'Man sagte und dass es sehr schon sei.'
    expect(detectPhraseCandidates(text, 'deu')).toEqual([])
  })
})
