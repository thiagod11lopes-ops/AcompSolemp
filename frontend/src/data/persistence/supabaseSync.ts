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
import { STORAGE_KEYS, storageGet } from '@/storage/indexedDb'

let syncTimer: ReturnType<typeof setTimeout> | null = null
let pendingData: AppData | null = null
let pendingVersion = APP_DATA_SEED_VERSION
let flushPromise: Promise<void> | null = null
/** Marca o último flush local para o poll não aplicar snapshot mais antigo. */
let lastLocalFlushAtMs = 0
/** Momento da última mutação local (saveAppData) — bloqueia overwrite remoto prematuro. */
let lastLocalMutationAtMs = 0
/** Sequência monotônica dos schedules — descarta import() atrasado com snapshot velho. */
let latestScheduleSeq = 0
/** Invalida uploads em voo (ex.: seed fictício) para o restore real prevalecer. */
let writeEpoch = 0

function isFictionalDashboardSeedActive(): boolean {
  return storageGet(STORAGE_KEYS.FICTIONAL_ACTIVE) === '1'
}

export function getLastLocalAppDataFlushAtMs(): number {
  return lastLocalFlushAtMs
}

export function getLastLocalAppDataMutationAtMs(): number {
  return lastLocalMutationAtMs
}

/** True enquanto há upload local pendente ou em andamento. */
export function isLocalAppDataSyncInFlight(): boolean {
  return Boolean(flushPromise || syncTimer || pendingData)
}

/** True nos segundos após mutação/flush local — prioriza o fluxo da planilha. */
export function shouldPreferLocalAppData(graceMs = 12_000): boolean {
  if (isLocalAppDataSyncInFlight()) return true
  const localMark = Math.max(lastLocalFlushAtMs, lastLocalMutationAtMs)
  if (!localMark) return false
  return Date.now() - localMark < graceMs
}

/**
 * True quando o remoto não deve sobrescrever o estado local.
 * Cobre: snapshot mais antigo, flush em voo e janela de graça pós-mutação.
 */
export function shouldIgnoreRemoteAppData(remoteUpdatedAtMs: number): boolean {
  if (!Number.isFinite(remoteUpdatedAtMs)) return false
  // Nunca aplicar remoto enquanto ainda estamos gravando o estado local.
  if (isLocalAppDataSyncInFlight()) return true

  const localMark = Math.max(lastLocalFlushAtMs, lastLocalMutationAtMs)
  if (!localMark) return false

  // Janela ampla: sync antigo não pode apagar receber/enviar/pedido no fluxo.
  const GRACE_MS = 12_000
  if (Date.now() - localMark < GRACE_MS) {
    // Só aceita remoto claramente posterior ao flush (outro usuário / eco do próprio save).
    return remoteUpdatedAtMs <= localMark + 1_500
  }

  return remoteUpdatedAtMs < localMark - 2_000
}

/** Cancela sync pendente e invalida uploads em andamento do seed fictício. */
export function invalidateSupabaseAppDataSyncGeneration(): void {
  writeEpoch += 1
  latestScheduleSeq += 1
  pendingData = null
  if (syncTimer) {
    clearTimeout(syncTimer)
    syncTimer = null
  }
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

/**
 * Agenda sync com a nuvem.
 * @param scheduleSeq sequência do persist local — schedules atrasados (import dinâmico) são ignorados.
 */
export function scheduleSupabaseAppDataSync(
  data: AppData,
  version: string = APP_DATA_SEED_VERSION,
  scheduleSeq?: number,
): void {
  if (!useCloudAppDataSync()) return
  // Seed fictício do dashboard nunca sobe para o Supabase.
  if (isFictionalDashboardSeedActive()) return

  const seq = scheduleSeq ?? ++latestScheduleSeq
  if (seq < latestScheduleSeq) return
  latestScheduleSeq = seq
  lastLocalMutationAtMs = Date.now()
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
  if (isFictionalDashboardSeedActive()) {
    pendingData = null
    if (syncTimer) {
      clearTimeout(syncTimer)
      syncTimer = null
    }
    return
  }
  if (syncTimer) {
    clearTimeout(syncTimer)
    syncTimer = null
  }

  // Se já há upload em andamento, espera e em seguida envia o snapshot mais recente
  // (evita descartar anexos/planilha gravados enquanto o flush anterior ainda rodava).
  if (flushPromise) {
    try {
      await flushPromise
    } catch {
      // Continua para tentar o pending/local atual.
    }
  }

  // Seed pode ter sido ativado enquanto aguardávamos um flush antigo.
  if (isFictionalDashboardSeedActive()) {
    pendingData = null
    return
  }

  // saveAppData agenda o sync via import() dinâmico — se flush rodar antes,
  // pendingData ainda é null e a gravação na nuvem era ignorada (1º cadastro sumia).
  if (!pendingData) {
    const { loadAppData } = await import('@/mocks/seed')
    pendingData = loadAppData()
    pendingVersion = APP_DATA_SEED_VERSION
  }

  const data = pendingData
  const version = pendingVersion
  pendingData = null
  const epoch = writeEpoch

  flushPromise = saveAppDataToSupabase(data, version)
    .then(() => {
      if (epoch !== writeEpoch) return
      lastLocalFlushAtMs = Date.now()
    })
    .catch((error) => {
      if (epoch === writeEpoch) {
        pendingData = data
        pendingVersion = version
      }
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
  onRemote: (data: AppData, updatedAtMs: number) => void,
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
          updated_at?: string
        } | null
        if (!row?.payload) return
        try {
          const updatedAt = row.updated_at ?? new Date().toISOString()
          const updatedAtMs = Date.parse(updatedAt)
          if (shouldIgnoreRemoteAppData(updatedAtMs)) return
          const snapshot = {
            version: row.version ?? APP_DATA_SEED_VERSION,
            payload:
              typeof row.payload === 'string'
                ? row.payload
                : JSON.stringify(row.payload),
            updatedAt,
          }
          onRemote(deserializeAppData(snapshot), updatedAtMs)
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
