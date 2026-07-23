export const MARINHA_EMAIL_DOMAIN = 'marinha.mil.br'

export const MARINHA_EMAIL_HINT = `Use um e-mail institucional @${MARINHA_EMAIL_DOMAIN}`

export function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase()
}

/** Aceita somente o domínio exato @marinha.mil.br (sem subdomínios). */
export function isMarinhaEmail(email: string): boolean {
  const normalized = normalizeEmailKey(email)
  const at = normalized.lastIndexOf('@')
  if (at <= 0) return false
  const local = normalized.slice(0, at)
  const domain = normalized.slice(at + 1)
  return Boolean(local) && domain === MARINHA_EMAIL_DOMAIN
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

export function passwordResetRedirectUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  const path = `${base.replace(/\/?$/, '/') }redefinir-senha`
  return new URL(path, window.location.origin).toString()
}
