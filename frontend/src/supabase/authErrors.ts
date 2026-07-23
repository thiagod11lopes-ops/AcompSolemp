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

function readErrorField(error: unknown, key: string): string {
  if (!error || typeof error !== 'object') return ''
  const value = (error as Record<string, unknown>)[key]
  return typeof value === 'string' ? value.trim() : ''
}

/** Extrai mensagem legível de AuthError / objetos do Supabase (evita "{}"). */
export function getAuthErrorMessage(error: unknown): string {
  if (error == null) return ''

  if (typeof error === 'string') return error.trim()

  if (error instanceof Error) {
    const fromError = error.message.trim()
    if (fromError && fromError !== '{}' && fromError !== '[object Object]') {
      return fromError
    }
  }

  const message = readErrorField(error, 'message')
  const msg = readErrorField(error, 'msg')
  const errorDescription = readErrorField(error, 'error_description')
  const errorCode = readErrorField(error, 'error')
  const code = readErrorField(error, 'code')

  const parts = [message, msg, errorDescription, errorCode, code].filter(Boolean)
  if (parts.length > 0) return parts[0]

  try {
    const json = JSON.stringify(error)
    if (json && json !== '{}' && json !== 'null') return json
  } catch {
    // ignore
  }

  return ''
}

export function mapSupabaseAuthError(error: unknown): Error {
  const message = getAuthErrorMessage(error)
  const lower = message.toLowerCase()

  if (!message || message === '{}') {
    return new Error(
      'Não foi possível concluir a operação de autenticação. ' +
        'Verifique SMTP (Authentication → Emails → SMTP), ' +
        'Redirect URLs (Authentication → URL Configuration) e tente novamente.',
    )
  }

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

  if (
    lower.includes('redirect') ||
    lower.includes('redirect_to') ||
    lower.includes('not allowed')
  ) {
    return new Error(
      'URL de redirecionamento não autorizada. Em Authentication → URL Configuration, ' +
        'adicione: ' +
        (typeof window !== 'undefined'
          ? `${window.location.origin}${import.meta.env.BASE_URL}redefinir-senha`.replace(
              /([^:]\/)\/+/g,
              '$1',
            )
          : '/redefinir-senha'),
    )
  }

  if (lower.includes('invalid path') || lower.includes('pgrst125')) {
    return new Error(
      'As tabelas do AcompSolemp não foram encontradas no Supabase. ' +
        'Abra o SQL Editor e execute o arquivo supabase/schema.sql do repositório. ' +
        'Também confira se VITE_SUPABASE_URL é só https://xxxx.supabase.co (sem /rest/v1).',
    )
  }

  if (lower.includes('error sending') || lower.includes('smtp') || lower.includes('mail')) {
    return new Error(
      'Falha ao enviar e-mail. Confira Authentication → Emails → SMTP (Gmail: smtp.gmail.com, senha de app).',
    )
  }

  return new Error(message)
}

export async function withSupabaseAuthError<T>(operation: () => Promise<T>): Promise<T> {
  assertSupabaseUrlConfig()
  try {
    return await operation()
  } catch (error) {
    throw mapSupabaseAuthError(error)
  }
}
