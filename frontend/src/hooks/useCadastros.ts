import { useQuery } from '@tanstack/react-query'
import {
  cadastroService,
  historicoService,
  notificationService,
  workflowService,
} from '@/services/cadastroService'

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
  return useQuery({ queryKey: ['workflow-etapas'], queryFn: workflowService.listEtapas })
}

export function useHistorico(pedidoId?: string) {
  return useQuery({
    queryKey: ['historico', pedidoId],
    queryFn: () => historicoService.list(pedidoId),
  })
}

export function useNotifications(perfil?: Parameters<typeof notificationService.list>[0]) {
  return useQuery({
    queryKey: ['notifications', perfil ?? 'all'],
    queryFn: () => notificationService.list(perfil),
    refetchInterval: 30000,
  })
}
