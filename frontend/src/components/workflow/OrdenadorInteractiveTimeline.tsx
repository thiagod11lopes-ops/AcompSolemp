import { useMemo } from 'react'
import type { PedidoComDetalhes, WorkflowEtapa } from '@/types'
import { formatDate } from '@/utils/format'
import { ORDENADOR_ETAPA_ACOES } from '@/utils/portal'
import { useOrdenadorAuth } from '@/contexts/AuthContext'
import { PERFIL_PARA_CHAVE_ETAPA } from '@/utils/perfilEtapa'
import {
  filtrarEtapasTrilhaAuditoria,
  filtrarEtapasTrilhaConfeccao,
  filtrarEtapasParaTimeline,
  usaTrilhaAuditoriaOrdenador,
  usaTrilhaConfeccaoOrdenador,
} from '@/utils/timelineFlow'
import {
  Timeline,
  buildLinearTimelineNodes,
  buildTimelineHeader,
  type TimelineNodeData,
} from '@/components/timeline'
import { TimelineActionButton } from '@/components/timeline/TimelineActionButton'

interface OrdenadorInteractiveTimelineProps {
  pedido: PedidoComDetalhes
  etapas: WorkflowEtapa[]
  onAssinar?: () => void
  assinando?: boolean
  onReceberPlanilha?: () => void
  onEncaminharImh?: () => void
  planilhaRecebida?: boolean
  onReceberPlanilhaImh?: () => void
  planilhaEncaminhadaImh?: boolean
  planilhaRecebidaImh?: boolean
  fluxoEncerrado?: boolean
  mensagemFluxoEncerrado?: string | null
}

