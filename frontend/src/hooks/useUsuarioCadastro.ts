import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  usuarioCadastroService,
  type CreatePortalUserInput,
} from '@/services/usuarioCadastroService'

export function useCreatePortalUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePortalUserInput) =>
      usuarioCadastroService.createPortalUser(input),
    onSuccess: async (_result, variables) => {
      await queryClient.refetchQueries({ queryKey: ['usuarios'] })
      if (variables.opcao.isClinica) {
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
      await queryClient.refetchQueries({ queryKey: ['usuarios'] })
      if (variables.isClinica) {
        await queryClient.refetchQueries({ queryKey: ['clinicas'] })
      }
    },
  })
}
