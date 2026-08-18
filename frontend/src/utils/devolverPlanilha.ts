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

export interface DestinoDevolucaoPlanilha {
  id: DestinoDevolucaoId
  label: string
  detalhe: string
  etapaChave: string
  perfilNotificar: UserRole
  notificaOrigem: boolean
}

const SETORES_CAMINHO_PLANILHA = [
  'DIV_MAT_AUDITORIA',
  'DIV_MAT_CONFECCAO_SOLEMP',
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

function setorVisitado(
  pedido: PedidoComDetalhes,
  etapas: WorkflowEtapa[],
  planilha: PedidoPlanilhaEnvioState | null,
  chave: string,
): boolean {
  const hist = historicoDaEtapa(pedido, etapas, chave)
  if (hist?.dataInicio) return true
  if (chave === 'DIV_MAT_AUDITORIA') {
    return Boolean(planilha?.recebidaEm && !historicoDaEtapa(pedido, etapas, 'DIV_MAT_CONFECCAO_SOLEMP')?.dataInicio)
  }
  if (chave === 'DIV_MAT_CONTABILIDADE_IMH') {
    return Boolean(planilha?.encaminhadaImhEm || planilha?.recebidaImhEm)
  }
  if (chave === 'DIV_MAT_CONFECCAO_SOLEMP') {
    return Boolean(planilha?.recebidaEm && historicoDaEtapa(pedido, etapas, 'DIV_MAT_CONFECCAO_SOLEMP'))
  }
  return false
}

/** Setores pelos quais a planilha já passou, mais Clínica e Medicamento. */
export function listarDestinosDevolucaoPlanilha(
  pedido: PedidoComDetalhes,
  etapas: WorkflowEtapa[],
  planilha: PedidoPlanilhaEnvioState | null,
  setorAtualChave: string,
): DestinoDevolucaoPlanilha[] {
  const destinos: DestinoDevolucaoPlanilha[] = [
    {
      id: 'clinica',
      label: 'Clínica',
      detalhe: 'Devolve à clínica de origem. O setor será notificado.',
      etapaChave: 'SOLICITACAO',
      perfilNotificar: 'CLINICA',
      notificaOrigem: true,
    },
    {
      id: 'medicamento',
      label: 'Medicamento',
      detalhe: 'Devolve ao portal de medicamento. O setor será notificado.',
      etapaChave: 'SOLICITACAO',
      perfilNotificar: 'MEDICAMENTO',
      notificaOrigem: true,
    },
  ]

  for (const chave of SETORES_CAMINHO_PLANILHA) {
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
): AppData {
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

  const observacao = `Planilha devolvida por ${usuario.nome} para ${destino.label}.`

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
    mensagem: `${usuario.nome} devolveu a planilha para ${destino.label}. Acesse o processo para revisar.`,
    pedidoId,
    reversaoId: null,
    perfilDestino: destino.perfilNotificar,
    etapaChave: destino.etapaChave,
    lida: false,
    data: nowIso(),
  })

  return data
}
