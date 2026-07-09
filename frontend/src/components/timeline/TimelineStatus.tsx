import { memo } from 'react'
import { motion } from 'framer-motion'
import {
  CircleAlert,
  CircleCheck,
  Clock3,
  Loader2,
} from 'lucide-react'
import type { TimelineNodeStatus } from './types'
import { timelineTheme } from './theme'

const STATUS_CONFIG: Record<
  TimelineNodeStatus,
  { label: string; bg: string; color: string; Icon: typeof CircleCheck }
> = {
  completed: {
    label: 'Concluído',
    bg: 'rgba(34,197,94,0.15)',
    color: timelineTheme.green,
    Icon: CircleCheck,
  },
  active: {
    label: 'Em andamento',
    bg: 'rgba(59,130,246,0.15)',
    color: timelineTheme.blue,
    Icon: Loader2,
  },
  waiting: {
    label: 'Aguardando',
    bg: 'rgba(148,163,184,0.12)',
    color: timelineTheme.textSecondary,
    Icon: Clock3,
  },
  error: {
    label: 'Rejeitado',
    bg: 'rgba(239,68,68,0.15)',
    color: timelineTheme.red,
    Icon: CircleAlert,
  },
  review: {
    label: 'Revisão',
    bg: 'rgba(139,92,246,0.15)',
    color: timelineTheme.purple,
    Icon: CircleAlert,
  },
}

interface TimelineStatusProps {
  status: TimelineNodeStatus
  compact?: boolean
}

export const TimelineStatus = memo(function TimelineStatus({
  status,
  compact = false,
}: TimelineStatusProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.Icon

  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: compact ? '4px 10px' : '6px 12px',
        borderRadius: 999,
        background: config.bg,
        color: config.color,
        fontSize: compact ? '0.7rem' : '0.75rem',
        fontWeight: 600,
        border: `1px solid ${config.color}33`,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon
        size={compact ? 12 : 14}
        className={status === 'active' ? 'tl-spin' : undefined}
      />
      {config.label}
    </motion.span>
  )
})
