import type { AppData } from '@/types'
import { useFirebaseDataSource } from '@/config/dataSource'
import { initFirebase } from '@/firebase/app'
import { applyRemoteAppData } from '@/mocks/seed'
import { syncOrgCodeClinicas } from '@/data/persistence/tenantPersistence'
import {
  createFirebaseAppDataPersistence,
  loadAppDataFromFirebase,
} from '@/data/persistence/firebaseAppDataPersistence'
import { getTenantId } from '@/services/tenantService'

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

/** Carrega AppData do Firestore para o cache em memória */
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
  if (!useFirebaseDataSource()) return

  syncQueue = syncQueue
    .then(async () => {
      await ensureFirebasePersistence()
      await createFirebaseAppDataPersistence().save(data, version)

      const tenantId = getTenantId()
      const orgCode = data.tenantMeta?.orgCode
      if (tenantId && orgCode) {
        await syncOrgCodeClinicas(
          orgCode,
          tenantId,
          data.clinicas.map((clinica) => ({
            id: clinica.id,
            nome: clinica.nome,
            login: data.usuarios.find(
              (user) => user.clinicaId === clinica.id && user.perfil === 'CLINICA' && user.ativo,
            )?.login,
          })),
        )
      }
    })
    .catch((error) => {
      console.error('[Firebase] Falha ao sincronizar AppData:', error)
    })
}

export async function flushFirebaseAppDataSync(): Promise<void> {
  await syncQueue
}
