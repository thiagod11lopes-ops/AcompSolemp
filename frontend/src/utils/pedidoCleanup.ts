import type { AppData, Pedido } from '@/types'
import {
  pedidoToConsumoRow,
  rowIdFromPedidoId,
  isPedidoLote,
} from '@/utils/consumoMaterialTemplate'

const MAX_PEDIDOS_EXCLUIDOS = 500

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

  const auditoriaEtapaId = data.workflowEtapas.find((e) => e.chave === 'DIV_MAT_AUDITORIA')?.id
  const confeccaoEtapaId = data.workflowEtapas.find(
    (e) => e.chave === 'DIV_MAT_CONFECCAO_SOLEMP',
  )?.id
  const temAuditoria = pedido.etapasHistorico.some((item) => item.etapaId === auditoriaEtapaId)
  const temConfeccao = pedido.etapasHistorico.some((item) => item.etapaId === confeccaoEtapaId)

  if (temAuditoria) {
    if (state.finalizedAuditoriaRowIds) {
      state.finalizedAuditoriaRowIds = state.finalizedAuditoriaRowIds.filter((id) => !ids.has(id))
    }
  }
  if (temConfeccao && state.finalizedMaterialRowIds) {
    state.finalizedMaterialRowIds = state.finalizedMaterialRowIds.filter((id) => !ids.has(id))
  }

  data.consumoPlanilha[pedido.clinicaId] = state
}

function rememberExcludedPedidoIds(data: AppData, pedidoIds: Set<string>) {
  const prev = data.pedidosExcluidosIds ?? []
  const merged = [...new Set([...prev, ...pedidoIds])]
  data.pedidosExcluidosIds =
    merged.length > MAX_PEDIDOS_EXCLUIDOS
      ? merged.slice(merged.length - MAX_PEDIDOS_EXCLUIDOS)
      : merged
}

/** Remove planilha/anexos/arquivados sem pedido vivo (órfãos de sync ou exclusão incompleta). */
export function purgeOrphanPedidoSideData(data: AppData): boolean {
  const alive = new Set((data.pedidos ?? []).map((p) => p.id))
  const excluded = new Set(data.pedidosExcluidosIds ?? [])
  let changed = false

  if (data.pedidoPlanilhaEnvio) {
    for (const pedidoId of Object.keys(data.pedidoPlanilhaEnvio)) {
      if (!alive.has(pedidoId) || excluded.has(pedidoId)) {
        delete data.pedidoPlanilhaEnvio[pedidoId]
        changed = true
      }
    }
  }

  if (data.planilhaAnexosPorPedido) {
    for (const pedidoId of Object.keys(data.planilhaAnexosPorPedido)) {
      if (!alive.has(pedidoId) || excluded.has(pedidoId)) {
        delete data.planilhaAnexosPorPedido[pedidoId]
        changed = true
      }
    }
  }

  if (data.processosArquivados?.length) {
    const next = data.processosArquivados.filter(
      (item) => alive.has(item.pedidoId) && !excluded.has(item.pedidoId),
    )
    if (next.length !== data.processosArquivados.length) {
      data.processosArquivados = next
      changed = true
    }
  }

  if (data.arquivos?.length) {
    const next = data.arquivos.filter(
      (arquivo) => !arquivo.pedidoId || (alive.has(arquivo.pedidoId) && !excluded.has(arquivo.pedidoId)),
    )
    if (next.length !== data.arquivos.length) {
      data.arquivos = next
      changed = true
    }
  }

  // Pedido recriado com o mesmo id: tira da lista de excluídos.
  if (data.pedidosExcluidosIds?.length) {
    const nextExcluded = data.pedidosExcluidosIds.filter((id) => !alive.has(id))
    if (nextExcluded.length !== data.pedidosExcluidosIds.length) {
      data.pedidosExcluidosIds = nextExcluded
      changed = true
    }
  }

  return changed
}

export function removePedidosFromAppData(data: AppData, pedidoIds: Set<string>) {
  if (pedidoIds.size === 0) return

  for (const pedido of data.pedidos) {
    if (pedidoIds.has(pedido.id)) {
      releasePedidoConsumoRows(data, pedido)
    }
  }

  rememberExcludedPedidoIds(data, pedidoIds)

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
  if (data.processosArquivados) {
    data.processosArquivados = data.processosArquivados.filter(
      (item) => !pedidoIds.has(item.pedidoId),
    )
  }
  if (data.pedidoPlanilhaEnvio) {
    for (const pedidoId of pedidoIds) {
      delete data.pedidoPlanilhaEnvio[pedidoId]
    }
  }
  if (data.planilhaAnexosPorPedido) {
    for (const pedidoId of pedidoIds) {
      delete data.planilhaAnexosPorPedido[pedidoId]
    }
  }

  // Garante que Pessoas atendidas / Procedimentos não leiam restos órfãos.
  purgeOrphanPedidoSideData(data)
}

export function archiveActivePedidosAsFinalized(data: AppData, pedidos: Pedido[]) {
  if (!data.consumoPlanilha) data.consumoPlanilha = {}

  for (const pedido of pedidos) {
    const clinicaId = pedido.clinicaId
    const current = data.consumoPlanilha[clinicaId] ?? {
      finalizedRowIds: [],
      finalizedAuditoriaRowIds: [],
      finalizedMaterialRowIds: [],
      extraRows: [],
    }

    if (pedido.consumoRowIds?.length) {
      for (const rowId of pedido.consumoRowIds) {
        if (!current.finalizedRowIds.includes(rowId)) {
          current.finalizedRowIds = [...current.finalizedRowIds, rowId]
        }
        const auditoria = current.finalizedAuditoriaRowIds ?? current.finalizedRowIds
        if (!auditoria.includes(rowId)) {
          current.finalizedAuditoriaRowIds = [...auditoria, rowId]
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
    const auditoria = current.finalizedAuditoriaRowIds ?? current.finalizedRowIds
    if (!auditoria.includes(rowId)) {
      current.finalizedAuditoriaRowIds = [...auditoria, rowId]
    }
    if (!current.extraRows.some((item) => item.id === rowId)) {
      current.extraRows = [...current.extraRows, row]
    }

    data.consumoPlanilha[clinicaId] = current
  }
}
