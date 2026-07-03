import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ordenadorService } from '@/services/ordenadorService'
import { useOrdenadorAuth } from '@/contexts/AuthContext'

export function useOrdenadorPedidos() {
  return useQuery({
    queryKey: ['ordenador-pedidos'],
    queryFn: () => ordenadorService.listPendentesAssinatura(),
  })
}

export function useOrdenadorPedido(id: string) {
  return useQuery({
    queryKey: ['ordenador-pedido', id],
    queryFn: () => ordenadorService.getById(id),
    enabled: Boolean(id),
  })
}

export function useAssinarSolemp() {
  const { user } = useOrdenadorAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (pedidoId: string) => ordenadorService.assinarSolemp(pedidoId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenador-pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['ordenador-pedido'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
