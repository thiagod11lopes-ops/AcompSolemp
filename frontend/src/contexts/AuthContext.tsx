import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthUser, LoginCredentials, UserRole } from '@/types'
import type { Portal } from '@/utils/portal'
import { authService } from '@/services/authService'

interface AuthContextValue {
  gestorUser: AuthUser | null
  clinicaUser: AuthUser | null
  ordenadorUser: AuthUser | null
  financeiroUser: AuthUser | null
  isLoading: boolean
  requiresGoogleAuth: (portal: Portal) => boolean
  login: (credentials: LoginCredentials, portal: Portal) => Promise<AuthUser>
  loginWithGoogle: (portal: Portal) => Promise<AuthUser>
  logout: (portal: Portal) => Promise<void>
  loginClinicaByClinica: (clinicaId: string, senha: string, orgCode?: string) => Promise<AuthUser>
  loginOrdenadorByNome: (nome: string, senha: string, orgCode?: string) => Promise<AuthUser>
  loginFinanceiroByNome: (nome: string, senha: string, orgCode?: string) => Promise<AuthUser>
  loginByPerfilNome: (
    nome: string,
    senha: string,
    perfil: UserRole,
    orgCode?: string,
  ) => Promise<AuthUser>
}

const AuthContext = createContext<AuthContextValue | null>(null)

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

  const logout = useCallback(async (portal: Portal) => {
    await authService.logout(portal)
    if (portal === 'gestor') setGestorUser(null)
    else if (portal === 'clinica') setClinicaUser(null)
    else if (portal === 'ordenador') setOrdenadorUser(null)
    else setFinanceiroUser(null)
  }, [])

  const loginClinicaByClinica = useCallback(
    async (clinicaId: string, senha: string, orgCode?: string) => {
      const authUser = await authService.loginClinicaByClinicaId(clinicaId, senha, orgCode)
      setClinicaUser(authUser)
      return authUser
    },
    [],
  )

  const loginOrdenadorByNome = useCallback(
    async (nome: string, senha: string, orgCode?: string) => {
      const authUser = await authService.loginOrdenadorByNome(nome, senha, orgCode)
      setOrdenadorUser(authUser)
      return authUser
    },
    [],
  )

  const loginFinanceiroByNome = useCallback(
    async (nome: string, senha: string, orgCode?: string) => {
      const authUser = await authService.loginFinanceiroByNome(nome, senha, orgCode)
      setFinanceiroUser(authUser)
      return authUser
    },
    [],
  )

  const loginByPerfilNome = useCallback(
    async (nome: string, senha: string, perfil: UserRole, orgCode?: string) => {
      if (perfil === 'FINANCEIRO') {
        const authUser = await authService.loginByPerfilNome(
          nome,
          senha,
          ['FINANCEIRO'],
          'financeiro',
          orgCode,
        )
        setFinanceiroUser(authUser)
        return authUser
      }

      const authUser = await authService.loginByPerfilNome(
        nome,
        senha,
        [perfil],
        'ordenador',
        orgCode,
      )
      setOrdenadorUser(authUser)
      return authUser
    },
    [],
  )

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
      logout,
      loginClinicaByClinica,
      loginOrdenadorByNome,
      loginFinanceiroByNome,
      loginByPerfilNome,
    }),
    [
      gestorUser,
      clinicaUser,
      ordenadorUser,
      financeiroUser,
      isLoading,
      login,
      loginWithGoogle,
      logout,
      loginClinicaByClinica,
      loginOrdenadorByNome,
      loginFinanceiroByNome,
      loginByPerfilNome,
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
  const { clinicaUser, isLoading, login, logout } = useAuth()
  return {
    user: clinicaUser,
    isLoading,
    login: (credentials: LoginCredentials) => login(credentials, 'clinica'),
    logout: () => logout('clinica'),
  }
}

export function useOrdenadorAuth() {
  const { ordenadorUser, isLoading, login, logout } = useAuth()
  return {
    user: ordenadorUser,
    isLoading,
    login: (credentials: LoginCredentials) => login(credentials, 'ordenador'),
    logout: () => logout('ordenador'),
  }
}

export function useFinanceiroAuth() {
  const { financeiroUser, isLoading, login, logout } = useAuth()
  return {
    user: financeiroUser,
    isLoading,
    login: (credentials: LoginCredentials) => login(credentials, 'financeiro'),
    logout: () => logout('financeiro'),
  }
}
