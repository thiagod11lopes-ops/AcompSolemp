import { memo } from 'react'
import type { TimelineNodeData } from './types'
import { TimelineCard } from './TimelineCard'
import { TimelineEdge } from './TimelineEdge'

interface TimelineNodeProps {
  node: TimelineNodeData
  onOpenDetails: () => void
  actions?: React.ReactNode
  showEdgeAfter?: boolean
  vertical?: boolean
}

export const TimelineNode = memo(function TimelineNode({
  node,
  onOpenDetails,
  actions,
  showEdgeAfter = true,
  vertical = false,
}: TimelineNodeProps) {
  return (
    <>
      <TimelineCard node={node} onOpenDetails={onOpenDetails} actions={actions} />
      {showEdgeAfter && <TimelineEdge state={node.edgeAfter} vertical={vertical} />}
    </>
  )
})
