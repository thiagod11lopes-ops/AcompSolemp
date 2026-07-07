import type { AppData } from '@/types'
import { useFirebaseDataSource } from '@/config/dataSource'
import { initFirebase } from '@/firebase/app'
import {
  createFirebaseAppDataPersistence,
  loadAppDataFromFirebase,
} from '@/data/persistence/firebaseAppDataPersistence'

let syncQueue: Promise<void> = Promise.resolve()
let firebaseReady = false

export async function ensureFirebasePersistence(): Promise<boolean> {
  if (!useFirebaseDataSource()) return false
  if (!firebaseReady) {
    initFirebase()
    firebaseReady = true
  }
  return true
}

/** Hidrata cache local a partir do Firestore (fase 1 — snapshot completo) */
export async function hydrateLocalCacheFromFirebase(
  applyData: (data: AppData) => void,
): Promise<boolean> {
  const enabled = await ensureFirebasePersistence()
  if (!enabled) return false

  const remote = await loadAppDataFromFirebase()
  if (!remote) return false

  applyData(remote)
  return true
}

/** Enfileira gravação do snapshot no Firestore após save local */
export function scheduleFirebaseAppDataSync(
  data: AppData,
  version: string,
): void {
  if (!useFirebaseDataSource()) return

  syncQueue = syncQueue
    .then(async () => {
      await ensureFirebasePersistence()
      await createFirebaseAppDataPersistence().save(data, version)
    })
    .catch((error) => {
      console.error('[Firebase] Falha ao sincronizar AppData:', error)
    })
}

export async function flushFirebaseAppDataSync(): Promise<void> {
  await syncQueue
}
