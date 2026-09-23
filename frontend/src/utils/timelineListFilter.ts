import { parseISO, startOfDay, endOfDay } from 'date-fns'
import type { PedidoComDetalhes } from '@/types'

export type TimelineListFiltro =
  | 'EM_ANDAMENTO'
  | 'TODAS'
  | 'CONCLUIDAS'
  | 'MINHAS_PENDENCIAS'
  | 'ATRASADAS'

export type TimelineListExtraFilters = {
  clinicaId?: string
  /** YYYY-MM-DD */
  dataDe?: string
  /** YYYY-MM-DD */
  dataAte?: string
}

export type TimelineListFilterOptions = {
  concluido?: (pedido: PedidoComDetalhes) => boolean
  /** “Minhas pendências” — ação aguardando o setor/perfil atual. */
  pendente?: (pedido: PedidoComDetalhes) => boolean
}

function isConcluidoPedido(
  pedido: PedidoComDetalhes,
  options?: TimelineListFilterOptions,
): boolean {
  return options?.concluido?.(pedido) ?? pedido.concluido
}

export function passaFiltroTimelineList(
  pedido: PedidoComDetalhes,
  filtro: TimelineListFiltro,
  options?: TimelineListFilterOptions,
): boolean {
  const isConcluido = isConcluidoPedido(pedido, options)
  if (filtro === 'TODAS') return true
  if (filtro === 'CONCLUIDAS') return isConcluido
  if (filtro === 'MINHAS_PENDENCIAS') {
    return options?.pendente?.(pedido) ?? !isConcluido
  }
  if (filtro === 'ATRASADAS') {
    return !isConcluido && pedido.prazoStatus === 'ATRASADO'
  }
  return !isConcluido
}

export function passaFiltrosExtrasTimeline(
  pedido: PedidoComDetalhes,
  extras?: TimelineListExtraFilters,
): boolean {
  if (!extras) return true
  if (extras.clinicaId && pedido.clinicaId !== extras.clinicaId) return false

  if (extras.dataDe) {
    const de = startOfDay(parseISO(extras.dataDe))
    if (parseISO(pedido.dataSolicitacao) < de) return false
  }
  if (extras.dataAte) {
    const ate = endOfDay(parseISO(extras.dataAte))
    if (parseISO(pedido.dataSolicitacao) > ate) return false
  }
  return true
}

export function filtrarTimelineList(
  pedidos: PedidoComDetalhes[],
  filtro: TimelineListFiltro,
  options?: TimelineListFilterOptions,
  extras?: TimelineListExtraFilters,
): PedidoComDetalhes[] {
  return pedidos.filter(
    (p) =>
      passaFiltroTimelineList(p, filtro, options) && passaFiltrosExtrasTimeline(p, extras),
  )
}

export function contarTimelineList(
  pedidos: PedidoComDetalhes[],
  options?: TimelineListFilterOptions,
  extras?: TimelineListExtraFilters,
) {
  const base = extras
    ? pedidos.filter((p) => passaFiltrosExtrasTimeline(p, extras))
    : pedidos
  const isConcluido = (p: PedidoComDetalhes) => isConcluidoPedido(p, options)
  const isPendente = (p: PedidoComDetalhes) =>
    options?.pendente?.(p) ?? !isConcluido(p)

  return {
    todas: base.length,
    emAndamento: base.filter((p) => !isConcluido(p)).length,
    concluidas: base.filter((p) => isConcluido(p)).length,
    minhasPendencias: base.filter((p) => isPendente(p)).length,
    atrasadas: base.filter((p) => !isConcluido(p) && p.prazoStatus === 'ATRASADO').length,
  }
}

export function clinicasFromPedidos(
  pedidos: PedidoComDetalhes[],
): Array<{ id: string; nome: string }> {
  const map = new Map<string, string>()
  for (const p of pedidos) {
    if (!map.has(p.clinicaId)) map.set(p.clinicaId, p.clinica.nome)
  }
  return [...map.entries()]
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}
