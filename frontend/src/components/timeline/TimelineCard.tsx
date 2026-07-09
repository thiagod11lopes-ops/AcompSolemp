import { memo } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, Clock3, User } from 'lucide-react'
import type { TimelineNodeData } from './types'
import { TimelineStatus } from './TimelineStatus'
import { timelineTheme } from './theme'
import { formatDate, formatDateTime } from '@/utils/format'

interface TimelineCardProps {
  node: TimelineNodeData
  onOpenDetails: () => void
  actions?: React.ReactNode
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
  actions,
}: TimelineCardProps) {
  const Icon = node.icon
  const isActive = node.isHighlighted || node.status === 'active' || node.status === 'error' || node.status === 'review'
  const showRotateRing = isActive && node.status !== 'completed'

  const cardBody = (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{
        y: showRotateRing ? -2 : -4,
      }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="timeline-card-inner"
      style={{
        padding: 20,
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
      {showRotateRing && <span className="timeline-card-active-badge">Etapa atual</span>}

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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(59,130,246,0.12)',
            border: `1px solid ${showRotateRing ? 'rgba(59,130,246,0.35)' : timelineTheme.border}`,
            color: timelineTheme.blue,
            flexShrink: 0,
          }}
        >
          {Icon && <Icon size={22} strokeWidth={1.75} />}
        </div>
        <TimelineStatus status={node.status} compact />
      </div>

      <h3
        style={{
          margin: '14px 0 6px',
          fontSize: '0.95rem',
          fontWeight: 700,
          lineHeight: 1.3,
          letterSpacing: '-0.01em',
        }}
      >
        {node.etapa.nome}
      </h3>

      {node.processoNumero && (
        <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: timelineTheme.blue, fontWeight: 600 }}>
          {node.processoNumero}
        </p>
      )}

      <div style={{ display: 'grid', gap: 6, fontSize: '0.78rem', color: timelineTheme.textSecondary }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <User size={13} />
          {node.responsavel ?? 'Não atribuído'}
        </span>
        {node.tempoNaEtapa && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock3 size={13} />
            {node.tempoNaEtapa} na etapa
          </span>
        )}
        {node.dataInicio && (
          <span>
            {formatDate(node.dataInicio)} · {formatDateTime(node.dataInicio).split(' ').pop()}
          </span>
        )}
      </div>

      {node.observacaoResumo && (
        <p
          style={{
            margin: '12px 0 0',
            fontSize: '0.78rem',
            color: timelineTheme.textSecondary,
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {node.observacaoResumo}
        </p>
      )}

      {actions && (
        <div className="timeline-actions-slot" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}

      <motion.button
        type="button"
        whileHover={{ x: 2 }}
        onClick={(e) => {
          e.stopPropagation()
          onOpenDetails()
        }}
        style={{
          marginTop: 14,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: 0,
          border: 'none',
          background: 'transparent',
          color: timelineTheme.blue,
          fontSize: '0.78rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
        title="Ver detalhes da etapa"
      >
        Ver detalhes
        <ChevronRight size={14} />
      </motion.button>
    </motion.article>
  )

  if (!showRotateRing) {
    return (
      <div className={activeShellClass(node.status, isActive)} style={{ width: '100%', minWidth: 240, maxWidth: 300 }}>
        {cardBody}
      </div>
    )
  }

  return (
    <div className={activeShellClass(node.status, true)}>
      <div className="timeline-card-rotate-ring" aria-hidden />
      {cardBody}
    </div>
  )
})