export function OrdenadorInteractiveTimeline({
  pedido,
  etapas,
  onAssinar,
  assinando = false,
  onReceberPlanilha,
  onEncaminharImh,
  planilhaRecebida = false,
  onReceberPlanilhaImh,
  planilhaEncaminhadaImh = false,
  planilhaRecebidaImh = false,
  fluxoEncerrado = false,
  mensagemFluxoEncerrado = null,
}: OrdenadorInteractiveTimelineProps) {
  const { user } = useOrdenadorAuth()
  const chavePerfil = user ? PERFIL_PARA_CHAVE_ETAPA[user.perfil] : null
  const trilhaAuditoria = usaTrilhaAuditoriaOrdenador(chavePerfil)
  const trilhaConfeccao = usaTrilhaConfeccaoOrdenador(chavePerfil)

  const ordenadas = useMemo(() => {
    const visiveis = filtrarEtapasParaTimeline(etapas)
    if (trilhaAuditoria) return filtrarEtapasTrilhaAuditoria(visiveis)
    if (trilhaConfeccao) return filtrarEtapasTrilhaConfeccao(visiveis)
    return visiveis
  }, [etapas, trilhaAuditoria, trilhaConfeccao])

  const nodes = useMemo(
    () =>
      buildLinearTimelineNodes(pedido, ordenadas, chavePerfil, { useProvidedOrder: true }),
    [pedido, ordenadas, chavePerfil],
  )

  const header = useMemo(() => buildTimelineHeader(pedido, nodes), [pedido, nodes])

  const etapasAtivasIds =
    pedido.etapasAtivasIds?.length > 0 ? pedido.etapasAtivasIds : [pedido.etapaAtualId]
  const etapaDoPerfil = ordenadas.find(
    (e) => etapasAtivasIds.includes(e.id) && e.chave === chavePerfil,
  )
  const acaoAtual = etapaDoPerfil ? ORDENADOR_ETAPA_ACOES[etapaDoPerfil.chave] : undefined
  const isAuditoriaAtiva = etapaDoPerfil?.chave === 'DIV_MAT_AUDITORIA'
  const isContabilidadeAtiva = etapaDoPerfil?.chave === 'DIV_MAT_CONTABILIDADE_IMH'
  const isConfeccaoAtiva = etapaDoPerfil?.chave === 'DIV_MAT_CONFECCAO_SOLEMP'
  const usaFluxoPlanilha = isAuditoriaAtiva || isContabilidadeAtiva || isConfeccaoAtiva

  const renderNodeActions = (node: TimelineNodeData) => {
    const minhaEtapa = etapaDoPerfil?.id === node.etapa.id

    if (!minhaEtapa || fluxoEncerrado) return null

    if (!usaFluxoPlanilha && onAssinar) {
      return (
        <TimelineActionButton onClick={onAssinar} disabled={assinando}>
          {assinando ? 'Processando...' : acaoAtual?.label ?? 'Concluir etapa'}
        </TimelineActionButton>
      )
    }

    if (isAuditoriaAtiva && onReceberPlanilha && onEncaminharImh) {
      return (
        <>
          <TimelineActionButton onClick={onReceberPlanilha} disabled={assinando}>
            Receber Planilha
          </TimelineActionButton>
          <TimelineActionButton
            variant="warning"
            onClick={onEncaminharImh}
            disabled={assinando || !planilhaRecebida}
          >
            Encaminhar ao IMH
          </TimelineActionButton>
        </>
      )
    }

    if (isContabilidadeAtiva && onReceberPlanilhaImh && onAssinar) {
      return (
        <>
          <TimelineActionButton
            onClick={onReceberPlanilhaImh}
            disabled={assinando || !planilhaEncaminhadaImh}
          >
            Receber Planilha
          </TimelineActionButton>
          <TimelineActionButton
            variant="warning"
            onClick={onAssinar}
            disabled={assinando || !planilhaRecebidaImh}
          >
            {acaoAtual?.label ?? 'Concluir Contabilidade/IMH'}
          </TimelineActionButton>
        </>
      )
    }

    if (isConfeccaoAtiva && onReceberPlanilha && onAssinar) {
      return (
        <>
          <TimelineActionButton onClick={onReceberPlanilha} disabled={assinando}>
            Receber Planilha
          </TimelineActionButton>
          <TimelineActionButton
            variant="warning"
            onClick={onAssinar}
            disabled={assinando || !planilhaRecebida}
          >
            {acaoAtual?.label ?? 'Confeccionar Solemp'}
          </TimelineActionButton>
        </>
      )
    }

    return null
  }

  return (
    <Timeline
      pedido={pedido}
      header={header}
      nodes={nodes}
      renderNodeActions={renderNodeActions}
      alerts={
        <>
          {fluxoEncerrado && mensagemFluxoEncerrado && (
            <div className="timeline-alert timeline-alert-success">{mensagemFluxoEncerrado}</div>
          )}
          {acaoAtual && etapaDoPerfil && !fluxoEncerrado && (
            <div className="timeline-alert timeline-alert-warning">
              <strong>Ação necessária:</strong> {acaoAtual.descricao}
              {isAuditoriaAtiva && !planilhaRecebida && (
                <p style={{ margin: '8px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
                  Abra a planilha antes de encaminhar ao IMH.
                </p>
              )}
              {isContabilidadeAtiva && !planilhaEncaminhadaImh && (
                <p style={{ margin: '8px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
                  Aguardando encaminhamento pela Auditoria.
                </p>
              )}
              {isContabilidadeAtiva && planilhaEncaminhadaImh && !planilhaRecebidaImh && (
                <p style={{ margin: '8px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
                  Abra a planilha antes de concluir a Contabilidade/IMH.
                </p>
              )}
              {isConfeccaoAtiva && !planilhaRecebida && (
                <p style={{ margin: '8px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
                  Abra a planilha enviada pela clínica antes de confeccionar a SOLEMP.
                </p>
              )}
              {pedido.solemp && !trilhaAuditoria && (
                <p style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>
                  SOLEMP: <strong>{pedido.solemp.numero}</strong>
                </p>
              )}
              {!usaFluxoPlanilha && onAssinar && (
                <div style={{ marginTop: 12 }}>
                  <TimelineActionButton onClick={onAssinar} disabled={assinando}>
                    {assinando ? 'Processando...' : acaoAtual.label}
                  </TimelineActionButton>
                </div>
              )}
            </div>
          )}
        </>
      }
      footer={
        <span>
          Pedido {pedido.numero} · {pedido.clinica.nome} · {formatDate(pedido.dataSolicitacao)}
        </span>
      }
    />
  )
}
