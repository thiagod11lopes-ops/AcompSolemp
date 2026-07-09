import { useMemo } from 'react'
import type { PedidoComDetalhes, WorkflowEtapa } from '@/types'
import { formatDate } from '@/utils/format'
import { clinicaPodeAvancar, CLINICA_ETAPA_ACOES, ETAPAS_AGUARDANDO_SETOR } from '@/utils/portal'
import { filtrarEtapasParaTimeline, resolveEtapaNomeExibicao } from '@/utils/timelineFlow'
import {
  Timeline,
  buildSectionedTimeline,
  buildTimelineHeader,
  flattenSections,
  type TimelineNodeData,
} from '@/components/timeline'
import { TimelineActionButton } from '@/components/timeline/TimelineActionButton'

interface ClinicaInteractiveTimelineProps {
  pedido: PedidoComDetalhes
  etapas: WorkflowEtapa[]
  onAvancar?: () => void
  onReverter?: () => void
  podeReverter?: boolean
  avancando?: boolean
  revertendo?: boolean
  somenteLeitura?: boolean
}

export function ClinicaInteractiveTimeline({
  pedido,
  etapas,
  onAvancar,
  onReverter,
  podeReverter = false,
  avancando = false,
  revertendo = false,
  somenteLeitura = false,
}: ClinicaInteractiveTimelineProps) {
  const etapasVisiveis = filtrarEtapasParaTimeline(etapas)
  const etapasAtivasIds =
    pedido.etapasAtivasIds?.length > 0 ? pedido.etapasAtivasIds : [pedido.etapaAtualId]
  const etapasAtivas = etapasVisiveis.filter((e) => etapasAtivasIds.includes(e.id))
  const podeEditar = !somenteLeitura && Boolean(onAvancar)

  const sections = useMemo(
    () => buildSectionedTimeline(pedido, etapas),
    [pedido, etapas],
  )
  const allNodes = useMemo(() => flattenSections(sections), [sections])
  const header = useMemo(
    () =>
      buildTimelineHeader(pedido, allNodes, {
        subtitle: somenteLeitura
          ? 'Acompanhe todas as etapas do processo até a conclusão.'
          : 'Acompanhe cada etapa e clique para registrar o avanço quando sua clínica concluir a ação.',
      }),
    [pedido, allNodes, somenteLeitura],
  )

  const renderNodeActions = (node: TimelineNodeData) => {
    const historico = node.historico
    const atual =
      etapasAtivasIds.includes(node.etapa.id) &&
      !pedido.concluido &&
      !historico?.dataConclusao
    const podeClicar = podeEditar && atual && clinicaPodeAvancar(node.etapa.chave)
    const acaoEtapa = CLINICA_ETAPA_ACOES[node.etapa.chave]

    return (
      <>
        {podeClicar && acaoEtapa && onAvancar && (
          <TimelineActionButton onClick={onAvancar} disabled={avancando}>
            {avancando ? 'Registrando...' : acaoEtapa.label}
          </TimelineActionButton>
        )}
        {atual && ETAPAS_AGUARDANDO_SETOR[node.etapa.chave] && (
          <span style={{ fontSize: '0.75rem', color: '#F59E0B' }}>
            {ETAPAS_AGUARDANDO_SETOR[node.etapa.chave]}
          </span>
        )}
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
          {etapasAtivas.length > 0 && !pedido.concluido && (
            <div className="timeline-alert">
              <strong>
                {etapasAtivas.length > 1 ? 'Etapas ativas em paralelo:' : 'Etapa atual:'}
              </strong>{' '}
              {etapasAtivas.map((e) => resolveEtapaNomeExibicao(e, pedido)).join(' · ')}
            </div>
          )}
          {pedido.concluido && (
            <div className="timeline-alert timeline-alert-success">
              Processo concluído — todas as etapas foram finalizadas.
            </div>
          )}
        </>
      }
      footer={
        <>
          <span>
            Timeline iniciada em {formatDate(pedido.dataSolicitacao)} · Pedido {pedido.numero}
          </span>
          {!somenteLeitura && podeReverter && onReverter && !pedido.concluido && (
            <div style={{ marginTop: 12 }}>
              <TimelineActionButton
                variant="warning"
                onClick={onReverter}
                disabled={revertendo || avancando}
              >
                {revertendo ? 'Revertendo...' : 'Voltar uma etapa'}
              </TimelineActionButton>
            </div>
          )}
        </>
      }
    />
  )
}
