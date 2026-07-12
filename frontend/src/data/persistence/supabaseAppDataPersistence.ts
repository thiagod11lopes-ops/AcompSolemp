import type { AppData } from '@/types'
import {
  APP_DATA_SEED_VERSION,
  deserializeAppData,
  serializeAppData,
  type AppDataPersistence,
  type AppDataSnapshot,
} from '@/data/persistence/types'
import { getSupabaseClient } from '@/supabase/client'
import { getTenantId } from '@/services/tenantService'

export async function loadAppDataFromSupabase(
  tenantId?: string | null,
): Promise<AppDataSnapshot | null> {
  const id = tenantId ?? getTenantId()
  if (!id) return null

  const { data, error } = await getSupabaseClient()
    .from('app_state')
    .select('version, payload, updated_at')
    .eq('tenant_id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    version: data.version as string,
    payload:
      typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload),
    updatedAt: data.updated_at as string,
  }
}

export async function saveAppDataToSupabase(
  appData: AppData,
  version: string = APP_DATA_SEED_VERSION,
  tenantId?: string | null,
): Promise<void> {
  const id = tenantId ?? getTenantId()
  if (!id) {
    throw new Error('Tenant não definido para salvar AppData no Supabase.')
  }

  const snapshot = serializeAppData(appData, version)
  const payload = JSON.parse(snapshot.payload) as AppData

  const { error } = await getSupabaseClient().from('app_state').upsert(
    {
      tenant_id: id,
      version: snapshot.version,
      payload,
      updated_at: snapshot.updatedAt,
    },
    { onConflict: 'tenant_id' },
  )

  if (error) throw error
}

export function createSupabaseAppDataPersistence(
  resolveTenantId: () => string | null = getTenantId,
): AppDataPersistence {
  return {
    async load() {
      return loadAppDataFromSupabase(resolveTenantId())
    },
    async save(data, version) {
      await saveAppDataToSupabase(data, version, resolveTenantId())
    },
  }
}

export { deserializeAppData, serializeAppData }
