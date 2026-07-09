import type { TimelineEdgeState, TimelineNodeData, TimelineSection } from './types'

export function isClinicNode(node: TimelineNodeData): boolean {
  return node.etapa.chave === 'SOLICITACAO'
}

export function isContabilidadeImhNode(node: TimelineNodeData): boolean {
  return node.etapa.chave === 'DIV_MAT_CONTABILIDADE_IMH'
}

export function getTimelineNodeAnchor(node: TimelineNodeData): string | undefined {
  if (isClinicNode(node)) return 'clinic'
  if (isContabilidadeImhNode(node)) return 'contabilidade-imh'
  return undefined
}

export function findContabilidadeImhNode(sections: TimelineSection[]): TimelineNodeData | null {
  for (const section of sections) {
    for (const lane of section.lanes) {
      for (const node of lane.nodes) {
        if (isContabilidadeImhNode(node)) return node
      }
    }
  }
  return null
}

export function isClinicSection(section: TimelineSection): boolean {
  const node = section.lanes[0]?.nodes[0]
  return section.lanes.length === 1 && section.lanes[0].nodes.length === 1 && Boolean(node && isClinicNode(node))
}

export function nodeNaoIniciada(node: TimelineNodeData): boolean {
  return node.status === 'waiting' && !node.historico
}

export function getSectionExitNodes(section: TimelineSection): TimelineNodeData[] {
  return section.lanes.map((lane) => lane.nodes[lane.nodes.length - 1]).filter(Boolean)
}

export function getSectionEntryNodes(section: TimelineSection): TimelineNodeData[] {
  return section.lanes.map((lane) => lane.nodes[0]).filter(Boolean)
}

export function resolveConnectorState(
  sourceNodes: TimelineNodeData[],
  targetNodes: TimelineNodeData[],
): TimelineEdgeState {
  if (sourceNodes.length === 0 || targetNodes.length === 0) return 'waiting'

  const sourceStarted = sourceNodes.some(
    (n) => n.status === 'completed' || n.status === 'active' || n.status === 'review' || n.status === 'error',
  )
  if (!sourceStarted) return 'waiting'

  if (targetNodes.some((n) => n.status === 'error')) return 'error'
  if (targetNodes.some((n) => n.status === 'active' || n.status === 'review')) return 'active'
  if (targetNodes.every((n) => n.status === 'completed')) return 'completed'
  if (targetNodes.some((n) => !nodeNaoIniciada(n))) return 'active'
  if (sourceNodes.every((n) => n.status === 'completed')) return 'completed'
  return 'waiting'
}

export function resolveBranchStates(
  sourceNode: TimelineNodeData,
  targetNodes: TimelineNodeData[],
): TimelineEdgeState[] {
  return targetNodes.map((target) => {
    if (sourceNode.status === 'error' || target.status === 'error') return 'error'
    if (nodeNaoIniciada(target)) return 'waiting'
    if (target.status === 'active' || target.status === 'review') return 'active'
    if (target.status === 'completed') return 'completed'
    if (target.historico) return 'active'
    if (sourceNode.status === 'completed') return 'completed'
    if (sourceNode.status === 'active' || sourceNode.status === 'review') return 'active'
    return 'waiting'
  })
}
