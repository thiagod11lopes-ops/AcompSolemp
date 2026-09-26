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
    // Atualiza o cache a partir do AppData local (já flushado). Evita invalidate
    // imediato que refetcha um snapshot remoto atrasado e “some” com o cadastro.
    onSuccess: () => {
      syncCadastroQueries(queryClient, { refreshClinicas: true })
    },
    onSettled: () => {
      syncCadastroQueries(queryClient, { refreshClinicas: true })
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
    onSuccess: () => {
      syncCadastroQueries(queryClient, { refreshClinicas: true })
    },
    onSettled: () => {
      syncCadastroQueries(queryClient, { refreshClinicas: true })
    },
  })
}
