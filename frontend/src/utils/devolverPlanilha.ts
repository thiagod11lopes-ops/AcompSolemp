import type {
  AppData,
  PedidoComDetalhes,
  PedidoPlanilhaEnvioState,
  User,
  UserRole,
  WorkflowEtapa,
} from '@/types'
import { getResponsavelParaEtapa } from '@/utils/workflow'

export type DestinoDevolucaoId = 'clinica' | 'medicamento' | string
export type OrigemPlanilha = 'clinica' | 'medicamento'

export interface DestinoDevolucaoPlanilha {
  id: DestinoDevolucaoId
  label: string
  detalhe: string
  etapaChave: string
  perfilNotificar: UserRole
  notificaOrigem: boolean
}

const SETORES_CAMINHO_CLINICA = [
  'DIV_MAT_AUDITORIA',
  'DIV_MAT_CONFECCAO_SOLEMP',
  'DIV_MAT_CONTABILIDADE_IMH',
] as const

const SETORES_CAMINHO_MEDICAMENTO = [
  'DIV_MAT_AUDITORIA',
  'DIV_MAT_CONTABILIDADE_IMH',
] as const

function historicoDaEtapa(
  pedido: Pick<PedidoComDetalhes, 'etapasHistorico'>,
  etapas: WorkflowEtapa[],
  chave: string,
) {
  const etapa = etapas.find((item) => item.chave === chave)
  if (!etapa) return null
  return (
    pedido.etapasHistorico.find(
      (h) => h.etapaId === etapa.id || h.etapaNome === etapa.nome,
    ) ?? null
  )
}

export function origemProducaoPlanilha(
  pedido: PedidoComDetalhes,
  planilha: PedidoPlanilhaEnvioState | null,
): OrigemPlanilha {
  if (planilha?.formato === 'imhMedicamento') return 'medicamento'
  if (pedido.clinica.tipo === 'medicamento') return 'medicamento'
  return 'clinica'
}

function setorVisitado(
  pedido: PedidoComDetalhes,
  etapas: WorkflowEtapa[],
  planilha: PedidoPlanilhaEnvioState | null,
  chave: string,
): boolean {
  const hist = historicoDaEtapa(pedido, etapas, chave)
  if (hist?.dataInicio) return true
  if (chave === 'DIV_MAT_AUDITORIA') {
    return Boolean(
      planilha?.recebidaEm &&
        !historicoDaEtapa(pedido, etapas, 'DIV_MAT_CONFECCAO_SOLEMP')?.dataInicio,
    )
  }
  if (chave === 'DIV_MAT_CONTABILIDADE_IMH') {
    return Boolean(planilha?.encaminhadaImhEm || planilha?.recebidaImhEm)
  }
  if (chave === 'DIV_MAT_CONFECCAO_SOLEMP') {
    return Boolean(
      planilha?.recebidaEm && historicoDaEtapa(pedido, etapas, 'DIV_MAT_CONFECCAO_SOLEMP'),
    )
  }
  return false
}

/** Destinos do caminho real da planilha: só quem produziu/enviou e os setores que a receberam. */
export function listarDestinosDevolucaoPlanilha(
  pedido: PedidoComDetalhes,
  etapas: WorkflowEtapa[],
  planilha: PedidoPlanilhaEnvioState | null,
  setorAtualChave: string,
): DestinoDevolucaoPlanilha[] {
  const origem = origemProducaoPlanilha(pedido, planilha)
  const destinos: DestinoDevolucaoPlanilha[] = []

  if (origem === 'medicamento') {
    destinos.push({
      id: 'medicamento',
      label: 'Medicamento',
      detalhe: 'Devolve ao medicamento que produziu e enviou a planilha. O setor será notificado.',
      etapaChave: 'SOLICITACAO',
      perfilNotificar: 'MEDICAMENTO',
      notificaOrigem: true,
    })
  } else {
    destinos.push({
      id: 'clinica',
      label: 'Clínica',
      detalhe: 'Devolve à clínica que produziu e enviou a planilha. O setor será notificado.',
      etapaChave: 'SOLICITACAO',
      perfilNotificar: 'CLINICA',
      notificaOrigem: true,
    })
  }

  const setoresCaminho =
    origem === 'medicamento' ? SETORES_CAMINHO_MEDICAMENTO : SETORES_CAMINHO_CLINICA

  for (const chave of setoresCaminho) {
    if (chave === setorAtualChave) continue
    if (!setorVisitado(pedido, etapas, planilha, chave)) continue
    const etapa = etapas.find((item) => item.chave === chave)
    if (!etapa) continue
    destinos.push({
      id: chave,
      label: etapa.nome,
      detalhe: `Retorna a planilha para ${etapa.nome}.`,
      etapaChave: chave,
      perfilNotificar: etapa.perfilResponsavel,
      notificaOrigem: false,
    })
  }

  return destinos
}

