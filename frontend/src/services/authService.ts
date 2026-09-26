import type { AuthUser, LoginCredentials, CredencialUsuario, User, UserRole } from '@/types'
import type { Portal } from '@/utils/portal'
import {
  assertMarinhaEmail,
  isSuperAdminEmail,
  normalizeEmailKey,
  passwordResetRedirectUrl,
} from '@/utils/email'
import { setOpenAccessSession, useSupabaseDataSource } from '@/config/dataSource'
import {
  applyRemoteAppData,
  clearAppDataCache,
  wipeDemoAppDataStore,
  delay,
  generateEmptyTenantData,
  loadAppData,
  MOCK_CREDENTIALS,
  reloadFreshAppData,
  resetAppData,
  saveAppData,
} from '@/mocks/seed'
import {
  canAccessGestorRoute,
  canAccessOrdenadorRoute,
  canAccessFinanceiroRoute,
} from '@/utils/permissions'
import { getHomeRouteForPerfil } from '@/utils/perfilEtapa'
import { loginPerfilLabel } from '@/utils/loginPerfis'
import { userHasPerfil, userPerfis, userTemCadeiaSolemp, normalizeUserPerfis } from '@/utils/userPerfis'
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
  declineTeamEmailInvite,
  provisionGestorTenant,
} from '@/data/persistence/supabaseTenant'
import { assertAccountNotPaused, resolveImpersonation } from '@/data/persistence/supabaseAdmin'
import { hydrateLocalCacheFromSupabase } from '@/data/persistence/supabaseSync'
import { getSupabaseClient } from '@/supabase/client'
import { getAuthErrorMessage, mapSupabaseAuthError } from '@/supabase/authErrors'

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

export interface ImpersonationState {
  targetEmail: string
  tenantId: string
  returnTenantId: string | null
  returnOrgCode: string | null
  returnGestorUser: AuthUser
}

function readImpersonation(): ImpersonationState | null {
  const stored = sessionStorage.getItem(STORAGE_KEYS.AUTH_IMPERSONATION)
  if (!stored) return null
  try {
    return JSON.parse(stored) as ImpersonationState
  } catch {
    return null
  }
}

