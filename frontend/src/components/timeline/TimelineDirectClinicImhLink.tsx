import { memo, useLayoutEffect, useState, type RefObject } from 'react'
import type { PedidoComDetalhes, PedidoPlanilhaEnvioState, WorkflowEtapa } from '@/types'
import type { TimelineEdgeState } from './types'
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
  clinicNodeId: string
  imhNodeId: string
  pedido: PedidoComDetalhes
  etapas: WorkflowEtapa[]
  planilhaEnvio?: PedidoPlanilhaEnvioState | null
}

function findAnchor(
  container: HTMLElement,
  nodeId: string,
  anchor: string,
): Element | null {
  return (
    container.querySelector(`[data-timeline-node-id="${nodeId}"]`) ??
    container.querySelector(`[data-timeline-anchor="${anchor}"]`)
  )
}

/** Rota futura: clínica → Contabilidade/IMH sem passar pela auditoria. */
export const TimelineDirectClinicImhLink = memo(function TimelineDirectClinicImhLink({
  containerRef,
  clinicNodeId,
  imhNodeId,
  pedido,
  etapas,
  planilhaEnvio,
}: TimelineDirectClinicImhLinkProps) {
  const [coords, setCoords] = useState<LineCoords | null>(null)
  const state: TimelineEdgeState = resolvePlanilhaEdgeState(
    'SOLICITACAO',
    'DIV_MAT_CONTABILIDADE_IMH',
    pedido,
    etapas,
    planilhaEnvio,
  )
  const traveled = isTraveledEdgeState(state)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    let rafId = 0

    const measure = () => {
      const clinicEl = findAnchor(container, clinicNodeId, 'clinic')
      const imhEl = findAnchor(container, imhNodeId, 'contabilidade-imh')
      if (!clinicEl || !imhEl) {
        setCoords(null)
        return
      }

      const bounds = container.getBoundingClientRect()
      const clinic = clinicEl.getBoundingClientRect()
      const imh = imhEl.getBoundingClientRect()

      if (clinic.width === 0 || imh.width === 0) {
        setCoords(null)
        return
      }

      setCoords({
        x1: clinic.left + clinic.width / 2 - bounds.left,
        y1: clinic.bottom - bounds.top,
        x2: imh.left + imh.width / 2 - bounds.left,
        y2: imh.top - bounds.top,
      })
    }

    const scheduleMeasure = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        requestAnimationFrame(measure)
      })
    }

    scheduleMeasure()

    const resizeObserver = new ResizeObserver(scheduleMeasure)
    resizeObserver.observe(container)

    const mutationObserver = new MutationObserver(scheduleMeasure)
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-timeline-anchor', 'data-timeline-node-id', 'class', 'style'],
    })

    window.addEventListener('resize', scheduleMeasure)

    return () => {
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
    }
  }, [containerRef, clinicNodeId, imhNodeId, pedido.id, state])

  if (!coords) return null

  const stroke = traveled ? TIMELINE_EDGE_COLORS[state] : '#94a3b8'
  const strokeOpacity = traveled ? 1 : 0.55

  return (
    <svg className="timeline-direct-clinic-imh" aria-hidden>
      <line
        x1={coords.x1}
        y1={coords.y1}
        x2={coords.x2}
        y2={coords.y2}
        stroke={stroke}
        strokeOpacity={strokeOpacity}
        strokeWidth={3}
        strokeLinecap="round"
        className={
          traveled
            ? 'timeline-direct-clinic-imh__line--traveled'
            : 'timeline-direct-clinic-imh__line--muted'
        }
      />
    </svg>
  )
})
