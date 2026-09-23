import escapeHtml from 'escape-html'

export interface NavEntry {
  level: number
  title: string
  href: string
}

interface NavNode {
  title: string
  href: string
  children: NavNode[]
}

/** Arma un árbol a partir de la lista plana con `level` — cualquier salto de nivel simplemente anida bajo el ancestro más cercano. */
function buildTree(entries: NavEntry[]): NavNode[] {
  const root: NavNode[] = []
  const stack: { level: number; children: NavNode[] }[] = [{ level: 0, children: root }]

  for (const entry of entries) {
    while (stack.length > 1 && stack[stack.length - 1].level >= entry.level) stack.pop()
    const node: NavNode = { title: entry.title, href: entry.href, children: [] }
    stack[stack.length - 1].children.push(node)
    stack.push({ level: entry.level, children: node.children })
  }
  return root
}

function renderNodes(nodes: NavNode[]): string {
  if (nodes.length === 0) return ''
  const items = nodes.map(
    (node) => `<li><a href="${escapeHtml(node.href)}">${escapeHtml(node.title)}</a>${renderNodes(node.children)}</li>`,
  )
  return `<ol>${items.join('')}</ol>`
}

/** El documento de navegación de EPUB3 (`properties="nav"` en el manifest) — también es el índice visible al abrir el libro. */
export function renderNavXhtml(entries: NavEntry[], language: string): string {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!DOCTYPE html>',
    `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${language}">`,
    '<head><meta charset="utf-8"/><title>Índice</title></head>',
    '<body>',
    '<nav epub:type="toc" id="toc">',
    '<h1>Índice</h1>',
    renderNodes(buildTree(entries)),
    '</nav>',
    '</body>',
    '</html>',
  ].join('\n')
}
