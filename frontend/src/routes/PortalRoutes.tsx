import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { canAccessGestorRoute, canAccessOrdenadorRoute, canAccessFinanceiroRoute } from '@/utils/permissions'
import type { Portal } from '@/utils/portal'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export function GestorProtectedRoute({ children }: { children: ReactNode }) {
  const { gestorUser, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingSpinner />

  if (!gestorUser || !canAccessGestorRoute(gestorUser.perfil)) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export function ClinicaProtectedRoute({ children }: { children: ReactNode }) {
  const { clinicaUser, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingSpinner />

  if (!clinicaUser || clinicaUser.perfil !== 'CLINICA') {
    return <Navigate to="/clinica/timeline" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export function OrdenadorProtectedRoute({ children }: { children: ReactNode }) {
  const { ordenadorUser, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingSpinner />

  if (!ordenadorUser || !canAccessOrdenadorRoute(ordenadorUser.perfil)) {
    return <Navigate to="/clinica/timeline" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export function FinanceiroProtectedRoute({ children }: { children: ReactNode }) {
  const { financeiroUser, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingSpinner />

  if (!financeiroUser || !canAccessFinanceiroRoute(financeiroUser.perfil)) {
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
    return <Navigate to="/clinica/timeline" replace />
  }

  if (portal === 'ordenador' && ordenadorUser && canAccessOrdenadorRoute(ordenadorUser.perfil)) {
    return <Navigate to="/ordenador/timelines" replace />
  }

  if (portal === 'financeiro' && financeiroUser && canAccessFinanceiroRoute(financeiroUser.perfil)) {
    return <Navigate to="/financeiro/pagamentos" replace />
  }

  return <>{children}</>
}
