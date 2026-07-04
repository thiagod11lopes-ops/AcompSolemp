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
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      if (variables.opcao.isClinica) {
        await queryClient.invalidateQueries({ queryKey: ['clinicas'] })
        await queryClient.refetchQueries({ queryKey: ['clinicas'] })
      }
    },
  })
}
