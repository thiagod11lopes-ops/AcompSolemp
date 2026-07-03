import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  usuarioCadastroService,
  type CreateClinicaUserInput,
  type CreateOrdenadorUserInput,
  type CreateFinanceiroUserInput,
} from '@/services/usuarioCadastroService'

export function useCreateClinicaUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateClinicaUserInput) => usuarioCadastroService.createClinicaUser(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      await queryClient.invalidateQueries({ queryKey: ['clinicas'] })
      await queryClient.refetchQueries({ queryKey: ['clinicas'] })
    },
  })
}

export function useCreateOrdenadorUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateOrdenadorUserInput) => usuarioCadastroService.createOrdenadorUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })
}

export function useCreateFinanceiroUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateFinanceiroUserInput) => usuarioCadastroService.createFinanceiroUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })
}
