import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { financeiroService } from '@/services/financeiroService'
import { useFinanceiroAuth } from '@/contexts/AuthContext'

export function useFinanceiroPedidos() {
  return useQuery({
    queryKey: ['financeiro-pedidos'],
    queryFn: () => financeiroService.listPagamentosPendentes(),
  })
}

export function useFinanceiroPedido(id: string) {
  return useQuery({
    queryKey: ['financeiro-pedido', id],
    queryFn: () => financeiroService.getById(id),
    enabled: Boolean(id),
  })
}

export function useRegistrarPagamento() {
  const { user } = useFinanceiroAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pedidoId, solempId }: { pedidoId: string; solempId: string }) =>
      financeiroService.registrarPagamento(pedidoId, solempId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro-pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['financeiro-pedido'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    },
  })
}
