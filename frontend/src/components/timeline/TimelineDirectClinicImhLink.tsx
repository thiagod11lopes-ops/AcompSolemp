import { memo, useLayoutEffect, useState, type RefObject } from 'react'
import type { PedidoComDetalhes, PedidoPlanilhaEnvioState, WorkflowEtapa } from '@/types'
import type { TimelineEdgeState } from './types'
import { isTraveledEdgeState, TIMELINE_EDGE_COLORS } from './timelineEdgeColors'
import { resolvePlanilhaEdgeState } from './timelinePlanilhaPath'

interface PathPoint {
  x: number
  y: number
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

/** Ligação clínica → IMH no fluxo horizontal (esquerda → direita). */
function buildHorizontalPath(
  clinicRight: number,
  clinicCy: number,
  imhLeft: number,
  imhCy: number,
): PathPoint[] {
  const midX = clinicRight + Math.max(16, (imhLeft - clinicRight) / 2)
  return [
    { x: clinicRight, y: clinicCy },
    { x: midX, y: clinicCy },
    { x: midX, y: imhCy },
    { x: imhLeft, y: imhCy },
  ]
}

function pointsToPolyline(points: PathPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

/** Rota futura: clínica → IMH sem passar pela auditoria. */
export const TimelineDirectClinicImhLink = memo(function TimelineDirectClinicImhLink({
  containerRef,
  clinicNodeId,
  imhNodeId,
  pedido,
  etapas,
  planilhaEnvio,
}: TimelineDirectClinicImhLinkProps) {
  const [pathPoints, setPathPoints] = useState<PathPoint[] | null>(null)
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
        setPathPoints(null)
        return
      }

      const bounds = container.getBoundingClientRect()
      const clinic = clinicEl.getBoundingClientRect()
      const imh = imhEl.getBoundingClientRect()

      if (clinic.width === 0 || imh.width === 0) {
        setPathPoints(null)
        return
      }

      const clinicRight = clinic.right - bounds.left
      const clinicCy = clinic.top + clinic.height / 2 - bounds.top
      const imhLeft = imh.left - bounds.left
      const imhCy = imh.top + imh.height / 2 - bounds.top

      setPathPoints(buildHorizontalPath(clinicRight, clinicCy, imhLeft, imhCy))
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

  if (!pathPoints?.length) return null

  const stroke = traveled ? TIMELINE_EDGE_COLORS[state] : '#94a3b8'
  const strokeOpacity = traveled ? 1 : 0.55

  return (
    <svg className="timeline-direct-clinic-imh" aria-hidden>
      <polyline
        points={pointsToPolyline(pathPoints)}
        fill="none"
        stroke={stroke}
        strokeOpacity={strokeOpacity}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={
          traveled
            ? 'timeline-direct-clinic-imh__line--traveled'
            : 'timeline-direct-clinic-imh__line--muted'
        }
      />
    </svg>
  )
})
