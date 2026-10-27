import type { AppData, ClinicaPlanilhasLivresState } from '@/types'
import { getTenantId } from '@/services/tenantService'
import { getSupabaseClient } from '@/supabase/client'
import {
  pickRicherPlanilhasState,
  planilhasLivresContentScore,
} from '@/utils/planilhasLivresBackup'

/** Remove clínicas com planilha vazia — evita casca oca no blob apagar o SQL no F5. */
export function omitEmptyPlanilhasLivres(data: AppData): AppData {
  const map = data.planilhasLivres ?? {}
  const next: Record<string, ClinicaPlanilhasLivresState> = {}
  for (const [clinicaId, state] of Object.entries(map)) {
    if (!clinicaId || !state) continue
    if (planilhasLivresContentScore(state) <= 0) continue
    next[clinicaId] = state
  }
  return { ...data, planilhasLivres: next }
}

async function readPlanilhasLivresRows(
  tenantId: string,
): Promise<{ clinica_id: string; data: ClinicaPlanilhasLivresState }[]> {
  const client = getSupabaseClient()

  // Preferência: RPC security definer (robusto após F5).
  const { data: rpcRows, error: rpcError } = await client.rpc(
    'fetch_planilhas_livres_for_tenant',
    { p_tenant_id: tenantId },
  )
  if (!rpcError && Array.isArray(rpcRows)) {
    return rpcRows.map((row) => ({
      clinica_id: String((row as { clinica_id?: string }).clinica_id ?? ''),
      data: (row as { data?: ClinicaPlanilhasLivresState }).data as ClinicaPlanilhasLivresState,
    }))
  }
  if (rpcError && !/could not find the function|does not exist|PGRST202/i.test(rpcError.message)) {
    console.warn('[AcompOPMS] RPC planilhas_livres:', rpcError.message)
  }

  const { data: rows, error } = await client
    .from('planilhas_livres')
    .select('clinica_id, data')
    .eq('tenant_id', tenantId)
  if (error) {
    console.warn('[AcompOPMS] read planilhas_livres:', error.message)
    return []
  }
  return (rows ?? []).map((row) => ({
    clinica_id: String(row.clinica_id ?? ''),
    data: row.data as ClinicaPlanilhasLivresState,
  }))
}

/** Grava planilhasLivres na tabela dedicada do servidor (além do app_state). */
export async function dualWritePlanilhasLivres(data: AppData): Promise<void> {
  const tenantId = getTenantId()
  if (!tenantId) return
  const map = data.planilhasLivres ?? {}

  try {
    const client = getSupabaseClient()
    // Não grava rascunho vazio por cima do SQL. Conteúdo > 0 sobe mesmo se o score
    // caiu (apagar um mês / linhas) — saveState local já bloqueia flush acidental vazio.
    const rows = Object.entries(map)
      .filter(([clinicaId, state]) => {
        if (!clinicaId || !state) return false
        return planilhasLivresContentScore(state) > 0
      })
      .map(([clinicaId, state]) => ({
        tenant_id: tenantId,
        clinica_id: clinicaId,
        data: state as ClinicaPlanilhasLivresState,
        updated_at: new Date().toISOString(),
      }))

    if (rows.length === 0) return

    const { error } = await client.from('planilhas_livres').upsert(rows, {
      onConflict: 'tenant_id,clinica_id',
    })
    if (error) {
      console.warn('[AcompOPMS] dual-write planilhas_livres:', error.message)
    }
  } catch (error) {
    console.warn('[AcompOPMS] dual-write planilhas_livres indisponível:', error)
  }
}

/** Remove planilha da tabela SQL (apagar tudo / clearState). */
export async function deletePlanilhaLivresForClinica(clinicaId: string): Promise<void> {
  const tenantId = getTenantId()
  if (!tenantId || !clinicaId) return
  try {
    const client = getSupabaseClient()
    const { error } = await client
      .from('planilhas_livres')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('clinica_id', clinicaId)
    if (error) {
      console.warn('[AcompOPMS] delete planilhas_livres:', error.message)
    }
  } catch (error) {
    console.warn('[AcompOPMS] delete planilhas_livres indisponível:', error)
  }
}

/** Mescla planilhas da tabela SQL no AppData (fonte servidor). */
export async function mergePlanilhasLivresFromNormalized(data: AppData): Promise<AppData> {
  const tenantId = getTenantId()
  if (!tenantId) return data

  try {
    const rows = await readPlanilhasLivresRows(tenantId)
    if (!rows.length) return omitEmptyPlanilhasLivres(data)

    const next: Record<string, ClinicaPlanilhasLivresState> = {
      ...omitEmptyPlanilhasLivres(data).planilhasLivres,
    }
    for (const row of rows) {
      const clinicaId = row.clinica_id
      const remote = row.data
      if (!clinicaId || !remote) continue
      const local = next[clinicaId]
      const richer = pickRicherPlanilhasState(local, remote)
      if (richer) next[clinicaId] = richer
    }
    return { ...data, planilhasLivres: next }
  } catch (error) {
    console.warn('[AcompOPMS] read planilhas_livres indisponível:', error)
    return data
  }
}

/** Lê planilha de uma clínica direto da tabela SQL do servidor. */
export async function fetchPlanilhaLivresForClinica(
  clinicaId: string,
): Promise<ClinicaPlanilhasLivresState | null> {
  const tenantId = getTenantId()
  if (!tenantId || !clinicaId) return null
  try {
    const rows = await readPlanilhasLivresRows(tenantId)
    const row = rows.find((r) => r.clinica_id === clinicaId)
    return row?.data ?? null
  } catch (error) {
    console.warn('[AcompOPMS] fetch planilhas_livres indisponível:', error)
    return null
  }
}
