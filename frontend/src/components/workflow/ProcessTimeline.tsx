import { useMemo } from 'react'
import type { PedidoComDetalhes, WorkflowEtapa } from '@/types'
import { formatDate } from '@/utils/format'
import { filtrarEtapasParaTimeline } from '@/utils/timelineFlow'
import {
  Timeline,
  buildLinearTimelineNodes,
  buildTimelineHeader,
} from '@/components/timeline'

interface ProcessTimelineProps {
  pedido: PedidoComDetalhes
  etapas: WorkflowEtapa[]
}

export function ProcessTimeline({ pedido, etapas }: ProcessTimelineProps) {
  const visiveis = useMemo(() => filtrarEtapasParaTimeline(etapas), [etapas])
  const nodes = useMemo(() => buildLinearTimelineNodes(pedido, visiveis), [pedido, visiveis])
  const header = useMemo(
    () =>
      buildTimelineHeader(pedido, nodes, {
        subtitle: 'Visualização completa do fluxo do processo.',
      }),
    [pedido, nodes],
  )

  return (
    <Timeline
      pedido={pedido}
      header={header}
      nodes={nodes}
      footer={<span>Solicitação em {formatDate(pedido.dataSolicitacao)}</span>}
    />
  )
}
