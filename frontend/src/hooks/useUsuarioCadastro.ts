import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  usuarioCadastroService,
  getCredenciaisPorLogin,
  type CreatePortalUserInput,
} from '@/services/usuarioCadastroService'

export function useCredenciaisPorLogin() {
  return useQuery({
    queryKey: ['credenciais-por-login'],
    queryFn: () => getCredenciaisPorLogin(),
  })
}

export function useCreatePortalUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePortalUserInput) =>
      usuarioCadastroService.createPortalUser(input),
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      await queryClient.invalidateQueries({ queryKey: ['credenciais-por-login'] })
      if (variables.opcao.isClinica) {
        await queryClient.invalidateQueries({ queryKey: ['clinicas'] })
        await queryClient.refetchQueries({ queryKey: ['clinicas'] })
      }
    },
  })
}

export function useDeleteCadastro() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { isClinica: boolean; id: string }) =>
      usuarioCadastroService.deleteCadastro(input),
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      await queryClient.invalidateQueries({ queryKey: ['credenciais-por-login'] })
      if (variables.isClinica) {
        await queryClient.invalidateQueries({ queryKey: ['clinicas'] })
        await queryClient.refetchQueries({ queryKey: ['clinicas'] })
      }
    },
  })
}
