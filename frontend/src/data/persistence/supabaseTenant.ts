import { getSupabaseClient } from '@/supabase/client'
import { generateOrgCode } from '@/services/tenantService'
import type { AppData } from '@/types'
import { saveAppDataToSupabase } from '@/data/persistence/supabaseAppDataPersistence'
import { APP_DATA_SEED_VERSION } from '@/data/persistence/types'

export interface TenantRecord {
  id: string
  org_code: string
  owner_user_id: string | null
  owner_email: string
  created_at: string
}

export interface ProfileRecord {
  id: string
  tenant_id: string
  app_user_id: string
  email: string
  perfil: string
}

export async function getProfileForCurrentUser(): Promise<ProfileRecord | null> {
  const client = getSupabaseClient()
  const { data: sessionData } = await client.auth.getSession()
  const userId = sessionData.session?.user?.id
  if (!userId) return null

  const { data, error } = await client
    .from('profiles')
    .select('id, tenant_id, app_user_id, email, perfil')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as ProfileRecord | null
}

/**
 * Remove perfil de equipe órfão (sem email_access) para o e-mail autenticado
 * poder criar Portal do Gestor com banco próprio.
 */
export async function clearOrphanTeamProfileForGestor(): Promise<boolean> {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('clear_orphan_team_profile_for_gestor')
  if (error) {
    // Migration ainda não aplicada: tenta delete direto (pode falhar por RLS).
    if (/could not find the function|does not exist|PGRST202/i.test(error.message)) {
      const profile = await getProfileForCurrentUser()
      if (!profile) return false
      const perfil = profile.perfil?.trim().toUpperCase()
      if (perfil === 'GESTOR' || perfil === 'ADMINISTRADOR') return false
      const access = await getEmailAccess(profile.email)
      if (access) return false
      const { error: delError } = await client.from('profiles').delete().eq('id', profile.id)
      if (delError) return false
      return true
    }
    throw new Error(error.message)
  }
  return Boolean(data)
}

export async function getTenantById(tenantId: string): Promise<TenantRecord | null> {
  const { data, error } = await getSupabaseClient()
    .from('tenants')
    .select('id, org_code, owner_user_id, owner_email, created_at')
    .eq('id', tenantId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as TenantRecord | null
}

async function createUniqueOrgCode(): Promise<string> {
  const client = getSupabaseClient()
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = generateOrgCode()
    const { data } = await client.from('tenants').select('id').eq('org_code', code).maybeSingle()
    if (!data) return code
  }
  throw new Error('Não foi possível gerar código da organização. Tente novamente.')
}

