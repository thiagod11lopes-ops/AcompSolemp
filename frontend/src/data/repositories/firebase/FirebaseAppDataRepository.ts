import type { AppData } from '@/types'
import { loadAppData, saveAppData } from '@/mocks/seed'
import { refreshAppDataFromCloud } from '@/data/persistence/firebaseSync'
import type { AppDataRepository } from '@/data/repositories/types'

/** AppData exclusivamente na nuvem — cache só em memória */
export class FirebaseAppDataRepository implements AppDataRepository {
  load(): AppData {
    return loadAppData()
  }

  save(data: AppData): void {
    saveAppData(data)
  }

  reload(): AppData {
    return loadAppData()
  }

  async reloadFromCloud(): Promise<AppData> {
    return refreshAppDataFromCloud()
  }
}
