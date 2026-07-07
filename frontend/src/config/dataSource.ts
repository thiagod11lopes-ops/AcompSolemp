import { env, isFirebaseConfigured } from '@/config/env'

export function useFirebaseDataSource(): boolean {
  return env.isFirebase && isFirebaseConfigured()
}

export function getActiveDataSourceLabel(): string {
  return useFirebaseDataSource() ? 'Firebase' : 'Local (IndexedDB)'
}
