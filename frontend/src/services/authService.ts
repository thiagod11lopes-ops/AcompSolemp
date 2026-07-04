import type { AuthUser, LoginCredentials, CredencialUsuario } from '@/types'
import type { Portal } from '@/utils/portal'
import { delay, loadAppData, MOCK_CREDENTIALS } from '@/mocks/seed'
import { slugLogin } from '@/utils/loginSlug'
import {
  canAccessGestorRoute,
  canAccessOrdenadorRoute,
  canAccessFinanceiroRoute,
} from '@/utils/permissions'
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

export const authService = {
  /** Deve ser chamado após initStorage() */
  bootstrap(): void {
    migrateLegacyAuth()
  },

  async login(credentials: LoginCredentials, portal: Portal): Promise<AuthUser> {
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

    if (!validatePortalAccess(portal, user.perfil)) {
      throw new Error('Este usuário não tem acesso a este portal')
    }

    const authUser: AuthUser = {
      ...user,
      token: `mock-jwt-${user.id}-${Date.now()}`,
    }

    setSession(portal, authUser)
    return authUser
  },

  async logout(portal: Portal): Promise<void> {
    await delay(null, 100)
    setSession(portal, null)
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

  async loginClinicaByClinicaId(clinicaId: string, senha: string): Promise<AuthUser> {
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

  async loginOrdenadorByNome(nome: string, senha: string): Promise<AuthUser> {
    return this.loginByPerfilNome(nome, senha, [
      'ASSINANTE',
      'CONFECCAO_SOLEMP',
      'ASSINATURA_1_SOLEMP',
      'ASSINATURA_2_SOLEMP',
      'AUDITORIA',
      'CONTABILIDADE_IMH',
      'SDA',
    ], 'ordenador')
  },

  async loginFinanceiroByNome(nome: string, senha: string): Promise<AuthUser> {
    return this.loginByPerfilNome(nome, senha, ['FINANCEIRO'], 'financeiro')
  },

  async loginByPerfilNome(
    nome: string,
    senha: string,
    perfis: AuthUser['perfil'][],
    portal: Portal,
  ): Promise<AuthUser> {
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
