import { doc, getDoc, setDoc } from 'firebase/firestore'
import type { AppData, UserRole } from '@/types'
import { getFirestoreDb } from '@/firebase/app'
import { generateOrgCode, getTenantId } from '@/services/tenantService'

export interface OrgCodePublicClinica {
  id: string
  nome: string
  login?: string
}

export interface OrgCodePublicUsuario {
  perfil: UserRole
  nome: string
  login: string
}

export interface OrgCodePublicData {
  tenantId: string
  clinicas: OrgCodePublicClinica[]
  usuarios: OrgCodePublicUsuario[]
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

  const data = snapshot.data() as {
    tenantId?: string
    clinicas?: OrgCodePublicClinica[]
    usuarios?: OrgCodePublicUsuario[]
  }
  if (!data.tenantId) return null

  return {
    tenantId: data.tenantId,
    clinicas: Array.isArray(data.clinicas) ? data.clinicas : [],
    usuarios: Array.isArray(data.usuarios) ? data.usuarios : [],
  }
}

export async function registerOrgCode(orgCode: string, tenantId: string): Promise<void> {
  const normalized = orgCode.trim().toUpperCase()
  await setDoc(
    doc(getFirestoreDb(), 'orgCodes', normalized),
    { tenantId, clinicas: [], usuarios: [] },
    { merge: true },
  )
}

export async function syncOrgCodePublicIndex(data: AppData): Promise<void> {
  const tenantId = getTenantId() ?? data.tenantMeta?.ownerUid ?? null
  const orgCode = data.tenantMeta?.orgCode
  if (!tenantId || !orgCode) return

  const normalized = orgCode.trim().toUpperCase()
  await setDoc(
    doc(getFirestoreDb(), 'orgCodes', normalized),
    {
      tenantId,
      clinicas: buildOrgCodeClinicasFromAppData(data).map((clinica) => ({
        id: clinica.id,
        nome: clinica.nome,
        ...(clinica.login ? { login: clinica.login } : {}),
      })),
      usuarios: buildOrgCodeUsuariosFromAppData(data),
    },
    { merge: true },
  )
}

export function buildOrgCodeClinicasFromAppData(data: AppData): OrgCodePublicClinica[] {
  return data.clinicas.map((clinica) => ({
    id: clinica.id,
    nome: clinica.nome,
    login: data.usuarios.find(
      (user) => user.clinicaId === clinica.id && user.perfil === 'CLINICA' && user.ativo,
    )?.login,
  }))
}

export function buildOrgCodeUsuariosFromAppData(data: AppData): OrgCodePublicUsuario[] {
  return data.usuarios
    .filter(
      (user) =>
        user.ativo &&
        user.perfil !== 'GESTOR' &&
        user.perfil !== 'ADMINISTRADOR' &&
        user.perfil !== 'CLINICA',
    )
    .map((user) => ({
      perfil: user.perfil,
      nome: user.nome,
      login: user.login,
    }))
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
