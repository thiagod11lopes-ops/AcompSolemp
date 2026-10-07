import { env } from '@/config/env'

/** Domínio institucional (VITE_EMAIL_DOMAIN). */
export function institutionalEmailDomain(): string {
  return env.emailDomain
}

/** Super administrador (VITE_SUPER_ADMIN_EMAIL). */
export function superAdminEmail(): string {
  return env.superAdminEmail
}

export function institutionalEmailHint(): string {
  const domain = institutionalEmailDomain()
  return domain
    ? `Use um e-mail institucional @${domain}`
    : 'Use um e-mail institucional válido'
}

export function institutionalEmailPlaceholder(): string {
  const domain = institutionalEmailDomain()
  return domain ? `seuemail@${domain}` : 'seuemail@institucional'
}

export function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase()
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const configured = superAdminEmail()
  if (!configured) return false
  return normalizeEmailKey(email) === configured
}

function domainOf(email: string): string | null {
  const normalized = normalizeEmailKey(email)
  const at = normalized.lastIndexOf('@')
  if (at <= 0) return null
  const local = normalized.slice(0, at)
  const domain = normalized.slice(at + 1)
  if (!local || !domain) return null
  return domain
}

/** Aceita somente o domínio institucional configurado (sem subdomínios). */
export function isInstitutionalEmail(email: string): boolean {
  const required = institutionalEmailDomain()
  if (!required) {
    return Boolean(domainOf(email))
  }
  return domainOf(email) === required
}

export function assertInstitutionalEmail(email: string): string {
  const normalized = normalizeEmailKey(email)
  if (!normalized || !normalized.includes('@')) {
    throw new Error('Informe um e-mail válido')
  }
  if (!isInstitutionalEmail(normalized)) {
    throw new Error(institutionalEmailHint())
  }
  return normalized
}

/** Mensagem ao tentar cadastrar o próprio e-mail do gestor na equipe. */
export function ownGestorEmailBlockedMessage(): string {
  const domain = institutionalEmailDomain()
  return domain
    ? `Não é permitido cadastrar o próprio e-mail do gestor. Use outro @${domain} para a equipe.`
    : 'Não é permitido cadastrar o próprio e-mail do gestor. Use outro e-mail institucional para a equipe.'
}

/** E-mail de demonstração no domínio institucional (ou @exemplo.local). */
export function demoInstitutionalEmail(localPart: string): string {
  const domain = institutionalEmailDomain() || 'exemplo.local'
  return `${localPart}@${domain}`
}

/**
 * Redirect após clicar no link do e-mail de recuperação.
 * Aponta para /redefinir-senha (incluir essa URL em Redirect URLs no Supabase).
 */
export function passwordResetRedirectUrl(): string {
  const productionSite = 'https://thiagod11lopes-ops.github.io/AcompSolemp/redefinir-senha'

  if (typeof window === 'undefined') return productionSite

  if (window.location.hostname.endsWith('github.io')) {
    return productionSite
  }

  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  const origin = `${window.location.origin}${base === '/' ? '' : base}`.replace(/\/$/, '')
  return `${origin}/redefinir-senha`
}

/** Detecta se a URL atual veio do link de recuperação de senha do Supabase. */
export function looksLikePasswordRecoveryUrl(
  hash = typeof window !== 'undefined' ? window.location.hash : '',
  search = typeof window !== 'undefined' ? window.location.search : '',
  pathname = typeof window !== 'undefined' ? window.location.pathname : '',
): boolean {
  const h = hash.toLowerCase()
  const s = search.toLowerCase()
  const path = pathname.toLowerCase()
  if (
    h.includes('type=recovery') ||
    s.includes('type=recovery') ||
    h.includes('type%3drecovery') ||
    s.includes('type%3drecovery')
  ) {
    return true
  }
  return s.includes('code=') && path.includes('redefinir-senha')
}
