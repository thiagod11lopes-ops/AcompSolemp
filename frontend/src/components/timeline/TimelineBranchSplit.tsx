import { memo } from 'react'
import type { TimelineEdgeState } from './types'
import { isTraveledEdgeState, TIMELINE_EDGE_COLORS } from './timelineEdgeColors'

interface TimelineBranchSplitProps {
  branchStates: TimelineEdgeState[]
}

function resolveRailState(states: TimelineEdgeState[]): TimelineEdgeState {
  if (states.some((s) => s === 'error')) return 'error'
  if (states.some((s) => s === 'active')) return 'active'
  if (states.some((s) => s === 'completed')) return 'completed'
  return 'waiting'
}

export const TimelineBranchSplit = memo(function TimelineBranchSplit({
  branchStates,
}: TimelineBranchSplitProps) {
  const count = Math.max(branchStates.length, 1)
  const railState = resolveRailState(branchStates)

  if (count === 1) {
    const color = TIMELINE_EDGE_COLORS[branchStates[0] ?? 'waiting']
    const traveled = isTraveledEdgeState(branchStates[0] ?? 'waiting')
    return (
      <div className="timeline-flow-connector timeline-flow-connector--single" aria-hidden>
        <div
          className={`timeline-flow-connector-line timeline-flow-connector-line--vertical${traveled ? ' timeline-flow-connector-line--traveled' : ''}`}
          style={{ backgroundColor: color }}
        />
      </div>
    )
  }

  const railTraveled = isTraveledEdgeState(railState)

  return (
    <div className="timeline-flow-branch-split" aria-hidden>
      <div
        className={`timeline-flow-connector-line timeline-flow-connector-line--stem${railTraveled ? ' timeline-flow-connector-line--traveled' : ''}`}
        style={{ backgroundColor: TIMELINE_EDGE_COLORS[railState] }}
      />
      <div className="timeline-flow-branch-rail">
        <div
          className={`timeline-flow-connector-line timeline-flow-connector-line--horizontal${railTraveled ? ' timeline-flow-connector-line--traveled' : ''}`}
          style={{ backgroundColor: TIMELINE_EDGE_COLORS[railState] }}
        />
        <div className="timeline-flow-branch-drops">
          {branchStates.map((state, index) => {
            const traveled = isTraveledEdgeState(state)
            return (
              <div key={index} className="timeline-flow-branch-drop">
                <div
                  className={`timeline-flow-connector-line timeline-flow-connector-line--drop${traveled ? ' timeline-flow-connector-line--traveled' : ''}`}
                  style={{ backgroundColor: TIMELINE_EDGE_COLORS[state] }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})