function nowIso(): string {
  return new Date().toISOString()
}

function ajustarFlagsPlanilha(
  data: AppData,
  pedidoId: string,
  etapaChave: string,
): void {
  const atual = data.pedidoPlanilhaEnvio?.[pedidoId]
  if (!atual) return

  if (etapaChave === 'SOLICITACAO') {
    data.pedidoPlanilhaEnvio![pedidoId] = {
      ...atual,
      recebidaEm: undefined,
      encaminhadaImhEm: undefined,
      recebidaImhEm: undefined,
      arquivadaEm: undefined,
    }
    return
  }

  if (etapaChave === 'DIV_MAT_AUDITORIA' || etapaChave === 'DIV_MAT_CONFECCAO_SOLEMP') {
    data.pedidoPlanilhaEnvio![pedidoId] = {
      ...atual,
      recebidaEm: undefined,
      encaminhadaImhEm: undefined,
      recebidaImhEm: undefined,
      arquivadaEm: undefined,
    }
    return
  }

  if (etapaChave === 'DIV_MAT_CONTABILIDADE_IMH') {
    data.pedidoPlanilhaEnvio![pedidoId] = {
      ...atual,
      recebidaImhEm: undefined,
      arquivadaEm: undefined,
    }
  }
}

function chavesAposDestino(destinoChave: string): string[] {
  if (destinoChave === 'SOLICITACAO') {
    return [
      'DIV_MAT_AUDITORIA',
      'DIV_MAT_CONFECCAO_SOLEMP',
      'DIV_MAT_CONTABILIDADE_IMH',
      'DIV_MAT_FINANCAS',
      'DIV_MAT_EMPENHADO',
    ]
  }
  if (destinoChave === 'DIV_MAT_AUDITORIA') {
    return ['DIV_MAT_CONTABILIDADE_IMH']
  }
  if (destinoChave === 'DIV_MAT_CONFECCAO_SOLEMP') {
    return ['DIV_MAT_FINANCAS', 'DIV_MAT_EMPENHADO']
  }
  return []
}

