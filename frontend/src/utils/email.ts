export const MARINHA_EMAIL_DOMAIN = 'marinha.mil.br'

/** Super administrador: pode listar gestores e pausar contas. */
export const SUPER_ADMIN_EMAIL = 'lopes.thiago.oliveira@marinha.mil.br'

export const MARINHA_EMAIL_HINT = `Use um e-mail institucional @${MARINHA_EMAIL_DOMAIN}`

export function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase()
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return normalizeEmailKey(email) === SUPER_ADMIN_EMAIL
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

/** Aceita somente o domínio exato @marinha.mil.br (sem subdomínios). */
export function isMarinhaEmail(email: string): boolean {
  return domainOf(email) === MARINHA_EMAIL_DOMAIN
}

export function assertMarinhaEmail(email: string): string {
  const normalized = normalizeEmailKey(email)
  if (!normalized || !normalized.includes('@')) {
    throw new Error('Informe um e-mail válido')
  }
  if (!isMarinhaEmail(normalized)) {
    throw new Error(MARINHA_EMAIL_HINT)
  }
  return normalized
}

/**
 * Redirect após clicar no link do e-mail.
 * Usa a Site URL (sem /redefinir-senha): ela é sempre permitida no Supabase.
 * PasswordRecoveryGate encaminha para /redefinir-senha.
 */
export function passwordResetRedirectUrl(): string {
  const productionSite = 'https://thiagod11lopes-ops.github.io/AcompSolemp'

  if (typeof window === 'undefined') return productionSite

  if (window.location.hostname.endsWith('github.io')) {
    return productionSite
  }

  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
  return `${window.location.origin}${base === '/' ? '' : base}`.replace(/\/$/, '')
}
