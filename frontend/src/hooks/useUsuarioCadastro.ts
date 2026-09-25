import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  usuarioCadastroService,
  type CreatePortalUserInput,
} from '@/services/usuarioCadastroService'
import { isCadastroEntidadeClinica } from '@/types/cadastroPerfis'
import { loadAppData } from '@/mocks/seed'

function syncCadastroQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  options?: { refreshClinicas?: boolean },
): void {
  const data = loadAppData()
  queryClient.setQueryData(['usuarios'], data.usuarios)
  if (options?.refreshClinicas) {
    queryClient.setQueryData(['clinicas'], data.clinicas)
  }
}

export function useCreatePortalUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePortalUserInput) =>
      usuarioCadastroService.createPortalUser(input),
    onSuccess: async (_result, variables) => {
      const refreshClinicas = variables.opcoes.some((o) => isCadastroEntidadeClinica(o))
      // Atualiza a lista imediatamente a partir do cache local (sem esperar o refetch).
      syncCadastroQueries(queryClient, { refreshClinicas })
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      if (refreshClinicas) {
        await queryClient.invalidateQueries({ queryKey: ['clinicas'] })
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
      syncCadastroQueries(queryClient, { refreshClinicas: variables.isEntidadeClinica })
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      if (variables.isEntidadeClinica) {
        await queryClient.invalidateQueries({ queryKey: ['clinicas'] })
      }
    },
  })
}
