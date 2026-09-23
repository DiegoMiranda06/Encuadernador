import { unzipSync } from 'fflate'

export interface ValidationReport {
  errors: string[]
  warnings: string[]
}

const EPUB_NAV_NAMESPACE_PREFIX = 'epub:type'
const REMOTE_URL = /^https?:\/\//i

function resolvePath(basePath: string, relative: string): string {
  const withoutFragment = relative.split('#')[0]
  const baseDir = basePath.includes('/') ? basePath.slice(0, basePath.lastIndexOf('/')) : ''
  const combined = baseDir ? `${baseDir}/${withoutFragment}` : withoutFragment
  const segments: string[] = []
  for (const part of combined.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') segments.pop()
    else segments.push(part)
  }
  return segments.join('/')
}

function parseXml(parser: DOMParser, text: string): Document {
  return parser.parseFromString(text, 'text/xml')
}

function isParseError(doc: Document): boolean {
  return doc.getElementsByTagName('parsererror').length > 0
}

/**
 * Validador estructural propio — sustituye a epubcheck (sección 5 del blueprint, ocho
 * comprobaciones). Lo que NO cubre, y se documenta así en la UI sin fingir cobertura completa:
 * conformidad estricta con el esquema OPF/OCF de IDPF, accesibilidad EPUB, ni las cientos de
 * reglas de metadata que sí revisa epubcheck.
 */
export function validateEpub(bytes: Uint8Array): ValidationReport {
  const errors: string[] = []
  const warnings: string[] = []

  // 1. mimetype es la primera entrada del ZIP y no está comprimida (STORED) — si esto falla,
  // ningún lector abre el archivo.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes.byteLength < 30 || view.getUint32(0, true) !== 0x04034b50) {
    errors.push('El archivo no empieza con un header de ZIP válido.')
  } else {
    const nameLength = view.getUint16(26, true)
    const name = new TextDecoder().decode(bytes.slice(30, 30 + nameLength))
    if (name !== 'mimetype') errors.push('"mimetype" no es la primera entrada del ZIP.')
    if (view.getUint16(8, true) !== 0) errors.push('"mimetype" no está guardado sin comprimir (STORED).')
  }

  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch {
    errors.push('No se pudo leer el ZIP.')
    return { errors, warnings }
  }

  const decode = (path: string) => new TextDecoder().decode(files[path])
  const parser = new DOMParser()

  // 2. container.xml apunta a un OPF que existe dentro del ZIP.
  if (!files['META-INF/container.xml']) {
    errors.push('Falta META-INF/container.xml.')
    return { errors, warnings }
  }
  const containerDoc = parseXml(parser, decode('META-INF/container.xml'))
  if (isParseError(containerDoc)) {
    errors.push('META-INF/container.xml no es XML válido.')
    return { errors, warnings }
  }
  const opfPath = containerDoc.querySelector('rootfile')?.getAttribute('full-path') ?? null
  if (!opfPath || !files[opfPath]) {
    errors.push('container.xml apunta a un OPF que no existe en el ZIP.')
    return { errors, warnings }
  }

  const opfDoc = parseXml(parser, decode(opfPath))
  if (isParseError(opfDoc)) {
    errors.push(`"${opfPath}" no es XML válido.`)
    return { errors, warnings }
  }

  const manifestItems = [...opfDoc.getElementsByTagName('item')]
  const manifestHrefById = new Map<string, string>()
  const manifestPaths = new Set<string>()
  for (const item of manifestItems) {
    const id = item.getAttribute('id')
    const href = item.getAttribute('href')
    if (!id || !href) continue
    const fullPath = resolvePath(opfPath, href)
    manifestHrefById.set(id, fullPath)
    manifestPaths.add(fullPath)
    // 3. Todo item del manifest existe como entrada real del ZIP.
    if (!files[fullPath]) errors.push(`El manifest declara "${href}" pero no existe en el ZIP.`)
  }

  // 3 (viceversa). Ningún archivo del ZIP queda huérfano, sin declarar en el manifest.
  const known = new Set(['mimetype', 'META-INF/container.xml', opfPath, ...manifestPaths])
  for (const path of Object.keys(files)) {
    if (!known.has(path)) warnings.push(`"${path}" existe en el ZIP pero no está declarado en el manifest.`)
  }

  // 4. Todo idref del spine tiene su item correspondiente en el manifest.
  for (const itemref of [...opfDoc.getElementsByTagName('itemref')]) {
    const idref = itemref.getAttribute('idref')
    if (!idref || !manifestHrefById.has(idref)) errors.push(`El spine referencia "${idref}", que no está en el manifest.`)
  }

  // 5 y 8, juntas: cada XHTML del manifest parsea sin error, y ningún src/href es remoto.
  for (const path of manifestPaths) {
    if (!path.endsWith('.xhtml')) continue
    const doc = parseXml(parser, decode(path))
    if (isParseError(doc)) {
      errors.push(`"${path}" no es XML válido.`)
      continue
    }
    for (const el of [...doc.querySelectorAll('[src], [href]')]) {
      const value = el.getAttribute('src') ?? el.getAttribute('href') ?? ''
      if (REMOTE_URL.test(value)) errors.push(`"${path}" tiene un ${el.hasAttribute('src') ? 'src' : 'href'} remoto: "${value}".`)
    }
  }

  // 6. nav.xhtml contiene un <nav epub:type="toc"> y todos sus href resuelven a un item del manifest.
  const navItem = manifestItems.find((item) => item.getAttribute('properties')?.split(/\s+/).includes('nav'))
  if (!navItem) {
    errors.push('No hay un item con properties="nav" en el manifest.')
  } else {
    const navHref = navItem.getAttribute('href')
    const navPath = navHref ? resolvePath(opfPath, navHref) : null
    if (!navPath || !files[navPath]) {
      errors.push('El nav.xhtml declarado en el manifest no existe en el ZIP.')
    } else {
      const navDoc = parseXml(parser, decode(navPath))
      const tocNav = [...navDoc.getElementsByTagName('nav')].find((nav) => nav.getAttribute(EPUB_NAV_NAMESPACE_PREFIX) === 'toc')
      if (!tocNav) {
        errors.push('nav.xhtml no tiene un <nav epub:type="toc">.')
      } else {
        for (const link of [...tocNav.getElementsByTagName('a')]) {
          const href = link.getAttribute('href')
          if (!href) continue
          if (!manifestPaths.has(resolvePath(navPath, href))) errors.push(`nav.xhtml linkea a "${href}", que no está en el manifest.`)
        }
      }
    }
  }

  // 7. La portada está declarada por las dos vías: properties="cover-image" y <meta name="cover">.
  const coverItem = manifestItems.find((item) => item.getAttribute('properties')?.split(/\s+/).includes('cover-image'))
  const coverMeta = [...opfDoc.getElementsByTagName('meta')].find((meta) => meta.getAttribute('name') === 'cover')
  if (coverItem || coverMeta) {
    if (!coverItem) errors.push('Falta properties="cover-image" en el manifest para la portada.')
    if (!coverMeta) errors.push('Falta <meta name="cover"> en la metadata para la portada.')
    if (coverItem && coverMeta && coverMeta.getAttribute('content') !== coverItem.getAttribute('id')) {
      errors.push('<meta name="cover"> no apunta al mismo id que properties="cover-image".')
    }
  }

  return { errors, warnings }
}
