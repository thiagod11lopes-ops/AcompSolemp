import type { AppData } from '@/types'
import {
  loadAppData,
  reloadAppDataFromStorage,
  saveAppData,
} from '@/mocks/seed'
import type { AppDataRepository } from '@/data/repositories/types'

export class LocalAppDataRepository implements AppDataRepository {
  load(): AppData {
    return loadAppData()
  }

  save(data: AppData): void {
    saveAppData(data)
  }

  reload(): AppData {
    return reloadAppDataFromStorage()
  }
}
