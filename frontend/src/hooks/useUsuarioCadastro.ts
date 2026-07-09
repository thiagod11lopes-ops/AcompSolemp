import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  usuarioCadastroService,
  type CreatePortalUserInput,
} from '@/services/usuarioCadastroService'
import { isCadastroEntidadeClinica } from '@/types/cadastroPerfis'

export function useCreatePortalUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePortalUserInput) =>
      usuarioCadastroService.createPortalUser(input),
    onSuccess: async (_result, variables) => {
      await queryClient.refetchQueries({ queryKey: ['usuarios'] })
      if (isCadastroEntidadeClinica(variables.opcao)) {
        await queryClient.refetchQueries({ queryKey: ['clinicas'] })
      }
    },
  })
}

export function useDeleteCadastro() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { isEntidadeClinica: boolean; id: string }) =>
      usuarioCadastroService.deleteCadastro(input),
    onSuccess: async (_result, variables) => {
      await queryClient.refetchQueries({ queryKey: ['usuarios'] })
      if (variables.isEntidadeClinica) {
        await queryClient.refetchQueries({ queryKey: ['clinicas'] })
      }
    },
  })
}
