import { memo } from 'react'
import { motion } from 'framer-motion'
import { Clock3 } from 'lucide-react'
import type { TimelineHeaderModel } from './types'
import { TimelineStatus } from './TimelineStatus'
import { timelineTheme } from './theme'

interface TimelineHeaderProps {
  model: TimelineHeaderModel
}

export const TimelineHeader = memo(function TimelineHeader({ model }: TimelineHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      style={{
        marginBottom: 18,
        paddingBottom: 16,
        borderBottom: `1px solid ${timelineTheme.border}`,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: '0.68rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 700,
            color: timelineTheme.textSecondary,
          }}
        >
          Fluxo do processo
        </p>
        <h2
          style={{
            margin: '4px 0 0',
            fontSize: '1.2rem',
            fontWeight: 750,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}
        >
          {model.numero}
        </h2>
        {model.subtitle && (
          <p
            style={{
              margin: '6px 0 0',
              fontSize: '0.82rem',
              color: timelineTheme.textSecondary,
            }}
          >
            {model.subtitle}
          </p>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <TimelineStatus status={model.statusVariant} />
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.78rem',
            color: timelineTheme.textSecondary,
            padding: '6px 10px',
            borderRadius: 999,
            border: `1px solid ${timelineTheme.border}`,
            background: 'rgba(255,255,255,0.03)',
          }}
          title="Tempo total do processo"
        >
          <Clock3 size={13} />
          <span>{model.tempoTotal}</span>
        </div>
      </div>
    </motion.header>
  )
})
