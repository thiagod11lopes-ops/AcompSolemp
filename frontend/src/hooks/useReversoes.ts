import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reversaoService } from '@/services/reversaoService'
import { useGestorAuth } from '@/contexts/AuthContext'

export function useReversoes() {
  return useQuery({
    queryKey: ['reversoes'],
    queryFn: reversaoService.list,
  })
}

export function useReversoesPendentes() {
  return useQuery({
    queryKey: ['reversoes', 'pendentes'],
    queryFn: reversaoService.listPendentes,
  })
}

export function useMarcarReversaoCiente() {
  const { user } = useGestorAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (reversaoId: string) =>
      reversaoService.marcarCiente(reversaoId, user!.id, user!.nome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reversoes'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useResponderReversao() {
  const { user } = useGestorAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { reversaoId: string; resposta: string }) =>
      reversaoService.responder(params.reversaoId, user!.id, user!.nome, params.resposta),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reversoes'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
