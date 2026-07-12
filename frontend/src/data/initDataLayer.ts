import { isDemoDataSession, getActiveDataSourceLabel } from '@/config/dataSource'
import { getRepositories } from '@/data/repositories'
import { initAppData } from '@/mocks/seed'
import type { AppData } from '@/types'

export async function initDataLayer(): Promise<void> {
  if (isDemoDataSession()) {
    const { initDemoAppData } = await import('@/services/demoCadastrosService')
    await initDemoAppData()
    return
  }

  initAppData()

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
