import { useMemo } from 'react'
import type { PedidoComDetalhes, WorkflowEtapa } from '@/types'
import { formatDate } from '@/utils/format'
import {
  FINANCEIRO_ETAPA_ACOES,
  financeiroPagamentoConcluido,
  financeiroPodeRegistrarPagamento,
} from '@/utils/portal'
import { filtrarEtapasParaTimeline } from '@/utils/timelineFlow'
import {
  Timeline,
  buildSectionedTimeline,
  buildTimelineHeader,
  flattenSections,
  type TimelineNodeData,
} from '@/components/timeline'
import { TimelineActionButton } from '@/components/timeline/TimelineActionButton'

interface FinanceiroInteractiveTimelineProps {
  pedido: PedidoComDetalhes
  etapas: WorkflowEtapa[]
  onPagamento?: () => void
  onAguardandoEmpenhar?: () => void
  registrando?: boolean
  marcandoAguardando?: boolean
  mensagemFluxoEncerrado?: string | null
}

export function FinanceiroInteractiveTimeline({
  pedido,
  etapas,
  onPagamento,
  onAguardandoEmpenhar,
  registrando = false,
  marcandoAguardando = false,
  mensagemFluxoEncerrado = null,
}: FinanceiroInteractiveTimelineProps) {
  const visiveis = useMemo(() => filtrarEtapasParaTimeline(etapas), [etapas])
  const sections = useMemo(
    () => buildSectionedTimeline(pedido, visiveis),
    [pedido, visiveis],
  )
  const allNodes = useMemo(() => flattenSections(sections), [sections])
  const header = useMemo(() => buildTimelineHeader(pedido, allNodes), [pedido, allNodes])

  const pagamentoConcluido = financeiroPagamentoConcluido(pedido, visiveis)
  const acaoFinancas = FINANCEIRO_ETAPA_ACOES.DIV_MAT_FINANCAS
  const podeRegistrar =
    !pagamentoConcluido && financeiroPodeRegistrarPagamento(pedido.etapaAtual.chave)
  const jaAguardando = Boolean(pedido.aguardandoEmpenho)
  const botaoAguardandoDisponivel =
    !pagamentoConcluido && Boolean(onAguardandoEmpenhar) && !marcandoAguardando && !registrando

  const botaoAguardando = !pagamentoConcluido ? (
    <TimelineActionButton
      onClick={botaoAguardandoDisponivel ? onAguardandoEmpenhar : undefined}
      disabled={!botaoAguardandoDisponivel}
      variant="warning"
      style={
        jaAguardando
          ? {
              borderColor: '#F9731655',
              color: '#F97316',
              background: 'rgba(249,115,22,0.12)',
              cursor: botaoAguardandoDisponivel ? 'pointer' : undefined,
            }
          : { borderColor: '#F9731688', color: '#F97316' }
      }
    >
      {marcandoAguardando ? 'Marcando...' : 'Aguardando Empenhar'}
    </TimelineActionButton>
  ) : null

  const renderNodeActions = (node: TimelineNodeData) => {
    if (node.etapa.chave !== 'DIV_MAT_FINANCAS') return null

    return (
      <>
        {botaoAguardando}
        <TimelineActionButton
          onClick={pagamentoConcluido ? undefined : onPagamento}
          disabled={pagamentoConcluido || registrando || marcandoAguardando || !onPagamento}
          variant={pagamentoConcluido ? 'ghost' : 'primary'}
          style={
            pagamentoConcluido
              ? { borderColor: '#22C55E55', color: '#22C55E' }
              : { background: '#22C55E' }
          }
        >
          {pagamentoConcluido
            ? (acaoFinancas.labelConcluido ?? 'Concluído')
            : registrando
              ? 'Registrando...'
              : acaoFinancas.label}
        </TimelineActionButton>
      </>
    )
  }

  return (
    <Timeline
      pedido={pedido}
      header={header}
      sections={sections}
      renderNodeActions={renderNodeActions}
      alerts={
        <>
          {pagamentoConcluido && mensagemFluxoEncerrado && (
            <div className="timeline-alert timeline-alert-success">{mensagemFluxoEncerrado}</div>
          )}
          {jaAguardando && !pagamentoConcluido && (
            <div className="timeline-alert" style={{ borderColor: '#F9731655' }}>
              <strong style={{ color: '#F97316' }}>Aguardando empenho:</strong> o card Solemp
              confeccionada permanece com a tarja laranja. O processo não avançou para Empenhado.
            </div>
          )}
          {acaoFinancas && podeRegistrar && (
            <div className="timeline-alert">
              <strong>Pagamento pendente:</strong> {acaoFinancas.descricao}
              {pedido.solemp && (
                <p style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>
                  SOLEMP: <strong>{pedido.solemp.numero}</strong>
                </p>
              )}
              <div
                className="timeline-actions-slot"
                style={{ marginTop: 12, width: '100%' }}
              >
                {botaoAguardando}
                {onPagamento && (
                  <TimelineActionButton onClick={onPagamento} disabled={registrando || marcandoAguardando}>
                    {registrando ? 'Registrando...' : acaoFinancas.label}
                  </TimelineActionButton>
                )}
              </div>
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
