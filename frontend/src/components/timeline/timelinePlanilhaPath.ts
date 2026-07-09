import type { PedidoComDetalhes, PedidoPlanilhaEnvioState, WorkflowEtapa } from '@/types'
import { getEtapaByChave } from '@/utils/timelineFlow'
import type { TimelineEdgeState } from './types'

function historicoDaEtapa(
  pedido: PedidoComDetalhes,
  etapas: WorkflowEtapa[],
  chave: string,
) {
  const etapa = getEtapaByChave(etapas, chave)
  if (!etapa) return null
  return (
    pedido.etapasHistorico.find(
      (h) => h.etapaId === etapa.id || h.etapaNome === etapa.nome,
    ) ?? null
  )
}

function solicitacaoConcluida(pedido: PedidoComDetalhes, etapas: WorkflowEtapa[]): boolean {
  return Boolean(historicoDaEtapa(pedido, etapas, 'SOLICITACAO')?.dataConclusao)
}

/** Planilha / fluxo enviado do card de origem ao de destino. */
export function planilhaEnviadaEntre(
  fromChave: string,
  toChave: string,
  pedido: PedidoComDetalhes,
  etapas: WorkflowEtapa[],
  planilhaEnvio?: PedidoPlanilhaEnvioState | null,
): boolean {
  const rota = `${fromChave}->${toChave}`

  switch (rota) {
    case 'SOLICITACAO->DIV_MAT_AUDITORIA':
      return (
        solicitacaoConcluida(pedido, etapas) &&
        Boolean(historicoDaEtapa(pedido, etapas, 'DIV_MAT_AUDITORIA')?.dataInicio)
      )

    case 'SOLICITACAO->DIV_MAT_CONFECCAO_SOLEMP':
      return (
        solicitacaoConcluida(pedido, etapas) &&
        Boolean(historicoDaEtapa(pedido, etapas, 'DIV_MAT_CONFECCAO_SOLEMP')?.dataInicio)
      )

    case 'DIV_MAT_AUDITORIA->DIV_MAT_CONTABILIDADE_IMH': {
      const contabilidade = historicoDaEtapa(pedido, etapas, 'DIV_MAT_CONTABILIDADE_IMH')
      if (planilhaEnvio?.encaminhadaImhEm || planilhaEnvio?.recebidaImhEm) return true
      const auditoria = historicoDaEtapa(pedido, etapas, 'DIV_MAT_AUDITORIA')
      return Boolean(auditoria?.dataConclusao && contabilidade?.dataInicio)
    }

    case 'DIV_MAT_CONFECCAO_SOLEMP->DIV_MAT_FINANCAS': {
      const confeccao = historicoDaEtapa(pedido, etapas, 'DIV_MAT_CONFECCAO_SOLEMP')
      const financas = historicoDaEtapa(pedido, etapas, 'DIV_MAT_FINANCAS')
      return Boolean(
        (confeccao?.dataConclusao || pedido.solemp) && financas?.dataInicio,
      )
    }

    default:
      return false
  }
}

export function resolvePlanilhaEdgeState(
  fromChave: string,
  toChave: string,
  pedido: PedidoComDetalhes,
  etapas: WorkflowEtapa[],
  planilhaEnvio?: PedidoPlanilhaEnvioState | null,
): TimelineEdgeState {
  if (
    planilhaEnviadaEntre(fromChave, toChave, pedido, etapas, planilhaEnvio)
  ) {
    return 'completed'
  }
  return 'waiting'
}
