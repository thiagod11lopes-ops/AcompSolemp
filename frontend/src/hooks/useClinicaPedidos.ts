import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clinicaPedidoService, type CreatePedidoInput } from '@/services/clinicaPedidoService'
import { useClinicaAuth } from '@/contexts/AuthContext'

export function useClinicaPedidos() {
  const { user } = useClinicaAuth()
  const clinicaId = user?.clinicaId ?? ''

  return useQuery({
    queryKey: ['clinica-pedidos', clinicaId],
    queryFn: () => clinicaPedidoService.listByClinica(clinicaId),
    enabled: Boolean(clinicaId),
  })
}

export function useClinicaPedido(id: string) {
  const { user } = useClinicaAuth()
  const clinicaId = user?.clinicaId ?? ''

  return useQuery({
    queryKey: ['clinica-pedido', id, clinicaId],
    queryFn: () => clinicaPedidoService.getById(id, clinicaId),
    enabled: Boolean(id && clinicaId),
  })
}

export function useSolempDefaults() {
  const { user } = useClinicaAuth()
  const clinicaId = user?.clinicaId ?? ''

  return useQuery({
    queryKey: ['solemp-defaults', clinicaId],
    queryFn: () => clinicaPedidoService.getSolempDefaults(clinicaId),
    enabled: Boolean(clinicaId),
  })
}

export function useCreateClinicaPedido() {
  const { user } = useClinicaAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreatePedidoInput) =>
      clinicaPedidoService.create(input, user!.id, user!.clinicaId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinica-pedidos'] })
    },
  })
}

export function useClinicaPedidoAcao() {
  const { user } = useClinicaAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { pedidoId: string; solempNumero?: string; notaFiscalNumero?: string }) =>
      clinicaPedidoService.executarAcao({
        pedidoId: params.pedidoId,
        solempNumero: params.solempNumero,
        notaFiscalNumero: params.notaFiscalNumero,
        usuarioId: user!.id,
        clinicaId: user!.clinicaId!,
      }),
    onSuccess: (_, { pedidoId }) => {
      invalidatePedidoQueries(queryClient, pedidoId)
    },
  })
}

export function useClinicaReverterEtapa() {
  const { user } = useClinicaAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { pedidoId: string; motivo: string }) =>
      clinicaPedidoService.reverterEtapa(
        params.pedidoId,
        user!.id,
        user!.clinicaId!,
        params.motivo,
      ),
    onSuccess: (_, { pedidoId }) => {
      invalidatePedidoQueries(queryClient, pedidoId)
      queryClient.invalidateQueries({ queryKey: ['reversoes'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

function invalidatePedidoQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  pedidoId: string,
) {
  queryClient.invalidateQueries({ queryKey: ['clinica-pedidos'] })
  queryClient.invalidateQueries({ queryKey: ['clinica-pedido', pedidoId] })
  queryClient.invalidateQueries({ queryKey: ['historico', pedidoId] })
  queryClient.invalidateQueries({ queryKey: ['solemp-defaults'] })
}
