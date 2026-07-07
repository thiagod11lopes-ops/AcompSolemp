import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { DemoRouteProvider } from '@/contexts/DemoRouteContext'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { DemoModeBanner } from '@/components/gestor/DemoModeBanner'
import { getDemoHomeRouteForPerfil } from '@/utils/perfilEtapa'
import { portalPathFromDemo } from '@/utils/portalPaths'

const PORTAL_ROUTE_PREFIX: Record<string, string> = {
  clinica: '/clinica',
  ordenador: '/ordenador',
  financeiro: '/financeiro',
}

export function GestorDemoShell() {
  const { gestorUser, demoMode, isLoading } = useAuth()
  const location = useLocation()

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
    return <Navigate to={getDemoHomeRouteForPerfil(demoMode.authUser.perfil)} replace />
  }

  return (
    <DemoRouteProvider enabled>
      <DemoModeBanner />
      <Outlet />
    </DemoRouteProvider>
  )
}
