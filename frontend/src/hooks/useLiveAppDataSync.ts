import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCloudAppDataSync } from '@/config/dataSource'
import { applyRemoteAppData, subscribeAppDataChanged } from '@/mocks/seed'
import {
  deserializeAppData,
  loadAppDataFromSupabase,
} from '@/data/persistence/supabaseAppDataPersistence'

/** Fallback raro — Realtime é a fonte principal; evita egress do snapshot a cada 2,5s. */
const FALLBACK_POLL_MS = 60_000

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
 * (mesma aba, outras abas e outras sessões via Supabase Realtime + fallback leve).
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
    let pollId: number | null = null

    const applyIfNewer = async () => {
      try {
        const snapshot = await loadAppDataFromSupabase()
        if (!snapshot || cancelled) return
        const { shouldIgnoreRemoteAppData } = await import(
          '@/data/persistence/supabaseSync'
        )
        const remoteMs = Date.parse(snapshot.updatedAt)
        // Poll/realtime com snapshot antigo não pode apagar cadastro acabado de criar.
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
        applyRemoteAppData(deserializeAppData(snapshot))
        invalidateLiveQueries(queryClient)
      } catch {
        // Rede/realtime indisponível — próxima tentativa no fallback ou ao focar a aba.
      }
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState !== 'visible') return
      void applyIfNewer()
    }

    void import('@/data/persistence/supabaseSync').then(({ subscribeAppStateRealtime }) => {
      if (cancelled) return
      unsubscribe = subscribeAppStateRealtime((remote, updatedAtMs) => {
        lastRemoteUpdatedAt.current = new Date(updatedAtMs).toISOString()
        applyRemoteAppData(remote)
        invalidateLiveQueries(queryClient)
      })
    })

    // Hidratação inicial + sync ao voltar à aba (sem polling agressivo).
    void applyIfNewer()
    document.addEventListener('visibilitychange', refreshWhenVisible)
    window.addEventListener('focus', refreshWhenVisible)

    // Apoio raro caso Realtime falhe ou esteja desabilitado no projeto Supabase.
    pollId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void applyIfNewer()
    }, FALLBACK_POLL_MS)

    return () => {
      cancelled = true
      unsubscribe()
      if (pollId != null) window.clearInterval(pollId)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.removeEventListener('focus', refreshWhenVisible)
    }
  }, [cloud, queryClient])
}
