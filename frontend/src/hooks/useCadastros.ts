import { useQuery } from '@tanstack/react-query'
import {
  cadastroService,
  historicoService,
  notificationService,
  workflowService,
} from '@/services/cadastroService'

export function useClinicas() {
  return useQuery({ queryKey: ['clinicas'], queryFn: cadastroService.listClinicas })
}

export function useEmpresas() {
  return useQuery({ queryKey: ['empresas'], queryFn: cadastroService.listEmpresas })
}

export function useMateriais() {
  return useQuery({ queryKey: ['materiais'], queryFn: cadastroService.listMateriais })
}

export function useUsuarios() {
  return useQuery({ queryKey: ['usuarios'], queryFn: cadastroService.listUsuarios })
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

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.list,
    refetchInterval: 30000,
  })
}
