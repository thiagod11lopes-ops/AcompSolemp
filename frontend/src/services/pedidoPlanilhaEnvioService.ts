import { isDemoDataSession } from '@/config/dataSource'
import { loadAppData, reloadAppDataFromStorage, saveAppData } from '@/mocks/seed'
import type { ImhMedicamentoLinha, PedidoPlanilhaEnvioState } from '@/types'
import type { ImhPlanilha } from '@/utils/imhPlanilhaTemplate'
import type { ControleSolempPlanilha } from '@/utils/controleSolempTemplate'
import { rowIdFromPedidoId } from '@/utils/consumoMaterialTemplate'
import { buildImhPlanilhaFromMedicamentoLinhas } from '@/utils/imhMedicamentoForm'

function readPlanilhaData() {
  if (isDemoDataSession()) return reloadAppDataFromStorage()
  return loadAppData()
}

function filterPlanilhaForRow(planilha: ImhPlanilha, rowId: string): ImhPlanilha {
  const linhas = planilha.linhas.filter((linha) => linha.pacienteGrupoId === rowId)
  return {
    cabecalho: planilha.cabecalho,
    linhas: linhas.length > 0 ? linhas : planilha.linhas,
  }
}

function filterControleSolempForRow(
  planilha: ControleSolempPlanilha,
  rowId: string,
): ControleSolempPlanilha {
  const linhas = planilha.linhas.filter((linha) => linha.pacienteGrupoId === rowId)
  return {
    linhas: linhas.length > 0 ? linhas : planilha.linhas,
  }
}

const EMPTY_IMH_CABECALHO = {
  numeroRelacao: '',
  pregaoTad: '',
  data: '',
  vigencia: '',
  processo: '',
  fornecedor: '',
}

export const pedidoPlanilhaEnvioService = {
  saveForPedido(pedidoId: string, planilha: ImhPlanilha, rowId?: string): PedidoPlanilhaEnvioState {
    const data = readPlanilhaData()
    if (!data.pedidoPlanilhaEnvio) data.pedidoPlanilhaEnvio = {}

    const existing = data.pedidoPlanilhaEnvio[pedidoId]
    const filtered = rowId ? filterPlanilhaForRow(planilha, rowId) : planilha
    const snapshot: PedidoPlanilhaEnvioState = {
      formato: 'imh',
      cabecalho: filtered.cabecalho,
      linhas: filtered.linhas.map((linha) => ({ ...linha })),
      controleSolempLinhas: existing?.controleSolempLinhas,
      enviadoEm: new Date().toISOString(),
      recebidaEm: existing?.recebidaEm,
      encaminhadaImhEm: existing?.encaminhadaImhEm,
      recebidaImhEm: existing?.recebidaImhEm,
      arquivadaEm: existing?.arquivadaEm,
    }

    data.pedidoPlanilhaEnvio[pedidoId] = snapshot
    saveAppData(data)
    return snapshot
  },

  saveImhMedicamentoForPedido(
    pedidoId: string,
    linhas: ImhMedicamentoLinha[],
  ): PedidoPlanilhaEnvioState {
    const data = readPlanilhaData()
    if (!data.pedidoPlanilhaEnvio) data.pedidoPlanilhaEnvio = {}

    const existing = data.pedidoPlanilhaEnvio[pedidoId]
    const converted = buildImhPlanilhaFromMedicamentoLinhas(linhas)
    const snapshot: PedidoPlanilhaEnvioState = {
      formato: 'imhMedicamento',
      cabecalho: converted.cabecalho,
      linhas: converted.linhas.map((linha) => ({ ...linha })),
      controleSolempLinhas: existing?.controleSolempLinhas,
      imhMedicamentoLinhas: linhas.map((linha) => ({ ...linha })),
      enviadoEm: new Date().toISOString(),
      recebidaEm: existing?.recebidaEm,
      encaminhadaImhEm: existing?.encaminhadaImhEm,
      recebidaImhEm: existing?.recebidaImhEm,
      arquivadaEm: existing?.arquivadaEm,
    }

    data.pedidoPlanilhaEnvio[pedidoId] = snapshot
    saveAppData(data)
    return snapshot
  },

  saveControleSolempForPedido(
    pedidoId: string,
    planilha: ControleSolempPlanilha,
    rowId?: string,
  ): PedidoPlanilhaEnvioState {
    const data = readPlanilhaData()
    if (!data.pedidoPlanilhaEnvio) data.pedidoPlanilhaEnvio = {}

    const existing = data.pedidoPlanilhaEnvio[pedidoId]
    const filtered = rowId ? filterControleSolempForRow(planilha, rowId) : planilha
    const hasImh = Boolean(existing?.linhas?.length)
    const snapshot: PedidoPlanilhaEnvioState = {
      formato: hasImh ? existing?.formato ?? 'imh' : 'controleSolemp',
      cabecalho: existing?.cabecalho ?? { ...EMPTY_IMH_CABECALHO },
      linhas: existing?.linhas ?? [],
      controleSolempLinhas: filtered.linhas.map((linha) => ({ ...linha })),
      enviadoEm: new Date().toISOString(),
      recebidaEm: existing?.recebidaEm,
      encaminhadaImhEm: existing?.encaminhadaImhEm,
      recebidaImhEm: existing?.recebidaImhEm,
      arquivadaEm: existing?.arquivadaEm,
    }

    data.pedidoPlanilhaEnvio[pedidoId] = snapshot
    saveAppData(data)
    return snapshot
  },

  getForPedido(pedidoId: string): PedidoPlanilhaEnvioState | null {
    const data = readPlanilhaData()
    const snapshot = data.pedidoPlanilhaEnvio?.[pedidoId]
    if (!snapshot) return null
    return {
      formato: snapshot.formato ?? (snapshot.controleSolempLinhas?.length ? 'controleSolemp' : 'imh'),
      cabecalho: { ...snapshot.cabecalho },
      linhas: (snapshot.linhas ?? []).map((linha) => ({ ...linha })),
      controleSolempLinhas: snapshot.controleSolempLinhas?.map((linha) => ({ ...linha })),
      imhMedicamentoLinhas: snapshot.imhMedicamentoLinhas?.map((linha) => ({ ...linha })),
      enviadoEm: snapshot.enviadoEm,
      recebidaEm: snapshot.recebidaEm,
      encaminhadaImhEm: snapshot.encaminhadaImhEm,
      recebidaImhEm: snapshot.recebidaImhEm,
      arquivadaEm: snapshot.arquivadaEm,
    }
  },

  markRecebida(pedidoId: string): PedidoPlanilhaEnvioState | null {
    const data = readPlanilhaData()
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
    const data = readPlanilhaData()
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
    const data = readPlanilhaData()
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
