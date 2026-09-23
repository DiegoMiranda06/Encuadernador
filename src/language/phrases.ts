/**
 * Capa 2: listas propias de palabras frecuentes para alemán, francés, italiano y latín — los
 * idiomas de cita corta más comunes en libros en español/inglés (epígrafes, notas al pie, frases
 * hechas). franc-min (capa 1) no incluye latín y necesita párrafos largos; estas listas cubren
 * justo el caso que la capa 1 no puede: fragmentos de pocas palabras.
 *
 * Las listas son disjuntas a propósito — cada palabra vive en un solo idioma — para que una
 * racha de 2+ palabras seguidas nunca quede ambigua entre dos idiomas candidatos.
 */
const WORD_LISTS: Record<string, ReadonlySet<string>> = {
  deu: new Set([
    'und', 'nicht', 'oder', 'aber', 'auch', 'sich', 'dass', 'sein', 'werden', 'können', 'müssen',
    'wenn', 'für', 'mit', 'über', 'durch', 'nach', 'sind', 'wurde', 'worden', 'ich', 'wir', 'ihr',
    'mich', 'dich', 'uns', 'euch', 'mein', 'dein', 'unser', 'euer', 'sehr', 'schon', 'immer',
    'noch', 'heute', 'morgen', 'gestern', 'warum', 'wohin', 'woher', 'du',
  ]),
  fra: new Set([
    'mais', 'donc', 'alors', 'ainsi', 'avec', 'sans', 'pour', 'dans', 'sur', 'chez', 'être',
    'avoir', 'cette', 'celui', 'celle', 'toujours', 'jamais', 'hier', 'demain', 'pourquoi',
    'comment', 'beaucoup', 'parce', 'lorsque', 'quelque', 'chaque', 'aucun', 'plusieurs',
  ]),
  ita: new Set([
    'perché', 'però', 'quindi', 'allora', 'anche', 'senza', 'dentro', 'sopra', 'essere', 'avere',
    'questo', 'quello', 'sempre', 'mai', 'oggi', 'domani', 'ieri', 'come', 'molto', 'ciascuno',
    'nessuno', 'alcuni', 'ognuno', 'soltanto',
  ]),
  lat: new Set([
    'sed', 'non', 'est', 'sunt', 'qui', 'quae', 'quod', 'ut', 'sic', 'nunc', 'tamen', 'atque',
    'ergo', 'igitur', 'enim', 'autem', 'nam', 'quia', 'omnis', 'omnes', 'inter', 'contra', 'apud',
    'etiam', 'semper', 'numquam', 'itaque', 'quibus', 'cuius', 'ideo', 'quoniam', 'postquam',
    'antequam',
  ]),
}

const WORD_PATTERN = /\p{L}+/gu

export interface PhraseMatch {
  language: string
  phrase: string
}

function languageOf(word: string): string | null {
  for (const [language, list] of Object.entries(WORD_LISTS)) {
    if (list.has(word)) return language
  }
  return null
}

/**
 * Busca secuencias de 2+ palabras SEGUIDAS que pertenecen a la lista de un mismo idioma. Una
 * coincidencia aislada (1 palabra) se descarta sin generar candidata — regla no negociable #9.
 */
export function detectPhraseCandidates(text: string, mainLanguage: string): PhraseMatch[] {
  const words = text.match(WORD_PATTERN) ?? []
  const matches: PhraseMatch[] = []

  let runLanguage: string | null = null
  let runWords: string[] = []

  const flush = () => {
    if (runLanguage && runWords.length >= 2) matches.push({ language: runLanguage, phrase: runWords.join(' ') })
    runLanguage = null
    runWords = []
  }

  for (const word of words) {
    const language = languageOf(word.toLowerCase())
    const usable = language && language !== mainLanguage ? language : null

    if (usable && usable === runLanguage) {
      runWords.push(word)
    } else {
      flush()
      if (usable) {
        runLanguage = usable
        runWords = [word]
      }
    }
  }
  flush()

  return matches
}
