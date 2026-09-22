import { useMemo } from 'react'
import type { PedidoComDetalhes, WorkflowEtapa } from '@/types'
import { formatDate } from '@/utils/format'
import { ORDENADOR_ETAPA_ACOES } from '@/utils/portal'
import { useOrdenadorAuth } from '@/contexts/AuthContext'
import {
  chavesEtapaParaPerfil,
  chavePendenteParaPerfil,
  pedidoPendenteParaChave,
} from '@/utils/perfilEtapa'
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
  onReceberPlanilhaConfeccao?: () => void
  onReceberPlanilhaRascunho?: () => void
  onReceberPlanilhaEmpenhado?: () => void
  onEncaminharImh?: () => void
  planilhaRecebida?: boolean
  planilhaRecebidaConfeccao?: boolean
  planilhaRecebidaRascunho?: boolean
  planilhaRecebidaEmpenhado?: boolean
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
  onReceberPlanilhaConfeccao,
  onReceberPlanilhaRascunho,
  onReceberPlanilhaEmpenhado,
  onEncaminharImh,
  planilhaRecebida = false,
  planilhaRecebidaConfeccao = false,
  planilhaRecebidaRascunho = false,
  planilhaRecebidaEmpenhado = false,
  onReceberPlanilhaImh,
  planilhaEncaminhadaImh = false,
  planilhaRecebidaImh = false,
  fluxoDiretoImh = false,
  fluxoEncerrado = false,
  mensagemFluxoEncerrado = null,
}: OrdenadorInteractiveTimelineProps) {
  const { user } = useOrdenadorAuth()
  const chavesPerfil = user ? chavesEtapaParaPerfil(user.perfil) : []
  const chavePendente = user
    ? chavePendenteParaPerfil(pedido, etapas, user.perfil)
    : null
  const trilhaAuditoria = usaTrilhaAuditoriaOrdenador(chavePendente)
  const isCadeiaConfeccao = user?.perfil === 'CONFECCAO_SOLEMP'

  const visiveis = useMemo(() => filtrarEtapasParaTimeline(etapas), [etapas])
  const sections = useMemo(
    () => buildSectionedTimeline(pedido, visiveis),
    [pedido, visiveis],
  )
  const allNodes = useMemo(() => flattenSections(sections), [sections])
  const header = useMemo(() => buildTimelineHeader(pedido, allNodes), [pedido, allNodes])

  const etapaDoPerfil = useMemo(() => {
    if (!chavePendente) return undefined
    return visiveis.find((e) => e.chave === chavePendente)
  }, [chavePendente, visiveis])

  const acaoAtual = etapaDoPerfil ? ORDENADOR_ETAPA_ACOES[etapaDoPerfil.chave] : undefined
  const isAuditoriaAtiva = etapaDoPerfil?.chave === 'DIV_MAT_AUDITORIA'
  const isContabilidadeAtiva = etapaDoPerfil?.chave === 'DIV_MAT_CONTABILIDADE_IMH'
  const isConfeccaoAtiva = etapaDoPerfil?.chave === 'DIV_MAT_CONFECCAO_SOLEMP'
  const isRascunhoAtivo = etapaDoPerfil?.chave === 'DIV_MAT_FINANCAS'
  const isEmpenhadoAtivo = etapaDoPerfil?.chave === 'DIV_MAT_EMPENHADO'
  const usaFluxoPlanilha =
    isAuditoriaAtiva ||
    isContabilidadeAtiva ||
    isConfeccaoAtiva ||
    (isCadeiaConfeccao && (isRascunhoAtivo || isEmpenhadoAtivo))

  const renderNodeActions = (node: TimelineNodeData) => {
    const minhaEtapa =
      chavesPerfil.includes(node.etapa.chave) &&
      pedidoPendenteParaChave(pedido, visiveis, node.etapa.chave)

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
      chavePendente === 'DIV_MAT_CONTABILIDADE_IMH' &&
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

    if (
      node.etapa.chave === 'DIV_MAT_CONFECCAO_SOLEMP' &&
      onReceberPlanilhaConfeccao &&
      onAssinar
    ) {
      return (
        <>
          <TimelineActionButton onClick={onReceberPlanilhaConfeccao} disabled={assinando}>
            Receber Planilha
          </TimelineActionButton>
          <TimelineActionButton
            variant="warning"
            onClick={onAssinar}
            disabled={assinando || !planilhaRecebidaConfeccao}
          >
            {ORDENADOR_ETAPA_ACOES.DIV_MAT_CONFECCAO_SOLEMP?.label ?? 'Confeccionar Solemp'}
          </TimelineActionButton>
        </>
      )
    }

    if (
      isCadeiaConfeccao &&
      node.etapa.chave === 'DIV_MAT_FINANCAS' &&
      onReceberPlanilhaRascunho &&
      onAssinar
    ) {
      return (
        <>
          <TimelineActionButton onClick={onReceberPlanilhaRascunho} disabled={assinando}>
            Receber Planilha
          </TimelineActionButton>
          <TimelineActionButton
            variant="warning"
            onClick={onAssinar}
            disabled={assinando || !planilhaRecebidaRascunho}
          >
            {ORDENADOR_ETAPA_ACOES.DIV_MAT_FINANCAS?.label ?? 'Enviar Planilha'}
          </TimelineActionButton>
        </>
      )
    }

    if (
      isCadeiaConfeccao &&
      node.etapa.chave === 'DIV_MAT_EMPENHADO' &&
      onReceberPlanilhaEmpenhado &&
      onAssinar
    ) {
      return (
        <>
          <TimelineActionButton onClick={onReceberPlanilhaEmpenhado} disabled={assinando}>
            Receber Planilha
          </TimelineActionButton>
          <TimelineActionButton
            variant="warning"
            onClick={onAssinar}
            disabled={assinando || !planilhaRecebidaEmpenhado}
          >
            {ORDENADOR_ETAPA_ACOES.DIV_MAT_EMPENHADO?.label ?? 'Enviar Planilha'}
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
              {isConfeccaoAtiva && !planilhaRecebidaConfeccao && (
                <p style={{ margin: '8px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
                  Abra a planilha enviada pela clínica antes de confeccionar a SOLEMP.
                </p>
              )}
              {isRascunhoAtivo && !planilhaRecebidaRascunho && (
                <p style={{ margin: '8px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
                  Abra e receba a planilha antes de enviar para Empenhado.
                </p>
              )}
              {isEmpenhadoAtivo && !planilhaRecebidaEmpenhado && (
                <p style={{ margin: '8px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
                  Abra e receba a planilha antes de concluir o Empenhado.
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
