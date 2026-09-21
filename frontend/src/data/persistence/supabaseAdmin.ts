import { getSupabaseClient } from '@/supabase/client'
import { assertMarinhaEmail, normalizeEmailKey } from '@/utils/email'

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
  return rows.map((row) => ({
    email: String(row.email ?? '').toLowerCase(),
    tenant_id: String(row.tenant_id ?? ''),
    org_code: String(row.org_code ?? ''),
    paused: Boolean(row.paused),
    team_count: Number(row.team_count ?? 0),
  }))
}

export async function listGestorTeamEmails(gestorEmail: string): Promise<GestorTeamEmailRow[]> {
  const { data, error } = await getSupabaseClient().rpc('list_gestor_team_emails', {
    p_gestor_email: assertMarinhaEmail(gestorEmail),
  })
  if (error) throw new Error(error.message)
  const rows = Array.isArray(data) ? data : []
  return rows.map((row) => ({
    email: String(row.email ?? '').toLowerCase(),
    perfil: String(row.perfil ?? ''),
    nome: String(row.nome ?? ''),
    paused: Boolean(row.paused),
    is_gestor: Boolean(row.is_gestor),
  }))
}

export async function setAccountPaused(email: string, paused: boolean): Promise<boolean> {
  const { data, error } = await getSupabaseClient().rpc('set_account_paused', {
    p_email: assertMarinhaEmail(email),
    p_paused: paused,
  })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  return Boolean(row?.paused)
}

export async function assertAccountNotPaused(email: string): Promise<void> {
  const paused = await isAccountPaused(email)
  if (paused) {
    throw new Error(
      'Esta conta está pausada pelo administrador do sistema. Entre em contato com o suporte.',
    )
  }
}
