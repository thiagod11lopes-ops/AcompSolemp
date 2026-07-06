import type { ImhCabecalho, ImhLinha } from '@/utils/imhPlanilhaTemplate'

export type PlanilhaDraftType = 'imh' | 'material'

export interface PlanilhaDraft {
  cabecalho: ImhCabecalho
  linhas: ImhLinha[]
  rowIds: string[]
  savedAt: string
}

function draftKey(type: PlanilhaDraftType, rowIds: string[]): string {
  const ids = [...rowIds].sort().join(',')
  return `acompsolemp:planilha-draft:${type}:${ids}`
}

function sameRowIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((id, i) => id === sortedB[i])
}

export function loadPlanilhaDraft(
  type: PlanilhaDraftType,
  rowIds: string[],
): PlanilhaDraft | null {
  if (rowIds.length === 0) return null
  try {
    const raw = localStorage.getItem(draftKey(type, rowIds))
    if (!raw) return null
    const draft = JSON.parse(raw) as PlanilhaDraft
    if (!draft.cabecalho || !Array.isArray(draft.linhas) || !Array.isArray(draft.rowIds)) {
      return null
    }
    if (!sameRowIds(draft.rowIds, rowIds)) return null
    return draft
  } catch {
    return null
  }
}

export function savePlanilhaDraft(
  type: PlanilhaDraftType,
  rowIds: string[],
  cabecalho: ImhCabecalho,
  linhas: ImhLinha[],
): string {
  const savedAt = new Date().toISOString()
  const draft: PlanilhaDraft = { cabecalho, linhas, rowIds: [...rowIds].sort(), savedAt }
  localStorage.setItem(draftKey(type, rowIds), JSON.stringify(draft))
  return savedAt
}

export function clearPlanilhaDraft(type: PlanilhaDraftType, rowIds: string[]): void {
  if (rowIds.length === 0) return
  localStorage.removeItem(draftKey(type, rowIds))
}
