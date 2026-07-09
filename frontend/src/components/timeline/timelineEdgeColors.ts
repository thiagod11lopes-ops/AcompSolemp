import type { TimelineEdgeState } from './types'
import { timelineTheme } from './theme'

/** Cor dos conectores — laranja apenas quando a planilha foi enviada entre os cards. */
export const TIMELINE_EDGE_COLORS: Record<TimelineEdgeState, string> = {
  completed: timelineTheme.orange,
  active: timelineTheme.line,
  waiting: timelineTheme.line,
  error: timelineTheme.red,
}

export function isTraveledEdgeState(state: TimelineEdgeState): boolean {
  return state === 'completed'
}
