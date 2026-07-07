import { loadAppData, saveAppData } from '@/mocks/seed'
import type { PedidoPlanilhaEnvioState } from '@/types'
import type { ImhPlanilha } from '@/utils/imhPlanilhaTemplate'
import { rowIdFromPedidoId } from '@/utils/consumoMaterialTemplate'

function filterPlanilhaForRow(planilha: ImhPlanilha, rowId: string): ImhPlanilha {
  const linhas = planilha.linhas.filter((linha) => linha.pacienteGrupoId === rowId)
  return {
    cabecalho: planilha.cabecalho,
    linhas: linhas.length > 0 ? linhas : planilha.linhas,
  }
}

export const pedidoPlanilhaEnvioService = {
  saveForPedido(pedidoId: string, planilha: ImhPlanilha, rowId?: string): PedidoPlanilhaEnvioState {
    const data = loadAppData()
    if (!data.pedidoPlanilhaEnvio) data.pedidoPlanilhaEnvio = {}

    const filtered = rowId ? filterPlanilhaForRow(planilha, rowId) : planilha
    const snapshot: PedidoPlanilhaEnvioState = {
      cabecalho: filtered.cabecalho,
      linhas: filtered.linhas.map((linha) => ({ ...linha })),
      enviadoEm: new Date().toISOString(),
    }

    data.pedidoPlanilhaEnvio[pedidoId] = snapshot
    saveAppData(data)
    return snapshot
  },

  getForPedido(pedidoId: string): PedidoPlanilhaEnvioState | null {
    const data = loadAppData()
    const snapshot = data.pedidoPlanilhaEnvio?.[pedidoId]
    if (!snapshot) return null
    return {
      cabecalho: { ...snapshot.cabecalho },
      linhas: snapshot.linhas.map((linha) => ({ ...linha })),
      enviadoEm: snapshot.enviadoEm,
      recebidaEm: snapshot.recebidaEm,
      encaminhadaImhEm: snapshot.encaminhadaImhEm,
      recebidaImhEm: snapshot.recebidaImhEm,
    }
  },

  markRecebida(pedidoId: string): PedidoPlanilhaEnvioState | null {
    const data = loadAppData()
    const current = data.pedidoPlanilhaEnvio?.[pedidoId]
    if (!current) return null

    const next: PedidoPlanilhaEnvioState = {
      ...current,
      recebidaEm: new Date().toISOString(),
    }
    data.pedidoPlanilhaEnvio![pedidoId] = next
    saveAppData(data)
    return next
  },

  markEncaminhadaImh(pedidoId: string): PedidoPlanilhaEnvioState | null {
    const data = loadAppData()
    const current = data.pedidoPlanilhaEnvio?.[pedidoId]
    if (!current) return null

    const next: PedidoPlanilhaEnvioState = {
      ...current,
      encaminhadaImhEm: new Date().toISOString(),
    }
    data.pedidoPlanilhaEnvio![pedidoId] = next
    saveAppData(data)
    return next
  },

  markRecebidaImh(pedidoId: string): PedidoPlanilhaEnvioState | null {
    const data = loadAppData()
    const current = data.pedidoPlanilhaEnvio?.[pedidoId]
    if (!current) return null

    const next: PedidoPlanilhaEnvioState = {
      ...current,
      recebidaImhEm: new Date().toISOString(),
    }
    data.pedidoPlanilhaEnvio![pedidoId] = next
    saveAppData(data)
    return next
  },

  getRowIdFromPedidoId(pedidoId: string): string {
    return rowIdFromPedidoId(pedidoId)
  },
}
