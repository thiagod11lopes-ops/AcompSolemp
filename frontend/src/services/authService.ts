import type { AuthUser, LoginCredentials, CredencialUsuario, User } from '@/types'
import type { Portal } from '@/utils/portal'
import { useFirebaseDataSource } from '@/config/dataSource'
import { getEmailAccess, normalizeEmailKey } from '@/data/persistence/emailAccessPersistence'
import { registerPortalUserMapping } from '@/data/persistence/portalUserPersistence'
import { createUniqueOrgCode } from '@/data/persistence/tenantPersistence'
import { firebaseAuthAdapter } from '@/firebase/authAdapter'
import { initFirebase } from '@/firebase/app'
import {
  createOwnerGestor,
  delay,
  generateEmptyTenantData,
  loadAppData,
  MOCK_CREDENTIALS,
  reloadFreshAppData,
  saveAppData,
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
  ownerUserId,
  resolveGestorTenantIdFromOwnerUserId,
  setStoredOrgCode,
  setTenantId,
} from '@/services/tenantService'
import { STORAGE_KEYS, storageGet, storageRemove, storageSet } from '@/storage/indexedDb'

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
  if (portal === 'clinica') return perfil === 'CLINICA' || perfil === 'MEDICAMENTO'
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

async function provisionGestorTenant(uid: string, email: string): Promise<User> {
  await reloadFreshAppData()
  let data = loadAppData()
  const ownerId = ownerUserId(uid)
  let owner = data.usuarios.find((user) => user.id === ownerId)

  if (!owner) {
    if (!data.tenantMeta && data.usuarios.length === 0 && data.pedidos.length === 0) {
      data = generateEmptyTenantData()
    }

    owner = createOwnerGestor(uid, email)
    const orgCode = data.tenantMeta?.orgCode ?? (await createUniqueOrgCode(uid))
    data.tenantMeta = data.tenantMeta ?? {
      orgCode,
      ownerEmail: email,
      ownerUid: uid,
      createdAt: new Date().toISOString(),
    }
    data.usuarios = [owner, ...data.usuarios.filter((user) => user.id !== ownerId)]
    saveAppData(data)
    setStoredOrgCode(data.tenantMeta.orgCode)
  } else if (data.tenantMeta?.orgCode) {
    setStoredOrgCode(data.tenantMeta.orgCode)
  }

  return owner
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

  requiresGoogleAuth(portal: Portal = 'gestor'): boolean {
    return useFirebaseDataSource() && (portal === 'gestor' || portal === 'clinica')
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

  async ensureGestorFirebaseSession(options?: { interactive?: boolean }): Promise<void> {
    if (!useFirebaseDataSource()) return

    const gestor = this.getGestorUser()
    if (!gestor) return

    const tenantId = this.resolveGestorTenantId()
    if (!tenantId) {
      throw new Error('Organização do gestor não encontrada. Faça login novamente.')
    }

    setTenantId(tenantId)
    await firebaseAuthAdapter.ensureGestorFirebaseAuth(tenantId, options)
  },

  async syncRemoteDataIfAuthenticated(): Promise<void> {
    if (!useFirebaseDataSource()) return
    const { syncRemoteDataWhenAuthenticated } = await import('@/data/initDataLayer')
    await syncRemoteDataWhenAuthenticated()
  },

  async loginWithGoogle(portal: Portal): Promise<AuthUser> {
    if (!useFirebaseDataSource()) {
      throw new Error('Login com Google disponível apenas com Firebase configurado')
    }
    if (portal !== 'gestor') {
      throw new Error('Login com Google do gestor é exclusivo do Portal do Gestor')
    }

    const firebaseSession = await firebaseAuthAdapter.signInWithGoogle()
    if (!firebaseSession.email) {
      await firebaseAuthAdapter.signOut()
      throw new Error('Conta Google sem e-mail. Use outra conta.')
    }

    setTenantId(firebaseSession.uid)
    const owner = await provisionGestorTenant(firebaseSession.uid, firebaseSession.email)
    return completePortalLogin('gestor', owner)
  },

  /** Login local (modo demo sem Firebase) */
  async login(credentials: LoginCredentials, portal: Portal): Promise<AuthUser> {
    if (useFirebaseDataSource()) {
      throw new Error('Use o login com Google')
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

  async loginWithGoogleTimeline(): Promise<TimelineLoginResult> {
    if (useFirebaseDataSource()) {
      const firebaseSession = await firebaseAuthAdapter.signInWithGoogle({ selectAccount: true })
      if (!firebaseSession.email) {
        await firebaseAuthAdapter.signOut()
        throw new Error('Conta Google sem e-mail. Use outra conta.')
      }

      const email = normalizeEmailKey(firebaseSession.email)
      const access = await getEmailAccess(email)
      if (!access) {
        await firebaseAuthAdapter.signOut()
        throw new Error('Email não cadastrado')
      }

      setTenantId(access.tenantId)
      await registerPortalUserMapping(firebaseSession.uid, access.tenantId)
      await reloadFreshAppData()

      const data = loadAppData()
      const user = data.usuarios.find((item) => item.id === access.userId && item.ativo)
      if (!user) {
        await firebaseAuthAdapter.signOut()
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

    await delay(null, 300)
    throw new Error('Configure Firebase para acesso à Timeline com Google')
  },

  async loginWithEmailTimeline(email: string): Promise<TimelineLoginResult> {
    const normalized = normalizeEmailKey(email)
    if (!normalized.includes('@')) {
      throw new Error('Informe um e-mail válido')
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

    if (!useFirebaseDataSource()) return

    if (portal === 'gestor') {
      setTenantId(null)
      setStoredOrgCode(null)
      await firebaseAuthAdapter.signOut()
      return
    }

    const hasGestor = Boolean(readStoredUser(GESTOR_AUTH_KEY))
    await firebaseAuthAdapter.signOut()
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
    if (useFirebaseDataSource()) {
      initFirebase()
      await firebaseAuthAdapter.signOut()
    }
  },
}
