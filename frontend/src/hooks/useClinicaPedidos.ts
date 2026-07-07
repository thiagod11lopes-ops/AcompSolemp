import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clinicaPedidoService, type CreatePedidoInput } from '@/services/clinicaPedidoService'
import { consumoPlanilhaService } from '@/services/consumoPlanilhaService'
import { useClinicaAuth } from '@/contexts/AuthContext'
import { usePortalPaths } from '@/contexts/DemoRouteContext'
import { subscribeDemoAppDataChanged } from '@/mocks/seed'

function useDemoClinicaInvalidation(queryKey: readonly unknown[]): void {
  const queryClient = useQueryClient()
  const { isDemo } = usePortalPaths()

  useEffect(() => {
    if (!isDemo) return
    return subscribeDemoAppDataChanged(() => {
      queryClient.invalidateQueries({ queryKey: [...queryKey] })
    })
  }, [isDemo, queryClient, queryKey])
}

export function useClinicaPedidos() {
  const { user } = useClinicaAuth()
  const clinicaId = user?.clinicaId ?? ''
  const queryKey = ['clinica-pedidos', clinicaId] as const

  useDemoClinicaInvalidation(queryKey)

  return useQuery({
    queryKey,
    queryFn: () => clinicaPedidoService.listByClinica(clinicaId),
    enabled: Boolean(clinicaId),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

export function useClinicaPedido(id: string) {
  const { user } = useClinicaAuth()
  const clinicaId = user?.clinicaId ?? ''
  const queryKey = ['clinica-pedido', id, clinicaId] as const

  useDemoClinicaInvalidation(queryKey)

  return useQuery({
    queryKey,
    queryFn: () => clinicaPedidoService.getById(id, clinicaId),
    enabled: Boolean(id && clinicaId),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
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

export function useDeleteAllClinicaPedidos() {
  const { user } = useClinicaAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => clinicaPedidoService.deleteAllByClinica(user!.clinicaId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinica-pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['solemp-defaults'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['consumo-planilha'] })
    },
  })
}

export function useDeletePedidosByIds() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (pedidoIds: string[]) => clinicaPedidoService.deletePedidosByIds(pedidoIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinica-pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['solemp-defaults'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['consumo-planilha'] })
    },
  })
}

export function useConsumoPlanilhaState(clinicaId: string) {
  const queryKey = ['consumo-planilha', clinicaId] as const
  useDemoClinicaInvalidation(queryKey)

  return useQuery({
    queryKey,
    queryFn: () => consumoPlanilhaService.getState(clinicaId),
    enabled: Boolean(clinicaId),
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}

function invalidateAfterPedidoMutation(
  queryClient: ReturnType<typeof useQueryClient>,
  pedidoId?: string,
) {
  queryClient.invalidateQueries({ queryKey: ['clinica-pedidos'] })
  queryClient.invalidateQueries({ queryKey: ['pedidos'] })
  queryClient.invalidateQueries({ queryKey: ['demo-pedidos'] })
  queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  queryClient.invalidateQueries({ queryKey: ['notifications'] })
  queryClient.invalidateQueries({ queryKey: ['ordenador-pedidos'] })
  queryClient.invalidateQueries({ queryKey: ['ordenador-pedido'] })
  queryClient.invalidateQueries({ queryKey: ['historico'] })
  queryClient.invalidateQueries({ queryKey: ['workflow-etapas'] })
  if (pedidoId) {
    queryClient.invalidateQueries({ queryKey: ['clinica-pedido', pedidoId] })
    queryClient.invalidateQueries({ queryKey: ['demo-pedido', pedidoId] })
    queryClient.invalidateQueries({ queryKey: ['historico', pedidoId] })
  }
}

export function useCreateClinicaPedido() {
  const { user } = useClinicaAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreatePedidoInput) =>
      clinicaPedidoService.create(input, user!.id, user!.clinicaId!),
    onSuccess: () => {
      invalidateAfterPedidoMutation(queryClient)
    },
  })
}

export function useAdicionarFluxoParalelo() {
  const { user } = useClinicaAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { pedidoId: string; fluxo: 'auditoria' | 'confeccao' }) =>
      clinicaPedidoService.adicionarFluxoParalelo(
        params.pedidoId,
        params.fluxo,
        user!.id,
        user!.clinicaId!,
      ),
    onSuccess: (pedido) => {
      invalidateAfterPedidoMutation(queryClient, pedido.id)
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
  queryClient.invalidateQueries({ queryKey: ['demo-pedidos'] })
  queryClient.invalidateQueries({ queryKey: ['demo-pedido', pedidoId] })
  queryClient.invalidateQueries({ queryKey: ['solemp-defaults'] })
}
