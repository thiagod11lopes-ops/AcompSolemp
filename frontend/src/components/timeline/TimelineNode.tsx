import { memo } from 'react'
import type { TimelineNodeData } from './types'
import { TimelineCard } from './TimelineCard'
import { TimelineEdge } from './TimelineEdge'

interface TimelineNodeProps {
  node: TimelineNodeData
  onOpenDetails: () => void
  showEdgeAfter?: boolean
  vertical?: boolean
}

export const TimelineNode = memo(function TimelineNode({
  node,
  onOpenDetails,
  showEdgeAfter = true,
  vertical = false,
}: TimelineNodeProps) {
  return (
    <>
      <TimelineCard node={node} onOpenDetails={onOpenDetails} />
      {showEdgeAfter && <TimelineEdge state={node.edgeAfter} vertical={vertical} />}
    </>
  )
})
