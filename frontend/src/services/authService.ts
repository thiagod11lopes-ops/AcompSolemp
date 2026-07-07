import type { AuthUser, LoginCredentials, CredencialUsuario, User } from '@/types'
import type { Portal } from '@/utils/portal'
import { useFirebaseDataSource } from '@/config/dataSource'
import { createUniqueOrgCode, resolveOrgCodePublicData, resolveOrgCodeToTenantId } from '@/data/persistence/tenantPersistence'
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
import { slugLogin } from '@/utils/loginSlug'
import {
  canAccessGestorRoute,
  canAccessOrdenadorRoute,
  canAccessFinanceiroRoute,
} from '@/utils/permissions'
import {
  getStoredOrgCode,
  getTenantId,
  ownerUserId,
  resolveGestorTenantIdFromOwnerUserId,
  setStoredOrgCode,
  setTenantId,
} from '@/services/tenantService'
import { syncPortalFirebaseUsers } from '@/services/portalUserSync'
import { STORAGE_KEYS, storageGet, storageRemove, storageSet } from '@/storage/indexedDb'

const LEGACY_AUTH_KEY = STORAGE_KEYS.AUTH_LEGACY
const GESTOR_AUTH_KEY = STORAGE_KEYS.AUTH_GESTOR
const CLINICA_AUTH_KEY = STORAGE_KEYS.AUTH_CLINICA
const ORDENADOR_AUTH_KEY = STORAGE_KEYS.AUTH_ORDENADOR
const FINANCEIRO_AUTH_KEY = STORAGE_KEYS.AUTH_FINANCEIRO

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

function resolveCredential(login: string, senha: string): CredencialUsuario | null {
  const data = loadAppData()
  const dynamic = data.credenciais?.[login]
  const cred = dynamic ?? MOCK_CREDENTIALS[login]
  if (!cred || cred.senha !== senha) return null
  return cred
}

