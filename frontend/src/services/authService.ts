import type { AuthUser, LoginCredentials, CredencialUsuario, User } from '@/types'
import type { Portal } from '@/utils/portal'
import { assertMarinhaEmail, normalizeEmailKey, passwordResetRedirectUrl } from '@/utils/email'
import { useSupabaseDataSource } from '@/config/dataSource'
import {
  applyRemoteAppData,
  delay,
  generateEmptyTenantData,
  loadAppData,
  MOCK_CREDENTIALS,
  reloadFreshAppData,
} from '@/mocks/seed'
import {
  canAccessGestorRoute,
  canAccessOrdenadorRoute,
  canAccessFinanceiroRoute,
} from '@/utils/permissions'
import { getHomeRouteForPerfil } from '@/utils/perfilEtapa'
import { DEMO_ROUTE_BASE, mapPortalPath } from '@/utils/portalPaths'
import { portalForPerfil } from '@/utils/portalForPerfil'
import { ensureDemoUserById, initDemoAppData } from '@/services/demoCadastrosService'
import {
  getStoredOrgCode,
  getTenantId,
  resolveGestorTenantIdFromOwnerUserId,
  setStoredOrgCode,
  setTenantId,
} from '@/services/tenantService'
import { STORAGE_KEYS, storageGet, storageRemove, storageSet } from '@/storage/indexedDb'
import { supabaseAuthAdapter } from '@/supabase/authAdapter'
import {
  getEmailAccess,
  getProfileForCurrentUser,
  provisionGestorTenant,
} from '@/data/persistence/supabaseTenant'
import { hydrateLocalCacheFromSupabase } from '@/data/persistence/supabaseSync'
import { getSupabaseClient } from '@/supabase/client'

const LEGACY_AUTH_KEY = STORAGE_KEYS.AUTH_LEGACY
const GESTOR_AUTH_KEY = STORAGE_KEYS.AUTH_GESTOR
const CLINICA_AUTH_KEY = STORAGE_KEYS.AUTH_CLINICA
const ORDENADOR_AUTH_KEY = STORAGE_KEYS.AUTH_ORDENADOR
const FINANCEIRO_AUTH_KEY = STORAGE_KEYS.AUTH_FINANCEIRO
const DEMO_MODE_KEY = STORAGE_KEYS.AUTH_DEMO_MODE

export interface DemoModeState {
  portal: Portal
  authUser: AuthUser
  tabTitle?: string
}

function readDemoMode(): DemoModeState | null {
  const stored = sessionStorage.getItem(DEMO_MODE_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as DemoModeState
  } catch {
    return null
  }
}

function writeDemoMode(state: DemoModeState | null): void {
  if (state) sessionStorage.setItem(DEMO_MODE_KEY, JSON.stringify(state))
  else sessionStorage.removeItem(DEMO_MODE_KEY)
  storageRemove(DEMO_MODE_KEY)
}

export interface TimelineLoginResult {
  authUser: AuthUser
  portal: Portal
  route: string
}

function readStoredUser(key: string): AuthUser | null {
  const stored = storageGet(key)
  if (!stored) return null
  try {
    return JSON.parse(stored) as AuthUser
  } catch {
    return null
  }
}

function writeStoredUser(key: string, authUser: AuthUser | null): void {
  if (authUser) storageSet(key, JSON.stringify(authUser))
  else storageRemove(key)
}

function resolveCredential(login: string, senha: string): CredencialUsuario | null {
  const data = loadAppData()
  const dynamic = data.credenciais?.[login]
  const cred = dynamic ?? MOCK_CREDENTIALS[login]
  if (!cred || cred.senha !== senha) return null
  return cred
}

function migrateLegacyAuth(): void {
  const legacy = storageGet(LEGACY_AUTH_KEY)
  if (!legacy) return

  try {
    const user = JSON.parse(legacy) as AuthUser
    if (canAccessGestorRoute(user.perfil) && !storageGet(GESTOR_AUTH_KEY)) {
      storageSet(GESTOR_AUTH_KEY, legacy)
    }
  } catch {
    // ignora JSON inválido
  }

  storageRemove(LEGACY_AUTH_KEY)
}

function validatePortalAccess(portal: Portal, perfil: AuthUser['perfil']): boolean {
  if (portal === 'gestor') return canAccessGestorRoute(perfil)
  if (portal === 'clinica') return perfil === 'CLINICA' || perfil === 'MEDICAMENTO' || perfil === 'EMPENHADO'
  if (portal === 'ordenador') return canAccessOrdenadorRoute(perfil)
  if (portal === 'financeiro') return canAccessFinanceiroRoute(perfil)
  return false
}

function sessionKey(portal: Portal): string {
  if (portal === 'gestor') return GESTOR_AUTH_KEY
  if (portal === 'clinica') return CLINICA_AUTH_KEY
  if (portal === 'ordenador') return ORDENADOR_AUTH_KEY
  return FINANCEIRO_AUTH_KEY
}

