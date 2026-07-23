import { env } from '@/config/env'

/** Valida a URL do Supabase antes de chamar a API (evita "Failed to fetch" opaco). */
export function assertSupabaseUrlConfig(): void {
  const raw = env.supabase.url?.trim()
  if (!raw) {
    throw new Error('VITE_SUPABASE_URL não configurada.')
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error('VITE_SUPABASE_URL inválida. Use o formato https://xxxx.supabase.co')
  }

  if (typeof window === 'undefined') return

  const pageHttps = window.location.protocol === 'https:'
  const loopback =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '[::1]'

  if (pageHttps && (parsed.protocol === 'http:' || loopback)) {
    throw new Error(
      'O site está em HTTPS, mas o Supabase aponta para um endereço local/HTTP. ' +
        'Nos Secrets do GitHub Actions, use a URL pública do projeto (https://xxxx.supabase.co).',
    )
  }
}

export function mapSupabaseAuthError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error('Falha na autenticação.')
  }

  const message = error.message.trim()
  const lower = message.toLowerCase()

  if (
    lower === 'failed to fetch' ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed') ||
    lower.includes('network request failed')
  ) {
    return new Error(
      'Não foi possível conectar ao servidor de autenticação (Failed to fetch). ' +
        'Confira se VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY estão corretos no build, ' +
        'se o projeto Supabase está ativo e se a rede permite acesso a *.supabase.co.',
    )
  }

  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return new Error('Este e-mail já possui conta. Use Entrar ou Esqueci a senha.')
  }

  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return new Error('E-mail ou senha inválidos.')
  }

  if (lower.includes('email rate limit') || lower.includes('over_email_send_rate_limit')) {
    return new Error('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
  }

  return error
}

export async function withSupabaseAuthError<T>(operation: () => Promise<T>): Promise<T> {
  assertSupabaseUrlConfig()
  try {
    return await operation()
  } catch (error) {
    throw mapSupabaseAuthError(error)
  }
}
