import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSupabaseDataSource } from '@/config/dataSource'
import { getSupabaseClient } from '@/supabase/client'
import { looksLikePasswordRecoveryUrl } from '@/utils/email'

/**
 * Quando o e-mail de recuperação abre a Site URL (sem /redefinir-senha),
 * o Supabase dispara PASSWORD_RECOVERY — redirecionamos para a tela de nova senha
 * preservando hash/query do token.
 */
export function PasswordRecoveryGate() {
  const navigate = useNavigate()
  const location = useLocation()
  const isSupabase = useSupabaseDataSource()

  useEffect(() => {
    if (!isSupabase) return

    const alreadyOnReset = location.pathname.includes('redefinir-senha')

    const goToReset = () => {
      if (window.location.pathname.toLowerCase().includes('redefinir-senha')) return
      navigate(
        {
          pathname: '/redefinir-senha',
          search: window.location.search,
          hash: window.location.hash,
        },
        { replace: true },
      )
    }

    const client = getSupabaseClient()
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        goToReset()
      }
    })

    if (
      !alreadyOnReset &&
      looksLikePasswordRecoveryUrl(window.location.hash, window.location.search)
    ) {
      void client.auth.getSession().then(({ data }) => {
        if (data.session || looksLikePasswordRecoveryUrl()) {
          goToReset()
        }
      })
    }

    return () => subscription.unsubscribe()
  }, [isSupabase, navigate, location.pathname])

  return null
}
