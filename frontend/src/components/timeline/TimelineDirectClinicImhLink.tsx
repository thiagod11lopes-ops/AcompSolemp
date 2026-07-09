import { memo, useLayoutEffect, useState, type RefObject } from 'react'
import type { PedidoComDetalhes, PedidoPlanilhaEnvioState, WorkflowEtapa } from '@/types'
import type { TimelineEdgeState, TimelineNodeData } from './types'
import { isTraveledEdgeState, TIMELINE_EDGE_COLORS } from './timelineEdgeColors'
import { resolvePlanilhaEdgeState } from './timelinePlanilhaPath'

interface LineCoords {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface TimelineDirectClinicImhLinkProps {
  containerRef: RefObject<HTMLDivElement | null>
  clinicNode: TimelineNodeData
  contabilidadeNode: TimelineNodeData
  pedido: PedidoComDetalhes
  etapas: WorkflowEtapa[]
  planilhaEnvio?: PedidoPlanilhaEnvioState | null
}

export const TimelineDirectClinicImhLink = memo(function TimelineDirectClinicImhLink({
  containerRef,
  clinicNode,
  contabilidadeNode,
  pedido,
  etapas,
  planilhaEnvio,
}: TimelineDirectClinicImhLinkProps) {
  const [coords, setCoords] = useState<LineCoords | null>(null)
  const state: TimelineEdgeState = resolvePlanilhaEdgeState(
    clinicNode.etapa.chave,
    contabilidadeNode.etapa.chave,
    pedido,
    etapas,
    planilhaEnvio,
  )
  const traveled = isTraveledEdgeState(state)
  const color = TIMELINE_EDGE_COLORS[state]

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const measure = () => {
      const clinicEl = container.querySelector('[data-timeline-anchor="clinic"]')
      const imhEl = container.querySelector('[data-timeline-anchor="contabilidade-imh"]')
      if (!clinicEl || !imhEl) {
        setCoords(null)
        return
      }

      const bounds = container.getBoundingClientRect()
      const clinic = clinicEl.getBoundingClientRect()
      const imh = imhEl.getBoundingClientRect()

      setCoords({
        x1: clinic.left + clinic.width / 2 - bounds.left,
        y1: clinic.bottom - bounds.top,
        x2: imh.left + imh.width / 2 - bounds.left,
        y2: imh.top - bounds.top,
      })
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(container)
    window.addEventListener('resize', measure)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [containerRef, clinicNode.id, contabilidadeNode.id])

  if (!coords) return null

  return (
    <svg
      className="timeline-direct-clinic-imh"
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
      <line
        x1={coords.x1}
        y1={coords.y1}
        x2={coords.x2}
        y2={coords.y2}
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={traveled ? undefined : '8 6'}
        className={traveled ? 'timeline-direct-clinic-imh__line--traveled' : undefined}
      />
    </svg>
  )
})
