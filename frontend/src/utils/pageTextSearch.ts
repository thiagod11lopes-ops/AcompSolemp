/** Busca textual na página atual: oculta o que não casa e destaca matches em negrito. */

export const PAGE_SEARCH_HIT_ATTR = 'data-page-search-hit'
export const PAGE_SEARCH_SKIP_ATTR = 'data-page-search-skip'
export const PAGE_SEARCH_HIDDEN_ATTR = 'data-page-search-hidden'

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

export function clearPageSearchHidden(root: ParentNode = document.body): void {
  root.querySelectorAll(`[${PAGE_SEARCH_HIDDEN_ATTR}]`).forEach((el) => {
    el.removeAttribute(PAGE_SEARCH_HIDDEN_ATTR)
    if (el instanceof HTMLElement) {
      el.style.removeProperty('display')
    }
  })
}

export function clearPageSearch(root: ParentNode = document.body): void {
  clearPageSearchHighlights(root)
  clearPageSearchHidden(root)
}

function isSkippedNode(node: Node): boolean {
  const el = node.parentElement
  if (!el) return true
  if (el.closest(`[${PAGE_SEARCH_SKIP_ATTR}]`)) return true
  if (el.closest('script, style, noscript, textarea, input, select, option')) return true
  if (el.closest(`[${PAGE_SEARCH_HIT_ATTR}]`)) return true
  if (el.closest(`[${PAGE_SEARCH_HIDDEN_ATTR}]`)) return true
  return false
}

function hideUnit(el: HTMLElement): void {
  el.setAttribute(PAGE_SEARCH_HIDDEN_ATTR, '1')
  el.style.display = 'none'
}

function showUnit(el: HTMLElement): void {
  el.removeAttribute(PAGE_SEARCH_HIDDEN_ATTR)
  el.style.removeProperty('display')
}

function isHeaderRow(el: HTMLElement): boolean {
  if (el.closest('thead')) return true
  if (el.getAttribute('role') === 'columnheader') return true
  if (el.querySelector(':scope > th')) return true
  return false
}

/** Unidades filtráveis: linhas de tabela, itens explícitos e cards em lista. */
export function collectFilterUnits(root: HTMLElement): HTMLElement[] {
  const marked = Array.from(
    root.querySelectorAll<HTMLElement>('[data-page-search-item]'),
  ).filter((el) => !el.closest(`[${PAGE_SEARCH_SKIP_ATTR}]`))
  if (marked.length > 0) return marked

  const rows = Array.from(
    root.querySelectorAll<HTMLElement>(
      'tbody > tr, .MuiTableBody-root > .MuiTableRow-root, [role="row"]',
    ),
  ).filter((el) => {
    if (el.closest(`[${PAGE_SEARCH_SKIP_ATTR}]`)) return false
    if (isHeaderRow(el)) return false
    if (el.getAttribute('role') === 'columnheader') return false
    return true
  })
  if (rows.length > 0) return rows

  const cards = Array.from(root.querySelectorAll<HTMLElement>('.MuiCard-root')).filter(
    (el) => !el.closest(`[${PAGE_SEARCH_SKIP_ATTR}]`),
  )
  const byParent = new Map<HTMLElement, HTMLElement[]>()
  for (const card of cards) {
    const parent = card.parentElement
    if (!parent) continue
    const list = byParent.get(parent) ?? []
    list.push(card)
    byParent.set(parent, list)
  }
  const listCards: HTMLElement[] = []
  for (const kids of byParent.values()) {
    if (kids.length >= 2) listCards.push(...kids)
  }
  return listCards
}

function filterUnitsByTerm(root: HTMLElement, term: string): number {
  clearPageSearchHidden(root)
  const units = collectFilterUnits(root)
  if (units.length === 0) return -1

  const q = term.toLowerCase()
  let visible = 0
  for (const unit of units) {
    const text = (unit.textContent ?? '').toLowerCase()
    if (text.includes(q)) {
      showUnit(unit)
      visible += 1
    } else {
      hideUnit(unit)
    }
  }
  return visible
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

export type PageSearchResult = {
  /** Trechos em negrito. */
  hits: number
  /** Itens de lista/tabela visíveis após filtro (-1 se a página não tem unidades filtráveis). */
  visibleUnits: number
}

/** Filtra a página (oculta não-matches) e destaca o termo em negrito. */
export function applyPageSearch(root: HTMLElement, term: string): PageSearchResult {
  const q = term.trim()
  if (!q) {
    clearPageSearch(root)
    return { hits: 0, visibleUnits: 0 }
  }

  const visibleUnits = filterUnitsByTerm(root, q)
  const hits = highlightPageText(root, q)
  return { hits, visibleUnits }
}
