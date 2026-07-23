import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { useSupabaseDataSource } from '@/config/dataSource'
import { getSupabaseClient } from '@/supabase/client'

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
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) throw error
    if (!data.session || !data.user) {
      throw new Error('Falha ao autenticar no Supabase.')
    }
    return { user: data.user, session: data.session }
  },

  async signUpWithPassword(
    email: string,
    password: string,
  ): Promise<SupabaseAuthSession> {
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

  async resetPasswordForEmail(email: string, redirectTo: string): Promise<void> {
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo },
    )
    if (error) throw error
  },

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await getSupabaseClient().auth.updateUser({
      password: newPassword,
    })
    if (error) throw error
  },

  /** Aguarda sessão de recovery (link do e-mail) ou sessão já ativa. */
  async waitForPasswordRecoverySession(timeoutMs = 8000): Promise<Session | null> {
    if (!useSupabaseDataSource()) return null
    const client = getSupabaseClient()
    const existing = (await client.auth.getSession()).data.session
    if (existing) return existing

    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        subscription.unsubscribe()
        void client.auth.getSession().then(({ data }) => resolve(data.session))
      }, timeoutMs)

      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
          window.clearTimeout(timer)
          subscription.unsubscribe()
          resolve(session)
        }
      })
    })
  },
}
