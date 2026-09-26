import { isDemoDataSession } from '@/config/dataSource'
import { loadAppData, reloadAppDataFromStorage, saveAppData } from '@/mocks/seed'
import type { ImhAbaFormData, ImhAbaLinha, ImhMedicamentoLinha, PedidoPlanilhaEnvioState } from '@/types'
import type { ImhPlanilha } from '@/utils/imhPlanilhaTemplate'
import type { ControleSolempPlanilha } from '@/utils/controleSolempTemplate'
import { rowIdFromPedidoId } from '@/utils/consumoMaterialTemplate'
import { buildImhPlanilhaFromAbaForm } from '@/utils/imhAbaForm'
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

function preservePlanilhaFlags(
  existing: PedidoPlanilhaEnvioState | undefined,
): Pick<
  PedidoPlanilhaEnvioState,
  | 'recebidaEm'
  | 'encaminhadaImhEm'
  | 'recebidaImhEm'
  | 'recebidaConfeccaoEm'
  | 'recebidaRascunhoEm'
  | 'recebidaEmpenhadoEm'
  | 'arquivadaEm'
> {
  return {
    recebidaEm: existing?.recebidaEm,
    encaminhadaImhEm: existing?.encaminhadaImhEm,
    recebidaImhEm: existing?.recebidaImhEm,
    recebidaConfeccaoEm: existing?.recebidaConfeccaoEm,
    recebidaRascunhoEm: existing?.recebidaRascunhoEm,
    recebidaEmpenhadoEm: existing?.recebidaEmpenhadoEm,
    arquivadaEm: existing?.arquivadaEm,
  }
}

/** Novo envio IMH: setores da trilha Auditoria/IMH precisam receber de novo. */
function resetFlagsTrilhaImh(
  existing: PedidoPlanilhaEnvioState | undefined,
): ReturnType<typeof preservePlanilhaFlags> {
  return {
    ...preservePlanilhaFlags(existing),
    recebidaEm: undefined,
    encaminhadaImhEm: undefined,
    recebidaImhEm: undefined,
    arquivadaEm: undefined,
  }
}

/** Novo envio Div. Material: setores da trilha Confecção precisam receber de novo. */
function resetFlagsTrilhaConfeccao(
  existing: PedidoPlanilhaEnvioState | undefined,
): ReturnType<typeof preservePlanilhaFlags> {
  return {
    ...preservePlanilhaFlags(existing),
    recebidaConfeccaoEm: undefined,
    recebidaRascunhoEm: undefined,
    recebidaEmpenhadoEm: undefined,
  }
}

function preserveAnexos(
  existing: PedidoPlanilhaEnvioState | undefined,
): Pick<PedidoPlanilhaEnvioState, 'anexos'> {
  return {
    anexos: existing?.anexos?.map((arquivo) => ({ ...arquivo })),
  }
}

type FlagRecebimento =
  | 'recebidaEm'
  | 'recebidaImhEm'
  | 'recebidaConfeccaoEm'
  | 'recebidaRascunhoEm'
  | 'recebidaEmpenhadoEm'

function baseSnapshotFrom(
  current: PedidoPlanilhaEnvioState | undefined,
): PedidoPlanilhaEnvioState {
  return {
    formato: current?.formato ?? 'imh',
    cabecalho: current?.cabecalho ?? { ...EMPTY_IMH_CABECALHO },
    linhas: current?.linhas ?? [],
    controleSolempLinhas: current?.controleSolempLinhas,
    imhMedicamentoLinhas: current?.imhMedicamentoLinhas,
    imhAbaLinhas: current?.imhAbaLinhas,
    divMaterialLinhas: current?.divMaterialLinhas,
    anexos: current?.anexos,
    enviadoEm: current?.enviadoEm ?? new Date().toISOString(),
    recebidaEm: current?.recebidaEm,
    encaminhadaImhEm: current?.encaminhadaImhEm,
    recebidaImhEm: current?.recebidaImhEm,
    recebidaConfeccaoEm: current?.recebidaConfeccaoEm,
    recebidaRascunhoEm: current?.recebidaRascunhoEm,
    recebidaEmpenhadoEm: current?.recebidaEmpenhadoEm,
    arquivadaEm: current?.arquivadaEm,
    devolvidaEm: current?.devolvidaEm,
    devolvidaParaChave: current?.devolvidaParaChave,
  }
}

