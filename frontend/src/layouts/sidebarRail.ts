import { useCallback, useSyncExternalStore } from 'react'

export const SIDEBAR_COLLAPSED_WIDTH = 72
export const SIDEBAR_EXPANDED_WIDTH_GESTOR = 260
export const SIDEBAR_EXPANDED_WIDTH_CLINICA = 260
export const SIDEBAR_EXPANDED_WIDTH_SETOR = 240

const STORAGE_KEY = 'acompopms.sidebar.collapsed'

function readCollapsed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return true
    return raw === '1' || raw === 'true'
  } catch {
    return true
  }
}

let collapsed = typeof window !== 'undefined' ? readCollapsed() : true
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return collapsed
}

function getServerSnapshot() {
  return true
}

export function setSidebarCollapsed(next: boolean) {
  if (collapsed === next) return
  collapsed = next
  try {
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
  } catch {
    /* ignore quota / private mode */
  }
  emit()
}

export function toggleSidebarCollapsed() {
  setSidebarCollapsed(!collapsed)
}

/** Largura atual do rail (recolhido = só ícones). */
export function sidebarWidthFor(expandedWidth: number, isCollapsed: boolean) {
  return isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : expandedWidth
}

/** Estado global do menu lateral (sincronizado entre layout, sidebar e topbar). */
export function useSidebarRail(expandedWidth: number) {
  const isCollapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const toggle = useCallback(() => {
    toggleSidebarCollapsed()
  }, [])
  const width = sidebarWidthFor(expandedWidth, isCollapsed)
  return { collapsed: isCollapsed, toggle, width, expandedWidth }
}
