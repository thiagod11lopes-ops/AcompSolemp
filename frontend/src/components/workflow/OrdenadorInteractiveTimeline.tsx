import { useMemo } from 'react'
import type { PedidoComDetalhes, WorkflowEtapa } from '@/types'
import { formatDate } from '@/utils/format'
import { ORDENADOR_ETAPA_ACOES } from '@/utils/portal'
import { useOrdenadorAuth } from '@/contexts/AuthContext'
import { PERFIL_PARA_CHAVE_ETAPA, pedidoPendenteParaChave } from '@/utils/perfilEtapa'
import {
  filtrarEtapasParaTimeline,
  usaTrilhaAuditoriaOrdenador,
} from '@/utils/timelineFlow'
import {
  Timeline,
  buildSectionedTimeline,
  buildTimelineHeader,
  flattenSections,
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
  fluxoDiretoImh?: boolean
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
  fluxoDiretoImh = false,
  fluxoEncerrado = false,
  mensagemFluxoEncerrado = null,
}: OrdenadorInteractiveTimelineProps) {
  const { user } = useOrdenadorAuth()
  const chavePerfil = user ? PERFIL_PARA_CHAVE_ETAPA[user.perfil] : null
  const trilhaAuditoria = usaTrilhaAuditoriaOrdenador(chavePerfil)

  const visiveis = useMemo(() => filtrarEtapasParaTimeline(etapas), [etapas])
  const sections = useMemo(
    () => buildSectionedTimeline(pedido, visiveis),
    [pedido, visiveis],
  )
  const allNodes = useMemo(() => flattenSections(sections), [sections])
  const header = useMemo(() => buildTimelineHeader(pedido, allNodes), [pedido, allNodes])

  const etapaDoPerfil = useMemo(() => {
    if (!chavePerfil) return undefined
    const etapa = visiveis.find((e) => e.chave === chavePerfil)
    if (!etapa) return undefined
    if (!pedidoPendenteParaChave(pedido, visiveis, chavePerfil)) return undefined
    return etapa
  }, [chavePerfil, visiveis, pedido])

  const acaoAtual = etapaDoPerfil ? ORDENADOR_ETAPA_ACOES[etapaDoPerfil.chave] : undefined
  const isAuditoriaAtiva = etapaDoPerfil?.chave === 'DIV_MAT_AUDITORIA'
  const isContabilidadeAtiva = etapaDoPerfil?.chave === 'DIV_MAT_CONTABILIDADE_IMH'
  const isConfeccaoAtiva = etapaDoPerfil?.chave === 'DIV_MAT_CONFECCAO_SOLEMP'
  const usaFluxoPlanilha = isAuditoriaAtiva || isContabilidadeAtiva || isConfeccaoAtiva

  const renderNodeActions = (node: TimelineNodeData) => {
    const minhaEtapa =
      Boolean(chavePerfil) &&
      chavePerfil === node.etapa.chave &&
      pedidoPendenteParaChave(pedido, visiveis, chavePerfil!)

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

    if (
      node.etapa.chave === 'DIV_MAT_CONTABILIDADE_IMH' &&
      chavePerfil === 'DIV_MAT_CONTABILIDADE_IMH' &&
      onReceberPlanilhaImh &&
      onAssinar
    ) {
      const planilhaDisponivel = planilhaEncaminhadaImh || fluxoDiretoImh
      return (
        <>
          <TimelineActionButton
            onClick={onReceberPlanilhaImh}
            disabled={assinando || !planilhaDisponivel}
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
      sections={sections}
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
              {isContabilidadeAtiva && !planilhaEncaminhadaImh && !fluxoDiretoImh && (
                <p style={{ margin: '8px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
                  Aguardando encaminhamento pela Auditoria.
                </p>
              )}
              {isContabilidadeAtiva && fluxoDiretoImh && !planilhaRecebidaImh && (
                <p style={{ margin: '8px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
                  Planilha enviada diretamente — abra e receba antes de concluir.
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
