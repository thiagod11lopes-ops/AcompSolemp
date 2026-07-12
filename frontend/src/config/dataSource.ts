import { env, isSupabaseConfigured } from '@/config/env'
import { getAppRoutePath, isDemoRoutePath } from '@/utils/portalPaths'

/** Sessão de demonstração (/gestor/demo/*) — dados locais isolados da nuvem */
export function isDemoDataSession(): boolean {
  if (typeof window === 'undefined') return false
  return isDemoRoutePath(getAppRoutePath())
}

export function useSupabaseDataSource(): boolean {
  return env.isSupabase && isSupabaseConfigured()
}

/** AppData na nuvem (Supabase) — desativado no modo demonstração */
export function useCloudAppDataSync(): boolean {
  return useSupabaseDataSource() && !isDemoDataSession()
}

/** AppData persistido no IndexedDB (produção local ou demonstração) */
export function usesIndexedDbAppData(): boolean {
  return !useSupabaseDataSource() || isDemoDataSession()
}

export function getActiveDataSourceLabel(): string {
  if (isDemoDataSession()) return 'Demonstração (IndexedDB)'
  return useSupabaseDataSource() ? 'Supabase' : 'Local (IndexedDB)'
}
