import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getFirestoreDb, getPortalSessionFirestore } from '@/firebase/app'

/** Vincula conta da timeline (uid Firebase) ao tenant do gestor */
export async function registerPortalUserMapping(portalUid: string, tenantId: string): Promise<void> {
  await setDoc(doc(getFirestoreDb(), 'portalUsers', portalUid), { tenantId }, { merge: true })
}

/** Resolve o tenant a partir da conta da timeline autenticada */
export async function resolvePortalTenantId(portalUid: string): Promise<string | null> {
  const snapshot = await getDoc(doc(getPortalSessionFirestore(), 'portalUsers', portalUid))
  if (!snapshot.exists()) return null

  const data = snapshot.data() as { tenantId?: string }
  return data.tenantId ?? null
}
