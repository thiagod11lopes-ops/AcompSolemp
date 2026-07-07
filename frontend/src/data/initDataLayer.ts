import { useFirebaseDataSource } from '@/config/dataSource'
import { hydrateLocalCacheFromFirebase } from '@/data/persistence/firebaseSync'
import { getRepositories } from '@/data/repositories'
import { applyRemoteAppData, initAppData } from '@/mocks/seed'
import type { AppData } from '@/types'

export async function initDataLayer(): Promise<void> {
  if (!useFirebaseDataSource()) {
    initAppData()
    return
  }

  const hydrated = await hydrateLocalCacheFromFirebase((data: AppData) => {
    applyRemoteAppData(data)
  })

  if (!hydrated) {
    initAppData()
  }

  if (import.meta.env.DEV) {
    const { getActiveDataSourceLabel } = await import('@/config/dataSource')
    console.info(`[AcompSolemp] Fonte de dados: ${getActiveDataSourceLabel()}`)
  }
}

export { getRepositories }

/** API estável para novos módulos — preferir em vez de importar seed diretamente */
export function loadAppDataSnapshot(): AppData {
  return getRepositories().appData.load()
}

export function saveAppDataSnapshot(data: AppData): void {
  getRepositories().appData.save(data)
}

export function reloadAppDataSnapshot(): AppData {
  return getRepositories().appData.reload()
}
