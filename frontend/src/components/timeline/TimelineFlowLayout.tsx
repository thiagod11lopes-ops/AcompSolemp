import { memo, useRef } from 'react'
import type { PedidoComDetalhes, PedidoPlanilhaEnvioState, WorkflowEtapa } from '@/types'
import type { TimelineLane, TimelineNodeData, TimelineSection } from './types'
import { TimelineNode } from './TimelineNode'
import { TimelineEdge } from './TimelineEdge'
import { TimelineDirectClinicImhLink } from './TimelineDirectClinicImhLink'
import {
  findContabilidadeImhNode,
  getSectionEntryNodes,
  getSectionExitNodes,
  isClinicSection,
  resolvePlanilhaConnectorState,
} from './timelineFlowUtils'
import { timelineConnectorVisivel } from '@/utils/timelineFlow'

interface TimelineFlowLayoutProps {
  sections: TimelineSection[]
  pedido: PedidoComDetalhes
  etapas: WorkflowEtapa[]
  planilhaEnvio?: PedidoPlanilhaEnvioState | null
  isMobile: boolean
  onOpenDetails: (node: TimelineNodeData) => void
}

function LaneRow({
  lane,
  onOpenDetails,
}: {
  lane: TimelineLane
  onOpenDetails: (node: TimelineNodeData) => void
}) {
  return (
    <div className="timeline-flow-lane">
      {lane.nodes.map((node, index) => (
        <TimelineNode
          key={node.id}
          node={node}
          vertical={false}
          showEdgeAfter={
            index < lane.nodes.length - 1 &&
            timelineConnectorVisivel(node.etapa.chave, lane.nodes[index + 1].etapa.chave)
          }
          onOpenDetails={() => onOpenDetails(node)}
        />
      ))}
    </div>
  )
}

function FlowSection({
  section,
  onOpenDetails,
  showTitle,
}: {
  section: TimelineSection
  onOpenDetails: (node: TimelineNodeData) => void
  showTitle: boolean
}) {
  const isParallel = section.lanes.length > 1

  return (
    <div className="timeline-flow-stage">
      {showTitle && section.title && (
        <div className="timeline-section-title">{section.title}</div>
      )}
      {section.subtitle && (
        <div className="timeline-section-subtitle">{section.subtitle}</div>
      )}
      <div
        className={
          isParallel ? 'timeline-flow-parallel-grid' : 'timeline-flow-sequential-grid'
        }
      >
        {section.lanes.map((lane) => (
          <div key={lane.id} className="timeline-flow-lane-column">
            {lane.title && <div className="timeline-lane-title">{lane.title}</div>}
            <LaneRow lane={lane} onOpenDetails={onOpenDetails} />
          </div>
        ))}
      </div>
    </div>
  )
}

export const TimelineFlowLayout = memo(function TimelineFlowLayout({
  sections,
  pedido,
  etapas,
  planilhaEnvio,
  onOpenDetails,
}: TimelineFlowLayoutProps) {
  const clinicSection = sections[0] && isClinicSection(sections[0]) ? sections[0] : null
  const flowSections = clinicSection ? sections.slice(1) : sections
  const clinicNode = clinicSection?.lanes[0]?.nodes[0]
  const contabilidadeImhNode = findContabilidadeImhNode(sections)
  const flowRef = useRef<HTMLDivElement>(null)

  if (!clinicSection || !clinicNode) {
    return (
      <div className="timeline-flow timeline-flow--horizontal" ref={flowRef}>
        <div className="timeline-flow-track">
          {sections.map((section, index) => (
            <div key={section.id} className="timeline-flow-segment">
              {index > 0 && (
                <div className="timeline-flow-connector">
                  <TimelineEdge
                    state={resolvePlanilhaConnectorState(
                      getSectionExitNodes(sections[index - 1]),
                      getSectionEntryNodes(section),
                      pedido,
                      etapas,
                      planilhaEnvio,
                    )}
                    vertical={false}
                  />
                </div>
              )}
              <FlowSection
                section={section}
                onOpenDetails={onOpenDetails}
                showTitle
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className="timeline-flow timeline-flow--horizontal timeline-flow--with-direct-imh"
      ref={flowRef}
    >
      <div className="timeline-flow-track">
        <div className="timeline-flow-clinic" data-timeline-anchor="clinic">
          <TimelineNode
            node={clinicNode}
            vertical={false}
            showEdgeAfter={false}
            onOpenDetails={() => onOpenDetails(clinicNode)}
          />
        </div>

        {flowSections.map((section, index) => {
          const prevSection = index === 0 ? clinicSection : flowSections[index - 1]
          const prevExitNodes = getSectionExitNodes(prevSection)
          const entryNodes = getSectionEntryNodes(section)
          const connectorState = resolvePlanilhaConnectorState(
            index === 0 ? [clinicNode] : prevExitNodes,
            entryNodes,
            pedido,
            etapas,
            planilhaEnvio,
          )

          return (
            <div key={section.id} className="timeline-flow-segment">
              <div className="timeline-flow-connector">
                <TimelineEdge state={connectorState} vertical={false} />
              </div>

              <FlowSection
                section={section}
                onOpenDetails={onOpenDetails}
                showTitle={Boolean(section.title)}
              />
            </div>
          )
        })}
      </div>

      {contabilidadeImhNode && (
        <TimelineDirectClinicImhLink
          containerRef={flowRef}
          clinicNodeId={clinicNode.id}
          imhNodeId={contabilidadeImhNode.id}
          pedido={pedido}
          etapas={etapas}
          planilhaEnvio={planilhaEnvio}
        />
      )}
    </div>
  )
})
