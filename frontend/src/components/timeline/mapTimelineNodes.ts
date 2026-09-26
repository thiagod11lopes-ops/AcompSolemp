import { differenceInCalendarDays, differenceInHours, isValid, parseISO } from 'date-fns'
import type { PedidoComDetalhes, WorkflowEtapa } from '@/types'
import { calcularDiasNaEtapa } from '@/utils/workflow'
import { resolveEtapaFromRef } from '@/utils/workflow'
import { getEtapaIcon } from './icons'
import type {
  TimelineEdgeState,
  TimelineHeaderModel,
  TimelineLane,
  TimelineNodeData,
  TimelineNodeStatus,
  TimelineSection,
} from './types'
import { buildTimelineBlocos, filtrarEtapasParaTimeline, resolveEtapaNomeExibicao, timelineConnectorVisivel, tituloGrupoOcultoNaTimeline, isEtapaDispensavelMedicamento, isPedidoTimelineMedicamento } from '@/utils/timelineFlow'
import type { PedidoPlanilhaEnvioState } from '@/types'
import { resolvePlanilhaEdgeState } from './timelinePlanilhaPath'
import { resolveEmpenhoExibicao } from '@/utils/empenho'
import { resolveJustificativaDevolucaoPedido } from '@/utils/devolverPlanilha'
import { loadAppData } from '@/mocks/seed'
import { somarPctIndenizarDoPedido } from '@/utils/totalIndenizado'

const ETAPAS_COM_INDENIZAR_NO_CARD = new Set([
  'DIV_MAT_AUDITORIA',
  'DIV_MAT_CONTABILIDADE_IMH',
])

function resolveValorIndenizarNoCard(
  pedido: PedidoComDetalhes,
  etapa: WorkflowEtapa,
  etapas: WorkflowEtapa[],
  cache: Map<string, number>,
): number | null {
  if (!ETAPAS_COM_INDENIZAR_NO_CARD.has(etapa.chave)) return null
  if (!etapaIniciadaNoPedido(pedido, etapas, etapa.chave)) return null

  let valor = cache.get(pedido.id)
  if (valor === undefined) {
    valor = somarPctIndenizarDoPedido(loadAppData(), pedido)
    cache.set(pedido.id, valor)
  }
  return valor > 0 ? valor : null
}

function resolveHistorico(
  pedido: PedidoComDetalhes,
  etapa: WorkflowEtapa,
  etapas: WorkflowEtapa[],
) {
  return (
    pedido.etapasHistorico.find(
      (h) =>
        h.etapaId === etapa.id ||
        h.etapaNome === etapa.nome ||
        resolveEtapaFromRef(h.etapaId, h.etapaNome, etapas)?.id === etapa.id,
    ) ?? null
  )
}

function formatTempoNaEtapa(
  pedido: PedidoComDetalhes,
  historico: ReturnType<typeof resolveHistorico>,
  atual: boolean,
): string | null {
  if (!historico) return null
  if (historico.dataConclusao) {
    const fim = parseISO(historico.dataConclusao)
    const inicio = parseISO(historico.dataInicio)
    if (isValid(fim) && isValid(inicio)) {
      const dias = differenceInCalendarDays(fim, inicio)
      return dias <= 0 ? '< 1 dia' : `${dias} dia${dias > 1 ? 's' : ''}`
    }
  }
  if (atual) {
    const dias = calcularDiasNaEtapa(pedido)
    return dias <= 0 ? '< 1 dia' : `${dias} dia${dias > 1 ? 's' : ''}`
  }
  return null
}

function resolveProcessoNumero(
  pedido: PedidoComDetalhes,
  etapa: WorkflowEtapa,
): string | null {
  if (etapa.chave === 'DIV_MAT_CONFECCAO_SOLEMP' && pedido.solemp?.numero) {
    return pedido.solemp.numero
  }
  if (etapa.chave === 'DIV_MAT_FINANCAS' && pedido.notaFiscal?.numero) {
    return pedido.notaFiscal.numero
  }
  if (pedido.solemp?.numero) return pedido.solemp.numero
  return pedido.numero
}

function etapaIniciadaNoPedido(
  pedido: PedidoComDetalhes,
  etapas: WorkflowEtapa[],
  chave: string,
): boolean {
  const etapa = etapas.find((e) => e.chave === chave)
  if (!etapa) return false
  return pedido.etapasHistorico.some(
    (h) => h.etapaId === etapa.id || h.etapaNome === etapa.nome,
  )
}

