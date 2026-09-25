import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { canAccessGestorRoute, canAccessOrdenadorRoute, canAccessFinanceiroRoute } from '@/utils/permissions'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useSupabaseDataSource } from '@/config/dataSource'
import { syncRemoteDataWhenAuthenticated } from '@/data/initDataLayer'
import { authService } from '@/services/authService'
import { getHomeRouteForPerfil } from '@/utils/perfilEtapa'
import { userHasPerfil, userTemCadeiaSolemp } from '@/utils/userPerfis'

export function GestorProtectedRoute({ children }: { children: ReactNode }) {
  const { gestorUser, isLoading } = useAuth()
  const location = useLocation()
  const isSupabase = useSupabaseDataSource()
  const isDemoRoute = location.pathname.startsWith('/gestor/demo')
  const user = gestorUser ?? authService.getGestorUser()

  useEffect(() => {
    if (!isSupabase || !user || isDemoRoute) return
    void syncRemoteDataWhenAuthenticated()
  }, [isSupabase, user, isDemoRoute])

  if (isLoading) return <LoadingSpinner />

  if (!user || !canAccessGestorRoute(user.perfil)) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export function ClinicaProtectedRoute({ children }: { children: ReactNode }) {
  const { clinicaUser, demoMode, isLoading, impersonationTargetEmail } = useAuth()
  const { isDemo } = usePortalPaths()
  const location = useLocation()

  const user =
    (isDemo && demoMode?.portal === 'clinica' ? demoMode.authUser : null) ??
    clinicaUser ??
    authService.getClinicaUser()

  if (isLoading) return <LoadingSpinner />

  if (!user || (user.perfil !== 'CLINICA' && user.perfil !== 'MEDICAMENTO' && user.perfil !== 'EMPENHADO')) {
    if (impersonationTargetEmail || authService.getImpersonation()) {
      const fallback =
        authService.getOrdenadorUser() ??
        authService.getFinanceiroUser() ??
        authService.getGestorUser()
      if (fallback) {
        return <Navigate to={getHomeRouteForPerfil(fallback.perfil)} replace />
      }
      return <LoadingSpinner />
    }
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export function OrdenadorProtectedRoute({ children }: { children: ReactNode }) {
  const { ordenadorUser, demoMode, isLoading, impersonationTargetEmail } = useAuth()
  const { isDemo } = usePortalPaths()
  const location = useLocation()

  const user =
    (isDemo &&
    demoMode &&
    (demoMode.portal === 'ordenador' ||
      (demoMode.portal === 'financeiro' && userTemCadeiaSolemp(demoMode.authUser)))
      ? demoMode.portal === 'financeiro'
        ? { ...demoMode.authUser, perfil: 'CONFECCAO_SOLEMP' as const }
        : demoMode.authUser
      : null) ??
    ordenadorUser ??
    authService.getOrdenadorUser()

  if (isLoading) return <LoadingSpinner />

  if (
    !user ||
    !(
      canAccessOrdenadorRoute(user.perfil) ||
      userHasPerfil(user, 'CONFECCAO_SOLEMP') ||
      userHasPerfil(user, 'AUDITORIA') ||
      userHasPerfil(user, 'CONTABILIDADE_IMH') ||
      userHasPerfil(user, 'ASSINANTE')
    )
  ) {
    if (impersonationTargetEmail || authService.getImpersonation()) {
      const fallback =
        authService.getClinicaUser() ??
        authService.getFinanceiroUser() ??
        authService.getGestorUser()
      if (fallback) {
        return <Navigate to={getHomeRouteForPerfil(fallback.perfil)} replace />
      }
      return <LoadingSpinner />
    }
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export function FinanceiroProtectedRoute({ children }: { children: ReactNode }) {
  const { financeiroUser, ordenadorUser, demoMode, isLoading, impersonationTargetEmail } = useAuth()
  const { isDemo } = usePortalPaths()
  const location = useLocation()

  const user = isDemo
    ? demoMode &&
      (demoMode.portal === 'financeiro' ||
        (demoMode.portal === 'ordenador' && userTemCadeiaSolemp(demoMode.authUser)))
      ? demoMode.portal === 'ordenador'
        ? { ...demoMode.authUser, perfil: 'FINANCEIRO' as const }
        : demoMode.authUser
      : null
    : financeiroUser ??
      (ordenadorUser && userTemCadeiaSolemp(ordenadorUser)
        ? { ...ordenadorUser, perfil: 'FINANCEIRO' as const }
        : null) ??
      authService.getFinanceiroUser() ??
      (() => {
        const ord = authService.getOrdenadorUser()
        return ord && userTemCadeiaSolemp(ord) ? { ...ord, perfil: 'FINANCEIRO' as const } : null
      })()

  if (isLoading) return <LoadingSpinner />

  if (!user || !(canAccessFinanceiroRoute(user.perfil) || userHasPerfil(user, 'FINANCEIRO'))) {
    if (impersonationTargetEmail || authService.getImpersonation()) {
      const fallback =
        authService.getClinicaUser() ??
        authService.getOrdenadorUser() ??
        authService.getGestorUser()
      if (fallback) {
        return <Navigate to={getHomeRouteForPerfil(fallback.perfil)} replace />
      }
      return <LoadingSpinner />
    }
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { gestorUser, clinicaUser, ordenadorUser, financeiroUser, isLoading } = useAuth()

  if (isLoading) return <LoadingSpinner />

  // Login unificado: qualquer sessão ativa volta para o portal correspondente
  if (gestorUser && canAccessGestorRoute(gestorUser.perfil)) {
    return <Navigate to="/gestor/dashboard" replace />
  }
  if (
    clinicaUser &&
    (clinicaUser.perfil === 'CLINICA' ||
      clinicaUser.perfil === 'MEDICAMENTO' ||
      clinicaUser.perfil === 'EMPENHADO')
  ) {
    return <Navigate to="/clinica/timelines" replace />
  }
  if (
    ordenadorUser &&
    (canAccessOrdenadorRoute(ordenadorUser.perfil) ||
      userHasPerfil(ordenadorUser, 'CONFECCAO_SOLEMP') ||
      userHasPerfil(ordenadorUser, 'AUDITORIA') ||
      userHasPerfil(ordenadorUser, 'CONTABILIDADE_IMH'))
  ) {
    return <Navigate to="/ordenador/timelines" replace />
  }
  if (financeiroUser && (canAccessFinanceiroRoute(financeiroUser.perfil) || userHasPerfil(financeiroUser, 'FINANCEIRO'))) {
    return <Navigate to="/financeiro/pagamentos" replace />
  }

  return <>{children}</>
}
