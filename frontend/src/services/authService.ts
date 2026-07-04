import type { AuthUser, LoginCredentials, CredencialUsuario } from '@/types'
import type { Portal } from '@/utils/portal'
import { delay, loadAppData, MOCK_CREDENTIALS } from '@/mocks/seed'
import { slugLogin } from '@/utils/loginSlug'
import {
  canAccessGestorRoute,
  canAccessOrdenadorRoute,
  canAccessFinanceiroRoute,
} from '@/utils/permissions'

const LEGACY_AUTH_KEY = 'acomp_solemp_auth'
const GESTOR_AUTH_KEY = 'acomp_solemp_auth_gestor'
const CLINICA_AUTH_KEY = 'acomp_solemp_auth_clinica'
const ORDENADOR_AUTH_KEY = 'acomp_solemp_auth_ordenador'
const FINANCEIRO_AUTH_KEY = 'acomp_solemp_auth_financeiro'

/** Sessões voláteis — expiram ao atualizar a página */
let clinicaSession: AuthUser | null = null
let ordenadorSession: AuthUser | null = null
let financeiroSession: AuthUser | null = null

function readStoredUser(key: string): AuthUser | null {
  const stored = localStorage.getItem(key)
  if (!stored) return null
  try {
    return JSON.parse(stored) as AuthUser
  } catch {
    return null
  }
}

function purgeVolatilePortalStorage(): void {
  localStorage.removeItem(CLINICA_AUTH_KEY)
  localStorage.removeItem(ORDENADOR_AUTH_KEY)
  localStorage.removeItem(FINANCEIRO_AUTH_KEY)
  localStorage.removeItem(LEGACY_AUTH_KEY)
}

function migrateLegacyAuth(): void {
  const legacy = localStorage.getItem(LEGACY_AUTH_KEY)
  if (!legacy) return

  try {
    const user = JSON.parse(legacy) as AuthUser
    if (canAccessGestorRoute(user.perfil) && !localStorage.getItem(GESTOR_AUTH_KEY)) {
      localStorage.setItem(GESTOR_AUTH_KEY, legacy)
    }
  } catch {
    // ignora JSON inválido
  }

  localStorage.removeItem(LEGACY_AUTH_KEY)
}

purgeVolatilePortalStorage()

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

function setSession(portal: Portal, authUser: AuthUser | null): void {
  if (portal === 'gestor') {
    if (authUser) localStorage.setItem(GESTOR_AUTH_KEY, JSON.stringify(authUser))
    else localStorage.removeItem(GESTOR_AUTH_KEY)
  } else if (portal === 'clinica') {
    clinicaSession = authUser
  } else if (portal === 'ordenador') {
    ordenadorSession = authUser
  } else {
    financeiroSession = authUser
  }
}

export const authService = {
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

  clearClinicaOrdenadorSessions(): void {
    clinicaSession = null
    ordenadorSession = null
    financeiroSession = null
    purgeVolatilePortalStorage()
  },

  getCurrentUser(portal: Portal): AuthUser | null {
    migrateLegacyAuth()
    if (portal === 'gestor') return readStoredUser(GESTOR_AUTH_KEY)
    if (portal === 'clinica') return clinicaSession
    if (portal === 'ordenador') return ordenadorSession
    if (portal === 'financeiro') return financeiroSession
    return null
  },

  getGestorUser(): AuthUser | null {
    return this.getCurrentUser('gestor')
  },

  getClinicaUser(): AuthUser | null {
    return this.getCurrentUser('clinica')
  },

  getOrdenadorUser(): AuthUser | null {
    return this.getCurrentUser('ordenador')
  },

  getFinanceiroUser(): AuthUser | null {
    return this.getCurrentUser('financeiro')
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
