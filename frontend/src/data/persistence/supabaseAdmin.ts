import { getSupabaseClient } from '@/supabase/client'
import { assertMarinhaEmail, normalizeEmailKey, SUPER_ADMIN_EMAIL } from '@/utils/email'
import type { AppData } from '@/types'

export interface ActiveGestorRow {
  email: string
  tenant_id: string
  org_code: string
  paused: boolean
  team_count: number
}

export interface GestorTeamEmailRow {
  email: string
  perfil: string
  nome: string
  paused: boolean
  is_gestor: boolean
}

export interface ImpersonationResolveResult {
  target_email: string
  tenant_id: string
  org_code: string
  owner_email: string
  perfil: string
  app_user_id: string
  nome: string
  is_gestor: boolean
  app_version: string
  app_payload: AppData
}

export async function isAccountPaused(email: string): Promise<boolean> {
  const { data, error } = await getSupabaseClient().rpc('is_account_paused', {
    p_email: normalizeEmailKey(email),
  })
  if (error) throw new Error(error.message)
  return Boolean(data)
}

export async function listActiveGestores(): Promise<ActiveGestorRow[]> {
  const { data, error } = await getSupabaseClient().rpc('list_active_gestores')
  if (error) throw new Error(error.message)
  const rows = Array.isArray(data) ? data : []
  return rows
    .map((row) => ({
      email: String(row.result_email ?? row.email ?? '').toLowerCase(),
      tenant_id: String(row.result_tenant_id ?? row.tenant_id ?? ''),
      org_code: String(row.result_org_code ?? row.org_code ?? ''),
      paused: Boolean(row.result_paused ?? row.paused),
      team_count: Number(row.result_team_count ?? row.team_count ?? 0),
    }))
    .filter((row) => row.email && row.email !== SUPER_ADMIN_EMAIL)
}

export async function listGestorTeamEmails(gestorEmail: string): Promise<GestorTeamEmailRow[]> {
  const { data, error } = await getSupabaseClient().rpc('list_gestor_team_emails', {
    p_gestor_email: assertMarinhaEmail(gestorEmail),
  })
  if (error) throw new Error(error.message)
  const rows = Array.isArray(data) ? data : []
  return rows
    .map((row) => ({
      email: String(row.result_email ?? row.email ?? '').toLowerCase(),
      perfil: String(row.result_perfil ?? row.perfil ?? ''),
      nome: String(row.result_nome ?? row.nome ?? ''),
      paused: Boolean(row.result_paused ?? row.paused),
      is_gestor: Boolean(row.result_is_gestor ?? row.is_gestor),
    }))
    .filter((row) => row.email && row.email !== SUPER_ADMIN_EMAIL)
}

export async function setAccountPaused(email: string, paused: boolean): Promise<boolean> {
  const { data, error } = await getSupabaseClient().rpc('set_account_paused', {
    p_email: assertMarinhaEmail(email),
    p_paused: paused,
  })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  return Boolean(row?.result_paused ?? row?.paused)
}

export async function assertAccountNotPaused(email: string): Promise<void> {
  const paused = await isAccountPaused(email)
  if (paused) {
    throw new Error(
      'Esta conta está pausada pelo administrador do sistema. Entre em contato com o suporte.',
    )
  }
}

export async function resolveImpersonation(email: string): Promise<ImpersonationResolveResult> {
  const { data, error } = await getSupabaseClient().rpc('admin_resolve_impersonation', {
    p_email: assertMarinhaEmail(email),
  })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('E-mail não encontrado no sistema')

  const payloadRaw = row.result_app_payload ?? row.app_payload
  const payload =
    payloadRaw && typeof payloadRaw === 'object'
      ? (payloadRaw as AppData)
      : ({ usuarios: [] } as unknown as AppData)

  return {
    target_email: String(row.result_target_email ?? row.target_email ?? '').toLowerCase(),
    tenant_id: String(row.result_tenant_id ?? row.tenant_id ?? ''),
    org_code: String(row.result_org_code ?? row.org_code ?? ''),
    owner_email: String(row.result_owner_email ?? row.owner_email ?? '').toLowerCase(),
    perfil: String(row.result_perfil ?? row.perfil ?? 'CLINICA').toUpperCase(),
    app_user_id: String(row.result_app_user_id ?? row.app_user_id ?? ''),
    nome: String(row.result_nome ?? row.nome ?? ''),
    is_gestor: Boolean(row.result_is_gestor ?? row.is_gestor),
    app_version: String(row.result_app_version ?? row.app_version ?? 'v16'),
    app_payload: payload,
  }
}

export async function adminLoadAppState(tenantId: string): Promise<{
  version: string
  payload: AppData
} | null> {
  const { data, error } = await getSupabaseClient().rpc('admin_get_app_state', {
    p_tenant_id: tenantId,
  })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  const payloadRaw = row.result_payload ?? row.payload
  return {
    version: String(row.result_version ?? row.version ?? 'v16'),
    payload:
      payloadRaw && typeof payloadRaw === 'object'
        ? (payloadRaw as AppData)
        : ({ usuarios: [] } as unknown as AppData),
  }
}

export async function adminSaveAppState(
  tenantId: string,
  version: string,
  payload: AppData,
): Promise<void> {
  const { error } = await getSupabaseClient().rpc('admin_save_app_state', {
    p_tenant_id: tenantId,
    p_version: version,
    p_payload: payload,
  })
  if (error) throw new Error(error.message)
}
