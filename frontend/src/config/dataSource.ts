import { env, isSupabaseConfigured } from '@/config/env'
import { STORAGE_KEYS, storageGet, storageRemove, storageSet } from '@/storage/indexedDb'
import { getAppRoutePath, isDemoRoutePath } from '@/utils/portalPaths'

/** Sessão de demonstração (/gestor/demo/*) — dados locais isolados da nuvem */
export function isDemoDataSession(): boolean {
  if (typeof window === 'undefined') return false
  return isDemoRoutePath(getAppRoutePath())
}

/** Acesso direto sem senha — usa IndexedDB local, sem Auth/Supabase */
export function isOpenAccessSession(): boolean {
  if (typeof window === 'undefined') return false
  return storageGet(STORAGE_KEYS.AUTH_OPEN_ACCESS) === '1'
}

export function setOpenAccessSession(enabled: boolean): void {
  if (enabled) storageSet(STORAGE_KEYS.AUTH_OPEN_ACCESS, '1')
  else storageRemove(STORAGE_KEYS.AUTH_OPEN_ACCESS)
}

export function useSupabaseDataSource(): boolean {
  return env.isSupabase && isSupabaseConfigured()
}

/** AppData na nuvem (Supabase) — desativado no modo demonstração e no acesso sem senha */
export function useCloudAppDataSync(): boolean {
  return useSupabaseDataSource() && !isDemoDataSession() && !isOpenAccessSession()
}

/** AppData persistido no IndexedDB (produção local, demonstração ou acesso sem senha) */
export function usesIndexedDbAppData(): boolean {
  return !useSupabaseDataSource() || isDemoDataSession() || isOpenAccessSession()
}

export function getActiveDataSourceLabel(): string {
  if (isDemoDataSession()) return 'Demonstração (IndexedDB)'
  if (isOpenAccessSession()) return 'Acesso sem senha (IndexedDB)'
  return useSupabaseDataSource() ? 'Supabase' : 'Local (IndexedDB)'
}
