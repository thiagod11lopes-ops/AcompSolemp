import { doc, getDoc, setDoc } from 'firebase/firestore'
import type { AppData } from '@/types'
import { env } from '@/config/env'
import {
  FIRESTORE_APP_STATE_DOC_ID,
  FIRESTORE_COLLECTIONS,
} from '@/firebase/collections'
import { getFirestoreDb } from '@/firebase/app'
import {
  type AppDataPersistence,
  type AppDataSnapshot,
  deserializeAppData,
  serializeAppData,
} from '@/data/persistence/types'

function appStateDocRef() {
  const [collection, docId] = env.firebase.appStateDocPath.includes('/')
    ? env.firebase.appStateDocPath.split('/')
    : [FIRESTORE_COLLECTIONS.appState, FIRESTORE_APP_STATE_DOC_ID]

  return doc(getFirestoreDb(), collection, docId)
}

export class FirebaseAppDataPersistence implements AppDataPersistence {
  async load(): Promise<AppDataSnapshot | null> {
    const snapshot = await getDoc(appStateDocRef())
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
    await setDoc(appStateDocRef(), snapshot, { merge: true })
  }
}

export function createFirebaseAppDataPersistence(): AppDataPersistence {
  return new FirebaseAppDataPersistence()
}

export async function loadAppDataFromFirebase(): Promise<AppData | null> {
  const persistence = createFirebaseAppDataPersistence()
  const snapshot = await persistence.load()
  if (!snapshot) return null
  return deserializeAppData(snapshot)
}
