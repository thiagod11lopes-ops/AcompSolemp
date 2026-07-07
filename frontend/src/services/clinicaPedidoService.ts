import type { DadosClinicaLancamento, PacientePedido, PedidoComDetalhes } from '@/types'
import { enrichPedido } from '@/utils/workflow'
import {
  advancePedidoEtapa,
  createNotaFiscalForPedido,
  createSolempForPedido,
  revertPedidoEtapa,
} from '@/utils/workflowAdvance'
import { CLINICA_ETAPA_ACOES } from '@/utils/portal'
import { getSolempDefaults, type SolempNumeroParts } from '@/utils/solemp'
import { delay, loadAppData, saveAppData } from '@/mocks/seed'
import { removePedidosFromAppData } from '@/utils/pedidoCleanup'
import { notifySetoresEtapasAtivas } from '@/utils/workflowAdvance'

export interface CreatePedidoInput {
  id?: string
  fluxo?: 'auditoria' | 'paralelo'
  paciente: PacientePedido
  dadosClinica: DadosClinicaLancamento
}

function ensureEmpresaByNome(
  data: ReturnType<typeof loadAppData>,
  nome: string,
): string {
  const trimmed = nome.trim()
  const existing = data.empresas.find(
    (e) =>
      e.nomeFantasia.localeCompare(trimmed, 'pt-BR', { sensitivity: 'accent' }) === 0 ||
      e.razaoSocial.localeCompare(trimmed, 'pt-BR', { sensitivity: 'accent' }) === 0,
  )
  if (existing) return existing.id

  const id = `empresa-${Date.now()}`
  data.empresas.push({
    id,
    razaoSocial: trimmed,
    nomeFantasia: trimmed,
    cnpj: '',
    contato: '',
    telefone: '',
    email: '',
  })
  return id
}

function ensureMaterialByDescricao(
  data: ReturnType<typeof loadAppData>,
  descricaoInput: string,
): string {
  const trimmed = descricaoInput.trim()
  const existing = data.materiais.find(
    (m) => m.descricao.localeCompare(trimmed, 'pt-BR', { sensitivity: 'accent' }) === 0,
  )
  if (existing) return existing.id

  const id = `material-${Date.now()}`
  data.materiais.push({
    id,
    descricao: trimmed,
    fabricante: '',
    unidade: 'UN',
  })
  return id
}

export interface ExecutarAcaoInput {
  pedidoId: string
  usuarioId: string
  clinicaId: string
  solempNumero?: string
  notaFiscalNumero?: string
}

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

