import { useCloudAppDataSync } from '@/config/dataSource'
import {
  deserializeAppData,
  loadAppDataFromSupabase,
  saveAppDataToSupabase,
} from '@/data/persistence/supabaseAppDataPersistence'
import { APP_DATA_SEED_VERSION } from '@/data/persistence/types'
import type { AppData } from '@/types'
import { getTenantId } from '@/services/tenantService'
import { getSupabaseClient } from '@/supabase/client'

let syncTimer: ReturnType<typeof setTimeout> | null = null
let pendingData: AppData | null = null
let pendingVersion = APP_DATA_SEED_VERSION
let flushPromise: Promise<void> | null = null
/** Marca o último flush local para o poll não aplicar snapshot mais antigo. */
let lastLocalFlushAtMs = 0

export function getLastLocalAppDataFlushAtMs(): number {
  return lastLocalFlushAtMs
}

export async function hydrateLocalCacheFromSupabase(
  apply: (data: AppData) => void,
): Promise<boolean> {
  if (!useCloudAppDataSync()) return false
  const tenantId = getTenantId()
  if (!tenantId) return false

  const snapshot = await loadAppDataFromSupabase(tenantId)
  if (!snapshot) return false

  apply(deserializeAppData(snapshot))
  return true
}

export async function refreshAppDataFromCloud(): Promise<AppData | null> {
  const snapshot = await loadAppDataFromSupabase()
  if (!snapshot) return null
  return deserializeAppData(snapshot)
}

export function scheduleSupabaseAppDataSync(
  data: AppData,
  version: string = APP_DATA_SEED_VERSION,
): void {
  if (!useCloudAppDataSync()) return
  pendingData = data
  pendingVersion = version
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    void flushSupabaseAppDataSync()
  }, 150)
}

export async function flushSupabaseAppDataSync(): Promise<void> {
  if (!useCloudAppDataSync()) return
  if (syncTimer) {
    clearTimeout(syncTimer)
    syncTimer = null
  }

  // saveAppData agenda o sync via import() dinâmico — se flush rodar antes,
  // pendingData ainda é null e a gravação na nuvem era ignorada (1º cadastro sumia).
  if (!pendingData) {
    const { loadAppData } = await import('@/mocks/seed')
    pendingData = loadAppData()
    pendingVersion = APP_DATA_SEED_VERSION
  }

  if (flushPromise) return flushPromise

  const data = pendingData
  const version = pendingVersion
  pendingData = null

  flushPromise = saveAppDataToSupabase(data, version)
    .then(() => {
      lastLocalFlushAtMs = Date.now()
    })
    .catch((error) => {
      pendingData = data
      pendingVersion = version
      throw error
    })
    .finally(() => {
      flushPromise = null
    })

  return flushPromise
}

/**
 * Escuta alterações de `app_state` no Supabase e aplica o payload remoto.
 * Necessário para que outro usuário (ex.: ordenador) veja envio/devolução na hora.
 */
export function subscribeAppStateRealtime(
  onRemote: (data: AppData) => void,
): () => void {
  if (!useCloudAppDataSync()) return () => undefined
  const tenantId = getTenantId()
  if (!tenantId) return () => undefined

  const client = getSupabaseClient()
  const channel = client
    .channel(`app_state:${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'app_state',
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        const row = (payload.new ?? null) as {
          payload?: unknown
          version?: string
        } | null
        if (!row?.payload) return
        try {
          const snapshot = {
            version: row.version ?? APP_DATA_SEED_VERSION,
            payload:
              typeof row.payload === 'string'
                ? row.payload
                : JSON.stringify(row.payload),
            updatedAt: new Date().toISOString(),
          }
          onRemote(deserializeAppData(snapshot))
        } catch (error) {
          console.warn('[AcompSolemp] Falha ao aplicar app_state remoto', error)
        }
      },
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}
