import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'
import type { UserRole } from '@/types'
import { getFirestoreDb } from '@/firebase/app'

export interface EmailAccessRecord {
  tenantId: string
  userId: string
  perfil: UserRole
  clinicaId: string | null
  nome: string
}

const COLLECTION = 'emailAccess'

export function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase()
}

function emailAccessDocRef(email: string) {
  return doc(getFirestoreDb(), COLLECTION, normalizeEmailKey(email))
}

export async function getEmailAccess(email: string): Promise<EmailAccessRecord | null> {
  const snapshot = await getDoc(emailAccessDocRef(email))
  if (!snapshot.exists()) return null
  return snapshot.data() as EmailAccessRecord
}

export async function registerEmailAccess(
  email: string,
  record: EmailAccessRecord,
  gestorTenantId: string,
): Promise<void> {
  const normalized = normalizeEmailKey(email)
  const existing = await getEmailAccess(normalized)

  if (existing && existing.tenantId !== gestorTenantId) {
    throw new Error('Este e-mail já está em uso em outra organização')
  }

  await setDoc(emailAccessDocRef(normalized), {
    ...record,
    tenantId: gestorTenantId,
  })
}

export async function removeEmailAccess(email: string | null | undefined): Promise<void> {
  const normalized = email?.trim()
  if (!normalized) return

  const snapshot = await getDoc(emailAccessDocRef(normalized))
  if (snapshot.exists()) {
    await deleteDoc(emailAccessDocRef(normalized))
  }
}
