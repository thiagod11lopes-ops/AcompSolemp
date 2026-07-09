import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ordenadorService } from '@/services/ordenadorService'
import { useOrdenadorAuth } from '@/contexts/AuthContext'

export function useOrdenadorPedidos() {
  const { user } = useOrdenadorAuth()
  return useQuery({
    queryKey: ['ordenador-pedidos', user?.id],
    queryFn: () => ordenadorService.listTimelines(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useOrdenadorPedido(id: string) {
  const { user } = useOrdenadorAuth()
  return useQuery({
    queryKey: ['ordenador-pedido', id, user?.id],
    queryFn: () => ordenadorService.getById(id, user!.id),
    enabled: Boolean(id && user?.id),
    staleTime: 0,
    refetchOnMount: 'always',
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
      assinanteNome,
    }: {
      pedidoId: string
      anotacoes?: string
      solempNumero?: string
      solempValor?: number
      assinanteNome?: string
    }) =>
      ordenadorService.executarAcao(pedidoId, user!.id, {
        anotacoes,
        solempNumero,
        solempValor,
        assinanteNome,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenador-pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['ordenador-pedido'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['pedido'] })
      queryClient.invalidateQueries({ queryKey: ['demo-pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['demo-pedido'] })
      queryClient.invalidateQueries({ queryKey: ['processos-arquivados'] })
    },
  })
}
