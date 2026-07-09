import { useMemo } from 'react'
import type { PedidoComDetalhes, WorkflowEtapa } from '@/types'
import { formatDate } from '@/utils/format'
import { filtrarEtapasParaTimeline } from '@/utils/timelineFlow'
import {
  Timeline,
  buildSectionedTimeline,
  buildTimelineHeader,
  flattenSections,
} from '@/components/timeline'

interface ProcessTimelineProps {
  pedido: PedidoComDetalhes
  etapas: WorkflowEtapa[]
}

export function ProcessTimeline({ pedido, etapas }: ProcessTimelineProps) {
  const visiveis = useMemo(() => filtrarEtapasParaTimeline(etapas), [etapas])
  const sections = useMemo(
    () => buildSectionedTimeline(pedido, visiveis),
    [pedido, visiveis],
  )
  const allNodes = useMemo(() => flattenSections(sections), [sections])
  const header = useMemo(
    () =>
      buildTimelineHeader(pedido, allNodes, {
        subtitle: 'Visualização completa do fluxo do processo.',
      }),
    [pedido, allNodes],
  )

  return (
    <Timeline
      pedido={pedido}
      header={header}
      sections={sections}
      footer={<span>Solicitação em {formatDate(pedido.dataSolicitacao)}</span>}
    />
  )
}
