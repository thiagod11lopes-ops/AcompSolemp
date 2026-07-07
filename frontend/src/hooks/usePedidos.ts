import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { PedidoFilters } from '@/types'
import { pedidoService } from '@/services/pedidoService'
import { notificationService } from '@/services/cadastroService'
import { useGestorAuth } from '@/contexts/AuthContext'
import { subscribeDemoAppDataChanged } from '@/mocks/seed'

export function usePedidos(filters?: PedidoFilters) {
  return useQuery({
    queryKey: ['pedidos', filters],
    queryFn: () => pedidoService.list(filters),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

export function useDemoPedidos(filters?: PedidoFilters) {
  const queryClient = useQueryClient()

  useEffect(() => {
    return subscribeDemoAppDataChanged(() => {
      queryClient.invalidateQueries({ queryKey: ['demo-pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['demo-pedido'] })
      queryClient.invalidateQueries({ queryKey: ['demo-workflow-etapas'] })
      queryClient.invalidateQueries({ queryKey: ['demo-historico'] })
    })
  }, [queryClient])

  return useQuery({
    queryKey: ['demo-pedidos', filters],
    queryFn: () => pedidoService.listDemo(filters),
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

export function useDemoPedido(id: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    return subscribeDemoAppDataChanged(() => {
      queryClient.invalidateQueries({ queryKey: ['demo-pedido', id] })
    })
  }, [queryClient, id])

  return useQuery({
    queryKey: ['demo-pedido', id],
    queryFn: () => pedidoService.getDemoById(id),
    enabled: Boolean(id),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
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
    queryClient.invalidateQueries({ queryKey: ['demo-pedidos'] })
    queryClient.invalidateQueries({ queryKey: ['demo-pedido'] })
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
      queryClient.invalidateQueries({ queryKey: ['demo-pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['demo-pedido'] })
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
