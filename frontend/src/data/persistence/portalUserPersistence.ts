import { doc, setDoc } from 'firebase/firestore'
import { getFirestoreDb } from '@/firebase/app'

/** Vincula conta da timeline (uid Firebase) ao tenant do gestor */
export async function registerPortalUserMapping(portalUid: string, tenantId: string): Promise<void> {
  await setDoc(doc(getFirestoreDb(), 'portalUsers', portalUid), { tenantId }, { merge: true })
}