function writeImpersonation(state: ImpersonationState | null): void {
  if (state) sessionStorage.setItem(STORAGE_KEYS.AUTH_IMPERSONATION, JSON.stringify(state))
  else sessionStorage.removeItem(STORAGE_KEYS.AUTH_IMPERSONATION)
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

async function completePortalLogin(
  portal: Portal,
  user: User,
  options?: { skipReload?: boolean; activePerfil?: UserRole },
): Promise<AuthUser> {
  const normalized = normalizeUserPerfis(user)
  const activePerfil =
    options?.activePerfil && userHasPerfil(normalized, options.activePerfil)
      ? options.activePerfil
      : normalized.perfil

  if (!validatePortalAccess(portal, activePerfil)) {
    throw new Error('Este usuário não tem acesso a este portal')
  }

  const authUser: AuthUser = {
    ...normalized,
    perfil: activePerfil,
    perfis: userPerfis(normalized),
    token: `session-${normalized.id}-${Date.now()}`,
  }

  setSession(portal, authUser)

  // Dual session só quando o gestor autorizou Confecção E Solemp em Rascunho.
  if (userTemCadeiaSolemp(authUser)) {
    if (portal === 'ordenador') {
      setSession('financeiro', { ...authUser, perfil: 'FINANCEIRO' })
    }
    if (portal === 'financeiro') {
      setSession('ordenador', { ...authUser, perfil: 'CONFECCAO_SOLEMP' })
    }
  }

  if (
    !options?.skipReload &&
    !readImpersonation() &&
    (portal === 'ordenador' || portal === 'financeiro' || portal === 'clinica')
  ) {
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
    setOpenAccessSession(false)

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

  /** Entra no Portal do Gestor sem e-mail/senha (dados locais IndexedDB). */
  async loginGestorSemSenha(): Promise<AuthUser> {
    setOpenAccessSession(true)

    if (useSupabaseDataSource()) {
      await supabaseAuthAdapter.signOut()
    }

    setTenantId(null)
    setStoredOrgCode(null)
    clearAppDataCache()

    let data = loadAppData()
    let user = data.usuarios.find((u) => u.id === 'user-gestor' && u.ativo)
    if (!user) {
      data = resetAppData()
      user = data.usuarios.find((u) => u.id === 'user-gestor' && u.ativo)
    }
    if (!user) {
      throw new Error('Não foi possível iniciar o acesso sem senha')
    }

    return completePortalLogin('gestor', user)
  },

  async loginGestorSupabase(credentials: LoginCredentials): Promise<AuthUser> {
    const marinhaEmail = assertMarinhaEmail(credentials.login)
    if (credentials.senha.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres')
    }

    await assertAccountNotPaused(marinhaEmail)

    const teamAccess = await getEmailAccess(marinhaEmail)
    if (teamAccess) {
      throw new Error(
        'Este e-mail foi cadastrado pelo gestor para a Timeline. Use Entrar na Timeline (não no Portal do Gestor).',
      )
    }

    try {
      const authSession = await supabaseAuthAdapter.signInWithPassword(
        marinhaEmail,
        credentials.senha,
      )
      return await this.completeGestorSupabaseSession(authSession, marinhaEmail)
    } catch (error) {
      throw mapSupabaseAuthError(error)
    }
  },

  async registerGestorSupabase(credentials: LoginCredentials): Promise<AuthUser> {
    setOpenAccessSession(false)
    const marinhaEmail = assertMarinhaEmail(credentials.login)
    if (credentials.senha.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres')
    }

    await assertAccountNotPaused(marinhaEmail)

    const teamAccess = await getEmailAccess(marinhaEmail)
    if (teamAccess) {
      throw new Error(
        'Este e-mail foi cadastrado pelo gestor. Use Cadastrar-se na Timeline para criar a senha — não cria Portal do Gestor.',
      )
    }

    try {
      const authSession = await supabaseAuthAdapter.signUpWithPassword(
        marinhaEmail,
        credentials.senha,
      )
      return await this.completeGestorSupabaseSession(authSession, marinhaEmail)
    } catch (error) {
      throw mapSupabaseAuthError(error)
    }
  },

  async completeGestorSupabaseSession(
    authSession: Awaited<ReturnType<typeof supabaseAuthAdapter.signInWithPassword>>,
    marinhaEmail: string,
  ): Promise<AuthUser> {
    // Trava de segurança: e-mail liberado em Cadastros nunca provisiona tenant de gestor.
    const teamAccess = await getEmailAccess(marinhaEmail)
    if (teamAccess) {
      throw new Error(
        'Este e-mail pertence à equipe do gestor (Timeline). Não é possível usá-lo no Portal do Gestor.',
      )
    }

    let profile = await getProfileForCurrentUser()

    if (!profile) {
      const { tenant, profile: created, owner } = await provisionGestorTenant({
        authUserId: authSession.user.id,
        email: marinhaEmail,
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
          ownerEmail: marinhaEmail,
          ownerUid: tenant.id,
          createdAt: tenant.created_at,
        },
      })
      return completePortalLogin('gestor', owner)
    }

    // Perfil de equipe (não gestor) que chegou aqui por engano
    if (profile.perfil !== 'GESTOR' && profile.perfil !== 'ADMINISTRADOR') {
      throw new Error(
        'Este e-mail está vinculado à Timeline da organização. Use a tela da Timeline para entrar.',
      )
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

  /** Se o e-mail foi liberado em Cadastros pelo gestor, retorna o acesso da Timeline. */
  async getTeamEmailAccess(email: string) {
    if (!useSupabaseDataSource()) return null
    return getEmailAccess(assertMarinhaEmail(email))
  },

  /** Recusa o convite: remove o e-mail do Cadastros do gestor. */
  async declineTeamInvite(email: string) {
    if (!useSupabaseDataSource()) {
      throw new Error('Disponível apenas com autenticação em nuvem (Supabase).')
    }
    const marinhaEmail = assertMarinhaEmail(email)
    return declineTeamEmailInvite(marinhaEmail)
  },

  async loginWithEmailTimeline(
    email: string,
    password?: string,
    expectedPerfil?: UserRole,
  ): Promise<TimelineLoginResult> {
    const marinhaEmail = assertMarinhaEmail(email)

    if (useSupabaseDataSource()) {
      if (!password || password.length < 6) {
        throw new Error('Informe a senha (mínimo 6 caracteres)')
      }

      await assertAccountNotPaused(marinhaEmail)

      const access = await getEmailAccess(marinhaEmail)
      if (!access) {
        throw new Error(
          'E-mail não cadastrado pelo gestor. Peça para liberá-lo na aba Cadastros.',
        )
      }

      if (expectedPerfil && access.perfil !== expectedPerfil) {
        // Validação definitiva ocorre após hidratar o usuário (perfis[]).
      }

      const authSession = await supabaseAuthAdapter.signInWithPassword(marinhaEmail, password)
      return this.completeTimelineSupabaseSession(authSession, access, marinhaEmail, expectedPerfil)
    }

    const user = findLocalUserByEmail(marinhaEmail)
    if (!user) {
      throw new Error('E-mail não cadastrado pelo gestor')
    }

    if (expectedPerfil && !userHasPerfil(user, expectedPerfil)) {
      const labels = userPerfis(user).map((p) => loginPerfilLabel(p)).join(', ')
      throw new Error(
        `Este e-mail está cadastrado como: ${labels}. Selecione um desses tipos no login.`,
      )
    }

    const activePerfil = expectedPerfil ?? user.perfil
    const portal = portalForPerfil(activePerfil)
    const authUser = await completePortalLogin(portal, user, { activePerfil })
    return {
      authUser,
      portal,
      route: getHomeRouteForPerfil(activePerfil),
    }
  },

  async registerWithEmailTimeline(
    email: string,
    password: string,
    expectedPerfil?: UserRole,
  ): Promise<TimelineLoginResult> {
    const marinhaEmail = assertMarinhaEmail(email)
    if (!useSupabaseDataSource()) {
      throw new Error('O cadastro com senha está disponível apenas com autenticação em nuvem.')
    }
    if (password.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres')
    }

    await assertAccountNotPaused(marinhaEmail)

    const access = await getEmailAccess(marinhaEmail)
    if (!access) {
      throw new Error(
        'E-mail não liberado. Peça ao gestor para cadastrá-lo em Cadastros antes de criar a senha.',
      )
    }

    if (expectedPerfil && access.perfil !== expectedPerfil) {
      // Validação definitiva ocorre após hidratar o usuário (perfis[]).
    }

    // Conta Auth já existia (ex.: exclusão incompleta): entra com a senha informada.
    let authSession: Awaited<ReturnType<typeof supabaseAuthAdapter.signUpWithPassword>>
    try {
      authSession = await supabaseAuthAdapter.signUpWithPassword(marinhaEmail, password)
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : ''
      const already =
        message.includes('já possui conta') ||
        message.includes('already registered') ||
        message.includes('already been registered')
      if (!already) throw error
      authSession = await supabaseAuthAdapter.signInWithPassword(marinhaEmail, password)
    }
    return this.completeTimelineSupabaseSession(authSession, access, marinhaEmail, expectedPerfil)
  },

  async completeTimelineSupabaseSession(
    authSession: Awaited<ReturnType<typeof supabaseAuthAdapter.signInWithPassword>>,
    access: NonNullable<Awaited<ReturnType<typeof getEmailAccess>>>,
    marinhaEmail: string,
    expectedPerfil?: UserRole,
  ): Promise<TimelineLoginResult> {
    const existingProfile = await getProfileForCurrentUser()
    if (!existingProfile) {
      const { error } = await getSupabaseClient().from('profiles').insert({
        id: authSession.user.id,
        tenant_id: access.tenant_id,
        app_user_id: access.app_user_id,
        email: marinhaEmail,
        perfil: access.perfil,
      })
      // Perfil já existe (mesmo auth user): segue o login.
      if (error && !/duplicate|unique|already exists/i.test(error.message)) {
        throw error
      }
    }

    setTenantId(access.tenant_id)
    await hydrateLocalCacheFromSupabase((data) => {
      applyRemoteAppData(data)
    })

    const data = loadAppData()
    const emailKey = marinhaEmail.trim().toLowerCase()
    let user =
      data.usuarios.find((item) => item.id === access.app_user_id && item.ativo) ??
      data.usuarios.find(
        (item) => item.email?.trim().toLowerCase() === emailKey && item.ativo,
      )

    // Cadastro soft-deletado com email_access órfão: reativa para liberar o login.
    if (!user) {
      const inactive =
        data.usuarios.find((item) => item.id === access.app_user_id && !item.ativo) ??
        data.usuarios.find(
          (item) => item.email?.trim().toLowerCase() === emailKey && !item.ativo,
        )
      if (inactive) {
        inactive.ativo = true
        inactive.email = marinhaEmail
        if (access.perfil) {
          inactive.perfil = access.perfil as UserRole
        }
        if (access.nome) inactive.nome = access.nome
        if (access.clinica_id) inactive.clinicaId = access.clinica_id
        saveAppData(data)
        try {
          const { flushSupabaseAppDataSync } = await import('@/data/persistence/supabaseSync')
          await flushSupabaseAppDataSync()
        } catch {
          // Mantém reativação local mesmo se o flush falhar.
        }
        user = inactive
      }
    }

    if (!user) {
      throw new Error(
        'E-mail liberado, mas o usuário não está ativo na organização. Peça ao gestor para cadastrá-lo novamente em Cadastros.',
      )
    }

    if (expectedPerfil && !userHasPerfil(user, expectedPerfil)) {
      const labels = userPerfis(user).map((p) => loginPerfilLabel(p)).join(', ')
      throw new Error(
        `Este e-mail está cadastrado como: ${labels}. Selecione um desses tipos no login.`,
      )
    }

    const activePerfil = expectedPerfil ?? user.perfil
    const portal = portalForPerfil(activePerfil)
    const authUser = await completePortalLogin(portal, user, { activePerfil })
    return {
      authUser,
      portal,
      route: getHomeRouteForPerfil(activePerfil),
    }
  },

  async logout(portal: Portal): Promise<void> {
    await delay(null, 100)
    const current = readStoredUser(sessionKey(portal))
    setSession(portal, null)

    if (current && userTemCadeiaSolemp(current)) {
      setSession('ordenador', null)
      setSession('financeiro', null)
    }

    const wasImpersonating = Boolean(readImpersonation())
    if (wasImpersonating) {
      writeImpersonation(null)
      this.clearClinicaOrdenadorSessions()
      setSession('gestor', null)
      setOpenAccessSession(false)
      if (useSupabaseDataSource()) {
        setTenantId(null)
        setStoredOrgCode(null)
        await supabaseAuthAdapter.signOut()
      }
      return
    }

    if (portal === 'gestor') {
      setOpenAccessSession(false)
    }

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
    const financeiro = readStoredUser(FINANCEIRO_AUTH_KEY)
    if (financeiro) return financeiro
    // Sessão antiga só no ordenador: herda financeiro só com cadeia autorizada.
    const ordenador = readStoredUser(ORDENADOR_AUTH_KEY)
    if (ordenador && userTemCadeiaSolemp(ordenador)) {
      const inherited: AuthUser = { ...ordenador, perfil: 'FINANCEIRO' }
      setSession('financeiro', inherited)
      return inherited
    }
    return null
  },

  getCurrentUser(portal: Portal): AuthUser | null {
    return readStoredUser(sessionKey(portal))
  },

  getDemoMode(): DemoModeState | null {
    return readDemoMode()
  },

  getImpersonation(): ImpersonationState | null {
    return readImpersonation()
  },

  /**
   * Super-admin entra no sistema como o e-mail alvo (gestor ou equipe).
   * Mantém a sessão Auth do super-admin; troca tenant/AppData e sessão de portal.
   */
  async startImpersonation(email: string): Promise<{
    authUser: AuthUser
    portal: Portal
    route: string
  }> {
    const existing = readImpersonation()
    const actor = existing?.returnGestorUser ?? this.getGestorUser()
    if (!actor || !isSuperAdminEmail(actor.email)) {
      throw new Error('Faça login como super administrador para personificar contas')
    }

    const resolved = await resolveImpersonation(email)
    const returnTenantId = existing?.returnTenantId ?? getTenantId()
    const returnOrgCode = existing?.returnOrgCode ?? getStoredOrgCode()

    // Limpa sessões de equipe antes de montar a personificação
    this.clearClinicaOrdenadorSessions()
    writeDemoMode(null)

    const payload = {
      ...generateEmptyTenantData(),
      ...resolved.app_payload,
      tenantMeta: {
        orgCode: resolved.org_code,
        ownerEmail: resolved.owner_email,
        ownerUid: resolved.tenant_id,
        createdAt: resolved.app_payload.tenantMeta?.createdAt ?? new Date().toISOString(),
      },
    }

    setTenantId(resolved.tenant_id)
    setStoredOrgCode(resolved.org_code)
    applyRemoteAppData(payload)

    const data = loadAppData()
    let user =
      data.usuarios.find((u) => u.id === resolved.app_user_id && u.ativo) ??
      data.usuarios.find(
        (u) => u.email?.trim().toLowerCase() === resolved.target_email && u.ativo,
      ) ??
      null

    const resolvedPerfil = (resolved.perfil || user?.perfil || 'CLINICA').toUpperCase() as UserRole

    if (!user && resolved.is_gestor) {
      user =
        data.usuarios.find((u) => u.perfil === 'GESTOR' && u.ativo) ??
        ({
          id: resolved.app_user_id || `user-owner-${resolved.tenant_id}`,
          nome: resolved.nome || resolved.target_email.split('@')[0] || 'Gestor',
          posto: '',
          graduacao: 'Gestor Geral',
          login: 'gestor',
          email: resolved.target_email,
          perfil: 'GESTOR' as UserRole,
          clinicaId: null,
          ativo: true,
        } satisfies User)
    }

    if (!user) {
      user = {
        id: resolved.app_user_id || `user-impersonate-${Date.now()}`,
        nome: resolved.nome || resolved.target_email.split('@')[0] || 'Usuário',
        posto: '',
        graduacao: resolvedPerfil,
        login: resolved.target_email.split('@')[0] || 'user',
        email: resolved.target_email,
        perfil: resolvedPerfil,
        clinicaId: null,
        ativo: true,
      }
    } else if (!resolved.is_gestor && user.perfil !== resolvedPerfil && resolvedPerfil) {
      user = { ...user, perfil: resolvedPerfil, email: resolved.target_email }
    }

    writeImpersonation({
      targetEmail: resolved.target_email,
      tenantId: resolved.tenant_id,
      returnTenantId,
      returnOrgCode,
      returnGestorUser: actor,
    })

    if (resolved.is_gestor || canAccessGestorRoute(user.perfil)) {
      const authUser = await completePortalLogin('gestor', user, { skipReload: true })
      return { authUser, portal: 'gestor', route: '/gestor/dashboard' }
    }

    const portal = portalForPerfil(user.perfil)
    const authUser = await completePortalLogin(portal, user, { skipReload: true })
    // Personificação de equipe: não manter sessão de gestor na UI
    setSession('gestor', null)

    const homeRoute = getHomeRouteForPerfil(user.perfil)
    if (homeRoute === '/login') {
      throw new Error(
        `Perfil "${user.perfil}" do e-mail ${resolved.target_email} não tem portal de acesso definido`,
      )
    }

    return {
      authUser,
      portal,
      route: homeRoute,
    }
  },

  async endImpersonation(): Promise<{ route: string }> {
    const state = readImpersonation()
    if (!state) {
      throw new Error('Nenhuma personificação ativa')
    }

    this.clearClinicaOrdenadorSessions()
    writeImpersonation(null)

    setTenantId(state.returnTenantId)
    setStoredOrgCode(state.returnOrgCode)
    clearAppDataCache()

    if (state.returnTenantId) {
      await hydrateLocalCacheFromSupabase((data) => {
        applyRemoteAppData(data)
      })
    }

    await completePortalLogin('gestor', state.returnGestorUser)
    return { route: '/gestor/dashboard' }
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

  async endDemoMode(): Promise<void> {
    // Apaga o armazenamento local da demonstração (aba Timeline → Demonstração).
    await wipeDemoAppDataStore()
    // Evita que o cache em memória continue com dados da sessão demo.
    clearAppDataCache()
    writeDemoMode(null)
  },

  clearClinicaOrdenadorSessions(): void {
    storageRemove(CLINICA_AUTH_KEY)
    storageRemove(ORDENADOR_AUTH_KEY)
    storageRemove(FINANCEIRO_AUTH_KEY)
  },

  async prepareTimelineEntry(): Promise<void> {
    // Não destruir sessão de personificação do super-admin
    if (readImpersonation()) return

    this.clearClinicaOrdenadorSessions()
    if (useSupabaseDataSource()) {
      await supabaseAuthAdapter.signOut()
    }
  },

  async requestPasswordReset(email: string): Promise<void> {
    const marinhaEmail = assertMarinhaEmail(email)
    if (!useSupabaseDataSource()) {
      throw new Error(
        'A recuperação de senha está disponível apenas com autenticação em nuvem (Supabase).',
      )
    }
    try {
      await supabaseAuthAdapter.resetPasswordForEmail(
        marinhaEmail,
        passwordResetRedirectUrl(),
      )
    } catch (error) {
      // Já vem mapeado pelo adapter; não remapeia de novo.
      const raw = getAuthErrorMessage(error)
      if (raw) throw new Error(raw)
      throw mapSupabaseAuthError(error)
    }
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
