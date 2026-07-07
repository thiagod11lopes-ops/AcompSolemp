export const DEMO_ROUTE_BASE = '/gestor/demo'
export const DEFAULT_APP_TITLE = 'AcompSolemp'

const PORTAL_PREFIXES = ['/clinica', '/ordenador', '/financeiro'] as const

export function buildAbsoluteAppUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '') || ''
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${window.location.origin}${base}${normalizedPath}`
}

export function buildDemoEnterUrl(userId: string, titulo: string): string {
  const params = new URLSearchParams({ userId, titulo })
  return buildAbsoluteAppUrl(`/gestor/demo/entrar?${params.toString()}`)
}

export function exitDemoTab(endDemo: () => void, onFallback: () => void): void {
  endDemo()
  if (window.opener) {
    window.close()
    return
  }
  onFallback()
}

export function stripDemoRouteBase(pathname: string): string {
  if (pathname.startsWith(DEMO_ROUTE_BASE)) {
    const stripped = pathname.slice(DEMO_ROUTE_BASE.length)
    return stripped || '/'
  }
  return pathname
}

export function mapPortalPath(path: string, demoBase: string | null): string {
  if (!demoBase) return path
  for (const prefix of PORTAL_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return `${demoBase}${path}`
    }
  }
  return path
}

export function portalPathFromDemo(pathname: string): string | null {
  if (!pathname.startsWith(DEMO_ROUTE_BASE)) return null
  const rest = pathname.slice(DEMO_ROUTE_BASE.length)
  for (const prefix of PORTAL_PREFIXES) {
    if (rest === prefix || rest.startsWith(`${prefix}/`)) {
      return rest
    }
  }
  return null
}
