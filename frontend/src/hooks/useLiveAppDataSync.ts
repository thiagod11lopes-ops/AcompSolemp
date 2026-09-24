import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCloudAppDataSync } from '@/config/dataSource'
import { applyRemoteAppData, subscribeAppDataChanged } from '@/mocks/seed'
import {
  deserializeAppData,
  loadAppDataFromSupabase,
} from '@/data/persistence/supabaseAppDataPersistence'

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
] as const

function invalidateLiveQueries(queryClient: ReturnType<typeof useQueryClient>): void {
  for (const key of LIVE_QUERY_KEYS) {
    void queryClient.invalidateQueries({ queryKey: [key] })
  }
}

/**
 * Mantém timelines/notificações sincronizadas quando planilha é enviada ou devolvida
 * (mesma aba, outras abas e outras sessões via Supabase realtime + polling de apoio).
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
        if (
          lastRemoteUpdatedAt.current &&
          snapshot.updatedAt === lastRemoteUpdatedAt.current
        ) {
          return
        }
        lastRemoteUpdatedAt.current = snapshot.updatedAt
        applyRemoteAppData(deserializeAppData(snapshot))
        invalidateLiveQueries(queryClient)
      } catch {
        // Rede/realtime indisponível — próxima tentativa no intervalo.
      }
    }

    void import('@/data/persistence/supabaseSync').then(({ subscribeAppStateRealtime }) => {
      if (cancelled) return
      unsubscribe = subscribeAppStateRealtime((remote) => {
        lastRemoteUpdatedAt.current = new Date().toISOString()
        applyRemoteAppData(remote)
        invalidateLiveQueries(queryClient)
      })
    })

    // Apoio caso realtime não esteja habilitado no projeto Supabase.
    const pollId = window.setInterval(() => {
      void applyIfNewer()
    }, 5_000)

    return () => {
      cancelled = true
      unsubscribe()
      window.clearInterval(pollId)
    }
  }, [cloud, queryClient])
}
