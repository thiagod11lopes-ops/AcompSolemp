import type { AppData } from '@/types'
import { useCloudAppDataSync } from '@/config/dataSource'
import { initFirebase } from '@/firebase/app'
import { applyRemoteAppData } from '@/mocks/seed'
import { syncOrgCodePublicIndex } from '@/data/persistence/tenantPersistence'
import {
  createFirebaseAppDataPersistence,
  loadAppDataFromFirebase,
} from '@/data/persistence/firebaseAppDataPersistence'

let syncQueue: Promise<void> = Promise.resolve()
let firebaseReady = false

function isPermissionDenied(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'permission-denied'
  )
}

export async function ensureFirebasePersistence(): Promise<boolean> {
  if (!useCloudAppDataSync()) return false
  if (!firebaseReady) {
    initFirebase()
    firebaseReady = true
  }
  return true
}

/** Carrega AppData do Firestore para o cache em memória */
export async function hydrateLocalCacheFromFirebase(
  applyData: (data: AppData) => void,
): Promise<boolean> {
  const enabled = await ensureFirebasePersistence()
  if (!enabled) return false

  try {
    const remote = await loadAppDataFromFirebase()
    if (!remote) return false

    applyData(remote)
    return true
  } catch (error) {
    if (isPermissionDenied(error)) {
      console.warn('[Firebase] Sem permissão para carregar dados remotos')
      return false
    }
    throw error
  }
}

/** Recarrega AppData a partir da nuvem (fonte de verdade em produção) */
export async function refreshAppDataFromCloud(): Promise<AppData> {
  const hydrated = await hydrateLocalCacheFromFirebase(applyRemoteAppData)
  const { loadAppData } = await import('@/mocks/seed')
  if (!hydrated && import.meta.env.DEV) {
    console.info('[AcompSolemp] Firestore sem snapshot — usando cache em memória')
  }
  return loadAppData()
}

/** Enfileira gravação do snapshot no Firestore */
export function scheduleFirebaseAppDataSync(
  data: AppData,
  version: string,
): void {
  if (!useCloudAppDataSync()) return

  syncQueue = syncQueue
    .then(async () => {
      await ensureFirebasePersistence()
      await createFirebaseAppDataPersistence().save(data, version)
      await syncOrgCodePublicIndex(data)
    })
    .catch((error) => {
      console.error('[Firebase] Falha ao sincronizar AppData:', error)
    })
}

export async function flushFirebaseAppDataSync(): Promise<void> {
  await syncQueue
}
