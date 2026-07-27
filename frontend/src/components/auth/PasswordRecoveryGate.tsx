import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupabaseDataSource } from '@/config/dataSource'
import { getSupabaseClient } from '@/supabase/client'

/**
 * Quando o e-mail de recuperação abre a Site URL (sem /redefinir-senha),
 * o Supabase dispara PASSWORD_RECOVERY — redirecionamos para a tela de nova senha.
 */
export function PasswordRecoveryGate() {
  const navigate = useNavigate()
  const isSupabase = useSupabaseDataSource()

  useEffect(() => {
    if (!isSupabase) return

    const client = getSupabaseClient()
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/redefinir-senha', { replace: true })
      }
    })

    // Hash/query já processados pelo client (detectSessionInUrl)
    void client.auth.getSession().then(({ data }) => {
      const hash = window.location.hash.toLowerCase()
      const search = window.location.search.toLowerCase()
      const looksLikeRecovery =
        hash.includes('type=recovery') ||
        search.includes('type=recovery') ||
        hash.includes('type%3drecovery')
      if (looksLikeRecovery && data.session) {
        navigate('/redefinir-senha', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [isSupabase, navigate])

  return null
}
