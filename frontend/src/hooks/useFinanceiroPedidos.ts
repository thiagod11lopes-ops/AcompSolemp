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
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useRegistrarPagamento() {
  const { user } = useFinanceiroAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      pedidoId,
      solempId,
      notaFiscalNumero,
      empresaNome,
    }: {
      pedidoId: string
      solempId: string
      notaFiscalNumero: string
      empresaNome: string
    }) =>
      financeiroService.registrarPagamento(pedidoId, solempId, user!.id, {
        notaFiscalNumero,
        empresaNome,
      }),
    onSuccess: (_, { pedidoId }) => {
      queryClient.invalidateQueries({ queryKey: ['financeiro-pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['financeiro-pedido', pedidoId] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] })
      queryClient.invalidateQueries({ queryKey: ['demo-pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['demo-pedido', pedidoId] })
      queryClient.invalidateQueries({ queryKey: ['clinica-pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['clinica-pedido', pedidoId] })
      queryClient.invalidateQueries({ queryKey: ['processos-arquivados'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
