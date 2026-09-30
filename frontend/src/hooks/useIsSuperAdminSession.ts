import { useEffect, useState } from 'react'
import { useAuth, useGestorAuth } from '@/contexts/AuthContext'
import { useSupabaseDataSource } from '@/config/dataSource'
import { isSuperAdminEmail, normalizeEmailKey } from '@/utils/email'
import { loadAppData } from '@/mocks/seed'
import { supabaseAuthAdapter } from '@/supabase/authAdapter'
import { getSupabaseClient } from '@/supabase/client'

/**
 * Detecta super-admin de forma confiável:
 * e-mail do usuário da sessão, tenantMeta e JWT do Supabase Auth.
 */
export function useIsSuperAdminSession(): boolean {
  const { user } = useGestorAuth()
  const { impersonationTargetEmail } = useAuth()
  const isSupabase = useSupabaseDataSource()
  const [authEmail, setAuthEmail] = useState<string>('')

  useEffect(() => {
    if (!isSupabase) {
      setAuthEmail('')
      return
    }
    let cancelled = false

    const applyEmail = (email: string | null | undefined) => {
      if (cancelled) return
      setAuthEmail(normalizeEmailKey(email ?? ''))
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

  const localEmail = normalizeEmailKey(
    user?.email?.trim() ||
      loadAppData().tenantMeta?.ownerEmail?.trim() ||
      '',
  )

  return isSuperAdminEmail(localEmail) || isSuperAdminEmail(authEmail)
}
