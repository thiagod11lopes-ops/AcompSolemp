import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getFirestoreDb } from '@/firebase/app'
import { generateOrgCode } from '@/services/tenantService'

export interface OrgCodePublicClinica {
  id: string
  nome: string
  login?: string
}

export interface OrgCodePublicData {
  tenantId: string
  clinicas: OrgCodePublicClinica[]
}

export async function resolveOrgCodeToTenantId(orgCode: string): Promise<string | null> {
  const data = await resolveOrgCodePublicData(orgCode)
  return data?.tenantId ?? null
}

export async function resolveOrgCodePublicData(orgCode: string): Promise<OrgCodePublicData | null> {
  const normalized = orgCode.trim().toUpperCase()
  if (!normalized) return null

  const snapshot = await getDoc(doc(getFirestoreDb(), 'orgCodes', normalized))
  if (!snapshot.exists()) return null

  const data = snapshot.data() as { tenantId?: string; clinicas?: OrgCodePublicClinica[] }
  if (!data.tenantId) return null

  return {
    tenantId: data.tenantId,
    clinicas: Array.isArray(data.clinicas) ? data.clinicas : [],
  }
}

export async function registerOrgCode(orgCode: string, tenantId: string): Promise<void> {
  const normalized = orgCode.trim().toUpperCase()
  await setDoc(doc(getFirestoreDb(), 'orgCodes', normalized), { tenantId, clinicas: [] }, { merge: true })
}

export async function syncOrgCodeClinicas(
  orgCode: string,
  tenantId: string,
  clinicas: OrgCodePublicClinica[],
): Promise<void> {
  const normalized = orgCode.trim().toUpperCase()
  await setDoc(
    doc(getFirestoreDb(), 'orgCodes', normalized),
    {
      tenantId,
      clinicas: clinicas.map((clinica) => ({
        id: clinica.id,
        nome: clinica.nome,
        ...(clinica.login ? { login: clinica.login } : {}),
      })),
    },
    { merge: true },
  )
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
