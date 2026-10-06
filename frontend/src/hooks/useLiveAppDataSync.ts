import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCloudAppDataSync } from '@/config/dataSource'
import { applyRemoteAppData, subscribeAppDataChanged } from '@/mocks/seed'
import { loadAppDataFromSupabase } from '@/data/persistence/supabaseAppDataPersistence'

const LIVE_QUERY_KEYS = [
  'notifications',
  'pedidos',
  'pedido',
  'dashboard',
  'clinica-pedidos',
  'clinica-pedido',
  'ordenador-pedidos',
  'ordenador-pedido',
  'financeiro-pedidos',
  'financeiro-pedido',
  'financeiro-aguardando-empenho',
  'historico',
  'demo-pedidos',
  'demo-pedido',
  'demo-historico',
  'demo-workflow-etapas',
  'reversoes',
  'consumo-planilha',
  'processos-arquivados',
  'chat-unread',
  'chat-threads',
  'chat-messages',
  'usuarios',
  'clinicas',
] as const

function invalidateLiveQueries(queryClient: ReturnType<typeof useQueryClient>): void {
  for (const key of LIVE_QUERY_KEYS) {
    void queryClient.invalidateQueries({ queryKey: [key] })
  }
}

/**
 * Mantém timelines/notificações sincronizadas quando planilha é enviada ou devolvida
 * (mesma aba, outras abas e outras sessões via Supabase Realtime + refresh no mount/foco).
 */
export function useLiveAppDataSync(): void {
  const queryClient = useQueryClient()
  const cloud = useCloudAppDataSync()
  const lastRemoteUpdatedAt = useRef<string | null>(null)

  useEffect(() => {
    return subscribeAppDataChanged(() => {
      invalidateLiveQueries(queryClient)
    })
  }, [queryClient])

  useEffect(() => {
    if (!cloud) return

    let unsubscribe: () => void = () => undefined
    let cancelled = false

    const applyIfNewer = async () => {
      try {
        const snapshot = await loadAppDataFromSupabase()
        if (!snapshot || cancelled) return
        const { shouldIgnoreRemoteAppData } = await import(
          '@/data/persistence/supabaseSync'
        )
        const remoteMs = Date.parse(snapshot.updatedAt)
        // Snapshot antigo não pode apagar cadastro acabado de criar.
        if (shouldIgnoreRemoteAppData(remoteMs)) {
          return
        }
        if (
          lastRemoteUpdatedAt.current &&
          snapshot.updatedAt <= lastRemoteUpdatedAt.current
        ) {
          return
        }
        lastRemoteUpdatedAt.current = snapshot.updatedAt
        const { hydrateAppDataFromCloudSnapshot } = await import(
          '@/data/persistence/normalized/hydrateNormalized'
        )
        applyRemoteAppData(await hydrateAppDataFromCloudSnapshot(snapshot))
        invalidateLiveQueries(queryClient)
      } catch {
        // Rede/realtime indisponível — próxima tentativa ao focar a aba ou remount.
      }
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'visible') return
      void applyIfNewer()
    }

    void import('@/data/persistence/supabaseSync').then(({ subscribeAppStateRealtime }) => {
      if (cancelled) return
      unsubscribe = subscribeAppStateRealtime((_remote, _updatedAtMs) => {
        // Sempre hidrata (mescla tabelas normalizadas). Aplicar só o blob
        // esvaziava Cadastros quando o domínio estava em strip.
        void applyIfNewer()
      })
    })

    // Hidratação inicial + sync ao voltar à aba (sem polling periódico).
    void applyIfNewer()
    document.addEventListener('visibilitychange', refreshWhenVisible)
    window.addEventListener('focus', refreshWhenVisible)

    return () => {
      cancelled = true
      unsubscribe()
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.removeEventListener('focus', refreshWhenVisible)
    }
  }, [cloud, queryClient])
}
