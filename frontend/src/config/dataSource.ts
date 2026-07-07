import { env, isFirebaseConfigured } from '@/config/env'

export function useFirebaseDataSource(): boolean {
  return env.isFirebase && isFirebaseConfigured()
}

/** Sessão de demonstração (/gestor/demo/*) — dados locais isolados da nuvem */
export function isDemoDataSession(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.pathname.startsWith('/gestor/demo')
}

/** AppData na nuvem (Firestore) — desativado no modo demonstração */
export function useCloudAppDataSync(): boolean {
  return useFirebaseDataSource() && !isDemoDataSession()
}

/** AppData persistido no IndexedDB (produção local ou demonstração) */
export function usesIndexedDbAppData(): boolean {
  return !useFirebaseDataSource() || isDemoDataSession()
}

export function getActiveDataSourceLabel(): string {
  if (isDemoDataSession()) return 'Demonstração (IndexedDB)'
  return useFirebaseDataSource() ? 'Firebase' : 'Local (IndexedDB)'
}
