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
import { buildTimelineBlocos, filtrarEtapasParaTimeline, resolveEtapaNomeExibicao, tituloGrupoOcultoNaTimeline } from '@/utils/timelineFlow'

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

function resolveNodeStatus(
  pedido: PedidoComDetalhes,
  historico: ReturnType<typeof resolveHistorico>,
  atual: boolean,
): TimelineNodeStatus {
  if (pedido.concluido || historico?.dataConclusao) return 'completed'
  if (atual) {
    if (pedido.prazoStatus === 'ATRASADO') return 'error'
    if (pedido.prazoStatus === 'PROXIMO_VENCIMENTO') return 'review'
    return 'active'
  }
  if (historico && !historico.dataConclusao) return 'active'
  return 'waiting'
}

function resolveEdgeAfter(status: TimelineNodeStatus): TimelineEdgeState {
  if (status === 'completed') return 'completed'
  if (status === 'active') return 'active'
  if (status === 'error') return 'error'
  return 'waiting'
}

export function buildTimelineNode(
  pedido: PedidoComDetalhes,
  etapa: WorkflowEtapa,
  etapas: WorkflowEtapa[],
  etapasAtivasIds: string[],
  options?: { isHighlighted?: boolean },
): TimelineNodeData {
  const historico = resolveHistorico(pedido, etapa, etapas)
  const atual =
    etapasAtivasIds.includes(etapa.id) && !pedido.concluido && !historico?.dataConclusao
  const status = resolveNodeStatus(pedido, historico, atual)

  return {
    id: etapa.id,
    etapa,
    displayName: resolveEtapaNomeExibicao(etapa, pedido),
    status,
    historico,
    numeroPedido: pedido.numero,
    responsavel: historico?.responsavelNome ?? null,
    dataInicio: historico?.dataInicio ?? null,
    dataConclusao: historico?.dataConclusao ?? null,
    tempoNaEtapa: formatTempoNaEtapa(pedido, historico, atual),
    processoNumero: resolveProcessoNumero(pedido, etapa),
    observacaoResumo: historico?.observacao?.slice(0, 120) ?? null,
    edgeAfter: resolveEdgeAfter(status),
    isHighlighted: options?.isHighlighted ?? atual,
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

  return visiveis.map((etapa) =>
    buildTimelineNode(pedido, etapa, visiveis, etapasAtivasIds, {
      isHighlighted: highlightChave ? etapa.chave === highlightChave : undefined,
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

  blocos.forEach((bloco, index) => {
    if (bloco.tipo === 'etapa') {
      sections.push({
        id: `section-${bloco.etapa.id}`,
        lanes: [
          {
            id: `lane-${bloco.etapa.id}`,
            nodes: [
              buildTimelineNode(pedido, bloco.etapa, visiveis, etapasAtivasIds),
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
          buildTimelineNode(pedido, etapa, visiveis, etapasAtivasIds),
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
  const completed = nodes.filter((n) => n.status === 'completed').length
  const progressPercent =
    nodes.length > 0 ? Math.round((completed / nodes.length) * 100) : 0

  const inicio = parseISO(pedido.dataSolicitacao)
  let tempoTotal = '—'
  if (isValid(inicio)) {
    const horas = differenceInHours(new Date(), inicio)
    if (horas < 24) tempoTotal = `${Math.max(horas, 1)}h`
    else tempoTotal = `${Math.ceil(horas / 24)} dias`
  }

  let statusLabel = 'Em andamento'
  let statusVariant: TimelineNodeStatus = 'active'
  if (pedido.concluido) {
    statusLabel = 'Concluído'
    statusVariant = 'completed'
  } else if (nodes.some((n) => n.status === 'error')) {
    statusLabel = 'Atrasado'
    statusVariant = 'error'
  } else if (nodes.some((n) => n.status === 'review')) {
    statusLabel = 'Em revisão'
    statusVariant = 'review'
  } else if (nodes.every((n) => n.status === 'waiting')) {
    statusLabel = 'Aguardando'
    statusVariant = 'waiting'
  }

  return {
    processName: options?.processName ?? pedido.material.descricao,
    numero: pedido.numero,
    statusLabel,
    statusVariant,
    progressPercent: pedido.concluido ? 100 : progressPercent,
    tempoTotal,
    subtitle: options?.subtitle,
  }
}

export function flattenSections(sections: TimelineSection[]): TimelineNodeData[] {
  return sections.flatMap((section) => section.lanes.flatMap((lane) => lane.nodes))
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
