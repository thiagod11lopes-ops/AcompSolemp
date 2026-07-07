import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { DemoRouteProvider } from '@/contexts/DemoRouteContext'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { DemoModeBanner } from '@/components/gestor/DemoModeBanner'
import { CADASTRO_PERFIS } from '@/types/cadastroPerfis'
import { getHomeRouteForPerfil } from '@/utils/perfilEtapa'
import { DEFAULT_APP_TITLE, DEMO_ROUTE_BASE, mapPortalPath, portalPathFromDemo } from '@/utils/portalPaths'
import type { Portal } from '@/utils/portal'
import type { UserRole } from '@/types'

const PORTAL_ROUTE_PREFIX: Record<Portal, string> = {
  gestor: '/gestor',
  clinica: '/clinica',
  ordenador: '/ordenador',
  financeiro: '/financeiro',
}

function getDemoHomeRoute(portal: Portal, perfil: UserRole): string {
  if (portal === 'gestor') {
    return mapPortalPath('/gestor/timeline', DEMO_ROUTE_BASE)
  }
  return mapPortalPath(getHomeRouteForPerfil(perfil), DEMO_ROUTE_BASE)
}

function resolveDemoDocumentTitle(demoMode: NonNullable<ReturnType<typeof useAuth>['demoMode']>): string {
  if (demoMode.tabTitle) return demoMode.tabTitle

  const perfilLabel =
    CADASTRO_PERFIS.find((perfil) => perfil.perfil === demoMode.authUser.perfil)?.label ??
    demoMode.authUser.perfil

  return `${perfilLabel} — ${demoMode.authUser.nome} | ${DEFAULT_APP_TITLE}`
}

export function GestorDemoShell() {
  const { gestorUser, demoMode, isLoading } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (!demoMode) return
    const title = resolveDemoDocumentTitle(demoMode)
    document.title = title
    return () => {
      document.title = DEFAULT_APP_TITLE
    }
  }, [demoMode])

  if (isLoading) return <LoadingSpinner />

  if (!gestorUser) {
    return <Navigate to="/login" replace />
  }

  if (!demoMode) {
    return <Navigate to="/gestor/dashboard" replace />
  }

  const portalPath = portalPathFromDemo(location.pathname)
  const expectedPrefix = PORTAL_ROUTE_PREFIX[demoMode.portal]

  if (!portalPath?.startsWith(expectedPrefix)) {
    return <Navigate to={getDemoHomeRoute(demoMode.portal, demoMode.authUser.perfil)} replace />
  }

  return (
    <DemoRouteProvider enabled>
      <DemoModeBanner />
      <Outlet />
    </DemoRouteProvider>
  )
}
