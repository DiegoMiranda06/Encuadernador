import escapeHtml from 'escape-html'
import { toDcLanguage } from './language'

export interface ManifestImageItem {
  id: string
  href: string
  mediaType: string
}

export interface ManifestChapterItem {
  id: string
  href: string
}

export interface ContentOpfOptions {
  bookId: string
  title: string
  author?: string
  language: string
  chapters: ManifestChapterItem[]
  images: ManifestImageItem[]
  coverImage?: ManifestImageItem
}

/** El paquete OPF — metadata, manifest y spine. `dc:language` correcto y la portada declarada como `properties="cover-image"` (regla no negociable, sección 5 del blueprint). */
export function renderContentOpf(options: ContentOpfOptions): string {
  const modified = new Date().toISOString().replace(/\.\d+Z$/, 'Z')

  const manifestItems = [
    '<item id="nav" href="nav.xhtml" properties="nav" media-type="application/xhtml+xml"/>',
    '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
    ...options.chapters.map(
      (chapter) => `<item id="${chapter.id}" href="${chapter.href}" media-type="application/xhtml+xml"/>`,
    ),
    ...options.images.map((image) => `<item id="${image.id}" href="${image.href}" media-type="${image.mediaType}"/>`),
  ]
  if (options.coverImage) {
    manifestItems.push(
      `<item id="${options.coverImage.id}" href="${options.coverImage.href}" media-type="${options.coverImage.mediaType}" properties="cover-image"/>`,
    )
  }

  const spineItems = options.chapters.map((chapter) => `<itemref idref="${chapter.id}"/>`)

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    `<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="${toDcLanguage(options.language)}">`,
    '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">',
    `<dc:identifier id="pub-id">urn:uuid:${options.bookId}</dc:identifier>`,
    `<dc:title>${escapeHtml(options.title)}</dc:title>`,
    options.author ? `<dc:creator>${escapeHtml(options.author)}</dc:creator>` : '',
    `<dc:language>${toDcLanguage(options.language)}</dc:language>`,
    `<meta property="dcterms:modified">${modified}</meta>`,
    // "meta name=cover" es la forma vieja (EPUB2) de declarar la portada — los lectores
    // antiguos (y algunos Kindle) todavía la buscan; `properties="cover-image"` es la de EPUB3.
    // Portada declarada dos veces, a propósito (sección 5 del blueprint).
    options.coverImage ? `<meta name="cover" content="${options.coverImage.id}"/>` : '',
    '</metadata>',
    `<manifest>${manifestItems.join('')}</manifest>`,
    `<spine toc="ncx">${spineItems.join('')}</spine>`,
    '</package>',
  ]
    .filter(Boolean)
    .join('\n')
}
