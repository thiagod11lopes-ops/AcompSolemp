import { differenceInCalendarDays, isValid, parseISO } from 'date-fns'
import type {
  Pedido,
  PedidoComDetalhes,
  PrazoStatus,
  User,
  WorkflowEtapa,
  Clinica,
  Empresa,
  Material,
  Solemp,
  NotaFiscal,
} from '@/types'

export function resolveEtapaFromRef(
  etapaId: string | undefined,
  etapaNome: string | undefined,
  etapas: WorkflowEtapa[],
): WorkflowEtapa | undefined {
  if (etapaId) {
    const porId = etapas.find((etapa) => etapa.id === etapaId)
    if (porId) return porId

    if (etapaId.startsWith('etapa-')) {
      const chaveGuess = etapaId.slice('etapa-'.length)
      const porChave = etapas.find((etapa) => etapa.chave.toLowerCase() === chaveGuess)
      if (porChave) return porChave
    }
  }

  if (etapaNome) {
    return etapas.find((etapa) => etapa.nome === etapaNome)
  }

  return undefined
}

export function getEtapaAtual(
  pedido: Pedido,
  etapas: WorkflowEtapa[],
): WorkflowEtapa | undefined {
  const porAtual = resolveEtapaFromRef(pedido.etapaAtualId, undefined, etapas)
  if (porAtual) return porAtual

  const ativas = pedido.etapasAtivasIds?.length
    ? pedido.etapasAtivasIds
    : pedido.etapaAtualId
      ? [pedido.etapaAtualId]
      : []

  for (const id of ativas) {
    const etapa = resolveEtapaFromRef(id, undefined, etapas)
    if (etapa) return etapa
  }

  const historicoAberto = pedido.etapasHistorico.find((h) => h.dataConclusao === null)
  if (historicoAberto) {
    return resolveEtapaFromRef(historicoAberto.etapaId, historicoAberto.etapaNome, etapas)
  }

  return undefined
}

function resolveClinica(pedido: Pedido, clinicas: Clinica[]): Clinica | undefined {
  const found = clinicas.find((c) => c.id === pedido.clinicaId)
  if (found) return found

  const nome = pedido.dadosClinica?.nomeClinica?.trim()
  if (!nome || !pedido.clinicaId) return undefined

  return {
    id: pedido.clinicaId,
    nome,
    responsavel: nome,
    telefone: '',
  }
}

function resolveEmpresa(pedido: Pedido, empresas: Empresa[]): Empresa | undefined {
  const found = empresas.find((e) => e.id === pedido.empresaId)
  if (found) return found

  const nome = pedido.dadosClinica?.empresaConsignada?.trim()
  if (!nome) return undefined

  return {
    id: pedido.empresaId || `empresa-${pedido.id}`,
    razaoSocial: nome,
    nomeFantasia: nome,
    cnpj: '',
    contato: '',
    telefone: '',
    email: '',
  }
}

function resolveMaterial(pedido: Pedido, materiais: Material[]): Material | undefined {
  const found = materiais.find((m) => m.id === pedido.materialId)
  if (found) return found

  const descricao = pedido.dadosClinica?.materialUtilizado?.trim()
  if (!descricao) return undefined

  return {
    id: pedido.materialId || `material-${pedido.id}`,
    descricao,
    fabricante: '',
    unidade: 'UN',
  }
}

export function getEtapaHistoricoAtual(pedido: Pedido) {
  return pedido.etapasHistorico.find((h) => h.dataConclusao === null)
}

export function calcularDiasNaEtapa(pedido: Pedido): number {
  const atual = getEtapaHistoricoAtual(pedido)
  if (!atual?.dataInicio) return 0
  const inicio = parseISO(atual.dataInicio)
  if (!isValid(inicio)) return 0
  return Math.max(0, differenceInCalendarDays(new Date(), inicio))
}

export function calcularPrazoStatus(
  diasNaEtapa: number,
  prazoDias: number,
): PrazoStatus {
  const diasRestantes = prazoDias - diasNaEtapa
  if (diasRestantes < 0) return 'ATRASADO'
  if (diasRestantes <= 2) return 'PROXIMO_VENCIMENTO'
  return 'NO_PRAZO'
}

export function calcularDiasRestantes(diasNaEtapa: number, prazoDias: number): number {
  return prazoDias - diasNaEtapa
}

export function enrichPedido(
  pedido: Pedido,
  context: {
    clinicas: Clinica[]
    empresas: Empresa[]
    materiais: Material[]
    etapas: WorkflowEtapa[]
    usuarios: User[]
    solemp: Solemp[]
    notasFiscais: NotaFiscal[]
  },
): PedidoComDetalhes | null {
  const clinica = resolveClinica(pedido, context.clinicas)
  const empresa = resolveEmpresa(pedido, context.empresas)
  const material = resolveMaterial(pedido, context.materiais)
  const etapaAtual = getEtapaAtual(pedido, context.etapas)

  if (!clinica || !empresa || !material || !etapaAtual) return null

  const responsavelAtual =
    context.usuarios.find((u) => u.id === pedido.responsavelAtualId) ?? null
  const diasNaEtapa = calcularDiasNaEtapa(pedido)
  const prazoStatus = calcularPrazoStatus(diasNaEtapa, etapaAtual.prazoDias)
  const diasRestantes = calcularDiasRestantes(diasNaEtapa, etapaAtual.prazoDias)

  return {
    ...pedido,
    clinica,
    empresa,
    material,
    etapaAtual,
    responsavelAtual,
    prazoStatus,
    diasNaEtapa,
    diasRestantes,
    solemp: context.solemp.find((s) => s.pedidoId === pedido.id) ?? null,
    notaFiscal: context.notasFiscais.find((n) => n.pedidoId === pedido.id) ?? null,
  }
}

export function getProximaEtapa(
  etapaAtual: WorkflowEtapa,
  etapas: WorkflowEtapa[],
): WorkflowEtapa | null {
  const ordenadas = [...etapas].filter((e) => e.ativo).sort((a, b) => a.ordem - b.ordem)
  const index = ordenadas.findIndex((e) => e.id === etapaAtual.id)
  return ordenadas[index + 1] ?? null
}

export function getResponsavelParaEtapa(
  etapa: WorkflowEtapa,
  usuarios: User[],
  clinicaId: string,
): User | null {
  const candidatos = usuarios.filter(
    (u) => u.ativo && u.perfil === etapa.perfilResponsavel,
  )

  if (etapa.perfilResponsavel === 'CLINICA') {
    return candidatos.find((u) => u.clinicaId === clinicaId) ?? candidatos[0] ?? null
  }

  return candidatos[0] ?? null
}

export function getPrazoStatusLabel(status: PrazoStatus): string {
  const labels: Record<PrazoStatus, string> = {
    NO_PRAZO: 'No prazo',
    PROXIMO_VENCIMENTO: 'Próximo do vencimento',
    ATRASADO: 'Atrasado',
  }
  return labels[status]
}

export function getPrazoStatusColor(
  status: PrazoStatus,
): 'success' | 'warning' | 'error' {
  const colors: Record<PrazoStatus, 'success' | 'warning' | 'error'> = {
    NO_PRAZO: 'success',
    PROXIMO_VENCIMENTO: 'warning',
    ATRASADO: 'error',
  }
  return colors[status]
}
