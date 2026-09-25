import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import type { AuthUser, LoginCredentials, UserRole } from '@/types'
import type { Portal } from '@/utils/portal'
import { authService, type DemoModeState, type TimelineLoginResult } from '@/services/authService'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { userTemCadeiaSolemp } from '@/utils/userPerfis'

interface AuthContextValue {
  gestorUser: AuthUser | null
  clinicaUser: AuthUser | null
  ordenadorUser: AuthUser | null
  financeiroUser: AuthUser | null
  demoMode: DemoModeState | null
  isLoading: boolean
  login: (credentials: LoginCredentials, portal: Portal) => Promise<AuthUser>
  loginGestorSemSenha: () => Promise<AuthUser>
  registerGestor: (credentials: LoginCredentials) => Promise<AuthUser>
  loginWithEmailTimeline: (
    email: string,
    password?: string,
    expectedPerfil?: UserRole,
  ) => Promise<TimelineLoginResult>
  registerWithEmailTimeline: (
    email: string,
    password: string,
    expectedPerfil?: UserRole,
  ) => Promise<TimelineLoginResult>
  logout: (portal: Portal) => Promise<void>
  startDemo: (userId: string, tabTitle?: string) => Promise<{ route: string }>
  startDemoGestorOverview: (tabTitle?: string) => Promise<{ route: string }>
  endDemo: () => Promise<void>
  startImpersonation: (email: string) => Promise<{ route: string }>
  endImpersonation: () => Promise<{ route: string }>
  impersonationTargetEmail: string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

function applyTimelineLogin(
  setters: {
    setClinicaUser: (user: AuthUser | null) => void
    setOrdenadorUser: (user: AuthUser | null) => void
    setFinanceiroUser: (user: AuthUser | null) => void
  },
  result: TimelineLoginResult,
): void {
  const cadeia = userTemCadeiaSolemp(result.authUser)
  setters.setClinicaUser(result.portal === 'clinica' ? result.authUser : null)

  if (cadeia && (result.portal === 'ordenador' || result.portal === 'financeiro')) {
    setters.setOrdenadorUser({ ...result.authUser, perfil: 'CONFECCAO_SOLEMP' })
    setters.setFinanceiroUser({ ...result.authUser, perfil: 'FINANCEIRO' })
    return
  }

  setters.setOrdenadorUser(result.portal === 'ordenador' ? result.authUser : null)
  setters.setFinanceiroUser(result.portal === 'financeiro' ? result.authUser : null)
}

function syncPortalUsersFromService(
  setters: {
    setClinicaUser: (user: AuthUser | null) => void
    setOrdenadorUser: (user: AuthUser | null) => void
    setFinanceiroUser: (user: AuthUser | null) => void
  },
): void {
  setters.setClinicaUser(authService.getClinicaUser())
  setters.setOrdenadorUser(authService.getOrdenadorUser())
  setters.setFinanceiroUser(authService.getFinanceiroUser())
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [gestorUser, setGestorUser] = useState<AuthUser | null>(null)
  const [clinicaUser, setClinicaUser] = useState<AuthUser | null>(null)
  const [ordenadorUser, setOrdenadorUser] = useState<AuthUser | null>(null)
  const [financeiroUser, setFinanceiroUser] = useState<AuthUser | null>(null)
  const [demoMode, setDemoMode] = useState<DemoModeState | null>(null)
  const [impersonationTargetEmail, setImpersonationTargetEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setGestorUser(authService.getGestorUser())
    syncPortalUsersFromService({ setClinicaUser, setOrdenadorUser, setFinanceiroUser })
    setDemoMode(authService.getDemoMode())
    setImpersonationTargetEmail(authService.getImpersonation()?.targetEmail ?? null)
    setIsLoading(false)
  }, [])

