import type { PedidoComDetalhes, User, UserRole } from '@/types'
import { useCloudAppDataSync } from '@/config/dataSource'
import { flushSupabaseAppDataSync } from '@/data/persistence/supabaseSync'
import {
  DEMO_EXEMPLO_USER_PREFIX,
  ensureDemoUserById,
} from '@/services/demoCadastrosService'
import { delay, loadAppData, loadFreshAppData, saveAppData } from '@/mocks/seed'
import { enrichPedido } from '@/utils/workflow'
import { advancePedidoEtapa, assinarSolempForPedido } from '@/utils/workflowAdvance'
import {
  devolverPlanilhaParaDestino,
  type DestinoDevolucaoPlanilha,
} from '@/utils/devolverPlanilha'
import {
  PERFIS_SETOR,
  PERFIL_PARA_CHAVE_ETAPA,
  CHAVES_CONFECCAO_CADEIA,
  chavePendenteParaPerfil,
  pedidoPendenteParaChave,
  pedidoPendenteParaPerfil,
  pedidoRelacionadoParaPerfil,
} from '@/utils/perfilEtapa'
import { userHasPerfil } from '@/utils/userPerfis'
import { pedidoPlanilhaEnvioService } from '@/services/pedidoPlanilhaEnvioService'

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

function isPendentePerfil(
  pedido: ReturnType<typeof loadAppData>['pedidos'][0],
  data: ReturnType<typeof loadAppData>,
  usuario: { perfil: UserRole; perfis?: UserRole[] },
): boolean {
  return pedidoPendenteParaPerfil(
    pedido,
    data.workflowEtapas,
    usuario.perfil,
    data.processosArquivados,
    usuario,
  )
}

function isRelacionadoPerfil(
  pedido: ReturnType<typeof loadAppData>['pedidos'][0],
  data: ReturnType<typeof loadAppData>,
  usuario: { perfil: UserRole; perfis?: UserRole[] },
): boolean {
  return pedidoRelacionadoParaPerfil(
    pedido,
    data.workflowEtapas,
    usuario.perfil,
    data.processosArquivados,
    usuario,
  )
}

async function resolveDataForSetor(usuarioId: string): Promise<{
  data: ReturnType<typeof loadAppData>
  usuario: User | null
}> {
  let data = await loadFreshAppData()
  let usuario = data.usuarios.find((item) => item.id === usuarioId && item.ativo) ?? null

  if (!usuario && usuarioId.startsWith(DEMO_EXEMPLO_USER_PREFIX)) {
    await ensureDemoUserById(usuarioId)
    data = loadAppData()
    usuario = data.usuarios.find((item) => item.id === usuarioId && item.ativo) ?? null
  }

  if (!usuario || !PERFIS_SETOR.some((perfil) => userHasPerfil(usuario, perfil))) {
    return { data, usuario: null }
  }

  return { data, usuario }
}

async function persistSetorData(data: ReturnType<typeof loadAppData>): Promise<void> {
  saveAppData(data)
  if (useCloudAppDataSync()) {
    await flushSupabaseAppDataSync()
  }
}

