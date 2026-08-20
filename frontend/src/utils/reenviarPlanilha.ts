import type {
  AppData,
  PedidoComDetalhes,
  PedidoPlanilhaEnvioState,
  User,
  UserRole,
  WorkflowEtapa,
} from '@/types'
import { getResponsavelParaEtapa } from '@/utils/workflow'
import { notifySetoresEtapasAtivas } from '@/utils/workflowAdvance'
import {
  limparEstadoDevolucaoPlanilha,
  listarSetoresComAcessoPlanilha,
  origemProducaoPlanilha,
} from '@/utils/devolverPlanilha'

export interface DestinoReenvioPlanilha {
  id: string
  label: string
  etapaChave: string
  perfilNotificar: UserRole
}

export interface OpcoesReenvioPlanilha {
  destinos: DestinoReenvioPlanilha[]
  defaultDestinoId: string | null
  permiteParaleloClinica: boolean
}

const PARALELO_ID = 'paralelo-auditoria-confeccao'

export function listarOpcoesReenvioPlanilha(
  pedido: PedidoComDetalhes,
  etapas: WorkflowEtapa[],
  planilha: PedidoPlanilhaEnvioState | null,
  remetenteChave: string,
): OpcoesReenvioPlanilha {
  const origem = origemProducaoPlanilha(pedido, planilha)
  const destinos: DestinoReenvioPlanilha[] = []

  const chavesCandidatas =
    pedido.planilhaSetoresAcessoSnapshot?.filter((chave) => chave !== remetenteChave) ??
    listarSetoresComAcessoPlanilha(pedido, etapas, planilha)
      .map((s) => s.chave)
      .filter((chave) => chave !== remetenteChave)

  for (const chave of chavesCandidatas) {
    if (chave === 'SOLICITACAO') continue
    const etapa = etapas.find((e) => e.chave === chave)
    if (!etapa) continue
    destinos.push({
      id: chave,
      label: etapa.nome,
      etapaChave: chave,
      perfilNotificar: etapa.perfilResponsavel,
    })
  }

  if (remetenteChave === 'SOLICITACAO' && origem === 'clinica') {
    const temAuditoria = destinos.some((d) => d.etapaChave === 'DIV_MAT_AUDITORIA')
    const temConfeccao = destinos.some((d) => d.etapaChave === 'DIV_MAT_CONFECCAO_SOLEMP')
    if (temAuditoria && temConfeccao) {
      destinos.unshift({
        id: PARALELO_ID,
        label: 'Auditoria e Confecção de Solemp (paralelo)',
        etapaChave: PARALELO_ID,
        perfilNotificar: 'AUDITORIA',
      })
    }
  }

  if (
    remetenteChave === 'SOLICITACAO' &&
    origem === 'medicamento' &&
    !destinos.some((d) => d.etapaChave === 'DIV_MAT_CONTABILIDADE_IMH')
  ) {
    const cont = etapas.find((e) => e.chave === 'DIV_MAT_CONTABILIDADE_IMH')
    if (cont) {
      destinos.push({
        id: cont.chave,
        label: cont.nome,
        etapaChave: cont.chave,
        perfilNotificar: cont.perfilResponsavel,
      })
    }
  }

  const defaultChave = pedido.planilhaDevolvidaDeChave
  let defaultDestinoId: string | null = null
  if (defaultChave) {
    if (
      remetenteChave === 'SOLICITACAO' &&
      defaultChave === 'DIV_MAT_AUDITORIA' &&
      destinos.some((d) => d.id === PARALELO_ID)
    ) {
      defaultDestinoId = destinos.find((d) => d.etapaChave === defaultChave)?.id ?? null
    } else {
      defaultDestinoId = destinos.find((d) => d.etapaChave === defaultChave)?.id ?? destinos[0]?.id ?? null
    }
  } else {
    defaultDestinoId = destinos[0]?.id ?? null
  }

  return {
    destinos,
    defaultDestinoId,
    permiteParaleloClinica: destinos.some((d) => d.id === PARALELO_ID),
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function ativarEtapaDestino(
  data: AppData,
  pedido: AppData['pedidos'][number],
  etapa: WorkflowEtapa,
  observacao: string,
): void {
  const alvo = pedido.etapasHistorico.find(
    (h) => h.etapaId === etapa.id || h.etapaNome === etapa.nome,
  )
  if (alvo) {
    alvo.dataConclusao = null
    alvo.observacao = observacao
    alvo.dataInicio = alvo.dataInicio || nowIso()
  } else {
    pedido.etapasHistorico.push({
      etapaId: etapa.id,
      etapaNome: etapa.nome,
      responsavelId: null,
      responsavelNome: null,
      dataInicio: nowIso(),
      dataConclusao: null,
      observacao,
      arquivos: [],
    })
  }
  if (!pedido.etapasAtivasIds.includes(etapa.id)) {
    pedido.etapasAtivasIds.push(etapa.id)
  }
  pedido.etapaAtualId = etapa.id
  const responsavel = getResponsavelParaEtapa(etapa, data.usuarios, pedido.clinicaId)
  if (responsavel) pedido.responsavelAtualId = responsavel.id
}

/** Reenvia planilha corrigida para um ou mais setores escolhidos. */
export function reenviarPlanilhaAposCorrecao(
  data: AppData,
  pedidoId: string,
  usuario: User,
  destinoIds: string[],
  remetenteChave: string,
): AppData {
  const pedidoIndex = data.pedidos.findIndex((p) => p.id === pedidoId)
  if (pedidoIndex < 0) throw new Error('Pedido não encontrado')

  const pedido = {
    ...data.pedidos[pedidoIndex],
    etapasHistorico: data.pedidos[pedidoIndex].etapasHistorico.map((h) => ({ ...h })),
    etapasAtivasIds: [...(data.pedidos[pedidoIndex].etapasAtivasIds ?? [])],
  }

  limparEstadoDevolucaoPlanilha(data, pedidoId)
  Object.assign(pedido, {
    planilhaDevolvidaParaChave: null,
    planilhaDevolvidaEm: null,
    planilhaDevolvidaJustificativa: null,
    planilhaDevolvidaDeChave: null,
    planilhaSetoresAcessoSnapshot: undefined,
    concluido: false,
  })

  const planilha = data.pedidoPlanilhaEnvio?.[pedidoId]
  if (planilha) {
    data.pedidoPlanilhaEnvio![pedidoId] = {
      ...planilha,
      devolvidaEm: undefined,
      devolvidaParaChave: undefined,
      enviadoEm: planilha.enviadoEm || nowIso(),
    }
  }

  const etapas = data.workflowEtapas
  const destinosUnicos = [...new Set(destinoIds)]

  if (destinosUnicos.includes(PARALELO_ID)) {
    const auditoria = etapas.find((e) => e.chave === 'DIV_MAT_AUDITORIA')
    const confeccao = etapas.find((e) => e.chave === 'DIV_MAT_CONFECCAO_SOLEMP')
    if (!auditoria || !confeccao) throw new Error('Workflow paralelo não configurado')
    pedido.etapasAtivasIds = []
    ativarEtapaDestino(
      data,
      pedido,
      auditoria,
      `Planilha ${pedido.numero} reenviada após correção — aguardando Auditoria.`,
    )
    ativarEtapaDestino(
      data,
      pedido,
      confeccao,
      `Planilha ${pedido.numero} reenviada após correção — aguardando Confecção de Solemp.`,
    )
    pedido.etapasAtivasIds = [confeccao.id, auditoria.id]
    pedido.etapaAtualId = confeccao.id
    pedido.observacoes = `Planilha ${pedido.numero} reenviada em fluxo paralelo após correção.`
  } else {
    pedido.etapasAtivasIds = []
    for (const destinoId of destinosUnicos) {
      const etapa = etapas.find((e) => e.chave === destinoId)
      if (!etapa) continue
      ativarEtapaDestino(
        data,
        pedido,
        etapa,
        `Planilha ${pedido.numero} reenviada após correção — aguardando ${etapa.nome}.`,
      )
    }
    if (pedido.etapasAtivasIds.length === 0) {
      throw new Error('Selecione ao menos um setor de destino.')
    }
    pedido.observacoes = `Planilha ${pedido.numero} reenviada após correção.`
  }

  data.pedidos[pedidoIndex] = pedido
  data.historico.push({
    id: `hist-reenvio-${Date.now()}`,
    pedidoId,
    etapaId: pedido.etapaAtualId,
    etapaNome: etapas.find((e) => e.id === pedido.etapaAtualId)?.nome ?? 'Reenvio',
    usuarioId: usuario.id,
    usuarioNome: usuario.nome,
    data: nowIso(),
    observacao: `Planilha reenviada após correção (${remetenteChave}). Destinos: ${destinosUnicos.join(', ')}.`,
  })

  notifySetoresEtapasAtivas(data, pedidoId)
  return data
}

export { PARALELO_ID }
