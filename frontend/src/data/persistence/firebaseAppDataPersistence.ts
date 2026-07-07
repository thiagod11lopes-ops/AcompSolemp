import { doc, getDoc, setDoc } from 'firebase/firestore'
import type { AppData } from '@/types'
import {
  FIRESTORE_APP_STATE_DOC_ID,
  FIRESTORE_COLLECTIONS,
} from '@/firebase/collections'
import { resolveActiveFirestoreDb } from '@/firebase/app'
import { getTenantId } from '@/services/tenantService'
import {
  type AppDataPersistence,
  type AppDataSnapshot,
  deserializeAppData,
  serializeAppData,
} from '@/data/persistence/types'

async function appStateDocRef(tenantId: string) {
  const db = await resolveActiveFirestoreDb()
  return doc(
    db,
    FIRESTORE_COLLECTIONS.tenants,
    tenantId,
    FIRESTORE_COLLECTIONS.appState,
    FIRESTORE_APP_STATE_DOC_ID,
  )
}

export class FirebaseAppDataPersistence implements AppDataPersistence {
  private readonly tenantId: string

  constructor(tenantId: string) {
    this.tenantId = tenantId
  }

  async load(): Promise<AppDataSnapshot | null> {
    const snapshot = await getDoc(await appStateDocRef(this.tenantId))
    if (!snapshot.exists()) return null

    const data = snapshot.data() as Partial<AppDataSnapshot>
    if (!data.payload || !data.version) return null

    return {
      version: data.version,
      payload: data.payload,
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    }
  }

  async save(data: AppData, version: string): Promise<void> {
    const snapshot = serializeAppData(data, version)
    await setDoc(await appStateDocRef(this.tenantId), snapshot, { merge: true })
  }
}

export function createFirebaseAppDataPersistence(tenantId?: string): AppDataPersistence {
  const resolvedTenantId = tenantId ?? getTenantId()
  if (!resolvedTenantId) {
    throw new Error('Organização não selecionada')
  }
  return new FirebaseAppDataPersistence(resolvedTenantId)
}

export async function loadAppDataFromFirebase(tenantId?: string): Promise<AppData | null> {
  const persistence = createFirebaseAppDataPersistence(tenantId)
  const snapshot = await persistence.load()
  if (!snapshot) return null
  return deserializeAppData(snapshot)
}
