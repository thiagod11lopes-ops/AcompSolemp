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
  recovery_email: string | null
  perfil: string
}

export async function getProfileForCurrentUser(): Promise<ProfileRecord | null> {
  const client = getSupabaseClient()
  const { data: sessionData } = await client.auth.getSession()
  const userId = sessionData.session?.user?.id
  if (!userId) return null

  const { data, error } = await client
    .from('profiles')
    .select('id, tenant_id, app_user_id, email, recovery_email, perfil')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as ProfileRecord | null
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
  recoveryEmail?: string | null
  displayName?: string | null
  initialAppData: AppData
}): Promise<{ tenant: TenantRecord; profile: ProfileRecord; owner: import('@/types').User }> {
  const client = getSupabaseClient()
  const existing = await getProfileForCurrentUser()
  if (existing) {
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

  const recoveryEmail = input.recoveryEmail?.trim().toLowerCase() || null
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .insert({
      id: input.authUserId,
      tenant_id: tenant.id,
      app_user_id: appUserId,
      email: input.email,
      recovery_email: recoveryEmail,
      perfil: 'GESTOR',
    })
    .select('id, tenant_id, app_user_id, email, recovery_email, perfil')
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
  const { error } = await getSupabaseClient().from('email_access').upsert(
    {
      email: input.email.trim().toLowerCase(),
      tenant_id: input.tenantId,
      app_user_id: input.appUserId,
      perfil: input.perfil,
      clinica_id: input.clinicaId ?? null,
      nome: input.nome ?? null,
    },
    { onConflict: 'email' },
  )
  if (error) throw new Error(error.message)
}

export async function removeEmailAccess(email: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('email_access')
    .delete()
    .eq('email', email.trim().toLowerCase())
  if (error) throw new Error(error.message)
}

export async function getEmailAccess(email: string): Promise<{
  email: string
  tenant_id: string
  app_user_id: string
  perfil: string
  clinica_id: string | null
  nome: string | null
} | null> {
  const { data, error } = await getSupabaseClient().rpc('lookup_email_access', {
    p_email: email.trim().toLowerCase(),
  })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  return row ?? null
}

/** E-mail Auth (Gmail de recuperação) a partir do e-mail @marinha.mil.br. */
export async function lookupAuthEmailByMarinha(marinhaEmail: string): Promise<string | null> {
  const { data, error } = await getSupabaseClient().rpc('lookup_auth_email_by_marinha', {
    p_marinha: marinhaEmail.trim().toLowerCase(),
  })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  const authEmail = row?.auth_email
  return typeof authEmail === 'string' && authEmail.trim() ? authEmail.trim().toLowerCase() : null
}