function resolveSolicitacaoStatus(
  pedido: PedidoComDetalhes,
  etapas: WorkflowEtapa[],
): TimelineNodeStatus {
  // Medicamento: tarja Concluído assim que a planilha é enviada ao IMH.
  if (isPedidoTimelineMedicamento(pedido, etapas)) {
    const enviouImh = etapaIniciadaNoPedido(
      pedido,
      etapas,
      'DIV_MAT_CONTABILIDADE_IMH',
    )
    return enviouImh || pedido.concluido ? 'completed' : 'active'
  }

  // Clínica: tarja Concluído quando a planilha já foi enviada à Auditoria
  // (Confecção e IMH recebem depois, no encaminhamento da Auditoria).
  const enviouAuditoria = etapaIniciadaNoPedido(pedido, etapas, 'DIV_MAT_AUDITORIA')
  if (enviouAuditoria) return 'completed'
  // Envio direto só para Confecção (legado / fluxo isolado).
  const enviouConfeccao = etapaIniciadaNoPedido(
    pedido,
    etapas,
    'DIV_MAT_CONFECCAO_SOLEMP',
  )
  if (enviouConfeccao) return 'completed'
  return 'active'
}

function etapaArquivadaNoPedido(pedidoId: string, etapaChave: string): boolean {
  return Boolean(
    loadAppData().processosArquivados?.some(
      (arquivo) => arquivo.pedidoId === pedidoId && arquivo.etapaChave === etapaChave,
    ),
  )
}

function resolveNodeStatus(
  pedido: PedidoComDetalhes,
  historico: ReturnType<typeof resolveHistorico>,
  atual: boolean,
  etapaChave?: string,
): TimelineNodeStatus {
  // Status por etapa: não usar pedido.concluido para pintar todos os cards.
  // Na clínica, IMH/Finanças encerram só a própria trilha.
  if (historico?.dataConclusao) return 'completed'
  if (etapaChave && etapaArquivadaNoPedido(pedido.id, etapaChave)) return 'completed'
  if (atual) {
    if (pedido.prazoStatus === 'ATRASADO') return 'error'
    if (pedido.prazoStatus === 'PROXIMO_VENCIMENTO') return 'review'
    return 'active'
  }
  if (historico && !historico.dataConclusao) return 'active'
  return 'waiting'
}

export function buildTimelineNode(
  pedido: PedidoComDetalhes,
  etapa: WorkflowEtapa,
  etapas: WorkflowEtapa[],
  etapasAtivasIds: string[],
  options?: { isHighlighted?: boolean; valorIndenizarCache?: Map<string, number> },
): TimelineNodeData {
  const historico = resolveHistorico(pedido, etapa, etapas)
  const dispensavel =
    isPedidoTimelineMedicamento(pedido, etapas) &&
    isEtapaDispensavelMedicamento(etapa.chave)

  const solempNumero = pedido.solemp?.numero?.trim() || null
  const solempValor =
    typeof pedido.solemp?.valor === 'number' && Number.isFinite(pedido.solemp.valor)
      ? pedido.solemp.valor
      : null
  const empenhoExibicao =
    etapa.chave === 'DIV_MAT_EMPENHADO' || pedido.clinica.tipo === 'empenhado'
      ? resolveEmpenhoExibicao({ etiquetas: pedido.dadosClinica?.etiquetas })
      : null
  const valorIndenizar = resolveValorIndenizarNoCard(
    pedido,
    etapa,
    etapas,
    options?.valorIndenizarCache ?? new Map(),
  )

  if (dispensavel) {
    return {
      id: etapa.id,
      etapa,
      displayName: resolveEtapaNomeExibicao(etapa, pedido),
      status: 'waiting',
      historico: null,
      numeroPedido: pedido.numero,
      responsavel: null,
      dataInicio: null,
      dataConclusao: null,
      tempoNaEtapa: null,
      processoNumero: resolveProcessoNumero(pedido, etapa),
      solempNumero,
      solempValor,
      valorIndenizar: null,
      empenhoExibicao,
      observacaoResumo: null,
      edgeAfter: 'waiting',
      isHighlighted: false,
      dispensavel: true,
      statusBand: 'dispensavel',
      icon: getEtapaIcon(etapa.chave),
    }
  }

  const arquivada = etapaArquivadaNoPedido(pedido.id, etapa.chave)
  const atual =
    etapasAtivasIds.includes(etapa.id) && !historico?.dataConclusao && !arquivada
  let status =
    etapa.chave === 'SOLICITACAO'
      ? resolveSolicitacaoStatus(pedido, etapas)
      : resolveNodeStatus(pedido, historico, atual, etapa.chave)

  const aguardandoEmpenhar =
    etapa.chave === 'DIV_MAT_FINANCAS' &&
    Boolean(pedido.aguardandoEmpenho) &&
    status !== 'completed'

  if (aguardandoEmpenhar) {
    status = 'waiting'
  }

  const devolvidoNesteCard =
    Boolean(pedido.planilhaDevolvidaParaChave) &&
    pedido.planilhaDevolvidaParaChave === etapa.chave

  if (devolvidoNesteCard && status === 'completed') {
    status = atual
      ? resolveNodeStatus(pedido, historico, atual, etapa.chave)
      : 'active'
  }

  const statusBand =
    devolvidoNesteCard
      ? 'devolvido'
      : status === 'completed'
        ? 'concluido'
        : aguardandoEmpenhar
          ? 'aguardando'
          : undefined

  return {
    id: etapa.id,
    etapa,
    displayName: resolveEtapaNomeExibicao(etapa, pedido),
    status,
    historico,
    numeroPedido: pedido.numero,
    responsavel: historico?.responsavelNome ?? null,
    dataInicio: historico?.dataInicio ?? null,
    dataConclusao:
      etapa.chave === 'SOLICITACAO' && status !== 'completed'
        ? null
        : (historico?.dataConclusao ?? null),
    tempoNaEtapa: formatTempoNaEtapa(pedido, historico, atual),
    processoNumero: resolveProcessoNumero(pedido, etapa),
    solempNumero,
    solempValor,
    valorIndenizar,
    empenhoExibicao,
    observacaoResumo: historico?.observacao?.slice(0, 120) ?? null,
    edgeAfter: 'waiting',
    isHighlighted: options?.isHighlighted ?? (etapa.chave === 'SOLICITACAO' ? status === 'active' : atual),
    statusBand,
    justificativaDevolucao: devolvidoNesteCard
      ? resolveJustificativaDevolucaoPedido(pedido, etapa.chave, etapa.id, etapa.nome)
      : null,
    icon: getEtapaIcon(etapa.chave),
  }
}

