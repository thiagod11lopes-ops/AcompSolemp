import type { NormalizedDomain } from '@/config/normalizedDataFlags'
import {
  isNormalizedDualWriteEnabled,
  isNormalizedReadEnabled,
} from '@/config/normalizedDataFlags'
import { getSupabaseClient } from '@/supabase/client'
import { getTenantId } from '@/services/tenantService'

type JsonRow = { id: string; data: unknown; pedido_id?: string }

/**
 * Dual-write genérico via RPC `sync_domain_rows_from_appdata`.
 * Por padrão falhas são warn (monolito no blob). Domínios críticos (ex.: cadastros)
 * podem exigir sucesso com `options.requireSuccess`.
 */
export async function dualWriteDomainRows(
  domain: NormalizedDomain,
  table: string,
  rows: JsonRow[],
  options?: { requireSuccess?: boolean },
): Promise<void> {
  if (!isNormalizedDualWriteEnabled(domain)) return
  const tenantId = getTenantId()
  if (!tenantId) return

  try {
    const client = getSupabaseClient()
    const { error } = await client.rpc('sync_domain_rows_from_appdata', {
      p_tenant_id: tenantId,
      p_table: table,
      p_rows: rows,
    })
    if (error) {
      console.warn(`[AcompSolemp] dual-write ${domain}:`, error.message)
      if (options?.requireSuccess) {
        throw new Error(`Falha ao gravar ${domain} na nuvem: ${error.message}`)
      }
    }
  } catch (error) {
    console.warn(`[AcompSolemp] dual-write ${domain} indisponível:`, error)
    if (options?.requireSuccess) {
      throw error instanceof Error
        ? error
        : new Error(`Falha ao gravar ${domain} na nuvem`)
    }
  }
}

/** Lê linhas `data` de uma tabela normalizada. */
export async function readDomainRows<T>(
  domain: NormalizedDomain,
  table: string,
): Promise<T[] | null> {
  if (!isNormalizedReadEnabled(domain)) return null
  const tenantId = getTenantId()
  if (!tenantId) return null

  try {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from(table)
      .select('id, data')
      .eq('tenant_id', tenantId)
    if (error) {
      console.warn(`[AcompSolemp] read ${domain}:`, error.message)
      return null
    }
    return (data ?? [])
      .map((row) => row.data as T)
      .filter((row) => row != null)
  } catch (error) {
    console.warn(`[AcompSolemp] read ${domain} indisponível:`, error)
    return null
  }
}
