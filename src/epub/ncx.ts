import escapeHtml from 'escape-html'
import type { NavEntry } from './nav'

interface NcxNode {
  title: string
  href: string
  children: NcxNode[]
}

function buildTree(entries: NavEntry[]): NcxNode[] {
  const root: NcxNode[] = []
  const stack: { level: number; children: NcxNode[] }[] = [{ level: 0, children: root }]

  for (const entry of entries) {
    while (stack.length > 1 && stack[stack.length - 1].level >= entry.level) stack.pop()
    const node: NcxNode = { title: entry.title, href: entry.href, children: [] }
    stack[stack.length - 1].children.push(node)
    stack.push({ level: entry.level, children: node.children })
  }
  return root
}

function renderNavPoints(nodes: NcxNode[], counter: { value: number }): string {
  return nodes
    .map((node) => {
      const playOrder = counter.value++
      const children = renderNavPoints(node.children, counter)
      return `<navPoint id="navPoint-${playOrder}" playOrder="${playOrder}"><navLabel><text>${escapeHtml(node.title)}</text></navLabel><content src="${escapeHtml(node.href)}"/>${children}</navPoint>`
    })
    .join('')
}

function maxLevel(entries: NavEntry[]): number {
  return entries.reduce((max, entry) => Math.max(max, entry.level), 1)
}

/** NCX heredado (EPUB2) — Kindle y varios lectores viejos todavía lo usan para el índice, aunque el libro sea EPUB3. */
export function renderNcx(bookId: string, title: string, entries: NavEntry[]): string {
  const navPoints = renderNavPoints(buildTree(entries), { value: 1 })

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">',
    '<head>',
    `<meta name="dtb:uid" content="urn:uuid:${bookId}"/>`,
    `<meta name="dtb:depth" content="${maxLevel(entries)}"/>`,
    '<meta name="dtb:totalPageCount" content="0"/>',
    '<meta name="dtb:maxPageNumber" content="0"/>',
    '</head>',
    `<docTitle><text>${escapeHtml(title)}</text></docTitle>`,
    `<navMap>${navPoints}</navMap>`,
    '</ncx>',
  ].join('\n')
}
