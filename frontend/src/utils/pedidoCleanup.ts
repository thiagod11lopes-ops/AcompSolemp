import type { AppData, Pedido } from '@/types'
import {
  pedidoToConsumoRow,
  rowIdFromPedidoId,
} from '@/utils/consumoMaterialTemplate'

export function removePedidosFromAppData(data: AppData, pedidoIds: Set<string>) {
  if (pedidoIds.size === 0) return

  data.pedidos = data.pedidos.filter((pedido) => !pedidoIds.has(pedido.id))
  data.historico = data.historico.filter((historico) => !pedidoIds.has(historico.pedidoId))
  data.notificacoes = data.notificacoes.filter(
    (notificacao) => !notificacao.pedidoId || !pedidoIds.has(notificacao.pedidoId),
  )
  data.solemp = data.solemp.filter((solemp) => !pedidoIds.has(solemp.pedidoId))
  data.notasFiscais = data.notasFiscais.filter((nota) => !pedidoIds.has(nota.pedidoId))
  if (data.reversoes) {
    data.reversoes = data.reversoes.filter((reversao) => !pedidoIds.has(reversao.pedidoId))
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
