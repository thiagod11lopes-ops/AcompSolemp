import type { PedidoComDetalhes } from '@/types'
import { delay, loadAppData, saveAppData } from '@/mocks/seed'
import { enrichPedido } from '@/utils/workflow'
import { assinarSolempForPedido } from '@/utils/workflowAdvance'

const ETAPAS_ORDENADOR = [
  'DIV_MAT_CONFECCAO_SOLEMP',
  'DIV_MAT_ASSINATURA_1',
  'DIV_MAT_ASSINATURA_2',
] as const

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

function isPedidoAguardandoAssinatura(pedido: ReturnType<typeof loadAppData>['pedidos'][0], data: ReturnType<typeof loadAppData>): boolean {
  const ativas = pedido.etapasAtivasIds?.length
    ? pedido.etapasAtivasIds
    : [pedido.etapaAtualId]
  const etapa = data.workflowEtapas.find(
    (e) =>
      ativas.includes(e.id) &&
      ETAPAS_ORDENADOR.includes(e.chave as (typeof ETAPAS_ORDENADOR)[number]),
  )
  if (!etapa) return false
  if (etapa.chave === 'DIV_MAT_CONFECCAO_SOLEMP' || etapa.chave === 'DIV_MAT_ASSINATURA_1') {
    return true
  }
  const solemp = data.solemp.find((s) => s.pedidoId === pedido.id)
  return Boolean(solemp && !solemp.assinada)
}

export const ordenadorService = {
  async listPendentesAssinatura(): Promise<PedidoComDetalhes[]> {
    await delay(null)
    const data = loadAppData()
    const ctx = getContext(data)

    return data.pedidos
      .filter((p) => !p.concluido && isPedidoAguardandoAssinatura(p, data))
      .map((p) => enrichPedido(p, ctx))
      .filter((p): p is PedidoComDetalhes => p !== null)
      .sort((a, b) => new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime())
  },

  async getById(pedidoId: string): Promise<PedidoComDetalhes | null> {
    await delay(null)
    const data = loadAppData()
    const pedido = data.pedidos.find((p) => p.id === pedidoId)
    if (!pedido || !isPedidoAguardandoAssinatura(pedido, data)) return null
    return enrichPedido(pedido, getContext(data))
  },

  async assinarSolemp(pedidoId: string, usuarioId: string): Promise<PedidoComDetalhes> {
    await delay(null, 500)
    let data = loadAppData()
    const usuario = data.usuarios.find((u) => u.id === usuarioId && u.perfil === 'ASSINANTE')
    if (!usuario) throw new Error('Usuário não autorizado')

    data = assinarSolempForPedido(data, pedidoId, usuario)
    saveAppData(data)

    const pedido = data.pedidos.find((p) => p.id === pedidoId)!
    const enriched = enrichPedido(pedido, getContext(data))
    if (!enriched) throw new Error('Erro ao atualizar pedido')
    return enriched
  },
}