  const login = useCallback(async (credentials: LoginCredentials, portal: Portal) => {
    const authUser = await authService.login(credentials, portal)
    if (portal === 'gestor') setGestorUser(authUser)
    else if (portal === 'clinica') setClinicaUser(authUser)
    else if (portal === 'ordenador' || portal === 'financeiro') {
      if (userTemCadeiaSolemp(authUser)) {
        setOrdenadorUser({ ...authUser, perfil: 'CONFECCAO_SOLEMP' })
        setFinanceiroUser({ ...authUser, perfil: 'FINANCEIRO' })
      } else if (portal === 'ordenador') {
        setOrdenadorUser(authUser)
      } else {
        setFinanceiroUser(authUser)
      }
    }
    return authUser
  }, [])

  const loginGestorSemSenha = useCallback(async () => {
    const authUser = await authService.loginGestorSemSenha()
    setGestorUser(authUser)
    return authUser
  }, [])

  const registerGestor = useCallback(async (credentials: LoginCredentials) => {
    if (!authService.usesSupabaseAuth()) {
      throw new Error('O cadastro está disponível apenas com autenticação em nuvem (Supabase).')
    }
    const authUser = await authService.registerGestorSupabase(credentials)
    setGestorUser(authUser)
    return authUser
  }, [])

  const loginWithEmailTimeline = useCallback(
    async (email: string, password?: string, expectedPerfil?: UserRole) => {
      const result = await authService.loginWithEmailTimeline(email, password, expectedPerfil)
      applyTimelineLogin({ setClinicaUser, setOrdenadorUser, setFinanceiroUser }, result)
      return result
    },
    [],
  )

  const registerWithEmailTimeline = useCallback(
    async (email: string, password: string, expectedPerfil?: UserRole) => {
      const result = await authService.registerWithEmailTimeline(email, password, expectedPerfil)
      applyTimelineLogin({ setClinicaUser, setOrdenadorUser, setFinanceiroUser }, result)
      return result
    },
    [],
  )

  const logout = useCallback(async (portal: Portal) => {
    const current =
      portal === 'gestor'
        ? gestorUser
        : portal === 'clinica'
          ? clinicaUser
          : portal === 'ordenador'
            ? ordenadorUser
            : financeiroUser
    const wasImpersonating = Boolean(impersonationTargetEmail)
    await authService.logout(portal)
    if (wasImpersonating) {
      setImpersonationTargetEmail(null)
      setGestorUser(null)
      setClinicaUser(null)
      setOrdenadorUser(null)
      setFinanceiroUser(null)
      setDemoMode(null)
      return
    }
    if (portal === 'gestor') setGestorUser(null)
    else if (portal === 'clinica') setClinicaUser(null)
    else if (portal === 'ordenador' || portal === 'financeiro') {
      if (current && userTemCadeiaSolemp(current)) {
        setOrdenadorUser(null)
        setFinanceiroUser(null)
      } else if (portal === 'ordenador') {
        setOrdenadorUser(null)
      } else {
        setFinanceiroUser(null)
      }
    }
  }, [gestorUser, clinicaUser, ordenadorUser, financeiroUser, impersonationTargetEmail])

  const startDemo = useCallback(async (userId: string, tabTitle?: string) => {
    const result = await authService.startDemoMode(userId, tabTitle)
    setDemoMode({ portal: result.portal, authUser: result.authUser, tabTitle: result.tabTitle })
    return { route: result.route }
  }, [])

  const startDemoGestorOverview = useCallback(async (tabTitle?: string) => {
    const result = await authService.startDemoGestorOverview(tabTitle)
    setDemoMode({ portal: result.portal, authUser: result.authUser, tabTitle: result.tabTitle })
    return { route: result.route }
  }, [])

  const endDemo = useCallback(async () => {
    await authService.endDemoMode()
    setDemoMode(null)
  }, [])

