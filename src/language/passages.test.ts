import { describe, expect, it } from 'vitest'
import { detectPassageLanguage, MIN_PASSAGE_LENGTH } from './passages'

const GERMAN_PASSAGE =
  'Dies ist ein Test des deutschen Textes für die Spracherkennung, ein längerer Absatz mit vielen Wörtern und Sätzen.'
const SPANISH_PASSAGE =
  'Este es un texto de prueba en español para la detección de idioma, un párrafo más largo con muchas palabras y frases.'

describe('detectPassageLanguage', () => {
  it('detecta un párrafo largo en un idioma distinto al principal', () => {
    expect(detectPassageLanguage(GERMAN_PASSAGE, 'spa')).toBe('deu')
  })

  it('no marca nada si el párrafo ya está en el idioma principal', () => {
    expect(detectPassageLanguage(SPANISH_PASSAGE, 'spa')).toBeNull()
  })

  it('no marca nada por debajo del umbral mínimo — nunca por una sola palabra', () => {
    expect('Wörterbuch'.length).toBeLessThan(MIN_PASSAGE_LENGTH)
    expect(detectPassageLanguage('Wörterbuch', 'spa')).toBeNull()
  })
})