function validatePortalAccess(portal: Portal, perfil: AuthUser['perfil']): boolean {
  if (portal === 'gestor') return canAccessGestorRoute(perfil)
  if (portal === 'clinica') return perfil === 'CLINICA'
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

async function resolveAndSetTenant(orgCode?: string): Promise<void> {
  initFirebase()
  const code = (orgCode ?? getStoredOrgCode())?.trim().toUpperCase()
  if (!code) {
    throw new Error('Informe o código da organização')
  }

  const tenantId = await resolveOrgCodeToTenantId(code)
  if (!tenantId) {
    throw new Error('Código da organização inválido')
  }

  setTenantId(tenantId)
  setStoredOrgCode(code)
}

async function ensurePortalFirestoreAccess(login: string, senha: string): Promise<void> {
  const tenantId = getTenantId()
  if (!tenantId) {
    throw new Error('Informe o código da organização')
  }
  await firebaseAuthAdapter.signInPortalUser(tenantId, login, senha)
  await reloadFreshAppData()
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

  void syncPortalFirebaseUsers()

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

  if (portal === 'ordenador' || portal === 'financeiro') {
    await reloadFreshAppData()
  }

  return authUser
}

export const authService = {
  bootstrap(): void {
    migrateLegacyAuth()
  },

  /** Google obrigatório apenas no portal do gestor em produção */
  requiresGoogleAuth(portal: Portal = 'gestor'): boolean {
    return useFirebaseDataSource() && portal === 'gestor'
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

  async ensureGestorFirebaseSession(): Promise<void> {
    if (!useFirebaseDataSource()) return

    const gestor = this.getGestorUser()
    if (!gestor) return

    const tenantId = this.resolveGestorTenantId()
    if (!tenantId) {
      throw new Error('Organização do gestor não encontrada. Faça login novamente.')
    }

    setTenantId(tenantId)
    await firebaseAuthAdapter.ensureGestorFirebaseAuth(tenantId)
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
      throw new Error('Login com Google é exclusivo do Portal do Gestor')
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

  async login(credentials: LoginCredentials, portal: Portal): Promise<AuthUser> {
    if (useFirebaseDataSource()) {
      if (portal === 'gestor') {
        throw new Error('Use o login com Google no Portal do Gestor')
      }
      await ensurePortalFirestoreAccess(credentials.login, credentials.senha)
    } else {
      await delay(null, 600)
    }

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
    if (!hasGestor) {
      setTenantId(null)
      await firebaseAuthAdapter.signOut()
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

  clearClinicaOrdenadorSessions(): void {
    storageRemove(CLINICA_AUTH_KEY)
    storageRemove(ORDENADOR_AUTH_KEY)
    storageRemove(FINANCEIRO_AUTH_KEY)
  },

  async loginClinicaByClinicaId(
    clinicaId: string,
    senha: string,
    orgCode?: string,
  ): Promise<AuthUser> {
    if (useFirebaseDataSource()) {
      await resolveAndSetTenant(orgCode)
      const tenantId = getTenantId()
      if (!tenantId) throw new Error('Informe o código da organização')

      const code = (orgCode ?? getStoredOrgCode())?.trim().toUpperCase()
      const orgData = code ? await resolveOrgCodePublicData(code) : null
      const clinica = orgData?.clinicas.find((item) => item.id === clinicaId)

      if (!clinica?.login) {
        throw new Error('Nenhum usuário cadastrado para esta clínica')
      }

      await firebaseAuthAdapter.signInPortalUser(tenantId, clinica.login, senha)
      return this.login({ login: clinica.login, senha }, 'clinica')
    }

    await delay(null, 300)
    const data = loadAppData()
    const users = data.usuarios.filter(
      (u) => u.perfil === 'CLINICA' && u.clinicaId === clinicaId && u.ativo,
    )

    if (users.length === 0) {
      throw new Error('Nenhum usuário cadastrado para esta clínica')
    }

    for (const user of users) {
      const cred = resolveCredential(user.login, senha)
      if (cred && cred.userId === user.id) {
        return this.login({ login: user.login, senha }, 'clinica')
      }
    }

    throw new Error('Senha inválida para esta clínica')
  },

  async loginOrdenadorByNome(nome: string, senha: string, orgCode?: string): Promise<AuthUser> {
    return this.loginByPerfilNome(
      nome,
      senha,
      [
        'ASSINANTE',
        'CONFECCAO_SOLEMP',
        'ASSINATURA_1_SOLEMP',
        'ASSINATURA_2_SOLEMP',
        'AUDITORIA',
        'CONTABILIDADE_IMH',
        'SDA',
      ],
      'ordenador',
      orgCode,
    )
  },

  async loginFinanceiroByNome(nome: string, senha: string, orgCode?: string): Promise<AuthUser> {
    return this.loginByPerfilNome(nome, senha, ['FINANCEIRO'], 'financeiro', orgCode)
  },

  async loginByPerfilNome(
    nome: string,
    senha: string,
    perfis: AuthUser['perfil'][],
    portal: Portal,
    orgCode?: string,
  ): Promise<AuthUser> {
    if (useFirebaseDataSource()) {
      await resolveAndSetTenant(orgCode)
      const tenantId = getTenantId()
      if (!tenantId) throw new Error('Informe o código da organização')

      const loginGuess = slugLogin(nome)
      await firebaseAuthAdapter.signInPortalUser(tenantId, loginGuess, senha)
      return this.login({ login: loginGuess, senha }, portal)
    }

    await delay(null, 300)
    const data = loadAppData()
    const nomeNorm = nome.trim().toLowerCase()
    const loginSlugValue = slugLogin(nome)

    const user = data.usuarios.find(
      (u) =>
        perfis.includes(u.perfil) &&
        u.ativo &&
        (u.nome.trim().toLowerCase() === nomeNorm || u.login === loginSlugValue),
    )

    if (!user) {
      throw new Error('Usuário não encontrado para este perfil')
    }

    return this.login({ login: user.login, senha }, portal)
  },
}