  const startImpersonation = useCallback(async (email: string) => {
    const result = await authService.startImpersonation(email)
    flushSync(() => {
      setImpersonationTargetEmail(result.authUser.email?.trim().toLowerCase() ?? email)
      setDemoMode(null)
      if (result.portal === 'gestor') {
        setGestorUser(result.authUser)
        setClinicaUser(null)
        setOrdenadorUser(null)
        setFinanceiroUser(null)
      } else {
        setGestorUser(null)
        applyTimelineLogin({ setClinicaUser, setOrdenadorUser, setFinanceiroUser }, result)
      }
    })
    return { route: result.route }
  }, [])

  const endImpersonation = useCallback(async () => {
    const result = await authService.endImpersonation()
    setImpersonationTargetEmail(null)
    setClinicaUser(null)
    setOrdenadorUser(null)
    setFinanceiroUser(null)
    setGestorUser(authService.getGestorUser())
    return result
  }, [])

  const value = useMemo(
    () => ({
      gestorUser,
      clinicaUser,
      ordenadorUser,
      financeiroUser,
      demoMode,
      isLoading,
      login,
      loginGestorSemSenha,
      registerGestor,
      loginWithEmailTimeline,
      registerWithEmailTimeline,
      logout,
      startDemo,
      startDemoGestorOverview,
      endDemo,
      startImpersonation,
      endImpersonation,
      impersonationTargetEmail,
    }),
    [
      gestorUser,
      clinicaUser,
      ordenadorUser,
      financeiroUser,
      demoMode,
      isLoading,
      login,
      loginGestorSemSenha,
      registerGestor,
      loginWithEmailTimeline,
      registerWithEmailTimeline,
      logout,
      startDemo,
      startDemoGestorOverview,
      endDemo,
      startImpersonation,
      endImpersonation,
      impersonationTargetEmail,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function useGestorAuth() {
  const { gestorUser, isLoading, login, loginGestorSemSenha, registerGestor, logout } = useAuth()
  return {
    user: gestorUser,
    isLoading,
    login: (credentials: LoginCredentials) => login(credentials, 'gestor'),
    loginSemSenha: loginGestorSemSenha,
    register: (credentials: LoginCredentials) => registerGestor(credentials),
    logout: () => logout('gestor'),
  }
}

export function useClinicaAuth() {
  const { clinicaUser, demoMode, isLoading, logout, endDemo } = useAuth()
  const { isDemo } = usePortalPaths()
  const user = isDemo && demoMode?.portal === 'clinica' ? demoMode.authUser : clinicaUser
  return {
    user,
    isLoading,
    isDemo,
    logout: isDemo
      ? async () => {
          await endDemo()
        }
      : () => logout('clinica'),
  }
}

export function useOrdenadorAuth() {
  const { ordenadorUser, demoMode, isLoading, logout, endDemo } = useAuth()
  const { isDemo } = usePortalPaths()
  const user =
    isDemo &&
    demoMode &&
    (demoMode.portal === 'ordenador' ||
      (demoMode.portal === 'financeiro' && userTemCadeiaSolemp(demoMode.authUser)))
      ? demoMode.portal === 'financeiro'
        ? { ...demoMode.authUser, perfil: 'CONFECCAO_SOLEMP' as const }
        : demoMode.authUser
      : ordenadorUser
  return {
    user,
    isLoading,
    isDemo,
    logout: isDemo
      ? async () => {
          await endDemo()
        }
      : () => logout('ordenador'),
  }
}

export function useFinanceiroAuth() {
  const { financeiroUser, demoMode, isLoading, logout, endDemo } = useAuth()
  const { isDemo } = usePortalPaths()
  const user =
    isDemo &&
    demoMode &&
    (demoMode.portal === 'financeiro' ||
      (demoMode.portal === 'ordenador' && userTemCadeiaSolemp(demoMode.authUser)))
      ? demoMode.portal === 'ordenador'
        ? { ...demoMode.authUser, perfil: 'FINANCEIRO' as const }
        : demoMode.authUser
      : financeiroUser
  return {
    user,
    isLoading,
    isDemo,
    logout: isDemo
      ? async () => {
          await endDemo()
        }
      : () => logout('financeiro'),
  }
}