export async function provisionGestorTenant(input: {
  authUserId: string
  email: string
  displayName?: string | null
  initialAppData: AppData
}): Promise<{ tenant: TenantRecord; profile: ProfileRecord; owner: import('@/types').User }> {
  const client = getSupabaseClient()

  // E-mail livre (sem convite): limpa perfil de equipe órfão antes de criar o banco.
  await clearOrphanTeamProfileForGestor()

  const existing = await getProfileForCurrentUser()
  if (existing) {
    const perfil = existing.perfil?.trim().toUpperCase()
    if (perfil !== 'GESTOR' && perfil !== 'ADMINISTRADOR') {
      throw new Error(
        'Este e-mail está vinculado à Timeline da organização. Use a tela da Timeline para entrar.',
      )
    }
    const tenant = await getTenantById(existing.tenant_id)
    if (!tenant) throw new Error('Organização do perfil não encontrada.')
    const ownerId = `user-owner-${tenant.id}`
    const owner =
      input.initialAppData.usuarios.find((u) => u.id === ownerId) ??
      ({
        id: ownerId,
        nome: input.displayName?.trim() || input.email.split('@')[0] || 'Gestor',
        posto: '',
        graduacao: 'Gestor Geral',
        login: 'gestor',
        email: input.email,
        perfil: 'GESTOR' as const,
        clinicaId: null,
        ativo: true,
      })
    return { tenant, profile: existing, owner }
  }

  const orgCode = await createUniqueOrgCode()
  const { data: tenant, error: tenantError } = await client
    .from('tenants')
    .insert({
      org_code: orgCode,
      owner_user_id: input.authUserId,
      owner_email: input.email,
    })
    .select('id, org_code, owner_user_id, owner_email, created_at')
    .single()

  if (tenantError) throw new Error(tenantError.message)

  const appUserId = `user-owner-${tenant.id}`
  const owner = {
    id: appUserId,
    nome: input.displayName?.trim() || input.email.split('@')[0] || 'Gestor',
    posto: '',
    graduacao: 'Gestor Geral',
    login: 'gestor',
    email: input.email,
    perfil: 'GESTOR' as const,
    clinicaId: null,
    ativo: true,
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .insert({
      id: input.authUserId,
      tenant_id: tenant.id,
      app_user_id: appUserId,
      email: input.email,
      perfil: 'GESTOR',
    })
    .select('id, tenant_id, app_user_id, email, perfil')
    .single()

  if (profileError) throw new Error(profileError.message)

  const appData: AppData = {
    ...input.initialAppData,
    usuarios: [owner],
    tenantMeta: {
      orgCode: tenant.org_code,
      ownerEmail: input.email,
      ownerUid: tenant.id,
      createdAt: tenant.created_at,
    },
  }

  await saveAppDataToSupabase(appData, APP_DATA_SEED_VERSION, tenant.id)

  return {
    tenant: tenant as TenantRecord,
    profile: profile as ProfileRecord,
    owner,
  }
}

export async function upsertEmailAccess(input: {
  email: string
  tenantId: string
  appUserId: string
  perfil: string
  clinicaId?: string | null
  nome?: string
}): Promise<void> {
  const email = input.email.trim().toLowerCase()
  const tenant = await getTenantById(input.tenantId)
  const ownerEmail = tenant?.owner_email?.trim().toLowerCase()
  if (ownerEmail && ownerEmail === email) {
    throw new Error(
      'Não é permitido cadastrar o próprio e-mail do gestor. Use outro @marinha.mil.br para a equipe.',
    )
  }

  const client = getSupabaseClient()
  const args = {
    p_email: email,
    p_tenant_id: input.tenantId,
    p_app_user_id: input.appUserId,
    p_perfil: input.perfil,
    p_clinica_id: input.clinicaId ?? null,
    p_nome: input.nome ?? null,
  }

  let { error } = await client.rpc('upsert_email_access_for_tenant', args)

  // Vínculo órfão em outra organização (ex.: exclusão antiga falhou): libera e tenta de novo.
  if (error && /vinculado a outra organização/i.test(error.message)) {
    const { error: freeError } = await client.rpc('decline_team_email_invite', {
      p_email: email,
    })
    if (!freeError) {
      ;({ error } = await client.rpc('upsert_email_access_for_tenant', args))
    }
  }

  if (error) throw new Error(error.message)
}

export async function removeEmailAccess(
  email: string,
  tenantId?: string | null,
): Promise<void> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed) return
  const client = getSupabaseClient()

  const tryRemove = async (withTenant: boolean) => {
    const args = withTenant
      ? { p_email: trimmed, p_tenant_id: tenantId ?? null }
      : { p_email: trimmed }
    return client.rpc('remove_email_access_for_tenant', args)
  }

  let { error } = await tryRemove(Boolean(tenantId))

  // Migration antiga só aceita (p_email) — tenta de novo sem tenant.
  if (
    error &&
    tenantId &&
    /could not find the function|does not exist|PGRST202/i.test(error.message)
  ) {
    ;({ error } = await tryRemove(false))
  }

  if (!error) return

  // Fallback: decline_team_email_invite remove email_access (security definer).
  const { error: declineError } = await client.rpc('decline_team_email_invite', {
    p_email: trimmed,
  })
  if (!declineError) return
  throw new Error(declineError.message || error.message)
}

function normalizeAccessPerfis(row: {
  perfil?: unknown
  perfis?: unknown
}): string[] {
  const fromArray = Array.isArray(row.perfis)
    ? row.perfis
        .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
        .map((p) => p.trim())
    : []
  if (fromArray.length > 0) return [...new Set(fromArray)]
  if (typeof row.perfil === 'string' && row.perfil.trim()) {
    return [row.perfil.trim()]
  }
  return []
}

export async function getEmailAccess(email: string): Promise<{
  email: string
  tenant_id: string
  app_user_id: string
  perfil: string
  clinica_id: string | null
  nome: string | null
  gestor_email: string | null
  /** Todos os setores/tipos liberados no cadastro do gestor. */
  perfis: string[]
} | null> {
  const { data, error } = await getSupabaseClient().rpc('lookup_email_access', {
    p_email: email.trim().toLowerCase(),
  })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  const perfis = normalizeAccessPerfis(row)
  return {
    ...row,
    perfil: typeof row.perfil === 'string' ? row.perfil : perfis[0] ?? '',
    perfis,
    gestor_email:
      typeof row.gestor_email === 'string' && row.gestor_email.trim()
        ? row.gestor_email.trim().toLowerCase()
        : null,
  }
}

/** Remove o e-mail do Cadastros do gestor (recusa de convite na tela de login). */
export async function declineTeamEmailInvite(email: string): Promise<{
  removed: boolean
  gestor_email: string | null
}> {
  const { data, error } = await getSupabaseClient().rpc('decline_team_email_invite', {
    p_email: email.trim().toLowerCase(),
  })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  return {
    removed: Boolean(row?.removed),
    gestor_email:
      typeof row?.gestor_email === 'string' && row.gestor_email.trim()
        ? row.gestor_email.trim().toLowerCase()
        : null,
  }
}

