const PORTAL_EMAIL_DOMAIN = 'portal.acompsolemp.app'

export function portalAuthEmail(tenantId: string, login: string): string {
  return `${tenantId}.${login}@${PORTAL_EMAIL_DOMAIN}`
}

export function parseTenantIdFromPortalEmail(email: string | null | undefined): string | null {
  if (!email) return null
  const match = email.match(/^([^.]+)\.[^@]+@portal\.acompsolemp\.app$/)
  return match?.[1] ?? null
}

export function isPortalAuthEmail(email: string | null | undefined): boolean {
  return Boolean(email?.endsWith(`@${PORTAL_EMAIL_DOMAIN}`))
}
