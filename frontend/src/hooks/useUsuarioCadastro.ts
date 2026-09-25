import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  usuarioCadastroService,
  type CreatePortalUserInput,
} from '@/services/usuarioCadastroService'
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
    // Sempre sincroniza usuários + clínicas: o 1º cadastro de entidade precisa
    // das duas listas, e onSettled cobre sucesso mesmo com latência de rede.
    onSettled: async () => {
      syncCadastroQueries(queryClient, { refreshClinicas: true })
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      await queryClient.invalidateQueries({ queryKey: ['clinicas'] })
    },
  })
}

export function useDeleteCadastro() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { isEntidadeClinica: boolean; id: string }) =>
      usuarioCadastroService.deleteCadastro(input),
    // Soft-delete local roda antes do revoke na nuvem: atualiza a lista mesmo se
    // a RPC falhar (evita card "Cadastrados" mostrar quem já foi excluído).
    onSettled: async () => {
      syncCadastroQueries(queryClient, { refreshClinicas: true })
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      await queryClient.invalidateQueries({ queryKey: ['clinicas'] })
    },
  })
}
