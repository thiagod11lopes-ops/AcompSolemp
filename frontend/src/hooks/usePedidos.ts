import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { PedidoFilters } from '@/types'
import { pedidoService } from '@/services/pedidoService'
import { notificationService } from '@/services/cadastroService'
import { useGestorAuth } from '@/contexts/AuthContext'

export function usePedidos(filters?: PedidoFilters) {
  return useQuery({
    queryKey: ['pedidos', filters],
    queryFn: () => pedidoService.list(filters),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

export function usePedido(id: string) {
  return useQuery({
    queryKey: ['pedido', id],
    queryFn: () => pedidoService.getById(id),
    enabled: Boolean(id),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => pedidoService.getDashboardMetrics(),
  })
}

export function useInvalidatePedidos() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    queryClient.invalidateQueries({ queryKey: ['pedido'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useDeleteGestorPedido() {
  const queryClient = useQueryClient()
  const { user } = useGestorAuth()

  return useMutation({
    mutationFn: (pedidoId: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado.')
      return pedidoService.deleteById(pedidoId, user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['pedido'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['clinica-pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['ordenador-pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['financeiro-pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['consumo-planilha'] })
      queryClient.invalidateQueries({ queryKey: ['reversoes'] })
    },
  })
}
