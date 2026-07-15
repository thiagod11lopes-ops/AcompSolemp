import { memo } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import type { TimelineNodeData } from './types'
import { timelineTheme } from './theme'
import { nodeNaoIniciada, getTimelineNodeAnchor } from './timelineFlowUtils'
import { formatCurrency } from '@/utils/format'

interface TimelineCardProps {
  node: TimelineNodeData
  onOpenDetails: () => void
}

const ETAPAS_COM_SOLEMP_NO_CARD = new Set([
  'DIV_MAT_CONFECCAO_SOLEMP',
  'DIV_MAT_FINANCAS',
])

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
  const isDispensavel = node.dispensavel === true
  const isActive =
    !isDispensavel &&
    (node.isHighlighted || node.status === 'active' || node.status === 'error' || node.status === 'review')
  const showRotateRing = isActive && node.status !== 'completed'
  const isPending = !isDispensavel && nodeNaoIniciada(node)
  const isCompleted = !isDispensavel && node.status === 'completed'

  const shellClass = [
    activeShellClass(node.status, isActive),
    isDispensavel ? 'timeline-card-shell--dispensavel' : '',
    isPending ? 'timeline-card-shell--pending' : '',
    isCompleted ? 'timeline-card-shell--completed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const contentOpacity = isDispensavel ? 0.3 : 1
  const showSolempMeta =
    ETAPAS_COM_SOLEMP_NO_CARD.has(node.etapa.chave) &&
    Boolean(node.solempNumero || node.solempValor != null)
  const showEmpenhoMeta = Boolean(node.empenhoExibicao)
  const showExtraMeta = showSolempMeta || showEmpenhoMeta

  const cardBody = (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: contentOpacity, y: 0, scale: 1 }}
      whileHover={{
        y: showRotateRing ? -2 : isDispensavel ? 0 : -4,
      }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={[
        'timeline-card-inner',
        'timeline-card-inner--compact',
        showExtraMeta ? 'timeline-card-inner--with-solemp' : '',
      ]
        .filter(Boolean)
        .join(' ')}
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

      {isDispensavel && (
        <div className="timeline-card-dispensavel-band" aria-hidden>
          <span>Dispensável</span>
        </div>
      )}

      {isCompleted && (
        <div className="timeline-card-concluido-band" aria-hidden>
          <span>Concluído</span>
        </div>
      )}

      <h3 className="timeline-card-title">{node.displayName}</h3>

      <p className="timeline-card-pedido" style={{ color: timelineTheme.blue }}>
        PED {node.numeroPedido}
      </p>

      {showSolempMeta ? (
        <div className="timeline-card-solemp-meta">
          {node.solempNumero ? (
            <p className="timeline-card-solemp-numero" style={{ color: timelineTheme.text }}>
              SOLEMP {node.solempNumero}
            </p>
          ) : null}
          {node.solempValor != null ? (
            <p className="timeline-card-solemp-valor" style={{ color: timelineTheme.blue }}>
              {formatCurrency(node.solempValor)}
            </p>
          ) : null}
        </div>
      ) : null}

      {showEmpenhoMeta ? (
        <div className="timeline-card-solemp-meta">
          <p className="timeline-card-solemp-numero" style={{ color: timelineTheme.text }}>
            {node.empenhoExibicao}
          </p>
        </div>
      ) : null}

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
    return (
      <div
        className={shellClass}
        data-timeline-node-id={node.id}
        data-timeline-anchor={getTimelineNodeAnchor(node)}
      >
        {cardBody}
      </div>
    )
  }

  return (
    <div className={shellClass} data-timeline-node-id={node.id} data-timeline-anchor={getTimelineNodeAnchor(node)}>
      <div className="timeline-card-rotate-ring" aria-hidden />
      {cardBody}
    </div>
  )
})
