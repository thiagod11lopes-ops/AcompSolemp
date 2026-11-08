/** Busca textual na página atual com destaque em negrito. */

export const PAGE_SEARCH_HIT_ATTR = 'data-page-search-hit'
export const PAGE_SEARCH_SKIP_ATTR = 'data-page-search-skip'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function clearPageSearchHighlights(root: ParentNode = document.body): void {
  const hits = root.querySelectorAll(`[${PAGE_SEARCH_HIT_ATTR}]`)
  hits.forEach((el) => {
    const parent = el.parentNode
    if (!parent) return
    while (el.firstChild) parent.insertBefore(el.firstChild, el)
    parent.removeChild(el)
    parent.normalize()
  })
}

function isSkippedNode(node: Node): boolean {
  const el = node.parentElement
  if (!el) return true
  if (el.closest(`[${PAGE_SEARCH_SKIP_ATTR}]`)) return true
  if (el.closest('script, style, noscript, textarea, input, select, option')) return true
  if (el.closest(`[${PAGE_SEARCH_HIT_ATTR}]`)) return true
  return false
}

/**
 * Destaca ocorrências de `term` dentro de `root` com <strong data-page-search-hit>.
 * Retorna quantidade de trechos destacados.
 */
export function highlightPageText(root: HTMLElement, term: string): number {
  clearPageSearchHighlights(root)
  const q = term.trim()
  if (!q) return 0

  const re = new RegExp(escapeRegExp(q), 'gi')
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT
      if (isSkippedNode(node)) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const textNodes: Text[] = []
  let current = walker.nextNode()
  while (current) {
    textNodes.push(current as Text)
    current = walker.nextNode()
  }

  let count = 0
  for (const textNode of textNodes) {
    const value = textNode.nodeValue ?? ''
    re.lastIndex = 0
    if (!re.test(value)) continue
    re.lastIndex = 0

    const frag = document.createDocumentFragment()
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = re.exec(value)) !== null) {
      const start = match.index
      const end = start + match[0].length
      if (start > lastIndex) {
        frag.appendChild(document.createTextNode(value.slice(lastIndex, start)))
      }
      const strong = document.createElement('strong')
      strong.setAttribute(PAGE_SEARCH_HIT_ATTR, '1')
      strong.className = 'page-search-hit'
      strong.textContent = value.slice(start, end)
      frag.appendChild(strong)
      count += 1
      lastIndex = end
      if (match[0].length === 0) re.lastIndex += 1
    }
    if (lastIndex < value.length) {
      frag.appendChild(document.createTextNode(value.slice(lastIndex)))
    }
    textNode.parentNode?.replaceChild(frag, textNode)
  }

  const first = root.querySelector(`[${PAGE_SEARCH_HIT_ATTR}]`)
  if (first instanceof HTMLElement) {
    first.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  return count
}
