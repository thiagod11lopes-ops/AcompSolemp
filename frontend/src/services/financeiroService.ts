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

function financasEtapaConcluida(
  pedido: ReturnType<typeof loadAppData>['pedidos'][0],
  etapas: ReturnType<typeof loadAppData>['workflowEtapas'],
): boolean {
  const financas = etapas.find((etapa) => etapa.chave === 'DIV_MAT_FINANCAS')
  if (!financas) return false

  return pedido.etapasHistorico.some(
    (historico) =>
      (historico.etapaId === financas.id || historico.etapaNome === financas.nome) &&
      Boolean(historico.dataConclusao),
  )
}

function isPedidoPagamentoPendente(
  pedido: ReturnType<typeof loadAppData>['pedidos'][0],
  data: ReturnType<typeof loadAppData>,
): boolean {
  if (pedido.concluido || financasEtapaConcluida(pedido, data.workflowEtapas)) return false

  const ativas = pedido.etapasAtivasIds?.length
    ? pedido.etapasAtivasIds
    : [pedido.etapaAtualId]

  return data.workflowEtapas.some(
    (e) =>
      ativas.includes(e.id) &&
      ETAPAS_FINANCEIRO.includes(e.chave as (typeof ETAPAS_FINANCEIRO)[number]),
  )
}

function isPedidoFinanceiroAcessivel(
  pedido: ReturnType<typeof loadAppData>['pedidos'][0],
  data: ReturnType<typeof loadAppData>,
): boolean {
  if (isPedidoPagamentoPendente(pedido, data)) return true

  const arquivadoFinanceiro = data.processosArquivados?.some(
    (arquivo) => arquivo.pedidoId === pedido.id && arquivo.etapaChave === 'DIV_MAT_FINANCAS',
  )

  return (
    financasEtapaConcluida(pedido, data.workflowEtapas) ||
    Boolean(arquivadoFinanceiro)
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

  /** Pendentes e já pagos/arquivados (abas Em andamento / Todas / Concluídas). */
  async listTimelines(): Promise<PedidoComDetalhes[]> {
    await delay(null)
    const data = loadAppData()
    const ctx = getContext(data)

    return data.pedidos
      .filter((p) => isPedidoFinanceiroAcessivel(p, data))
      .map((p) => enrichPedido(p, ctx))
      .filter((p): p is PedidoComDetalhes => p !== null)
      .sort((a, b) => new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime())
  },

  async getById(pedidoId: string): Promise<PedidoComDetalhes | null> {
    await delay(null)
    const data = loadAppData()
    const pedido = data.pedidos.find((p) => p.id === pedidoId)
    if (!pedido || !isPedidoFinanceiroAcessivel(pedido, data)) return null
    return enrichPedido(pedido, getContext(data))
  },

  async registrarPagamento(
    pedidoId: string,
    solempId: string,
    usuarioId: string,
    options?: { notaFiscalNumero: string; empresaNome: string },
  ): Promise<PedidoComDetalhes> {
    await delay(null, 500)
    let data = loadAppData()
    const usuario = data.usuarios.find((u) => u.id === usuarioId && u.perfil === 'FINANCEIRO')
    if (!usuario) throw new Error('Usuário não autorizado')

    data = registrarPagamentoForPedido(data, pedidoId, solempId, usuario, options)
    saveAppData(data)

    const pedido = data.pedidos.find((p) => p.id === pedidoId)!
    const enriched = enrichPedido(pedido, getContext(data))
    if (!enriched) throw new Error('Erro ao atualizar pedido')
    return enriched
  },
}
