export const MARINHA_EMAIL_DOMAIN = 'marinha.mil.br'
export const GMAIL_EMAIL_DOMAIN = 'gmail.com'

export const MARINHA_EMAIL_HINT = `Use um e-mail institucional @${MARINHA_EMAIL_DOMAIN}`
export const GMAIL_RECOVERY_HINT = `Informe um Gmail @${GMAIL_EMAIL_DOMAIN} para receber o link de recuperação de senha`

export function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase()
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

/** Aceita somente @gmail.com (sem googlemail / subdomínios). */
export function isGmailEmail(email: string): boolean {
  return domainOf(email) === GMAIL_EMAIL_DOMAIN
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

export function assertGmailEmail(email: string): string {
  const normalized = normalizeEmailKey(email)
  if (!normalized || !normalized.includes('@')) {
    throw new Error('Informe um Gmail válido')
  }
  if (!isGmailEmail(normalized)) {
    throw new Error(GMAIL_RECOVERY_HINT)
  }
  return normalized
}

export function passwordResetRedirectUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  const path = `${base.replace(/\/?$/, '/') }redefinir-senha`
  return new URL(path, window.location.origin).toString()
}
