import type { PedidoComDetalhes } from '@/types'

export type ProcessSearchMatchKind = 'PED' | 'SOLEMP' | 'NF'

export type ProcessSearchHit = {
  pedido: PedidoComDetalhes
  kind: ProcessSearchMatchKind
  matchedValue: string
}

function normalizeTerm(term: string): string {
  return term.trim().toLowerCase()
}

/** Indica se o pedido casa com PED / SOLEMP / NF (número). */
export function matchProcessoBusca(
  pedido: PedidoComDetalhes,
  term: string,
): ProcessSearchMatchKind | null {
  const t = normalizeTerm(term)
  if (!t) return null
  if (pedido.numero.toLowerCase().includes(t)) return 'PED'
  if (pedido.solemp?.numero?.toLowerCase().includes(t)) return 'SOLEMP'
  if (pedido.notaFiscal?.numero?.toLowerCase().includes(t)) return 'NF'
  return null
}

export function searchPedidosPorNumero(
  pedidos: PedidoComDetalhes[],
  term: string,
  limit = 12,
): ProcessSearchHit[] {
  const t = normalizeTerm(term)
  if (!t) return []

  const hits: ProcessSearchHit[] = []
  for (const pedido of pedidos) {
    const kind = matchProcessoBusca(pedido, t)
    if (!kind) continue
    const matchedValue =
      kind === 'PED'
        ? pedido.numero
        : kind === 'SOLEMP'
          ? (pedido.solemp?.numero ?? '')
          : (pedido.notaFiscal?.numero ?? '')
    hits.push({ pedido, kind, matchedValue })
    if (hits.length >= limit) break
  }
  return hits
}

export type GlobalSearchPortal = 'gestor' | 'clinica' | 'ordenador' | 'financeiro'

export function detailPathForSearchPortal(
  portal: GlobalSearchPortal,
  pedidoId: string,
): string {
  switch (portal) {
    case 'gestor':
      return `/gestor/timeline/${pedidoId}`
    case 'clinica':
      return `/clinica/timeline/${pedidoId}`
    case 'ordenador':
      return `/ordenador/timelines/${pedidoId}`
    case 'financeiro':
      return `/financeiro/pagamentos/${pedidoId}`
  }
}
