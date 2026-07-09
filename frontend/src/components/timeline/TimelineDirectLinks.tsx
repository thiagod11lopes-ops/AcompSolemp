import { memo, useLayoutEffect, useState, type RefObject } from 'react'
import type { TimelineEdgeState } from './types'
import { isTraveledEdgeState, TIMELINE_EDGE_COLORS } from './timelineEdgeColors'

interface DirectLinkDef {
  id: string
  fromAnchor: string
  toAnchor: string
  state: TimelineEdgeState
  /** Linha opaca sólida quando ainda não houve envio (sem laranja). */
  mutedWhenWaiting?: boolean
}

interface LineCoords {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  state: TimelineEdgeState
  mutedWhenWaiting: boolean
}

interface TimelineDirectLinksProps {
  containerRef: RefObject<HTMLDivElement | null>
  links: DirectLinkDef[]
}

export const TimelineDirectLinks = memo(function TimelineDirectLinks({
  containerRef,
  links,
}: TimelineDirectLinksProps) {
  const [lines, setLines] = useState<LineCoords[]>([])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || links.length === 0) return

    const measure = () => {
      const bounds = container.getBoundingClientRect()
      const next: LineCoords[] = []

      for (const link of links) {
        const fromEl = container.querySelector(`[data-timeline-anchor="${link.fromAnchor}"]`)
        const toEl = container.querySelector(`[data-timeline-anchor="${link.toAnchor}"]`)
        if (!fromEl || !toEl) continue

        const from = fromEl.getBoundingClientRect()
        const to = toEl.getBoundingClientRect()

        next.push({
          id: link.id,
          x1: from.left + from.width / 2 - bounds.left,
          y1: from.bottom - bounds.top,
          x2: to.left + to.width / 2 - bounds.left,
          y2: to.top - bounds.top,
          state: link.state,
          mutedWhenWaiting: link.mutedWhenWaiting ?? true,
        })
      }

      setLines(next)
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(container)
    window.addEventListener('resize', measure)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [containerRef, links.map((link) => `${link.id}:${link.state}`).join('|')])

  if (lines.length === 0) return null

  return (
    <svg
      className="timeline-direct-links"
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'visible',
      }}
    >
      {lines.map((line) => {
        const traveled = isTraveledEdgeState(line.state)
        const muted = !traveled && line.mutedWhenWaiting
        const color = traveled ? TIMELINE_EDGE_COLORS[line.state] : TIMELINE_EDGE_COLORS.waiting
        const className = [
          traveled ? 'timeline-direct-link__line--traveled' : '',
          muted ? 'timeline-direct-link__line--muted' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <line
            key={line.id}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={!traveled && !muted ? '8 6' : undefined}
            className={className || undefined}
          />
        )
      })}
    </svg>
  )
})
