import type { PedidoComDetalhes } from '@/types'
import { delay, loadAppData, saveAppData } from '@/mocks/seed'
import { enrichPedido } from '@/utils/workflow'
import { registrarPagamentoForPedido } from '@/utils/workflowAdvance'

function getContext(data: ReturnType<typeof loadAppData>) {
  return {
    clinicas: data.clinicas,
    empresas: data.empresas,
    materiais: data.materiais,
    etapas: data.workflowEtapas,
    usuarios: data.usuarios,
    solemp: data.solemp,
    notasFiscais: data.notasFiscais,
  }
}

const ETAPAS_FINANCEIRO = ['DIV_MAT_FINANCAS'] as const

function isPedidoPagamentoPendente(
  pedido: ReturnType<typeof loadAppData>['pedidos'][0],
  data: ReturnType<typeof loadAppData>,
): boolean {
  const etapa = data.workflowEtapas.find((e) => e.id === pedido.etapaAtualId)
  return Boolean(
    etapa &&
      ETAPAS_FINANCEIRO.includes(etapa.chave as (typeof ETAPAS_FINANCEIRO)[number]) &&
      !pedido.concluido,
  )
}

export const financeiroService = {
  async listPagamentosPendentes(): Promise<PedidoComDetalhes[]> {
    await delay(null)
    const data = loadAppData()
    const ctx = getContext(data)

    return data.pedidos
      .filter((p) => isPedidoPagamentoPendente(p, data))
      .map((p) => enrichPedido(p, ctx))
      .filter((p): p is PedidoComDetalhes => p !== null)
      .sort((a, b) => new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime())
  },

  async getById(pedidoId: string): Promise<PedidoComDetalhes | null> {
    await delay(null)
    const data = loadAppData()
    const pedido = data.pedidos.find((p) => p.id === pedidoId)
    if (!pedido || !isPedidoPagamentoPendente(pedido, data)) return null
    return enrichPedido(pedido, getContext(data))
  },

  async registrarPagamento(
    pedidoId: string,
    solempId: string,
    usuarioId: string,
  ): Promise<PedidoComDetalhes> {
    await delay(null, 500)
    let data = loadAppData()
    const usuario = data.usuarios.find((u) => u.id === usuarioId && u.perfil === 'FINANCEIRO')
    if (!usuario) throw new Error('Usuário não autorizado')

    data = registrarPagamentoForPedido(data, pedidoId, solempId, usuario)
    saveAppData(data)

    const pedido = data.pedidos.find((p) => p.id === pedidoId)!
    const enriched = enrichPedido(pedido, getContext(data))
    if (!enriched) throw new Error('Erro ao atualizar pedido')
    return enriched
  },
}
