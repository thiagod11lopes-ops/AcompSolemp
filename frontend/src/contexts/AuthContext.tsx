import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthUser, LoginCredentials } from '@/types'
import type { Portal } from '@/utils/portal'
import { authService, type TimelineLoginResult } from '@/services/authService'

interface AuthContextValue {
  gestorUser: AuthUser | null
  clinicaUser: AuthUser | null
  ordenadorUser: AuthUser | null
  financeiroUser: AuthUser | null
  isLoading: boolean
  requiresGoogleAuth: (portal: Portal) => boolean
  login: (credentials: LoginCredentials, portal: Portal) => Promise<AuthUser>
  loginWithGoogle: (portal: Portal) => Promise<AuthUser>
  loginWithGoogleTimeline: () => Promise<TimelineLoginResult>
  loginWithEmailTimeline: (email: string) => Promise<TimelineLoginResult>
  logout: (portal: Portal) => Promise<void>
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
  setters.setClinicaUser(result.portal === 'clinica' ? result.authUser : null)
  setters.setOrdenadorUser(result.portal === 'ordenador' ? result.authUser : null)
  setters.setFinanceiroUser(result.portal === 'financeiro' ? result.authUser : null)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [gestorUser, setGestorUser] = useState<AuthUser | null>(null)
  const [clinicaUser, setClinicaUser] = useState<AuthUser | null>(null)
  const [ordenadorUser, setOrdenadorUser] = useState<AuthUser | null>(null)
  const [financeiroUser, setFinanceiroUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setGestorUser(authService.getGestorUser())
    setClinicaUser(authService.getClinicaUser())
    setOrdenadorUser(authService.getOrdenadorUser())
    setFinanceiroUser(authService.getFinanceiroUser())
    setIsLoading(false)
  }, [])

  const login = useCallback(async (credentials: LoginCredentials, portal: Portal) => {
    const authUser = await authService.login(credentials, portal)
    if (portal === 'gestor') setGestorUser(authUser)
    else if (portal === 'clinica') setClinicaUser(authUser)
    else if (portal === 'ordenador') setOrdenadorUser(authUser)
    else setFinanceiroUser(authUser)
    return authUser
  }, [])

  const loginWithGoogle = useCallback(async (portal: Portal) => {
    const authUser = await authService.loginWithGoogle(portal)
    if (portal === 'gestor') setGestorUser(authUser)
    return authUser
  }, [])

  const loginWithGoogleTimeline = useCallback(async () => {
    const result = await authService.loginWithGoogleTimeline()
    applyTimelineLogin({ setClinicaUser, setOrdenadorUser, setFinanceiroUser }, result)
    return result
  }, [])

  const loginWithEmailTimeline = useCallback(async (email: string) => {
    const result = await authService.loginWithEmailTimeline(email)
    applyTimelineLogin({ setClinicaUser, setOrdenadorUser, setFinanceiroUser }, result)
    return result
  }, [])

  const logout = useCallback(async (portal: Portal) => {
    await authService.logout(portal)
    if (portal === 'gestor') setGestorUser(null)
    else if (portal === 'clinica') setClinicaUser(null)
    else if (portal === 'ordenador') setOrdenadorUser(null)
    else setFinanceiroUser(null)
  }, [])

  const value = useMemo(
    () => ({
      gestorUser,
      clinicaUser,
      ordenadorUser,
      financeiroUser,
      isLoading,
      requiresGoogleAuth: (portal: Portal) => authService.requiresGoogleAuth(portal),
      login,
      loginWithGoogle,
      loginWithGoogleTimeline,
      loginWithEmailTimeline,
      logout,
    }),
    [
      gestorUser,
      clinicaUser,
      ordenadorUser,
      financeiroUser,
      isLoading,
      login,
      loginWithGoogle,
      loginWithGoogleTimeline,
      loginWithEmailTimeline,
      logout,
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
  const { gestorUser, isLoading, login, loginWithGoogle, logout, requiresGoogleAuth } = useAuth()
  return {
    user: gestorUser,
    isLoading,
    requiresGoogleAuth: requiresGoogleAuth('gestor'),
    login: (credentials: LoginCredentials) => login(credentials, 'gestor'),
    loginWithGoogle: () => loginWithGoogle('gestor'),
    logout: () => logout('gestor'),
  }
}

export function useClinicaAuth() {
  const { clinicaUser, isLoading, logout } = useAuth()
  return {
    user: clinicaUser,
    isLoading,
    logout: () => logout('clinica'),
  }
}

export function useOrdenadorAuth() {
  const { ordenadorUser, isLoading, logout } = useAuth()
  return {
    user: ordenadorUser,
    isLoading,
    logout: () => logout('ordenador'),
  }
}

export function useFinanceiroAuth() {
  const { financeiroUser, isLoading, logout } = useAuth()
  return {
    user: financeiroUser,
    isLoading,
    logout: () => logout('financeiro'),
  }
}