export function buildLinearTimelineNodes(
  pedido: PedidoComDetalhes,
  etapas: WorkflowEtapa[],
  highlightChave?: string | null,
  options?: { useProvidedOrder?: boolean },
): TimelineNodeData[] {
  const visiveis = options?.useProvidedOrder
    ? [...etapas]
    : filtrarEtapasParaTimeline(etapas)
  const etapasAtivasIds =
    pedido.etapasAtivasIds?.length > 0 ? pedido.etapasAtivasIds : [pedido.etapaAtualId]
  const valorIndenizarCache = new Map<string, number>()

  return visiveis.map((etapa) =>
    buildTimelineNode(pedido, etapa, visiveis, etapasAtivasIds, {
      isHighlighted: highlightChave ? etapa.chave === highlightChave : undefined,
      valorIndenizarCache,
    }),
  )
}

export function buildSectionedTimeline(
  pedido: PedidoComDetalhes,
  etapas: WorkflowEtapa[],
): TimelineSection[] {
  const visiveis = filtrarEtapasParaTimeline(etapas)
  const etapasAtivasIds =
    pedido.etapasAtivasIds?.length > 0 ? pedido.etapasAtivasIds : [pedido.etapaAtualId]
  const blocos = buildTimelineBlocos(visiveis)
  const sections: TimelineSection[] = []
  const valorIndenizarCache = new Map<string, number>()

  blocos.forEach((bloco, index) => {
    if (bloco.tipo === 'etapa') {
      sections.push({
        id: `section-${bloco.etapa.id}`,
        lanes: [
          {
            id: `lane-${bloco.etapa.id}`,
            nodes: [
              buildTimelineNode(pedido, bloco.etapa, visiveis, etapasAtivasIds, {
                valorIndenizarCache,
              }),
            ],
          },
        ],
      })
      return
    }

    sections.push({
      id: `section-${bloco.nome}-${index}`,
      title: tituloGrupoOcultoNaTimeline(bloco.nome) ? undefined : bloco.nome,
      lanes: bloco.divisoes.map((divisao) => ({
        id: `${bloco.nome}-${divisao.trilha}`,
        title: tituloGrupoOcultoNaTimeline(bloco.nome) ? undefined : divisao.nome,
        nodes: divisao.etapas.map(({ etapa }) =>
          buildTimelineNode(pedido, etapa, visiveis, etapasAtivasIds, {
            valorIndenizarCache,
          }),
        ),
      })),
    })
  })

  return sections
}