function upsertRecebimentoFlag(
  pedidoId: string,
  flag: FlagRecebimento,
): PedidoPlanilhaEnvioState {
  const data = readPlanilhaData()
  if (!data.pedidoPlanilhaEnvio) data.pedidoPlanilhaEnvio = {}
  const current = data.pedidoPlanilhaEnvio[pedidoId]
  const next: PedidoPlanilhaEnvioState = {
    ...baseSnapshotFrom(current),
    [flag]: new Date().toISOString(),
  }
  data.pedidoPlanilhaEnvio[pedidoId] = next
  saveAppData(data)
  return next
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
      imhAbaLinhas: existing?.imhAbaLinhas,
      imhMedicamentoLinhas: existing?.imhMedicamentoLinhas,
      divMaterialLinhas: existing?.divMaterialLinhas,
      ...preserveAnexos(existing),
      enviadoEm: new Date().toISOString(),
      ...resetFlagsTrilhaImh(existing),
      devolvidaEm: undefined,
      devolvidaParaChave: undefined,
    }

    data.pedidoPlanilhaEnvio[pedidoId] = snapshot
    saveAppData(data)
    return snapshot
  },

  saveImhAbaForPedido(
    pedidoId: string,
    form: Pick<ImhAbaFormData, 'clinica' | 'numeroCp'>,
    linhas: ImhAbaLinha[],
  ): PedidoPlanilhaEnvioState {
    const data = readPlanilhaData()
    if (!data.pedidoPlanilhaEnvio) data.pedidoPlanilhaEnvio = {}

    const existing = data.pedidoPlanilhaEnvio[pedidoId]
    // Snapshot fiel das linhas da aba IMH (mesmas colunas/valores).
    const abaSnapshot = linhas.map((linha) => ({ ...linha }))
    // Legado OPME mantido só como backup para exportações antigas.
    const legacy = buildImhPlanilhaFromAbaForm(
      { clinica: form.clinica, numeroCp: form.numeroCp, linhas },
      linhas,
    )
    const snapshot: PedidoPlanilhaEnvioState = {
      formato: 'imhAba',
      cabecalho: legacy.cabecalho,
      linhas: legacy.linhas.map((linha) => ({ ...linha })),
      controleSolempLinhas: existing?.controleSolempLinhas,
      imhAbaLinhas: abaSnapshot,
      imhMedicamentoLinhas: existing?.imhMedicamentoLinhas,
      divMaterialLinhas: existing?.divMaterialLinhas,
      ...preserveAnexos(existing),
      enviadoEm: new Date().toISOString(),
      ...resetFlagsTrilhaImh(existing),
      devolvidaEm: undefined,
      devolvidaParaChave: undefined,
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
      imhAbaLinhas: existing?.imhAbaLinhas,
      imhMedicamentoLinhas: linhas.map((linha) => ({ ...linha })),
      divMaterialLinhas: existing?.divMaterialLinhas,
      ...preserveAnexos(existing),
      enviadoEm: new Date().toISOString(),
      ...resetFlagsTrilhaImh(existing),
      devolvidaEm: undefined,
      devolvidaParaChave: undefined,
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
      imhAbaLinhas: existing?.imhAbaLinhas,
      imhMedicamentoLinhas: existing?.imhMedicamentoLinhas,
      divMaterialLinhas: existing?.divMaterialLinhas,
      ...preserveAnexos(existing),
      enviadoEm: new Date().toISOString(),
      ...resetFlagsTrilhaConfeccao(existing),
      devolvidaEm: undefined,
      devolvidaParaChave: undefined,
    }

    data.pedidoPlanilhaEnvio[pedidoId] = snapshot
    saveAppData(data)
    return snapshot
  },

  saveDivMaterialForPedido(
    pedidoId: string,
    linhas: import('@/utils/divMaterialForm').DivMaterialLinha[],
    controle?: ControleSolempPlanilha,
  ): PedidoPlanilhaEnvioState {
    const data = readPlanilhaData()
    if (!data.pedidoPlanilhaEnvio) data.pedidoPlanilhaEnvio = {}

    const existing = data.pedidoPlanilhaEnvio[pedidoId]
    const hasImh = Boolean(existing?.imhAbaLinhas?.length || existing?.linhas?.length)
    // Snapshot fiel das linhas da aba Div. Material (mesmas colunas/valores).
    const divSnapshot = linhas.map((linha) => ({ ...linha }))
    const snapshot: PedidoPlanilhaEnvioState = {
      formato: hasImh ? existing?.formato ?? 'imh' : 'divMaterial',
      cabecalho: existing?.cabecalho ?? { ...EMPTY_IMH_CABECALHO },
      linhas: existing?.linhas ?? [],
      // Controle Solemp fica só como legado/backup; a UI das 3 etapas usa divMaterialLinhas.
      controleSolempLinhas: controle?.linhas?.length
        ? controle.linhas.map((linha) => ({ ...linha }))
        : existing?.controleSolempLinhas,
      imhAbaLinhas: existing?.imhAbaLinhas,
      imhMedicamentoLinhas: existing?.imhMedicamentoLinhas,
      divMaterialLinhas: divSnapshot,
      ...preserveAnexos(existing),
      enviadoEm: new Date().toISOString(),
      ...resetFlagsTrilhaConfeccao(existing),
      devolvidaEm: undefined,
      devolvidaParaChave: undefined,
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
      imhAbaLinhas: snapshot.imhAbaLinhas?.map((linha) => ({ ...linha })),
      imhMedicamentoLinhas: snapshot.imhMedicamentoLinhas?.map((linha) => ({ ...linha })),
      divMaterialLinhas: snapshot.divMaterialLinhas?.map((linha) => ({ ...linha })),
      anexos: snapshot.anexos?.map((arquivo) => ({ ...arquivo })),
      enviadoEm: snapshot.enviadoEm,
      devolvidaEm: snapshot.devolvidaEm,
      devolvidaParaChave: snapshot.devolvidaParaChave,
      recebidaEm: snapshot.recebidaEm,
      encaminhadaImhEm: snapshot.encaminhadaImhEm,
      recebidaImhEm: snapshot.recebidaImhEm,
      recebidaConfeccaoEm: snapshot.recebidaConfeccaoEm,
      recebidaRascunhoEm: snapshot.recebidaRascunhoEm,
      recebidaEmpenhadoEm: snapshot.recebidaEmpenhadoEm,
      arquivadaEm: snapshot.arquivadaEm,
    }
  },

  /** True somente após o setor clicar em Receber Planilha. */
  foiRecebidaNoSetor(pedidoId: string, etapaChave: string): boolean {
    const snap = this.getForPedido(pedidoId)
    if (!snap) return false
    switch (etapaChave) {
      case 'DIV_MAT_AUDITORIA':
        return Boolean(snap.recebidaEm)
      case 'DIV_MAT_CONTABILIDADE_IMH':
        return Boolean(snap.recebidaImhEm)
      case 'DIV_MAT_CONFECCAO_SOLEMP':
        return Boolean(snap.recebidaConfeccaoEm)
      case 'DIV_MAT_FINANCAS':
        return Boolean(snap.recebidaRascunhoEm)
      case 'DIV_MAT_EMPENHADO':
        return Boolean(snap.recebidaEmpenhadoEm)
      default:
        return false
    }
  },

  markRecebida(pedidoId: string): PedidoPlanilhaEnvioState | null {
    return upsertRecebimentoFlag(pedidoId, 'recebidaEm')
  },

  markEncaminhadaImh(pedidoId: string): PedidoPlanilhaEnvioState | null {
    const data = readPlanilhaData()
    if (!data.pedidoPlanilhaEnvio) data.pedidoPlanilhaEnvio = {}
    const current = data.pedidoPlanilhaEnvio[pedidoId]
    // Não inventa recebidaEm — o envio exige Receber Planilha antes.
    if (!current?.recebidaEm) return null
    const next: PedidoPlanilhaEnvioState = {
      ...baseSnapshotFrom(current),
      recebidaEm: current.recebidaEm,
      encaminhadaImhEm: new Date().toISOString(),
    }
    data.pedidoPlanilhaEnvio[pedidoId] = next
    saveAppData(data)
    return next
  },

  markRecebidaImh(pedidoId: string): PedidoPlanilhaEnvioState | null {
    return upsertRecebimentoFlag(pedidoId, 'recebidaImhEm')
  },

  markRecebidaConfeccao(pedidoId: string): PedidoPlanilhaEnvioState | null {
    return upsertRecebimentoFlag(pedidoId, 'recebidaConfeccaoEm')
  },

  markRecebidaRascunho(pedidoId: string): PedidoPlanilhaEnvioState | null {
    return upsertRecebimentoFlag(pedidoId, 'recebidaRascunhoEm')
  },

  markRecebidaEmpenhado(pedidoId: string): PedidoPlanilhaEnvioState | null {
    return upsertRecebimentoFlag(pedidoId, 'recebidaEmpenhadoEm')
  },

  getRowIdFromPedidoId(pedidoId: string): string {
    return rowIdFromPedidoId(pedidoId)
  },
}
