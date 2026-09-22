import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { useSupabaseDataSource } from '@/config/dataSource'
import { getSupabaseClient } from '@/supabase/client'
import { withSupabaseAuthError } from '@/supabase/authErrors'

export interface SupabaseAuthSession {
  user: SupabaseUser
  session: Session
}

export const supabaseAuthAdapter = {
  isEnabled(): boolean {
    return useSupabaseDataSource()
  },

  async getSession(): Promise<Session | null> {
    if (!useSupabaseDataSource()) return null
    const { data, error } = await getSupabaseClient().auth.getSession()
    if (error) throw error
    return data.session
  },

  async waitForAuthReady(): Promise<Session | null> {
    if (!useSupabaseDataSource()) return null
    const client = getSupabaseClient()
    await client.auth.getSession()
    return (await client.auth.getSession()).data.session
  },

  async signInWithPassword(email: string, password: string): Promise<SupabaseAuthSession> {
    return withSupabaseAuthError(async () => {
      const { data, error } = await getSupabaseClient().auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (error) throw error
      if (!data.session || !data.user) {
        throw new Error('Falha ao autenticar no Supabase.')
      }
      return { user: data.user, session: data.session }
    })
  },

  async signUpWithPassword(
    email: string,
    password: string,
  ): Promise<SupabaseAuthSession> {
    return withSupabaseAuthError(async () => {
      const { data, error } = await getSupabaseClient().auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      })
      if (error) throw error
      if (!data.session || !data.user) {
        throw new Error(
          'Conta criada. Confirme o e-mail (se exigido) e faça login novamente.',
        )
      }
      return { user: data.user, session: data.session }
    })
  },

  /** Entra ou cria conta com e-mail/senha (gestor). */
  async signInOrSignUp(email: string, password: string): Promise<SupabaseAuthSession> {
    try {
      return await this.signInWithPassword(email, password)
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : ''
      const invalid =
        message.includes('invalid login') ||
        message.includes('invalid credentials') ||
        message.includes('e-mail ou senha inválidos') ||
        message.includes('user not found')
      if (!invalid) throw error
      return this.signUpWithPassword(email, password)
    }
  },

  async signOut(): Promise<void> {
    if (!useSupabaseDataSource()) return
    const { error } = await getSupabaseClient().auth.signOut()
    if (error) throw error
  },

  async resetPasswordForEmail(email: string, redirectTo?: string): Promise<void> {
    return withSupabaseAuthError(async () => {
      // Sem redirectTo customizado o Supabase usa a Site URL (sempre permitida).
      const { error } = redirectTo
        ? await getSupabaseClient().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
            redirectTo,
          })
        : await getSupabaseClient().auth.resetPasswordForEmail(email.trim().toLowerCase())
      if (error) {
        const enriched = Object.assign(new Error(error.message || 'reset_password_failed'), {
          code: (error as { code?: string }).code,
          status: (error as { status?: number }).status,
          redirectTo: redirectTo ?? '(Site URL padrão)',
        })
        throw enriched
      }
    })
  },

  async updatePassword(newPassword: string): Promise<void> {
    return withSupabaseAuthError(async () => {
      const { error } = await getSupabaseClient().auth.updateUser({
        password: newPassword,
      })
      if (error) throw error
    })
  },

  /** Aguarda sessão de recovery (link do e-mail) ou sessão já ativa. */
  async waitForPasswordRecoverySession(timeoutMs = 15000): Promise<Session | null> {
    if (!useSupabaseDataSource()) return null
    const client = getSupabaseClient()

    const fromHash = await sessionFromRecoveryHash(client)
    if (fromHash) return fromHash

    // PKCE: troca ?code= por sessão (detectSessionInUrl às vezes ainda não terminou)
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      try {
        const { data, error } = await client.auth.exchangeCodeForSession(code)
        if (!error && data.session) return data.session
      } catch {
        // Pode já ter sido consumido pelo detectSessionInUrl
      }
    }

    const existing = (await client.auth.getSession()).data.session
    if (existing) return existing

    return new Promise((resolve) => {
      let settled = false
      const finish = (session: Session | null) => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        subscription.unsubscribe()
        resolve(session)
      }

      const timer = window.setTimeout(() => {
        void client.auth.getSession().then(({ data }) => finish(data.session))
      }, timeoutMs)

      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
          finish(session)
        }
      })

      // Segunda tentativa no hash (client pode ter processado o detectSessionInUrl)
      void sessionFromRecoveryHash(client).then((session) => {
        if (session) finish(session)
      })
    })
  },
}

/** Tokens implícitos do e-mail: #access_token=...&type=recovery */
async function sessionFromRecoveryHash(
  client: ReturnType<typeof getSupabaseClient>,
): Promise<Session | null> {
  const raw = window.location.hash.replace(/^#/, '')
  if (!raw) return null
  const params = new URLSearchParams(raw)
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  const type = params.get('type')
  if (!access_token || !refresh_token) return null
  if (type && type !== 'recovery' && type !== 'invite' && type !== 'magiclink') {
    return null
  }
  try {
    const { data, error } = await client.auth.setSession({ access_token, refresh_token })
    if (error || !data.session) return null
    // Limpa o hash para não reprocessar ao salvar a senha
    const path = `${window.location.pathname}${window.location.search}`
    window.history.replaceState(null, '', path)
    return data.session
  } catch {
    return null
  }
}