function setSession(portal: Portal, authUser: AuthUser | null): void {
  writeStoredUser(sessionKey(portal), authUser)
}

async function completePortalLogin(portal: Portal, user: User): Promise<AuthUser> {
  if (!validatePortalAccess(portal, user.perfil)) {
    throw new Error('Este usuário não tem acesso a este portal')
  }

  const authUser: AuthUser = {
    ...user,
    token: `session-${user.id}-${Date.now()}`,
  }

  setSession(portal, authUser)

  if (portal === 'ordenador' || portal === 'financeiro' || portal === 'clinica') {
    await reloadFreshAppData()
  }

  return authUser
}

function findLocalUserByEmail(email: string): User | null {
  const normalized = normalizeEmailKey(email)
  const data = loadAppData()
  return (
    data.usuarios.find(
      (user) =>
        user.ativo &&
        user.perfil !== 'GESTOR' &&
        user.perfil !== 'ADMINISTRADOR' &&
        user.email?.trim().toLowerCase() === normalized,
    ) ?? null
  )
}

export const authService = {
  bootstrap(): void {
    migrateLegacyAuth()
  },

  usesSupabaseAuth(): boolean {
    return useSupabaseDataSource()
  },

  getOrgCode(): string | null {
    const data = loadAppData()
    return data.tenantMeta?.orgCode ?? getStoredOrgCode()
  },

  resolveGestorTenantId(): string | null {
    const data = loadAppData()
    if (data.tenantMeta?.ownerUid) return data.tenantMeta.ownerUid

    const gestor = this.getGestorUser()
    if (!gestor) return getTenantId()

    return resolveGestorTenantIdFromOwnerUserId(gestor.id) ?? getTenantId()
  },

  async login(credentials: LoginCredentials, portal: Portal): Promise<AuthUser> {
    if (useSupabaseDataSource() && portal === 'gestor') {
      return this.loginGestorSupabase(credentials)
    }

    await delay(null, 600)
    const cred = resolveCredential(credentials.login, credentials.senha)
    if (!cred) {
      throw new Error('Login ou senha inválidos')
    }

    const data = loadAppData()
    const user = data.usuarios.find((u) => u.id === cred.userId && u.ativo)
    if (!user) {
      throw new Error('Usuário não encontrado ou inativo')
    }

    return completePortalLogin(portal, user)
  },

  async loginGestorSupabase(credentials: LoginCredentials): Promise<AuthUser> {
    const email = assertMarinhaEmail(credentials.login)
    if (credentials.senha.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres')
    }

    const authSession = await supabaseAuthAdapter.signInOrSignUp(email, credentials.senha)
    let profile = await getProfileForCurrentUser()

    if (!profile) {
      const { tenant, profile: created, owner } = await provisionGestorTenant({
        authUserId: authSession.user.id,
        email,
        displayName: authSession.user.user_metadata?.full_name,
        initialAppData: generateEmptyTenantData(),
      })
      profile = created
      setTenantId(tenant.id)
      setStoredOrgCode(tenant.org_code)
      applyRemoteAppData({
        ...generateEmptyTenantData(),
        usuarios: [owner],
        tenantMeta: {
          orgCode: tenant.org_code,
          ownerEmail: email,
          ownerUid: tenant.id,
          createdAt: tenant.created_at,
        },
      })
      return completePortalLogin('gestor', owner)
    }

    setTenantId(profile.tenant_id)
    await hydrateLocalCacheFromSupabase((data) => {
      applyRemoteAppData(data)
    })
    setStoredOrgCode(loadAppData().tenantMeta?.orgCode ?? null)

    const data = loadAppData()
    const owner =
      data.usuarios.find((u) => u.id === profile!.app_user_id && u.ativo) ??
      data.usuarios.find((u) => u.perfil === 'GESTOR' && u.ativo)

    if (!owner) {
      throw new Error('Usuário gestor não encontrado na organização.')
    }

    return completePortalLogin('gestor', owner)
  },

  async loginWithEmailTimeline(
    email: string,
    password?: string,
  ): Promise<TimelineLoginResult> {
    const normalized = assertMarinhaEmail(email)

    if (useSupabaseDataSource()) {
      if (!password || password.length < 6) {
        throw new Error('Informe a senha (mínimo 6 caracteres)')
      }

      const access = await getEmailAccess(normalized)
      if (!access) {
        throw new Error('Email não cadastrado pelo gestor')
      }

      const authSession = await supabaseAuthAdapter.signInOrSignUp(normalized, password)
      const existingProfile = await getProfileForCurrentUser()
      if (!existingProfile) {
        const { error } = await getSupabaseClient().from('profiles').insert({
          id: authSession.user.id,
          tenant_id: access.tenant_id,
          app_user_id: access.app_user_id,
          email: normalized,
          perfil: access.perfil,
        })
        if (error) throw error
      }

      setTenantId(access.tenant_id)
      await hydrateLocalCacheFromSupabase((data) => {
        applyRemoteAppData(data)
      })

      const data = loadAppData()
      const user = data.usuarios.find((item) => item.id === access.app_user_id && item.ativo)
      if (!user) {
        throw new Error('Email não cadastrado')
      }

      const portal = portalForPerfil(user.perfil)
      const authUser = await completePortalLogin(portal, user)
      return {
        authUser,
        portal,
        route: getHomeRouteForPerfil(user.perfil),
      }
    }

    const user = findLocalUserByEmail(normalized)
    if (!user) {
      throw new Error('Email não cadastrado')
    }

    const portal = portalForPerfil(user.perfil)
    const authUser = await completePortalLogin(portal, user)
    return {
      authUser,
      portal,
      route: getHomeRouteForPerfil(user.perfil),
    }
  },

  async logout(portal: Portal): Promise<void> {
    await delay(null, 100)
    setSession(portal, null)

    if (!useSupabaseDataSource()) return

    if (portal === 'gestor') {
      setTenantId(null)
      setStoredOrgCode(null)
      await supabaseAuthAdapter.signOut()
      return
    }

    const hasGestor = Boolean(readStoredUser(GESTOR_AUTH_KEY))
    await supabaseAuthAdapter.signOut()
    if (!hasGestor) {
      setTenantId(null)
    }
  },

  getGestorUser(): AuthUser | null {
    return readStoredUser(GESTOR_AUTH_KEY)
  },

  getClinicaUser(): AuthUser | null {
    return readStoredUser(CLINICA_AUTH_KEY)
  },

  getOrdenadorUser(): AuthUser | null {
    return readStoredUser(ORDENADOR_AUTH_KEY)
  },

  getFinanceiroUser(): AuthUser | null {
    return readStoredUser(FINANCEIRO_AUTH_KEY)
  },

  getCurrentUser(portal: Portal): AuthUser | null {
    return readStoredUser(sessionKey(portal))
  },

  getDemoMode(): DemoModeState | null {
    return readDemoMode()
  },

  async startDemoMode(
    userId: string,
    tabTitle?: string,
  ): Promise<{ authUser: AuthUser; portal: Portal; route: string; tabTitle?: string }> {
    const gestor = this.getGestorUser()
    if (!gestor) {
      throw new Error('Faça login como gestor para usar a demonstração')
    }

    const user = await ensureDemoUserById(userId)

    const portal = portalForPerfil(user.perfil)
    const authUser: AuthUser = {
      ...user,
      token: `demo-${user.id}-${Date.now()}`,
    }

    writeDemoMode({ portal, authUser, tabTitle })

    const homeRoute = getHomeRouteForPerfil(user.perfil)
    return {
      authUser,
      portal,
      route: mapPortalPath(homeRoute, DEMO_ROUTE_BASE),
      tabTitle,
    }
  },

  async startDemoGestorOverview(
    tabTitle?: string,
  ): Promise<{ authUser: AuthUser; portal: Portal; route: string; tabTitle?: string }> {
    const gestor = this.getGestorUser()
    if (!gestor) {
      throw new Error('Faça login como gestor para usar a demonstração')
    }

    await initDemoAppData()

    const authUser: AuthUser = {
      ...gestor,
      token: `demo-gestor-${Date.now()}`,
    }

    writeDemoMode({ portal: 'gestor', authUser, tabTitle })

    return {
      authUser,
      portal: 'gestor',
      route: mapPortalPath('/gestor/dashboard', DEMO_ROUTE_BASE),
      tabTitle,
    }
  },

  endDemoMode(): void {
    writeDemoMode(null)
  },

  clearClinicaOrdenadorSessions(): void {
    storageRemove(CLINICA_AUTH_KEY)
    storageRemove(ORDENADOR_AUTH_KEY)
    storageRemove(FINANCEIRO_AUTH_KEY)
  },

  async prepareTimelineEntry(): Promise<void> {
    this.clearClinicaOrdenadorSessions()
    if (useSupabaseDataSource()) {
      await supabaseAuthAdapter.signOut()
    }
  },

  async requestPasswordReset(email: string): Promise<void> {
    const normalized = assertMarinhaEmail(email)
    if (!useSupabaseDataSource()) {
      throw new Error(
        'A recuperação de senha está disponível apenas com autenticação em nuvem (Supabase).',
      )
    }
    await supabaseAuthAdapter.resetPasswordForEmail(
      normalized,
      passwordResetRedirectUrl(),
    )
  },

  async completePasswordReset(newPassword: string): Promise<void> {
    if (!useSupabaseDataSource()) {
      throw new Error(
        'A recuperação de senha está disponível apenas com autenticação em nuvem (Supabase).',
      )
    }
    if (newPassword.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres')
    }
    await supabaseAuthAdapter.updatePassword(newPassword)
    await supabaseAuthAdapter.signOut()
  },

  async waitForPasswordRecoverySession() {
    return supabaseAuthAdapter.waitForPasswordRecoverySession()
  },
}
