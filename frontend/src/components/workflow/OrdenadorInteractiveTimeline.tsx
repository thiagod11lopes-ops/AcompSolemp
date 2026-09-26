import { useMemo, useState, type ReactNode } from 'react'
import type { PedidoComDetalhes, ProcessoArquivado, WorkflowEtapa } from '@/types'
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
import { PlanilhaAnexosModal } from '@/components/clinica/PlanilhaAnexosModal'
import { userHasPerfil, userTemCadeiaSolemp } from '@/utils/userPerfis'

interface OrdenadorInteractiveTimelineProps {
  pedido: PedidoComDetalhes
  etapas: WorkflowEtapa[]
  processosArquivados?: ProcessoArquivado[]
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
  processosArquivados,
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
  const [anexosModalOpen, setAnexosModalOpen] = useState(false)
  const chavesPerfil = user ? chavesEtapaParaPerfil(user.perfil, user) : []
  const chavePendente = user
    ? chavePendenteParaPerfil(
        pedido,
        etapas,
        user.perfil,
        processosArquivados,
        user,
      )
    : null
  const trilhaAuditoria = usaTrilhaAuditoriaOrdenador(chavePendente)
  const isCadeiaConfeccao = Boolean(user && userTemCadeiaSolemp(user))
  const isAuditoriaUser = Boolean(user && userHasPerfil(user, 'AUDITORIA'))

  const botaoArquivoAnexado = (
    <TimelineActionButton
      type="button"
      variant="ghost"
      data-keep-drawer=""
      onClick={() => setAnexosModalOpen(true)}
    >
      Arquivo Anexado
    </TimelineActionButton>
  )

  const comArquivoAnexado = (acoes: ReactNode) => (
    <>
      {botaoArquivoAnexado}
      {acoes}
    </>
  )

  // Mantém a timeline completa (todas as etapas), como antes do filtro por trilha.
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
  const isAuditoriaAtiva =
    chavePendente === 'DIV_MAT_AUDITORIA' ||
    (isAuditoriaUser &&
      pedidoPendenteParaChave(
        pedido,
        visiveis,
        'DIV_MAT_AUDITORIA',
        processosArquivados,
      ))
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

    const tituloBloqueado =
      'Receba a planilha primeiro — clique em Receber Planilha para liberar o envio'

    if (
      node.etapa.chave === 'DIV_MAT_AUDITORIA' &&
      isAuditoriaAtiva &&
      onReceberPlanilha &&
      onEncaminharImh
    ) {
      // Sem data-keep-drawer: o drawer (z-index 1301) precisa fechar para o modal
      // de encaminhamento (MUI Dialog ~1300) ficar visível e concluir o avanço.
      return comArquivoAnexado(
        <>
          <TimelineActionButton onClick={onReceberPlanilha} disabled={assinando}>
            {planilhaRecebida ? 'Planilha recebida' : 'Receber Planilha'}
          </TimelineActionButton>
          <TimelineActionButton
            variant="warning"
            onClick={onEncaminharImh}
            disabled={assinando || !planilhaRecebida}
            title={!planilhaRecebida ? tituloBloqueado : 'Enviar Planilha'}
          >
            Enviar Planilha
          </TimelineActionButton>
        </>,
      )
    }

    if (
      node.etapa.chave === 'DIV_MAT_CONTABILIDADE_IMH' &&
      chavePendente === 'DIV_MAT_CONTABILIDADE_IMH' &&
      onReceberPlanilhaImh &&
      onAssinar
    ) {
      const planilhaDisponivel = planilhaEncaminhadaImh || fluxoDiretoImh
      return comArquivoAnexado(
        <>
          <TimelineActionButton
            onClick={onReceberPlanilhaImh}
            disabled={assinando || !planilhaDisponivel}
          >
            {planilhaRecebidaImh ? 'Planilha recebida' : 'Receber Planilha'}
          </TimelineActionButton>
          <TimelineActionButton
            variant="warning"
            onClick={onAssinar}
            disabled={assinando || !planilhaRecebidaImh}
            title={!planilhaRecebidaImh ? tituloBloqueado : 'Enviar Planilha'}
          >
            Enviar Planilha
          </TimelineActionButton>
        </>,
      )
    }

