import type { AppData, Pedido } from '@/types'
import {
  pedidoToConsumoRow,
  rowIdFromPedidoId,
  isPedidoLote,
} from '@/utils/consumoMaterialTemplate'

function releasePedidoConsumoRows(data: AppData, pedido: Pedido) {
  if (!data.consumoPlanilha) return

  const rowIds =
    pedido.consumoRowIds?.length
      ? pedido.consumoRowIds
      : isPedidoLote(pedido.id)
        ? []
        : [rowIdFromPedidoId(pedido.id)]

  if (rowIds.length === 0) return

  const state = data.consumoPlanilha[pedido.clinicaId]
  if (!state) return

  const ids = new Set(rowIds)
  state.finalizedRowIds = state.finalizedRowIds.filter((id) => !ids.has(id))
  data.consumoPlanilha[pedido.clinicaId] = state
}

export function removePedidosFromAppData(data: AppData, pedidoIds: Set<string>) {
  if (pedidoIds.size === 0) return

  for (const pedido of data.pedidos) {
    if (pedidoIds.has(pedido.id)) {
      releasePedidoConsumoRows(data, pedido)
    }
  }

  data.pedidos = data.pedidos.filter((pedido) => !pedidoIds.has(pedido.id))
  data.historico = data.historico.filter((historico) => !pedidoIds.has(historico.pedidoId))
  data.notificacoes = data.notificacoes.filter(
    (notificacao) => !notificacao.pedidoId || !pedidoIds.has(notificacao.pedidoId),
  )
  data.solemp = data.solemp.filter((solemp) => !pedidoIds.has(solemp.pedidoId))
  data.notasFiscais = data.notasFiscais.filter((nota) => !pedidoIds.has(nota.pedidoId))
  data.arquivos = data.arquivos.filter((arquivo) => !pedidoIds.has(arquivo.pedidoId))
  if (data.reversoes) {
    data.reversoes = data.reversoes.filter((reversao) => !pedidoIds.has(reversao.pedidoId))
  }
  if (data.pedidoPlanilhaEnvio) {
    for (const pedidoId of pedidoIds) {
      delete data.pedidoPlanilhaEnvio[pedidoId]
    }
  }
}

export function archiveActivePedidosAsFinalized(data: AppData, pedidos: Pedido[]) {
  if (!data.consumoPlanilha) data.consumoPlanilha = {}

  for (const pedido of pedidos) {
    const clinicaId = pedido.clinicaId
    const current = data.consumoPlanilha[clinicaId] ?? {
      finalizedRowIds: [],
      extraRows: [],
    }

    if (pedido.consumoRowIds?.length) {
      for (const rowId of pedido.consumoRowIds) {
        if (!current.finalizedRowIds.includes(rowId)) {
          current.finalizedRowIds = [...current.finalizedRowIds, rowId]
        }
      }
      data.consumoPlanilha[clinicaId] = current
      continue
    }

    const row = pedidoToConsumoRow(pedido)
    const rowId = rowIdFromPedidoId(pedido.id)

    if (!current.finalizedRowIds.includes(rowId)) {
      current.finalizedRowIds = [...current.finalizedRowIds, rowId]
    }
    if (!current.extraRows.some((item) => item.id === rowId)) {
      current.extraRows = [...current.extraRows, row]
    }

    data.consumoPlanilha[clinicaId] = current
  }
}
