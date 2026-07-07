import { isDemoDataSession, useFirebaseDataSource } from '@/config/dataSource'
import { firebaseAuthAdapter } from '@/firebase/authAdapter'
import { getFirebaseAuth, initFirebase } from '@/firebase/app'
import { resolvePortalTenantId } from '@/data/persistence/portalUserPersistence'
import { hydrateLocalCacheFromFirebase } from '@/data/persistence/firebaseSync'
import { getRepositories } from '@/data/repositories'
import { applyRemoteAppData, initAppData } from '@/mocks/seed'
import { setTenantId } from '@/services/tenantService'
import { STORAGE_KEYS, storageRemove } from '@/storage/indexedDb'
import type { AppData } from '@/types'

async function resolveTenantFromFirebaseAuth(): Promise<string | null> {
  if (!useFirebaseDataSource()) return null

  initFirebase()
  const mainAuth = getFirebaseAuth()
  await mainAuth.authStateReady()

  const mainUser = mainAuth.currentUser
  if (!mainUser) return null

  const portalTenant = await resolvePortalTenantId(mainUser.uid)
  if (portalTenant) return portalTenant

  return mainUser.uid
}

export async function initDataLayer(): Promise<void> {
  if (isDemoDataSession()) {
    const { initDemoAppData } = await import('@/services/demoCadastrosService')
    await initDemoAppData()
    return
  }

  if (!useFirebaseDataSource()) {
    initAppData()
    return
  }

  initFirebase()
  storageRemove(STORAGE_KEYS.APP_DATA)
  initAppData()

  await firebaseAuthAdapter.waitForAuthReady()

  const tenantId = await resolveTenantFromFirebaseAuth()
  if (tenantId) {
    setTenantId(tenantId)
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

/** Recarrega dados da nuvem quando há sessão Firebase válida */
export async function syncRemoteDataWhenAuthenticated(): Promise<boolean> {
  const tenantId = await resolveTenantFromFirebaseAuth()
  if (!tenantId) return false

  setTenantId(tenantId)
  return hydrateLocalCacheFromFirebase((data: AppData) => {
    applyRemoteAppData(data)
  })
}
