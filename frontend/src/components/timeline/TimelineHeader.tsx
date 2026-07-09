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
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        marginBottom: 28,
        paddingBottom: 24,
        borderBottom: `1px solid ${timelineTheme.border}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              margin: '6px 0 0',
              fontSize: '1.35rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            Processo {model.numero}
          </h2>
          {model.subtitle && (
            <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: timelineTheme.textSecondary }}>
              {model.subtitle}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
          <TimelineStatus status={model.statusVariant} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.82rem',
              color: timelineTheme.textSecondary,
            }}
            title="Tempo total do processo"
          >
            <Clock3 size={14} />
            <span>{model.tempoTotal}</span>
          </div>
        </div>
      </div>
    </motion.header>
  )
})
