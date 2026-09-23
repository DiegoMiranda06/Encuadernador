import { strToU8, zipSync, type Zippable } from 'fflate'
import type { Chapter, DocModel } from '@/model/document'
import { renderNavXhtml, type NavEntry } from './nav'
import { renderNcx } from './ncx'
import { renderContentOpf, type ManifestChapterItem, type ManifestImageItem } from './opf'
import { renderChapterXhtml } from './render'

const CONTAINER_XML = [
  '<?xml version="1.0" encoding="utf-8"?>',
  '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">',
  '<rootfiles>',
  '<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>',
  '</rootfiles>',
  '</container>',
].join('\n')

export interface BuildEpubOptions {
  metadata: DocModel['metadata']
  chapters: Chapter[]
  toc: DocModel['toc']
  /** Bytes reales de cada imagen referenciada por los capítulos — el mismo Map que usa el resto del pipeline. */
  assets: Map<string, Uint8Array>
  /** El cover ya recortado a 1600×2560 (Paso 10), JPEG. Sin portada si no se eligió ninguna. */
  cover?: Uint8Array
}

/**
 * DocModel → el .epub como ZIP (Uint8Array), con fflate. Un XHTML por capítulo, vía
 * renderChapterXhtml() — la misma función que usa la preview (Paso 6); cualquier divergencia
 * es un bug crítico (regla no negociable #4). EPUB3 con nav.xhtml + NCX heredado, portada
 * declarada dos veces, UUID único, dc:language correcto.
 */
export function buildEpub(options: BuildEpubOptions): Uint8Array {
  const bookId = crypto.randomUUID()
  const title = options.metadata.title ?? 'Documento'
  const language = options.metadata.language

  const files: Zippable = {
    // `mimetype` debe ser la primera entrada del ZIP y sin comprimir (STORED) — si esto falla,
    // ningún lector abre el archivo (sección 5, comprobación #1 del validador del Paso 12).
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': strToU8(CONTAINER_XML),
  }

  const chapterHrefByKey = new Map<string, string>()
  const chapterManifest: ManifestChapterItem[] = []

  options.chapters.forEach((chapter, index) => {
    const href = `chapters/chapter-${index}.xhtml`
    chapterHrefByKey.set(chapter.key, href)
    chapterManifest.push({ id: `chapter-${index}`, href })

    const xhtml = renderChapterXhtml(chapter, {
      language,
      resolveAssetHref: (assetId) => `../images/${assetId}.png`,
    })
    files[`OEBPS/${href}`] = strToU8(xhtml)
  })

  const imageManifest: ManifestImageItem[] = []
  for (const [assetId, bytes] of options.assets) {
    const href = `images/${assetId}.png`
    files[`OEBPS/${href}`] = bytes
    imageManifest.push({ id: `img-${assetId}`, href, mediaType: 'image/png' })
  }

  let coverImage: ManifestImageItem | undefined
  if (options.cover) {
    files['OEBPS/images/cover.jpg'] = options.cover
    coverImage = { id: 'cover-image', href: 'images/cover.jpg', mediaType: 'image/jpeg' }
  }

  const navEntries: NavEntry[] = options.toc.map((entry) => {
    const chapterHref = chapterHrefByKey.get(entry.chapterKey) ?? ''
    return { level: entry.level, title: entry.title, href: entry.blockId ? `${chapterHref}#${entry.blockId}` : chapterHref }
  })

  files['OEBPS/nav.xhtml'] = strToU8(renderNavXhtml(navEntries, language))
  files['OEBPS/toc.ncx'] = strToU8(renderNcx(bookId, title, navEntries))
  files['OEBPS/content.opf'] = strToU8(
    renderContentOpf({
      bookId,
      title,
      author: options.metadata.author,
      language,
      chapters: chapterManifest,
      images: imageManifest,
      coverImage,
    }),
  )

  return zipSync(files)
}
