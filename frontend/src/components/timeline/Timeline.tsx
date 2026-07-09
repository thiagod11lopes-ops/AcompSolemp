import { memo, useCallback, useMemo, useState } from 'react'
import { useMediaQuery } from '@mui/material'
import type { PedidoComDetalhes } from '@/types'
import type { TimelineDrawerDetail, TimelineHeaderModel, TimelineLane, TimelineNodeData, TimelineSection } from './types'
import { TimelineHeader } from './TimelineHeader'
import { TimelineNode } from './TimelineNode'
import { TimelineDrawer } from './TimelineDrawer'
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

  const resolvedLanes = useMemo(() => {
    if (lanes?.length) return lanes
    if (sections?.length) {
      return sections.flatMap((section) =>
        section.lanes.map((lane) => ({
          ...lane,
          title: lane.title ?? section.title,
          subtitle: lane.subtitle ?? section.subtitle,
        })),
      )
    }
    if (nodes?.length) return [{ id: 'main', nodes }]
    return []
  }, [lanes, sections, nodes])

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
        {sections?.length
          ? sections.map((section) => (
              <div key={section.id} className="timeline-section">
                {section.title && <div className="timeline-section-title">{section.title}</div>}
                {section.subtitle && (
                  <div className="timeline-section-subtitle">{section.subtitle}</div>
                )}
                <div className={section.lanes.length > 1 ? 'timeline-parallel-grid' : undefined}>
                  {section.lanes.map((lane) => (
                    <LaneRow
                      key={lane.id}
                      lane={lane}
                      vertical={isMobile || section.lanes.length > 1}
                      onOpenDetails={openDrawer}
                    />
                  ))}
                </div>
              </div>
            ))
          : resolvedLanes.map((lane) => (
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
            ))}
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
