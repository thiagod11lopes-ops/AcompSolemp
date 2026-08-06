import type { PedidoComDetalhes, PedidoEtapaHistorico, WorkflowEtapa } from '@/types'
import type { LucideIcon } from 'lucide-react'

export type TimelineNodeStatus = 'completed' | 'active' | 'waiting' | 'error' | 'review'

export type TimelineEdgeState = 'completed' | 'active' | 'waiting' | 'error'

export interface TimelineNodeData {
  id: string
  etapa: WorkflowEtapa
  displayName: string
  status: TimelineNodeStatus
  historico: PedidoEtapaHistorico | null
  numeroPedido: string
  responsavel: string | null
  dataInicio: string | null
  dataConclusao: string | null
  tempoNaEtapa: string | null
  processoNumero: string | null
  /** Número da SOLEMP (quando já confeccionada). */
  solempNumero: string | null
  /** Valor da SOLEMP (quando já confeccionada). */
  solempValor: number | null
  /** Empenho formatado como `NE (número)` — setor Empenhado. */
  empenhoExibicao: string | null
  observacaoResumo: string | null
  edgeAfter: TimelineEdgeState
  isHighlighted?: boolean
  /** Etapa não usada em timeline de medicamento (fluxo direto IMH). */
  dispensavel?: boolean
  /** Tarja lateral no card (ex.: Aguardando empenho). */
  statusBand?: 'concluido' | 'aguardando' | 'dispensavel'
  icon?: LucideIcon
}

export interface TimelineLane {
  id: string
  title?: string
  subtitle?: string
  nodes: TimelineNodeData[]
}

export interface TimelineSection {
  id: string
  title?: string
  subtitle?: string
  lanes: TimelineLane[]
}

export interface TimelineHeaderModel {
  processName: string
  numero: string
  statusLabel: string
  statusVariant: TimelineNodeStatus
  progressPercent: number
  tempoTotal: string
  subtitle?: string
}

export interface TimelineDrawerDetail {
  pedido: PedidoComDetalhes
  node: TimelineNodeData
}
