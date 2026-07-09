import { memo } from 'react'
import type { TimelineEdgeState } from './types'
import { isTraveledEdgeState, TIMELINE_EDGE_COLORS } from './timelineEdgeColors'

interface TimelineBranchEntryConnectorProps {
  state: TimelineEdgeState
}

export const TimelineBranchEntryConnector = memo(function TimelineBranchEntryConnector({
  state,
}: TimelineBranchEntryConnectorProps) {
  const color = TIMELINE_EDGE_COLORS[state]
  const traveled = isTraveledEdgeState(state)

  return (
    <div className="timeline-flow-branch-entry timeline-flow-branch-entry--centered" aria-hidden>
      <div
        className={`timeline-flow-connector-line timeline-flow-connector-line--drop${traveled ? ' timeline-flow-connector-line--traveled' : ''}`}
        style={{ backgroundColor: color }}
      />
    </div>
  )
})

interface TimelineBranchStemProps {
  state?: TimelineEdgeState
}

/** Trecho vertical central da clínica até a bifurcação — sempre estrutural (cinza). */
export const TimelineBranchStem = memo(function TimelineBranchStem({
  state = 'waiting',
}: TimelineBranchStemProps) {
  return (
    <div className="timeline-flow-connector timeline-flow-connector--stem" aria-hidden>
      <div
        className="timeline-flow-connector-line timeline-flow-connector-line--stem"
        style={{ backgroundColor: TIMELINE_EDGE_COLORS[state] }}
      />
    </div>
  )
})
