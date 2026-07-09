import type { PedidoComDetalhes } from '@/types'

export type TimelineListFiltro = 'EM_ANDAMENTO' | 'TODAS' | 'CONCLUIDAS'

export function passaFiltroTimelineList(
  pedido: PedidoComDetalhes,
  filtro: TimelineListFiltro,
  options?: { concluido?: (pedido: PedidoComDetalhes) => boolean },
): boolean {
  const isConcluido = options?.concluido?.(pedido) ?? pedido.concluido
  if (filtro === 'TODAS') return true
  if (filtro === 'CONCLUIDAS') return isConcluido
  return !isConcluido
}

export function contarTimelineList(
  pedidos: PedidoComDetalhes[],
  options?: { concluido?: (pedido: PedidoComDetalhes) => boolean },
) {
  const isConcluido = options?.concluido ?? ((p: PedidoComDetalhes) => p.concluido)
  return {
    todas: pedidos.length,
    emAndamento: pedidos.filter((p) => !isConcluido(p)).length,
    concluidas: pedidos.filter((p) => isConcluido(p)).length,
  }
}
