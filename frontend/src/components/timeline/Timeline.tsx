import { memo, useCallback, useMemo, useState } from 'react'
import { useMediaQuery } from '@mui/material'
import type { PedidoComDetalhes, WorkflowEtapa } from '@/types'
import { pedidoPlanilhaEnvioService } from '@/services/pedidoPlanilhaEnvioService'
import type { TimelineDrawerDetail, TimelineHeaderModel, TimelineLane, TimelineNodeData, TimelineSection } from './types'
import { TimelineHeader } from './TimelineHeader'
import { TimelineDrawer } from './TimelineDrawer'
import { TimelineFlowLayout } from './TimelineFlowLayout'
import { TimelineNode } from './TimelineNode'
import { TimelineEdge } from './TimelineEdge'
import { isClinicNode } from './timelineFlowUtils'
import { timelineConnectorVisivel } from '@/utils/timelineFlow'
import {
  applyPlanilhaEdgesToNodes,
  applyPlanilhaEdgesToSections,
  flattenSections,
  sectionsToLanes,
} from './mapTimelineNodes'
import './timeline.css'

export interface TimelineProps {
  pedido: PedidoComDetalhes
  header: TimelineHeaderModel
  lanes?: TimelineLane[]
  sections?: TimelineSection[]
  nodes?: TimelineNodeData[]
  alerts?: React.ReactNode
  footer?: React.ReactNode
  renderNodeActions?: (node: TimelineNodeData) => React.ReactNode
}

export const Timeline = memo(function Timeline({
  pedido,
  header,
  lanes,
  sections,
  nodes,
  alerts,
  footer,
  renderNodeActions,
}: TimelineProps) {
  const isMobile = useMediaQuery('(max-width:900px)')
  const [drawerDetail, setDrawerDetail] = useState<TimelineDrawerDetail | null>(null)

  const planilhaEnvio = useMemo(
    () => pedidoPlanilhaEnvioService.getForPedido(pedido.id),
    [pedido.id],
  )

  const etapasFromTimeline = useMemo(() => {
    const allNodes = [
      ...(sections ? flattenSections(sections) : []),
      ...(nodes ?? []),
      ...(lanes?.flatMap((lane) => lane.nodes) ?? []),
    ]
    const map = new Map<string, WorkflowEtapa>()
    allNodes.forEach((node) => map.set(node.etapa.id, node.etapa))
    return Array.from(map.values())
  }, [sections, nodes, lanes])

  const resolvedSections = useMemo(() => {
    if (!sections?.length) return sections
    return applyPlanilhaEdgesToSections(sections, pedido, etapasFromTimeline, planilhaEnvio)
  }, [sections, pedido, etapasFromTimeline, planilhaEnvio])

  const resolvedNodes = useMemo(() => {
    if (!nodes?.length) return nodes
    return applyPlanilhaEdgesToNodes(nodes, pedido, etapasFromTimeline, planilhaEnvio)
  }, [nodes, pedido, etapasFromTimeline, planilhaEnvio])

  const resolvedLanes = useMemo(() => {
    if (lanes?.length) {
      return lanes.map((lane) => ({
        ...lane,
        nodes: applyPlanilhaEdgesToNodes(
          lane.nodes,
          pedido,
          etapasFromTimeline,
          planilhaEnvio,
        ),
      }))
    }
    if (resolvedSections?.length) {
      return sectionsToLanes(resolvedSections)
    }
    if (resolvedNodes?.length) return [{ id: 'main', nodes: resolvedNodes }]
    return []
  }, [lanes, resolvedSections, resolvedNodes, pedido, etapasFromTimeline, planilhaEnvio])

  const openDrawer = useCallback(
    (node: TimelineNodeData) => {
      setDrawerDetail({ pedido, node })
    },
    [pedido],
  )

  const closeDrawer = useCallback(() => setDrawerDetail(null), [])

  return (
    <div className="timeline-root">
      <div className="timeline-inner">
        <TimelineHeader model={header} />
        {alerts}
        {resolvedSections?.length ? (
          <TimelineFlowLayout
            sections={resolvedSections}
            pedido={pedido}
            etapas={etapasFromTimeline}
            planilhaEnvio={planilhaEnvio}
            isMobile={isMobile}
            onOpenDetails={openDrawer}
          />
        ) : resolvedNodes?.length && isClinicNode(resolvedNodes[0]) ? (
          <LinearFlowLayout nodes={resolvedNodes} isMobile={isMobile} onOpenDetails={openDrawer} />
        ) : (
          resolvedLanes.map((lane) => (
              <div key={lane.id} className="timeline-section">
                {lane.title && <div className="timeline-lane-title">{lane.title}</div>}
                {lane.subtitle && (
                  <div className="timeline-section-subtitle">{lane.subtitle}</div>
                )}
                <LaneRow
                  lane={lane}
                  vertical={isMobile}
                  onOpenDetails={openDrawer}
                />
              </div>
            ))
        )}
        {footer && <div className="timeline-footer">{footer}</div>}
      </div>
      <TimelineDrawer
        detail={drawerDetail}
        onClose={closeDrawer}
        actions={drawerDetail ? renderNodeActions?.(drawerDetail.node) : undefined}
      />
    </div>
  )
})

interface LaneRowProps {
  lane: TimelineLane
  vertical: boolean
  onOpenDetails: (node: TimelineNodeData) => void
}

const LaneRow = memo(function LaneRow({
  lane,
  vertical,
  onOpenDetails,
}: LaneRowProps) {
  return (
    <div className="timeline-lane-wrap">
      <div className={`timeline-lane ${vertical ? 'timeline-lane-vertical' : ''}`}>
        {lane.nodes.map((node, index) => (
          <TimelineNode
            key={node.id}
            node={node}
            vertical={vertical}
            showEdgeAfter={index < lane.nodes.length - 1}
            onOpenDetails={() => onOpenDetails(node)}
          />
        ))}
      </div>
    </div>
  )
})

const LinearFlowLayout = memo(function LinearFlowLayout({
  nodes,
  isMobile,
  onOpenDetails,
}: {
  nodes: TimelineNodeData[]
  isMobile: boolean
  onOpenDetails: (node: TimelineNodeData) => void
}) {
  const [clinicNode, ...restNodes] = nodes

  if (!clinicNode || !isClinicNode(clinicNode)) {
    return (
      <LaneRow
        lane={{ id: 'main', nodes }}
        vertical={isMobile}
        onOpenDetails={onOpenDetails}
      />
    )
  }

  return (
    <div className="timeline-flow">
      <div className="timeline-flow-clinic">
        <TimelineNode
          node={clinicNode}
          vertical={false}
          showEdgeAfter={false}
          onOpenDetails={() => onOpenDetails(clinicNode)}
        />
      </div>
      {restNodes.length > 0 && (
        <>
          <div className="timeline-flow-connector">
            <TimelineEdge state={clinicNode.edgeAfter} vertical />
          </div>
          <div className="timeline-flow-sequential-grid">
            <div className="timeline-flow-lane">
              {restNodes.map((node, index) => (
                <TimelineNode
                  key={node.id}
                  node={node}
                  vertical={isMobile}
                  showEdgeAfter={
                    index < restNodes.length - 1 &&
                    timelineConnectorVisivel(node.etapa.chave, restNodes[index + 1].etapa.chave)
                  }
                  onOpenDetails={() => onOpenDetails(node)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
})
