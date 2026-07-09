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

function resolveCorridorX(container: HTMLElement, bounds: DOMRect): number {
  const columns = container.querySelectorAll('.timeline-flow-lane-column')
  if (columns.length >= 2) {
    const left = columns[0].getBoundingClientRect()
    const right = columns[columns.length - 1].getBoundingClientRect()
    return (left.right + right.left) / 2 - bounds.left
  }

  const grid = container.querySelector('.timeline-flow-parallel-grid')
  if (grid) {
    const gridBounds = grid.getBoundingClientRect()
    return gridBounds.left + gridBounds.width / 2 - bounds.left
  }

  return bounds.width / 2
}

function buildOrthogonalPath(
  clinicCx: number,
  clinicBottom: number,
  corridorX: number,
  imhCx: number,
  imhTop: number,
): PathPoint[] {
  const points: PathPoint[] = [{ x: clinicCx, y: clinicBottom }]

  if (Math.abs(clinicCx - corridorX) > 2) {
    points.push({ x: corridorX, y: clinicBottom })
  }

  points.push({ x: corridorX, y: imhTop })

  if (Math.abs(corridorX - imhCx) > 2) {
    points.push({ x: imhCx, y: imhTop })
  }

  return points
}

function pointsToPolyline(points: PathPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
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

      const clinicCx = clinic.left + clinic.width / 2 - bounds.left
      const clinicBottom = clinic.bottom - bounds.top
      const imhCx = imh.left + imh.width / 2 - bounds.left
      const imhTop = imh.top - bounds.top
      const corridorX = resolveCorridorX(container, bounds)

      setPathPoints(
        buildOrthogonalPath(clinicCx, clinicBottom, corridorX, imhCx, imhTop),
      )
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
