import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ordenadorService } from '@/services/ordenadorService'
import { useOrdenadorAuth } from '@/contexts/AuthContext'

export function useOrdenadorPedidos() {
  const { user } = useOrdenadorAuth()
  return useQuery({
    queryKey: ['ordenador-pedidos', user?.id],
    queryFn: () => ordenadorService.listPendentesAssinatura(user!.id),
    enabled: Boolean(user?.id),
  })
}

export function useOrdenadorPedido(id: string) {
  const { user } = useOrdenadorAuth()
  return useQuery({
    queryKey: ['ordenador-pedido', id, user?.id],
    queryFn: () => ordenadorService.getById(id, user!.id),
    enabled: Boolean(id && user?.id),
  })
}

export function useAssinarSolemp() {
  const { user } = useOrdenadorAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      pedidoId,
      anotacoes,
      solempNumero,
      solempValor,
    }: {
      pedidoId: string
      anotacoes?: string
      solempNumero?: string
      solempValor?: number
    }) =>
      ordenadorService.executarAcao(pedidoId, user!.id, {
        anotacoes,
        solempNumero,
        solempValor,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenador-pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['ordenador-pedido'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['pedido'] })
    },
  })
}
