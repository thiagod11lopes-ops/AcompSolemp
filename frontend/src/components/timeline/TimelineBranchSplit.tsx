import { memo } from 'react'
import type { TimelineEdgeState } from './types'
import { timelineTheme } from './theme'

const EDGE_COLORS: Record<TimelineEdgeState, string> = {
  completed: timelineTheme.green,
  active: timelineTheme.blue,
  waiting: timelineTheme.line,
  error: timelineTheme.red,
}

interface TimelineBranchSplitProps {
  branchStates: TimelineEdgeState[]
}

export const TimelineBranchSplit = memo(function TimelineBranchSplit({
  branchStates,
}: TimelineBranchSplitProps) {
  const count = Math.max(branchStates.length, 1)

  if (count === 1) {
    const color = EDGE_COLORS[branchStates[0] ?? 'waiting']
    return (
      <div className="timeline-flow-connector timeline-flow-connector--single" aria-hidden>
        <div
          className="timeline-flow-connector-line timeline-flow-connector-line--vertical"
          style={{ backgroundColor: color }}
        />
      </div>
    )
  }

  return (
    <div className="timeline-flow-branch-split" aria-hidden>
      <div
        className="timeline-flow-connector-line timeline-flow-connector-line--stem"
        style={{ backgroundColor: EDGE_COLORS[branchStates.some((s) => s === 'active') ? 'active' : branchStates.every((s) => s === 'completed') ? 'completed' : 'waiting'] }}
      />
      <div className="timeline-flow-branch-rail">
        <div
          className="timeline-flow-connector-line timeline-flow-connector-line--horizontal"
          style={{
            backgroundColor: EDGE_COLORS[
              branchStates.some((s) => s === 'active')
                ? 'active'
                : branchStates.some((s) => s === 'completed')
                  ? 'completed'
                  : 'waiting'
            ],
          }}
        />
        <div className="timeline-flow-branch-drops">
          {branchStates.map((state, index) => (
            <div key={index} className="timeline-flow-branch-drop">
              <div
                className="timeline-flow-connector-line timeline-flow-connector-line--drop"
                style={{ backgroundColor: EDGE_COLORS[state] }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})
