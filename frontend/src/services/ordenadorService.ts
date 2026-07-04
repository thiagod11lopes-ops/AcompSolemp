import type { PedidoComDetalhes, UserRole } from '@/types'
import { delay, loadAppData, saveAppData } from '@/mocks/seed'
import { enrichPedido } from '@/utils/workflow'
import { advancePedidoEtapa, assinarSolempForPedido } from '@/utils/workflowAdvance'
import {
  PERFIS_SETOR,
  PERFIS_SOLEMP,
  PERFIL_PARA_CHAVE_ETAPA,
} from '@/utils/perfilEtapa'

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

function pedidoPendenteParaPerfil(
  pedido: ReturnType<typeof loadAppData>['pedidos'][0],
  data: ReturnType<typeof loadAppData>,
  perfil: UserRole,
): boolean {
  if (pedido.concluido) return false
  const chave = PERFIL_PARA_CHAVE_ETAPA[perfil]
  if (!chave) return false

  const ativas = pedido.etapasAtivasIds?.length
    ? pedido.etapasAtivasIds
    : [pedido.etapaAtualId]

  return data.workflowEtapas.some((e) => ativas.includes(e.id) && e.chave === chave)
}

export const ordenadorService = {
  async listPendentesAssinatura(usuarioId: string): Promise<PedidoComDetalhes[]> {
    await delay(null)
    const data = loadAppData()
    const usuario = data.usuarios.find((u) => u.id === usuarioId && u.ativo)
    if (!usuario || !PERFIS_SETOR.includes(usuario.perfil)) return []

    const ctx = getContext(data)
    return data.pedidos
      .filter((p) => pedidoPendenteParaPerfil(p, data, usuario.perfil))
      .map((p) => enrichPedido(p, ctx))
      .filter((p): p is PedidoComDetalhes => p !== null)
      .sort((a, b) => new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime())
  },

  async getById(pedidoId: string, usuarioId: string): Promise<PedidoComDetalhes | null> {
    await delay(null)
    const data = loadAppData()
    const usuario = data.usuarios.find((u) => u.id === usuarioId && u.ativo)
    if (!usuario) return null

    const pedido = data.pedidos.find((p) => p.id === pedidoId)
    if (!pedido || !pedidoPendenteParaPerfil(pedido, data, usuario.perfil)) return null
    return enrichPedido(pedido, getContext(data))
  },

  async executarAcao(
    pedidoId: string,
    usuarioId: string,
    options?: {
      anotacoes?: string
      solempNumero?: string
      solempValor?: number
      assinanteNome?: string
    },
  ): Promise<PedidoComDetalhes> {
    await delay(null, 500)
    let data = loadAppData()
    const usuario = data.usuarios.find(
      (u) => u.id === usuarioId && PERFIS_SETOR.includes(u.perfil),
    )
    if (!usuario) throw new Error('Usuário não autorizado')

    const anotacoes = options?.anotacoes

    if (PERFIS_SOLEMP.includes(usuario.perfil)) {
      data = assinarSolempForPedido(data, pedidoId, usuario, {
        numero: options?.solempNumero,
        valor: options?.solempValor,
        assinanteNome: options?.assinanteNome,
      })
    } else {
      const chave = PERFIL_PARA_CHAVE_ETAPA[usuario.perfil]
      if (!chave) throw new Error('Perfil sem etapa associada')

      const pedido = data.pedidos.find((p) => p.id === pedidoId)
      if (!pedido) throw new Error('Pedido não encontrado')

      const ativas = pedido.etapasAtivasIds?.length
        ? pedido.etapasAtivasIds
        : [pedido.etapaAtualId]
      const etapa = data.workflowEtapas.find((e) => ativas.includes(e.id) && e.chave === chave)
      if (!etapa) throw new Error('Nenhuma etapa ativa para o seu perfil')

      const notas = anotacoes?.trim()
      let observacao: string
      if (chave === 'DIV_MAT_AUDITORIA') {
        observacao = notas
          ? `Auditoria concluída por ${usuario.nome}. Enviado para Contabilidade/IMH. Anotações: ${notas}`
          : `Auditoria concluída por ${usuario.nome}. Enviado para Contabilidade/IMH.`
      } else if (chave === 'DIV_MAT_CONTABILIDADE_IMH') {
        observacao = `Contabilidade/IMH concluída por ${usuario.nome}. Dados do paciente, material, valor e data conferidos e confirmados como corretos. Etapa finalizada.`
      } else {
        observacao = notas
          ? `${etapa.nome} concluída por ${usuario.nome}. Anotações: ${notas}`
          : `${etapa.nome} concluída por ${usuario.nome}.`
      }

      data = advancePedidoEtapa(data, pedidoId, usuario, observacao, etapa.id)
    }

    saveAppData(data)

    const pedido = data.pedidos.find((p) => p.id === pedidoId)!
    const enriched = enrichPedido(pedido, getContext(data))
    if (!enriched) throw new Error('Erro ao atualizar pedido')
    return enriched
  },

  /** @deprecated use executarAcao */
  async assinarSolemp(pedidoId: string, usuarioId: string): Promise<PedidoComDetalhes> {
    return this.executarAcao(pedidoId, usuarioId)
  },
}
