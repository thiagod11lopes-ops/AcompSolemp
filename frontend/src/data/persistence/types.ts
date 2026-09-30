import type { AppData } from '@/types'
import { stripAnexoBase64FromAppData } from '@/data/persistence/appDataAnexoSanitize'

export const APP_DATA_SEED_VERSION = 'v15'

export interface AppDataSnapshot {
  version: string
  payload: string
  updatedAt: string
}

export interface AppDataPersistence {
  /** Lê snapshot remoto; null se inexistente */
  load(): Promise<AppDataSnapshot | null>
  /** Persiste snapshot remoto */
  save(data: AppData, version: string): Promise<void>
}

export function serializeAppData(data: AppData, version: string): AppDataSnapshot {
  return {
    version,
    payload: JSON.stringify(data),
    updatedAt: new Date().toISOString(),
  }
}

export function deserializeAppData(snapshot: AppDataSnapshot): AppData {
  const data = JSON.parse(snapshot.payload) as AppData
  // Fase 1: não reintroduzir base64 do snapshot cloud na memória.
  return stripAnexoBase64FromAppData(data)
}
