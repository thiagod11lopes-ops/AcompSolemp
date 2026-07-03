import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { PedidoFilters } from '@/types'
import { pedidoService } from '@/services/pedidoService'
import { notificationService } from '@/services/cadastroService'

export function usePedidos(filters?: PedidoFilters) {
  return useQuery({
    queryKey: ['pedidos', filters],
    queryFn: () => pedidoService.list(filters),
  })
}

export function usePedido(id: string) {
  return useQuery({
    queryKey: ['pedido', id],
    queryFn: () => pedidoService.getById(id),
    enabled: Boolean(id),
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
