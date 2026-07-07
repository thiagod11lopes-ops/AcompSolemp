import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { canAccessGestorRoute, canAccessOrdenadorRoute, canAccessFinanceiroRoute } from '@/utils/permissions'
import type { Portal } from '@/utils/portal'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useFirebaseDataSource } from '@/config/dataSource'
import { syncRemoteDataWhenAuthenticated } from '@/data/initDataLayer'

export function GestorProtectedRoute({ children }: { children: ReactNode }) {
  const { gestorUser, isLoading } = useAuth()
  const location = useLocation()
  const isFirebase = useFirebaseDataSource()
  const isDemoRoute = location.pathname.startsWith('/gestor/demo')

  useEffect(() => {
    if (!isFirebase || !gestorUser || isDemoRoute) return
    void syncRemoteDataWhenAuthenticated()
  }, [isFirebase, gestorUser, isDemoRoute])

  if (isLoading) return <LoadingSpinner />

  if (!gestorUser || !canAccessGestorRoute(gestorUser.perfil)) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export function ClinicaProtectedRoute({ children }: { children: ReactNode }) {
  const { clinicaUser, demoMode, isLoading } = useAuth()
  const { isDemo } = usePortalPaths()
  const location = useLocation()

  const user = isDemo && demoMode?.portal === 'clinica' ? demoMode.authUser : clinicaUser

  if (isLoading) return <LoadingSpinner />

  if (!user || user.perfil !== 'CLINICA') {
    return <Navigate to="/clinica/timeline" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export function OrdenadorProtectedRoute({ children }: { children: ReactNode }) {
  const { ordenadorUser, demoMode, isLoading } = useAuth()
  const { isDemo } = usePortalPaths()
  const location = useLocation()

  const user = isDemo && demoMode?.portal === 'ordenador' ? demoMode.authUser : ordenadorUser

  if (isLoading) return <LoadingSpinner />

  if (!user || !canAccessOrdenadorRoute(user.perfil)) {
    return <Navigate to="/clinica/timeline" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export function FinanceiroProtectedRoute({ children }: { children: ReactNode }) {
  const { financeiroUser, demoMode, isLoading } = useAuth()
  const { isDemo } = usePortalPaths()
  const location = useLocation()

  const user = isDemo && demoMode?.portal === 'financeiro' ? demoMode.authUser : financeiroUser

  if (isLoading) return <LoadingSpinner />

  if (!user || !canAccessFinanceiroRoute(user.perfil)) {
    return <Navigate to="/clinica/timeline" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export function GuestRoute({
  children,
  portal,
}: {
  children: ReactNode
  portal: Portal
}) {
  const { gestorUser, clinicaUser, ordenadorUser, financeiroUser, isLoading } = useAuth()

  if (isLoading) return <LoadingSpinner />

  if (portal === 'gestor' && gestorUser && canAccessGestorRoute(gestorUser.perfil)) {
    return <Navigate to="/gestor/dashboard" replace />
  }

  if (portal === 'clinica' && clinicaUser && clinicaUser.perfil === 'CLINICA') {
    return <Navigate to="/clinica/timelines" replace />
  }

  if (portal === 'ordenador' && ordenadorUser && canAccessOrdenadorRoute(ordenadorUser.perfil)) {
    return <Navigate to="/ordenador/timelines" replace />
  }

  if (portal === 'financeiro' && financeiroUser && canAccessFinanceiroRoute(financeiroUser.perfil)) {
    return <Navigate to="/financeiro/pagamentos" replace />
  }

  return <>{children}</>
}