export function buildTimelineHeader(
  pedido: PedidoComDetalhes,
  nodes: TimelineNodeData[],
  options?: { processName?: string; subtitle?: string },
): TimelineHeaderModel {
  const actionable = nodes.filter((n) => !n.dispensavel)
  const completed = actionable.filter((n) => n.status === 'completed').length
  const progressPercent =
    actionable.length > 0 ? Math.round((completed / actionable.length) * 100) : 0
  const allActionableDone =
    actionable.length > 0 && actionable.every((n) => n.status === 'completed')

  const inicio = parseISO(pedido.dataSolicitacao)
  let tempoTotal = '—'
  if (isValid(inicio)) {
    const horas = differenceInHours(new Date(), inicio)
    if (horas < 24) tempoTotal = `${Math.max(horas, 1)}h`
    else tempoTotal = `${Math.ceil(horas / 24)} dias`
  }

  let statusLabel = 'Em andamento'
  let statusVariant: TimelineNodeStatus = 'active'
  if (pedido.concluido || allActionableDone) {
    statusLabel = 'Concluído'
    statusVariant = 'completed'
  } else if (nodes.some((n) => n.status === 'error')) {
    statusLabel = 'Atrasado'
    statusVariant = 'error'
  } else if (nodes.some((n) => n.status === 'review')) {
    statusLabel = 'Em revisão'
    statusVariant = 'review'
  } else if (actionable.every((n) => n.status === 'waiting')) {
    statusLabel = 'Aguardando'
    statusVariant = 'waiting'
  }

  return {
    processName: options?.processName ?? pedido.material.descricao,
    numero: pedido.numero,
    statusLabel,
    statusVariant,
    progressPercent: pedido.concluido || allActionableDone ? 100 : progressPercent,
    tempoTotal,
    subtitle: options?.subtitle,
  }
}

export function flattenSections(sections: TimelineSection[]): TimelineNodeData[] {
  return sections.flatMap((section) => section.lanes.flatMap((lane) => lane.nodes))
}

function etapasFromNodes(nodes: TimelineNodeData[]): WorkflowEtapa[] {
  const map = new Map<string, WorkflowEtapa>()
  nodes.forEach((node) => map.set(node.etapa.id, node.etapa))
  return Array.from(map.values())
}

export function applyPlanilhaEdgesToSections(
  sections: TimelineSection[],
  pedido: PedidoComDetalhes,
  etapas: WorkflowEtapa[],
  planilhaEnvio?: PedidoPlanilhaEnvioState | null,
): TimelineSection[] {
  return sections.map((section) => ({
    ...section,
    lanes: section.lanes.map((lane) => ({
      ...lane,
      nodes: lane.nodes.map((node, index) => {
        if (index >= lane.nodes.length - 1) {
          return { ...node, edgeAfter: 'waiting' as TimelineEdgeState }
        }
        const next = lane.nodes[index + 1]
        if (!timelineConnectorVisivel(node.etapa.chave, next.etapa.chave)) {
          return { ...node, edgeAfter: 'waiting' as TimelineEdgeState }
        }
        return {
          ...node,
          edgeAfter: resolvePlanilhaEdgeState(
            node.etapa.chave,
            next.etapa.chave,
            pedido,
            etapas,
            planilhaEnvio,
          ),
        }
      }),
    })),
  }))
}

export function applyPlanilhaEdgesToNodes(
  nodes: TimelineNodeData[],
  pedido: PedidoComDetalhes,
  etapas: WorkflowEtapa[],
  planilhaEnvio?: PedidoPlanilhaEnvioState | null,
): TimelineNodeData[] {
  const resolvedEtapas = etapas.length > 0 ? etapas : etapasFromNodes(nodes)
  return nodes.map((node, index) => {
    if (index >= nodes.length - 1) {
      return { ...node, edgeAfter: 'waiting' as TimelineEdgeState }
    }
    const next = nodes[index + 1]
    if (!timelineConnectorVisivel(node.etapa.chave, next.etapa.chave)) {
      return { ...node, edgeAfter: 'waiting' as TimelineEdgeState }
    }
    return {
      ...node,
      edgeAfter: resolvePlanilhaEdgeState(
        node.etapa.chave,
        next.etapa.chave,
        pedido,
        resolvedEtapas,
        planilhaEnvio,
      ),
    }
  })
}

export function sectionsToLanes(sections: TimelineSection[]): TimelineLane[] {
  return sections.flatMap((section) =>
    section.lanes.map((lane) => ({
      ...lane,
      title: lane.title ?? section.title,
      subtitle: lane.subtitle ?? section.subtitle,
    })),
  )
}