export const ordenadorService = {
  async listPendentesAssinatura(usuarioId: string): Promise<PedidoComDetalhes[]> {
    await delay(null)
    const { data, usuario } = await resolveDataForSetor(usuarioId)
    if (!usuario) return []

    const ctx = getContext(data)
    return data.pedidos
      .filter((p) => isPendentePerfil(p, data, usuario))
      .map((p) => enrichPedido(p, ctx))
      .filter((p): p is PedidoComDetalhes => p !== null)
      .sort((a, b) => new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime())
  },

  /** Pendentes e já tratados pelo setor (abas Em andamento / Todas / Concluídas). */
  async listTimelines(usuarioId: string): Promise<PedidoComDetalhes[]> {
    await delay(null)
    const { data, usuario } = await resolveDataForSetor(usuarioId)
    if (!usuario) return []

    const ctx = getContext(data)
    return data.pedidos
      .filter((p) => isRelacionadoPerfil(p, data, usuario))
      .map((p) => enrichPedido(p, ctx))
      .filter((p): p is PedidoComDetalhes => p !== null)
      .sort((a, b) => new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime())
  },

  async getById(pedidoId: string, usuarioId: string): Promise<PedidoComDetalhes | null> {
    await delay(null)
    const { data, usuario } = await resolveDataForSetor(usuarioId)
    if (!usuario) return null

    const pedido = data.pedidos.find((p) => p.id === pedidoId)
    if (!pedido || !isRelacionadoPerfil(pedido, data, usuario)) return null
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
    const { data: initialData, usuario } = await resolveDataForSetor(usuarioId)
    if (!usuario) throw new Error('Usuário não autorizado')
    let data = initialData

    const anotacoes = options?.anotacoes

    const pedidoAtual = data.pedidos.find((p) => p.id === pedidoId)
    if (!pedidoAtual) throw new Error('Pedido não encontrado')

    const chavePendente = chavePendenteParaPerfil(
      pedidoAtual,
      data.workflowEtapas,
      usuario.perfil,
      data.processosArquivados,
      usuario,
    )
    const usaCadeiaSolemp =
      Boolean(chavePendente) &&
      (CHAVES_CONFECCAO_CADEIA as readonly string[]).includes(chavePendente!) &&
      (userHasPerfil(usuario, 'CONFECCAO_SOLEMP') || userHasPerfil(usuario, 'FINANCEIRO'))

    const chaveGate =
      chavePendente ??
      (usaCadeiaSolemp ? null : PERFIL_PARA_CHAVE_ETAPA[usuario.perfil]) ??
      null
    if (
      chaveGate &&
      (chaveGate === 'DIV_MAT_AUDITORIA' ||
        chaveGate === 'DIV_MAT_CONTABILIDADE_IMH' ||
        chaveGate === 'DIV_MAT_CONFECCAO_SOLEMP' ||
        chaveGate === 'DIV_MAT_FINANCAS' ||
        chaveGate === 'DIV_MAT_EMPENHADO') &&
      !pedidoPlanilhaEnvioService.foiRecebidaNoSetor(pedidoId, chaveGate)
    ) {
      throw new Error(
        'Receba a planilha antes de enviar. Clique em Receber Planilha primeiro.',
      )
    }

    if (usaCadeiaSolemp) {
      data = assinarSolempForPedido(data, pedidoId, usuario, {
        numero: options?.solempNumero,
        valor: options?.solempValor,
        assinanteNome: options?.assinanteNome,
      })
    } else {
      const chave = chavePendente ?? PERFIL_PARA_CHAVE_ETAPA[usuario.perfil]
      if (!chave) throw new Error('Perfil sem etapa associada')

      if (
        !pedidoPendenteParaChave(
          pedidoAtual,
          data.workflowEtapas,
          chave,
          data.processosArquivados,
        )
      ) {
        throw new Error('Nenhuma etapa ativa para o seu perfil')
      }

      const etapa = data.workflowEtapas.find((item) => item.chave === chave)
      if (!etapa) throw new Error('Etapa do workflow não encontrada')

      const notas = anotacoes?.trim()
      let observacao: string
      if (chave === 'DIV_MAT_AUDITORIA') {
        observacao = notas
          ? `Auditoria concluída por ${usuario.nome}. Planilha da Div. de Material enviada para IMH e Confecção de Solemp. Anotações: ${notas}`
          : `Auditoria concluída por ${usuario.nome}. Planilha da Div. de Material enviada para IMH e Confecção de Solemp.`
      } else if (chave === 'DIV_MAT_CONTABILIDADE_IMH') {
        observacao = notas
          ? `IMH concluída por ${usuario.nome}. Itens conferidos e confirmados como corretos. Anotações: ${notas}`
          : `IMH concluída por ${usuario.nome}. Itens conferidos e confirmados como corretos. Etapa finalizada.`
      } else {
        observacao = notas
          ? `${etapa.nome} concluída por ${usuario.nome}. Anotações: ${notas}`
          : `${etapa.nome} concluída por ${usuario.nome}.`
      }

      data = advancePedidoEtapa(data, pedidoId, usuario, observacao, etapa.id)
    }

    await persistSetorData(data)

    // Depois do avanço persistido: marca encaminhamento sem sobrescrever o pedido.
    if (!usaCadeiaSolemp) {
      const chaveFinal = chavePendente ?? PERFIL_PARA_CHAVE_ETAPA[usuario.perfil]
      if (chaveFinal === 'DIV_MAT_AUDITORIA') {
        pedidoPlanilhaEnvioService.markEncaminhadaImh(pedidoId)
        if (useCloudAppDataSync()) {
          await flushSupabaseAppDataSync()
        }
      }
    }

    const dataFinal = loadAppData()
    const pedido = dataFinal.pedidos.find((p) => p.id === pedidoId)!
    const enriched = enrichPedido(pedido, getContext(dataFinal))
    if (!enriched) throw new Error('Erro ao atualizar pedido')
    return enriched
  },

  async devolverPlanilha(
    pedidoId: string,
    usuarioId: string,
    destino: DestinoDevolucaoPlanilha,
    justificativa: string,
  ): Promise<PedidoComDetalhes> {
    await delay(null, 400)
    const { data: initialData, usuario } = await resolveDataForSetor(usuarioId)
    if (!usuario) throw new Error('Usuário não autorizado')

    const data = devolverPlanilhaParaDestino(
      initialData,
      pedidoId,
      destino,
      usuario,
      justificativa,
    )
    await persistSetorData(data)

    const pedido = data.pedidos.find((p) => p.id === pedidoId)
    if (!pedido) throw new Error('Pedido não encontrado')
    const enriched = enrichPedido(pedido, getContext(data))
    if (!enriched) throw new Error('Erro ao devolver planilha')
    return enriched
  },

  /** @deprecated use executarAcao */
  async assinarSolemp(pedidoId: string, usuarioId: string): Promise<PedidoComDetalhes> {
    return this.executarAcao(pedidoId, usuarioId)
  },
}
