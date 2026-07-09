import { memo } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import type { TimelineNodeData } from './types'
import { timelineTheme } from './theme'
import { nodeNaoIniciada } from './timelineFlowUtils'

interface TimelineCardProps {
  node: TimelineNodeData
  onOpenDetails: () => void
}

function activeShellClass(status: TimelineNodeData['status'], isActive: boolean): string {
  if (!isActive) return 'timeline-card-shell'
  if (status === 'error') return 'timeline-card-shell timeline-card-shell--active timeline-card-shell--error'
  if (status === 'review') return 'timeline-card-shell timeline-card-shell--active timeline-card-shell--review'
  return 'timeline-card-shell timeline-card-shell--active'
}

export const TimelineCard = memo(function TimelineCard({
  node,
  onOpenDetails,
}: TimelineCardProps) {
  const isActive = node.isHighlighted || node.status === 'active' || node.status === 'error' || node.status === 'review'
  const showRotateRing = isActive && node.status !== 'completed'
  const isPending = nodeNaoIniciada(node)

  const shellClass = [
    activeShellClass(node.status, isActive),
    isPending ? 'timeline-card-shell--pending' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const cardBody = (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{
        y: showRotateRing ? -2 : -4,
      }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="timeline-card-inner timeline-card-inner--compact"
      style={{
        background: `linear-gradient(145deg, ${timelineTheme.card} 0%, rgba(17,24,39,0.92) 100%)`,
        border: showRotateRing
          ? '1px solid rgba(255,255,255,0.1)'
          : `1px solid ${isActive ? `${timelineTheme.blue}66` : timelineTheme.border}`,
        backdropFilter: 'blur(12px)',
        boxShadow: showRotateRing
          ? `0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)`
          : isActive
            ? `0 0 24px ${timelineTheme.blue}22, ${timelineTheme.shadow}`
            : timelineTheme.shadow,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={onOpenDetails}
    >
      {isActive && !showRotateRing && (
        <motion.div
          layoutId={`glow-${node.id}`}
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at top right, ${timelineTheme.blue}18, transparent 60%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      <h3 className="timeline-card-title">{node.displayName}</h3>

      <p className="timeline-card-pedido" style={{ color: timelineTheme.blue }}>
        PED {node.numeroPedido}
      </p>

      <motion.button
        type="button"
        className="timeline-card-details-btn"
        whileHover={{ x: 2 }}
        onClick={(e) => {
          e.stopPropagation()
          onOpenDetails()
        }}
        style={{ color: timelineTheme.blue }}
        title="Ver detalhes da etapa"
      >
        Ver detalhes
        <ChevronRight size={14} />
      </motion.button>
    </motion.article>
  )

  if (!showRotateRing) {
    return <div className={shellClass}>{cardBody}</div>
  }

  return (
    <div className={shellClass}>
      <div className="timeline-card-rotate-ring" aria-hidden />
      {cardBody}
    </div>
  )
})
