import { memo } from 'react'
import { motion } from 'framer-motion'
import type { TimelineEdgeState } from './types'
import { isTraveledEdgeState, TIMELINE_EDGE_COLORS } from './timelineEdgeColors'

interface TimelineEdgeProps {
  state: TimelineEdgeState
  vertical?: boolean
}

export const TimelineEdge = memo(function TimelineEdge({
  state,
  vertical = false,
}: TimelineEdgeProps) {
  const color = TIMELINE_EDGE_COLORS[state]
  const animated = state === 'active'
  const traveled = isTraveledEdgeState(state)

  if (vertical) {
    return (
      <div
        style={{
          width: 3,
          height: 32,
          margin: '4px 0',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <svg width="3" height="32" style={{ overflow: 'visible' }}>
          <motion.path
            d="M 1.5 0 C 1.5 10, 1.5 22, 1.5 32"
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5 }}
          />
          {animated && (
            <motion.circle
              r={4}
              fill={color}
              style={{ filter: `drop-shadow(0 0 6px ${color})` }}
              animate={{ cy: [0, 32, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              cx={1.5}
            />
          )}
        </svg>
      </div>
    )
  }

  return (
    <div
      style={{
        width: 48,
        minWidth: 32,
        height: 3,
        alignSelf: 'center',
        margin: '0 4px',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <svg width="100%" height="12" viewBox="0 0 48 12" preserveAspectRatio="none">
        <motion.path
          d="M 0 6 C 12 6, 16 2, 24 6 S 36 10, 48 6"
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.5 }}
          animate={{
            pathLength: 1,
            opacity: animated ? [0.7, 1, 0.7] : 1,
          }}
          transition={{
            pathLength: { duration: 0.6 },
            opacity: animated ? { duration: 2, repeat: Infinity } : { duration: 0.3 },
          }}
          style={animated || traveled ? { filter: `drop-shadow(0 0 4px ${color})` } : undefined}
        />
      </svg>
    </div>
  )
})
