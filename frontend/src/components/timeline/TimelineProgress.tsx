import { memo } from 'react'
import { motion } from 'framer-motion'
import { timelineTheme } from './theme'

interface TimelineProgressProps {
  percent: number
  completed?: boolean
}

export const TimelineProgress = memo(function TimelineProgress({
  percent,
  completed = false,
}: TimelineProgressProps) {
  const clamped = Math.min(100, Math.max(0, percent))

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 8,
          fontSize: '0.78rem',
          color: timelineTheme.textSecondary,
        }}
      >
        <span>Progresso</span>
        <span style={{ color: timelineTheme.text, fontWeight: 600 }}>{clamped}%</span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
          border: `1px solid ${timelineTheme.border}`,
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{
            height: '100%',
            borderRadius: 999,
            background: completed
              ? `linear-gradient(90deg, ${timelineTheme.green}, #4ade80)`
              : `linear-gradient(90deg, ${timelineTheme.blue}, #60a5fa)`,
            boxShadow: completed
              ? `0 0 16px ${timelineTheme.green}66`
              : `0 0 16px ${timelineTheme.blue}55`,
          }}
        />
      </div>
    </div>
  )
})