export function devolverPlanilhaParaDestino(
  data: AppData,
  pedidoId: string,
  destino: DestinoDevolucaoPlanilha,
  usuario: User,
  justificativa: string,
): AppData {
  const justificativaLimpa = justificativa.trim()
  if (justificativaLimpa.length < 10) {
    throw new Error('Informe a justificativa da devolução (mínimo 10 caracteres).')
  }

  const pedidoIndex = data.pedidos.findIndex((p) => p.id === pedidoId)
  if (pedidoIndex < 0) throw new Error('Pedido não encontrado')

  const pedido = { ...data.pedidos[pedidoIndex] }
  if (pedido.concluido) throw new Error('Processo já encerrado')

  const etapaDestino = data.workflowEtapas.find((e) => e.chave === destino.etapaChave)
  if (!etapaDestino) throw new Error('Setor de destino não encontrado')

  const etapaPorId = new Map(data.workflowEtapas.map((e) => [e.id, e]))
  const chavesDescartar = new Set(chavesAposDestino(destino.etapaChave))

  const historico = pedido.etapasHistorico.map((h) => ({ ...h }))
  const proximoHistorico = historico.filter((h) => {
    const chave = etapaPorId.get(h.etapaId)?.chave
    if (chave && chavesDescartar.has(chave)) return false
    return true
  })

  const observacao = `Planilha devolvida por ${usuario.nome} para ${destino.label}. Justificativa: ${justificativaLimpa}`

  const alvo = proximoHistorico.find(
    (h) =>
      h.etapaId === etapaDestino.id ||
      h.etapaNome === etapaDestino.nome ||
      etapaPorId.get(h.etapaId)?.chave === destino.etapaChave,
  )
  if (alvo) {
    alvo.dataConclusao = null
    alvo.observacao = observacao
  } else {
    const responsavelNovo = getResponsavelParaEtapa(etapaDestino, data.usuarios, pedido.clinicaId)
    proximoHistorico.push({
      etapaId: etapaDestino.id,
      etapaNome: etapaDestino.nome,
      responsavelId: responsavelNovo?.id ?? usuario.id,
      responsavelNome: responsavelNovo?.nome ?? usuario.nome,
      dataInicio: nowIso(),
      dataConclusao: null,
      observacao,
      arquivos: [],
    })
  }

  const responsavel = getResponsavelParaEtapa(etapaDestino, data.usuarios, pedido.clinicaId)
  const ativas = (pedido.etapasAtivasIds?.length ? pedido.etapasAtivasIds : [pedido.etapaAtualId]).filter(
    (id) => {
      const chave = etapaPorId.get(id)?.chave
      if (!chave) return false
      if (chavesDescartar.has(chave)) return false
      if (id === pedido.etapaAtualId) return false
      return true
    },
  )
  if (!ativas.includes(etapaDestino.id)) ativas.unshift(etapaDestino.id)

  data.pedidos[pedidoIndex] = {
    ...pedido,
    etapaAtualId: etapaDestino.id,
    etapasAtivasIds: ativas,
    responsavelAtualId: responsavel?.id ?? usuario.id,
    concluido: false,
    etapasHistorico: proximoHistorico,
    dataEntrega: destino.etapaChave === 'SOLICITACAO' ? null : pedido.dataEntrega,
  }

  if (data.processosArquivados) {
    data.processosArquivados = data.processosArquivados.filter((item) => {
      if (item.pedidoId !== pedidoId) return true
      return !chavesDescartar.has(item.etapaChave) && item.etapaChave !== destino.etapaChave
    })
  }

  ajustarFlagsPlanilha(data, pedidoId, destino.etapaChave)

  const etapaAtual =
    data.workflowEtapas.find((e) => e.id === pedido.etapaAtualId) ??
    data.workflowEtapas.find((e) => e.id === (pedido.etapasAtivasIds?.[0] ?? ''))
  const clinicaNome =
    data.clinicas.find((c) => c.id === pedido.clinicaId)?.nome ?? destino.label
  const reversaoId = `rev-planilha-${Date.now()}`

  if (!data.reversoes) data.reversoes = []
  data.reversoes.push({
    id: reversaoId,
    pedidoId,
    pedidoNumero: pedido.numero,
    clinicaNome,
    etapaDeNome: etapaAtual?.nome ?? 'Setor atual',
    etapaParaNome: destino.label,
    motivo: justificativaLimpa,
    usuarioId: usuario.id,
    usuarioNome: usuario.nome,
    data: nowIso(),
    status: 'PENDENTE',
    respostaGestor: null,
    dataResposta: null,
    gestorNome: null,
  })

  data.historico.push({
    id: `hist-devolver-${Date.now()}`,
    pedidoId,
    etapaId: etapaDestino.id,
    etapaNome: etapaDestino.nome,
    usuarioId: usuario.id,
    usuarioNome: usuario.nome,
    data: nowIso(),
    observacao,
  })

  data.notificacoes.push({
    id: `notif-devolver-${pedidoId}-${destino.id}-${Date.now()}`,
    tipo: 'PLANILHA_DEVOLVIDA',
    titulo: `Planilha devolvida — ${pedido.numero}`,
    mensagem: `${usuario.nome} devolveu a planilha para ${destino.label}. Justificativa: ${justificativaLimpa}`,
    pedidoId,
    reversaoId,
    perfilDestino: destino.perfilNotificar,
    etapaChave: destino.etapaChave,
    lida: false,
    data: nowIso(),
  })

  data.notificacoes.push({
    id: `notif-devolver-gestor-${pedidoId}-${Date.now()}`,
    tipo: 'REVERSAO_TIMELINE',
    titulo: `Devolução de planilha — ${pedido.numero}`,
    mensagem: `${usuario.nome} devolveu a planilha para ${destino.label}. ${justificativaLimpa}`,
    pedidoId,
    reversaoId,
    perfilDestino: null,
    etapaChave: destino.etapaChave,
    lida: false,
    data: nowIso(),
  })

  return data
}
