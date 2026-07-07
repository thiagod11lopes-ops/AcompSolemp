export const DEMO_ROUTE_BASE = '/gestor/demo'

const PORTAL_PREFIXES = ['/clinica', '/ordenador', '/financeiro'] as const

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
