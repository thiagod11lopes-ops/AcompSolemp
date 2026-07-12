import { isDemoDataSession, useSupabaseDataSource, getActiveDataSourceLabel } from '@/config/dataSource'
import { getRepositories } from '@/data/repositories'
import { applyRemoteAppData, initAppData } from '@/mocks/seed'
import { getProfileForCurrentUser } from '@/data/persistence/supabaseTenant'
import { hydrateLocalCacheFromSupabase } from '@/data/persistence/supabaseSync'
import { supabaseAuthAdapter } from '@/supabase/authAdapter'
import { setTenantId } from '@/services/tenantService'
import { STORAGE_KEYS, storageRemove } from '@/storage/indexedDb'
import type { AppData } from '@/types'

export async function initDataLayer(): Promise<void> {
  if (isDemoDataSession()) {
    const { initDemoAppData } = await import('@/services/demoCadastrosService')
    await initDemoAppData()
    return
  }

  if (!useSupabaseDataSource()) {
    initAppData()
    if (import.meta.env.DEV) {
      console.info(`[AcompSolemp] Fonte de dados: ${getActiveDataSourceLabel()}`)
    }
    return
  }

  storageRemove(STORAGE_KEYS.APP_DATA)
  initAppData()
  await supabaseAuthAdapter.waitForAuthReady()

  const profile = await getProfileForCurrentUser()
  if (profile) {
    setTenantId(profile.tenant_id)
    await hydrateLocalCacheFromSupabase((data: AppData) => {
      applyRemoteAppData(data)
    })
  }

  if (import.meta.env.DEV) {
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

export async function syncRemoteDataWhenAuthenticated(): Promise<boolean> {
  if (!useSupabaseDataSource()) return false
  const profile = await getProfileForCurrentUser()
  if (!profile) return false
  setTenantId(profile.tenant_id)
  return hydrateLocalCacheFromSupabase((data: AppData) => {
    applyRemoteAppData(data)
  })
}
