import { memo } from 'react'
import type { TimelineLane, TimelineNodeData, TimelineSection } from './types'
import { TimelineNode } from './TimelineNode'
import { TimelineEdge } from './TimelineEdge'
import { TimelineBranchSplit } from './TimelineBranchSplit'
import {
  getSectionEntryNodes,
  getSectionExitNodes,
  isClinicSection,
  resolveBranchStates,
  resolveConnectorState,
} from './timelineFlowUtils'

interface TimelineFlowLayoutProps {
  sections: TimelineSection[]
  isMobile: boolean
  onOpenDetails: (node: TimelineNodeData) => void
}

function LaneColumn({
  lane,
  vertical,
  onOpenDetails,
}: {
  lane: TimelineLane
  vertical: boolean
  onOpenDetails: (node: TimelineNodeData) => void
}) {
  return (
    <div className="timeline-flow-lane">
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
  )
}

function FlowSection({
  section,
  isMobile,
  onOpenDetails,
  showTitle,
}: {
  section: TimelineSection
  isMobile: boolean
  onOpenDetails: (node: TimelineNodeData) => void
  showTitle: boolean
}) {
  const isParallel = section.lanes.length > 1

  return (
    <div className="timeline-flow-stage">
      {showTitle && section.title && <div className="timeline-section-title">{section.title}</div>}
      {section.subtitle && <div className="timeline-section-subtitle">{section.subtitle}</div>}
      <div
        className={
          isParallel ? 'timeline-flow-parallel-grid' : 'timeline-flow-sequential-grid'
        }
      >
        {section.lanes.map((lane) => (
          <LaneColumn
            key={lane.id}
            lane={lane}
            vertical={isMobile || isParallel}
            onOpenDetails={onOpenDetails}
          />
        ))}
      </div>
    </div>
  )
}

export const TimelineFlowLayout = memo(function TimelineFlowLayout({
  sections,
  isMobile,
  onOpenDetails,
}: TimelineFlowLayoutProps) {
  const clinicSection = sections[0] && isClinicSection(sections[0]) ? sections[0] : null
  const flowSections = clinicSection ? sections.slice(1) : sections
  const clinicNode = clinicSection?.lanes[0]?.nodes[0]

  if (!clinicSection || !clinicNode) {
    return (
      <>
        {sections.map((section) => (
          <FlowSection
            key={section.id}
            section={section}
            isMobile={isMobile}
            onOpenDetails={onOpenDetails}
            showTitle
          />
        ))}
      </>
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

      {flowSections.map((section, index) => {
        const prevSection = index === 0 ? clinicSection : flowSections[index - 1]
        const prevExitNodes = getSectionExitNodes(prevSection)
        const entryNodes = getSectionEntryNodes(section)
        const connectorState = resolveConnectorState(
          index === 0 ? [clinicNode] : prevExitNodes,
          entryNodes,
        )
        const branchStates =
          index === 0 && section.lanes.length > 1
            ? resolveBranchStates(clinicNode, entryNodes)
            : [connectorState]

        return (
          <div key={section.id} className="timeline-flow-segment">
            {index === 0 && section.lanes.length > 1 ? (
              <TimelineBranchSplit branchStates={branchStates} />
            ) : (
              <div className="timeline-flow-connector">
                <TimelineEdge state={connectorState} vertical />
              </div>
            )}

            <FlowSection
              section={section}
              isMobile={isMobile}
              onOpenDetails={onOpenDetails}
              showTitle={Boolean(section.title)}
            />

            {index < flowSections.length - 1 && (
              <div className="timeline-flow-connector">
                <TimelineEdge
                  state={resolveConnectorState(getSectionExitNodes(section), getSectionEntryNodes(flowSections[index + 1]))}
                  vertical
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
})
