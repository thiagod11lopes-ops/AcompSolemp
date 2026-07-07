import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cadastroService,
  historicoService,
  notificationService,
  workflowService,
} from '@/services/cadastroService'
import { peekDemoAppData, subscribeDemoAppDataChanged } from '@/mocks/seed'

export function useClinicas() {
  return useQuery({
    queryKey: ['clinicas'],
    queryFn: cadastroService.listClinicas,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useEmpresas() {
  return useQuery({ queryKey: ['empresas'], queryFn: cadastroService.listEmpresas })
}

export function useMateriais() {
  return useQuery({ queryKey: ['materiais'], queryFn: cadastroService.listMateriais })
}

export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: cadastroService.listUsuarios,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useWorkflowEtapas() {
  const queryClient = useQueryClient()

  useEffect(() => {
    return subscribeDemoAppDataChanged(() => {
      queryClient.invalidateQueries({ queryKey: ['workflow-etapas'] })
      queryClient.invalidateQueries({ queryKey: ['demo-workflow-etapas'] })
    })
  }, [queryClient])

  return useQuery({
    queryKey: ['workflow-etapas'],
    queryFn: workflowService.listEtapas,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

export function useDemoWorkflowEtapas() {
  const queryClient = useQueryClient()

  useEffect(() => {
    return subscribeDemoAppDataChanged(() => {
      queryClient.invalidateQueries({ queryKey: ['demo-workflow-etapas'] })
    })
  }, [queryClient])

  return useQuery({
    queryKey: ['demo-workflow-etapas'],
    queryFn: async () => {
      const data = peekDemoAppData()
      if (!data) return []
      return [...data.workflowEtapas].sort((a, b) => a.ordem - b.ordem)
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

export function useHistorico(pedidoId?: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    return subscribeDemoAppDataChanged(() => {
      queryClient.invalidateQueries({ queryKey: ['historico', pedidoId] })
    })
  }, [queryClient, pedidoId])

  return useQuery({
    queryKey: ['historico', pedidoId],
    queryFn: () => historicoService.list(pedidoId),
    enabled: Boolean(pedidoId),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

export function useDemoHistorico(pedidoId?: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    return subscribeDemoAppDataChanged(() => {
      queryClient.invalidateQueries({ queryKey: ['demo-historico', pedidoId] })
    })
  }, [queryClient, pedidoId])

  return useQuery({
    queryKey: ['demo-historico', pedidoId],
    queryFn: async () => {
      const data = peekDemoAppData()
      if (!data) return []
      let historico = data.historico
      if (pedidoId) historico = historico.filter((h) => h.pedidoId === pedidoId)
      return historico.sort(
        (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
      )
    },
    enabled: Boolean(pedidoId),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

export function useNotifications(perfil?: Parameters<typeof notificationService.list>[0]) {
  return useQuery({
    queryKey: ['notifications', perfil ?? 'all'],
    queryFn: () => notificationService.list(perfil),
    refetchInterval: 30000,
  })
}
