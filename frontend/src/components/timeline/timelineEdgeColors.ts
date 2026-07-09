import type { TimelineEdgeState } from './types'
import { timelineTheme } from './theme'

/** Cor dos conectores — laranja indica caminho já percorrido ou em andamento. */
export const TIMELINE_EDGE_COLORS: Record<TimelineEdgeState, string> = {
  completed: timelineTheme.orange,
  active: timelineTheme.orange,
  waiting: timelineTheme.line,
  error: timelineTheme.red,
}

export function isTraveledEdgeState(state: TimelineEdgeState): boolean {
  return state === 'completed' || state === 'active'
}
