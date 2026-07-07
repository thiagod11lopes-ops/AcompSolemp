import { STORAGE_KEYS, storageGet, storageRemove, storageSet } from '@/storage/indexedDb'

let activeTenantId: string | null = null

export function getTenantId(): string | null {
  return activeTenantId ?? storageGet(STORAGE_KEYS.TENANT_ID)
}

export function setTenantId(tenantId: string | null): void {
  activeTenantId = tenantId
  if (tenantId) storageSet(STORAGE_KEYS.TENANT_ID, tenantId)
  else storageRemove(STORAGE_KEYS.TENANT_ID)
}

export function getStoredOrgCode(): string | null {
  return storageGet(STORAGE_KEYS.ORG_CODE)
}

export function setStoredOrgCode(orgCode: string | null): void {
  if (orgCode) storageSet(STORAGE_KEYS.ORG_CODE, orgCode.trim().toUpperCase())
  else storageRemove(STORAGE_KEYS.ORG_CODE)
}

export function ownerUserId(tenantId: string): string {
  return `user-owner-${tenantId}`
}

const ORG_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateOrgCode(length = 6): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += ORG_CODE_CHARS[Math.floor(Math.random() * ORG_CODE_CHARS.length)]
  }
  return code
}
