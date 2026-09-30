import { useEffect, useState } from 'react'
import { useAuth, useGestorAuth } from '@/contexts/AuthContext'
import { useSupabaseDataSource } from '@/config/dataSource'
import { isSuperAdminEmail, normalizeEmailKey } from '@/utils/email'
import { supabaseAuthAdapter } from '@/supabase/authAdapter'
import { getSupabaseClient } from '@/supabase/client'

/**
 * Super-admin só pelo e-mail autenticado (JWT / sessão do gestor).
 * Não usa tenantMeta.ownerEmail — evitava liberar "Gestores ativos" para outros gestores.
 */
export function useIsSuperAdminSession(): boolean {
  const { user } = useGestorAuth()
  const { impersonationTargetEmail } = useAuth()
  const isSupabase = useSupabaseDataSource()
  const [authEmail, setAuthEmail] = useState<string>('')
  const [authReady, setAuthReady] = useState(!isSupabase)

  useEffect(() => {
    if (!isSupabase) {
      setAuthEmail('')
      setAuthReady(true)
      return
    }
    let cancelled = false

    const applyEmail = (email: string | null | undefined) => {
      if (cancelled) return
      setAuthEmail(normalizeEmailKey(email ?? ''))
      setAuthReady(true)
    }

    void (async () => {
      try {
        const session =
          (await supabaseAuthAdapter.waitForAuthReady()) ??
          (await supabaseAuthAdapter.getSession())
        applyEmail(session?.user?.email)
      } catch {
        applyEmail('')
      }
    })()

    const {
      data: { subscription },
    } = getSupabaseClient().auth.onAuthStateChange((_event, session) => {
      applyEmail(session?.user?.email)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [isSupabase, user?.id, user?.email])

  if (!isSupabase || impersonationTargetEmail) return false

  const sessionEmail = normalizeEmailKey(user?.email?.trim() || '')
  // JWT é a fonte de verdade; user.email só vale se o Auth ainda não respondeu.
  const effectiveEmail = authReady && authEmail ? authEmail : sessionEmail

  return isSuperAdminEmail(effectiveEmail)
}
