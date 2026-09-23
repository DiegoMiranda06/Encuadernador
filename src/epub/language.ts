/**
 * ISO 639-3 (lo que usan franc-min y nuestros propios códigos internos) → ISO 639-1, el
 * código de dos letras que la mayoría de los lectores EPUB esperan en `dc:language`. Si no
 * está en la lista, se manda el código de tres letras tal cual — sigue siendo válido BCP47.
 */
const ISO_639_3_TO_1: Record<string, string> = {
  spa: 'es',
  eng: 'en',
  deu: 'de',
  fra: 'fr',
  ita: 'it',
  por: 'pt',
  cat: 'ca',
  lat: 'la',
}

export function toDcLanguage(code: string): string {
  return ISO_639_3_TO_1[code] ?? code
}
