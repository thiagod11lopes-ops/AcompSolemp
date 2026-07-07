import { useFirebaseDataSource } from '@/config/dataSource'
import { firebaseAuthAdapter } from '@/firebase/authAdapter'
import { getFirebaseAuth, initFirebase } from '@/firebase/app'
import { hydrateLocalCacheFromFirebase } from '@/data/persistence/firebaseSync'
import { getRepositories } from '@/data/repositories'
import { applyRemoteAppData, initAppData } from '@/mocks/seed'
import { getTenantId, setTenantId } from '@/services/tenantService'
import { STORAGE_KEYS, storageRemove } from '@/storage/indexedDb'
import type { AppData } from '@/types'

export async function initDataLayer(): Promise<void> {
  if (!useFirebaseDataSource()) {
    initAppData()
    return
  }

  initFirebase()
  storageRemove(STORAGE_KEYS.APP_DATA)
  initAppData()

  await firebaseAuthAdapter.waitForAuthReady()
  const authUser = getFirebaseAuth().currentUser

  if (authUser && !authUser.isAnonymous) {
    setTenantId(authUser.uid)
  }

  if (getTenantId()) {
    await hydrateLocalCacheFromFirebase((data: AppData) => {
      applyRemoteAppData(data)
    })
  }

  if (import.meta.env.DEV) {
    const { getActiveDataSourceLabel } = await import('@/config/dataSource')
    console.info(`[AcompSolemp] Fonte de dados: ${getActiveDataSourceLabel()}`)
  }
}

export { getRepositories }

export function loadAppDataSnapshot(): AppData {
  return getRepositories().appData.load()
}

export function saveAppDataSnapshot(data: AppData): void {
  getRepositories().appData.save(data)
}

export function reloadAppDataSnapshot(): AppData {
  return getRepositories().appData.reload()
}
