import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getFirestoreDb } from '@/firebase/app'
import { generateOrgCode } from '@/services/tenantService'

export async function resolveOrgCodeToTenantId(orgCode: string): Promise<string | null> {
  const normalized = orgCode.trim().toUpperCase()
  if (!normalized) return null

  const snapshot = await getDoc(doc(getFirestoreDb(), 'orgCodes', normalized))
  if (!snapshot.exists()) return null

  const data = snapshot.data() as { tenantId?: string }
  return data.tenantId ?? null
}

export async function registerOrgCode(orgCode: string, tenantId: string): Promise<void> {
  const normalized = orgCode.trim().toUpperCase()
  await setDoc(doc(getFirestoreDb(), 'orgCodes', normalized), { tenantId })
}

export async function createUniqueOrgCode(tenantId: string): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateOrgCode()
    const existing = await resolveOrgCodeToTenantId(code)
    if (!existing) {
      await registerOrgCode(code, tenantId)
      return code
    }
  }

  const fallback = tenantId.slice(0, 8).toUpperCase()
  await registerOrgCode(fallback, tenantId)
  return fallback
}