export const clinicaPedidoService = {
  async listByClinica(clinicaId: string): Promise<PedidoComDetalhes[]> {
    await delay(null)
    const data = loadAppData()
    return data.pedidos
      .filter((p) => p.clinicaId === clinicaId)
      .map((p) => enrichPedido(p, getContext(data)))
      .filter((p): p is PedidoComDetalhes => p !== null)
      .sort((a, b) => new Date(b.dataSolicitacao).getTime() - new Date(a.dataSolicitacao).getTime())
  },

  async getById(id: string, clinicaId: string): Promise<PedidoComDetalhes | null> {
    await delay(null)
    const data = loadAppData()
    const pedido = data.pedidos.find((p) => p.id === id && p.clinicaId === clinicaId)
    if (!pedido) return null
    return enrichPedido(pedido, getContext(data))
  },

  getSolempDefaults(clinicaId: string): SolempNumeroParts {
    const data = loadAppData()
    return getSolempDefaults(data, clinicaId)
  },

  async create(
    input: CreatePedidoInput,
    usuarioId: string,
    clinicaId: string,
  ): Promise<PedidoComDetalhes> {
    await delay(null, 500)
    let data = loadAppData()
    const usuario = data.usuarios.find((u) => u.id === usuarioId)
    if (!usuario) throw new Error('Usuário não encontrado')

    const etapas = [...data.workflowEtapas].sort((a, b) => a.ordem - b.ordem)
    const solicitacao = etapas.find((e) => e.chave === 'SOLICITACAO')
    const auditoria = etapas.find((e) => e.chave === 'DIV_MAT_AUDITORIA')
    const confeccao = etapas.find((e) => e.chave === 'DIV_MAT_CONFECCAO_SOLEMP')
    if (!solicitacao || !auditoria || !confeccao) {
      throw new Error('Workflow não configurado')
    }

    const numero = `PED-${String(data.pedidos.length + 1).padStart(5, '0')}`
    const agora = new Date().toISOString()
    const pedidoId = input.id ?? `pedido-${Date.now()}`
    if (data.pedidos.some((p) => p.id === pedidoId)) {
      throw new Error('Este lançamento já possui um processo em andamento.')
    }

    const empresaId = ensureEmpresaByNome(data, input.dadosClinica.empresaConsignada)
    const materialId = ensureMaterialByDescricao(data, input.dadosClinica.materialUtilizado)
    const observacaoInicial = `Lançamento do paciente ${input.paciente.nome}.`
    const somenteAuditoria = input.fluxo === 'auditoria'

    const historicoAuditoria = {
      etapaId: auditoria.id,
      etapaNome: auditoria.nome,
      responsavelId: null,
      responsavelNome: null,
      dataInicio: agora,
      dataConclusao: null as string | null,
      observacao: somenteAuditoria
        ? 'Aguardando recebimento da planilha pela Auditoria.'
        : 'Fluxo paralelo — Material (Auditoria).',
      arquivos: [] as never[],
    }

    const historicoConfeccao = somenteAuditoria
      ? null
      : {
          etapaId: confeccao.id,
          etapaNome: confeccao.nome,
          responsavelId: null,
          responsavelNome: null,
          dataInicio: agora,
          dataConclusao: null as string | null,
          observacao: 'Fluxo paralelo — Material (Confecção de Solemp).',
          arquivos: [] as never[],
        }

    const pedido = {
      id: pedidoId,
      numero,
      clinicaId,
      empresaId,
      materialId,
      quantidade: input.dadosClinica.quantidade,
      valor: input.dadosClinica.valorTotal,
      observacoes: observacaoInicial,
      paciente: input.paciente,
      dadosClinica: input.dadosClinica,
      dataSolicitacao: agora,
      dataEntrega: null,
      etapaAtualId: somenteAuditoria ? auditoria.id : confeccao.id,
      etapasAtivasIds: somenteAuditoria ? [auditoria.id] : [confeccao.id, auditoria.id],
      responsavelAtualId: usuario.id,
      concluido: false,
      etapasHistorico: [
        {
          etapaId: solicitacao.id,
          etapaNome: solicitacao.nome,
          responsavelId: usuario.id,
          responsavelNome: usuario.nome,
          dataInicio: agora,
          dataConclusao: agora,
          observacao: observacaoInicial,
          arquivos: [],
        },
        historicoAuditoria,
        ...(historicoConfeccao ? [historicoConfeccao] : []),
      ],
    }

    data.pedidos.push(pedido)
    data.historico.push({
      id: `hist-${Date.now()}`,
      pedidoId: pedido.id,
      etapaId: solicitacao.id,
      etapaNome: solicitacao.nome,
      usuarioId: usuario.id,
      usuarioNome: usuario.nome,
      data: agora,
      observacao: somenteAuditoria
        ? `Timeline iniciada — pedido ${numero} enviado para Auditoria.`
        : `Timeline iniciada — pedido ${numero} enviado para a Div. de Material (fluxo paralelo).`,
    })

    notifySetoresEtapasAtivas(data, pedido.id)
    saveAppData(data)
    const enriched = enrichPedido(pedido, getContext(data))
    if (!enriched) throw new Error('Erro ao criar pedido')
    return enriched
  },

  async executarAcao(input: ExecutarAcaoInput): Promise<PedidoComDetalhes> {
    await delay(null, 500)
    let data = loadAppData()
    const usuario = data.usuarios.find((u) => u.id === input.usuarioId)
    const pedido = data.pedidos.find(
      (p) => p.id === input.pedidoId && p.clinicaId === input.clinicaId,
    )
    if (!usuario || !pedido) throw new Error('Pedido não encontrado')
    if (usuario.perfil === 'CLINICA') {
      throw new Error(
        'Após o envio para a Div. de Material, a clínica possui apenas visualização da timeline.',
      )
    }

    const etapa = data.workflowEtapas.find((e) => e.id === pedido.etapaAtualId)
    if (!etapa) throw new Error('Etapa não encontrada')

    const acao = CLINICA_ETAPA_ACOES[etapa.chave]
    if (!acao) throw new Error('Ação não disponível nesta etapa')

    if (etapa.chave === 'SOLEMP_CRIADA') {
      if (!input.solempNumero) throw new Error('Informe o número da SOLEMP')
      data = createSolempForPedido(data, input.pedidoId, input.solempNumero)
    }
    if (etapa.chave === 'SOLEMP_ASSINADA' || etapa.chave === 'NF_ANEXADA') {
      if (!input.notaFiscalNumero?.trim()) {
        throw new Error('Informe o número da nota fiscal')
      }
      data = createNotaFiscalForPedido(data, input.pedidoId, input.notaFiscalNumero.trim())
    }

    data = advancePedidoEtapa(data, input.pedidoId, usuario, acao.proximaObservacao)

    if (etapa.chave === 'SOLEMP_ASSINADA') {
      const pedidoIntermediario = data.pedidos.find((p) => p.id === input.pedidoId)!
      const etapaIntermediaria = data.workflowEtapas.find(
        (e) => e.id === pedidoIntermediario.etapaAtualId,
      )
      if (etapaIntermediaria?.chave === 'NF_ANEXADA') {
        data = advancePedidoEtapa(
          data,
          input.pedidoId,
          usuario,
          'Nota fiscal anexada e processo enviado ao financeiro pela clínica.',
        )
      }
    }

    const pedidoAtualizado = data.pedidos.find((p) => p.id === input.pedidoId)!

    if (etapa.chave === 'SOLEMP_CRIADA') {
      data.notificacoes.push({
        id: `notif-${Date.now()}`,
        tipo: 'SOLEMP_CRIADA',
        titulo: `SOLEMP criada — ${pedido.numero}`,
        mensagem: `SOLEMP ${input.solempNumero} confeccionada.`,
        pedidoId: input.pedidoId,
        reversaoId: null,
        perfilDestino: null,
        etapaChave: etapa.chave,
        lida: false,
        data: new Date().toISOString(),
      })
    }

    saveAppData(data)

    const atualizado = pedidoAtualizado
    const enriched = enrichPedido(atualizado, getContext(data))
    if (!enriched) throw new Error('Erro ao atualizar pedido')
    return enriched
  },

  async reverterEtapa(
    pedidoId: string,
    usuarioId: string,
    clinicaId: string,
    motivo: string,
  ): Promise<PedidoComDetalhes> {
    await delay(null, 500)
    let data = loadAppData()
    const usuario = data.usuarios.find((u) => u.id === usuarioId)
    const pedido = data.pedidos.find((p) => p.id === pedidoId && p.clinicaId === clinicaId)
    const clinica = data.clinicas.find((c) => c.id === clinicaId)
    if (!usuario || !pedido || !clinica) throw new Error('Pedido não encontrado')
    if (usuario.perfil === 'CLINICA') {
      throw new Error(
        'Após o envio para a Div. de Material, a clínica possui apenas visualização da timeline.',
      )
    }

    data = revertPedidoEtapa(data, pedidoId, usuario, motivo, clinica.nome)
    saveAppData(data)

    const atualizado = data.pedidos.find((p) => p.id === pedidoId)!
    const enriched = enrichPedido(atualizado, getContext(data))
    if (!enriched) throw new Error('Erro ao reverter etapa')
    return enriched
  },

  getAcaoDisponivel(etapaChave: string): (typeof CLINICA_ETAPA_ACOES)[string] | null {
    return CLINICA_ETAPA_ACOES[etapaChave] ?? null
  },

  podeReverter(pedido: PedidoComDetalhes, etapas: { id: string; ordem: number }[]): boolean {
    if (pedido.concluido) return false
    const ordenadas = [...etapas].sort((a, b) => a.ordem - b.ordem)
    const index = ordenadas.findIndex((e) => e.id === pedido.etapaAtualId)
    return index > 0
  },

  getEtapaAnteriorNome(pedido: PedidoComDetalhes, etapas: { id: string; nome: string; ordem: number }[]): string {
    const ordenadas = [...etapas].sort((a, b) => a.ordem - b.ordem)
    const index = ordenadas.findIndex((e) => e.id === pedido.etapaAtualId)
    return ordenadas[index - 1]?.nome ?? ''
  },

  async deleteAllByClinica(clinicaId: string): Promise<number> {
    await delay(null, 400)
    const data = loadAppData()
    const pedidoIds = new Set(
      data.pedidos.filter((p) => p.clinicaId === clinicaId).map((p) => p.id),
    )
    if (pedidoIds.size === 0) {
      saveAppData(data)
      return 0
    }

    removePedidosFromAppData(data, pedidoIds)
    saveAppData(data)
    return pedidoIds.size
  },

  async deletePedidosByIds(pedidoIds: string[]): Promise<number> {
    await delay(null, 300)
    const data = loadAppData()
    const ids = new Set(pedidoIds)
    if (ids.size === 0) {
      saveAppData(data)
      return 0
    }
    removePedidosFromAppData(data, ids)
    saveAppData(data)
    return ids.size
  },
}
