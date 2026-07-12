import { getAppRoutePath, isDemoRoutePath } from '@/utils/portalPaths'

/** Sessão de demonstração (/gestor/demo/*) — dados locais isolados */
export function isDemoDataSession(): boolean {
  if (typeof window === 'undefined') return false
  return isDemoRoutePath(getAppRoutePath())
}

export function getActiveDataSourceLabel(): string {
  if (isDemoDataSession()) return 'Demonstração (IndexedDB)'
  return 'Local (IndexedDB)'
}