    if (
      node.etapa.chave === 'DIV_MAT_CONFECCAO_SOLEMP' &&
      onReceberPlanilhaConfeccao &&
      onAssinar
    ) {
      return comArquivoAnexado(
        <>
          <TimelineActionButton onClick={onReceberPlanilhaConfeccao} disabled={assinando}>
            {planilhaRecebidaConfeccao ? 'Planilha recebida' : 'Receber Planilha'}
          </TimelineActionButton>
          <TimelineActionButton
            variant="warning"
            onClick={onAssinar}
            disabled={assinando || !planilhaRecebidaConfeccao}
            title={!planilhaRecebidaConfeccao ? tituloBloqueado : 'Enviar Planilha'}
          >
            Enviar Planilha
          </TimelineActionButton>
        </>,
      )
    }

    if (
      isCadeiaConfeccao &&
      node.etapa.chave === 'DIV_MAT_FINANCAS' &&
      onReceberPlanilhaRascunho &&
      onAssinar
    ) {
      return comArquivoAnexado(
        <>
          <TimelineActionButton onClick={onReceberPlanilhaRascunho} disabled={assinando}>
            {planilhaRecebidaRascunho ? 'Planilha recebida' : 'Receber Planilha'}
          </TimelineActionButton>
          <TimelineActionButton
            variant="warning"
            onClick={onAssinar}
            disabled={assinando || !planilhaRecebidaRascunho}
            title={!planilhaRecebidaRascunho ? tituloBloqueado : 'Enviar Planilha'}
          >
            Enviar Planilha
          </TimelineActionButton>
        </>,
      )
    }

    if (
      isCadeiaConfeccao &&
      node.etapa.chave === 'DIV_MAT_EMPENHADO' &&
      onReceberPlanilhaEmpenhado &&
      onAssinar
    ) {
      return comArquivoAnexado(
        <>
          <TimelineActionButton onClick={onReceberPlanilhaEmpenhado} disabled={assinando}>
            {planilhaRecebidaEmpenhado ? 'Planilha recebida' : 'Receber Planilha'}
          </TimelineActionButton>
          <TimelineActionButton
            variant="warning"
            onClick={onAssinar}
            disabled={assinando || !planilhaRecebidaEmpenhado}
            title={!planilhaRecebidaEmpenhado ? tituloBloqueado : 'Enviar Planilha'}
          >
            Enviar Planilha
          </TimelineActionButton>
        </>,
      )
    }

    return null
  }

  return (
    <>
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
                    Enviar Planilha fica bloqueado até clicar em Receber Planilha.
                  </p>
                )}
                {isContabilidadeAtiva && !planilhaEncaminhadaImh && !fluxoDiretoImh && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
                    Aguardando encaminhamento pela Auditoria.
                  </p>
                )}
                {isContabilidadeAtiva &&
                  (planilhaEncaminhadaImh || fluxoDiretoImh) &&
                  !planilhaRecebidaImh && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
                    Enviar Planilha fica bloqueado até clicar em Receber Planilha.
                  </p>
                )}
                {isConfeccaoAtiva && !planilhaRecebidaConfeccao && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
                    Enviar Planilha fica bloqueado até clicar em Receber Planilha.
                  </p>
                )}
                {isRascunhoAtivo && !planilhaRecebidaRascunho && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
                    Enviar Planilha fica bloqueado até clicar em Receber Planilha.
                  </p>
                )}
                {isEmpenhadoAtivo && !planilhaRecebidaEmpenhado && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
                    Enviar Planilha fica bloqueado até clicar em Receber Planilha.
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
      <PlanilhaAnexosModal
        open={anexosModalOpen}
        pedidoId={pedido.id}
        onClose={() => setAnexosModalOpen(false)}
      />
    </>
  )
}
