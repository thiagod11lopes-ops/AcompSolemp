import type { UserRole } from '@/types'

export type Portal = 'gestor' | 'clinica' | 'ordenador' | 'financeiro'

const GESTOR_ROLES: UserRole[] = ['GESTOR', 'ADMINISTRADOR']

export function isGestorPortalRole(role: UserRole): boolean {
  return GESTOR_ROLES.includes(role)
}

export function isClinicaPortalRole(role: UserRole): boolean {
  return role === 'CLINICA' || role === 'MEDICAMENTO' || role === 'EMPENHADO'
}

export function isOrdenadorPortalRole(role: UserRole): boolean {
  return role === 'ASSINANTE'
}

export function isFinanceiroPortalRole(role: UserRole): boolean {
  return role === 'FINANCEIRO'
}

export function getPortalForRole(role: UserRole): Portal | null {
  if (isGestorPortalRole(role)) return 'gestor'
  if (isClinicaPortalRole(role)) return 'clinica'
  if (isOrdenadorPortalRole(role)) return 'ordenador'
  if (isFinanceiroPortalRole(role)) return 'financeiro'
  return null
}

export function getHomeRoute(user: { perfil: UserRole }): string {
  const portal = getPortalForRole(user.perfil)
  if (portal === 'clinica') return '/clinica/timelines'
  if (portal === 'ordenador') return '/ordenador/timelines'
  if (portal === 'financeiro') return '/financeiro/pagamentos'
  if (portal === 'gestor') return '/gestor/dashboard'
  return '/login'
}

export function getHomeRouteForPortal(portal: Portal): string {
  if (portal === 'clinica') return '/clinica/timelines'
  if (portal === 'ordenador') return '/ordenador/timelines'
  if (portal === 'financeiro') return '/financeiro/pagamentos'
  return '/gestor/dashboard'
}

export function getLoginRoute(portal: Portal): string {
  if (portal === 'clinica') return '/clinica/timeline'
  if (portal === 'ordenador') return '/clinica/timeline'
  if (portal === 'financeiro') return '/clinica/timeline'
  return '/login'
}

/** Ações que a clínica executa — após envio, apenas visualização */
export const CLINICA_ETAPA_ACOES: Record<
  string,
  { label: string; descricao: string; proximaObservacao: string }
> = {}

export const FINANCEIRO_ETAPA_ACOES: Record<
  string,
  { label: string; labelConcluido?: string; descricao: string }
> = {
  DIV_MAT_FINANCAS: {
    label: 'Registrar pagamento',
    labelConcluido: 'Concluído',
    descricao: 'Confirme o pagamento na etapa Finanças Pagamento.',
  },
}

export const ORDENADOR_ETAPA_ACOES: Record<
  string,
  { label: string; descricao: string }
> = {
  DIV_MAT_AUDITORIA: {
    label: 'Encaminhar ao IMH',
    descricao: 'Receba a planilha enviada pela clínica e, após conferir, encaminhe ao IMH.',
  },
  DIV_MAT_CONTABILIDADE_IMH: {
    label: 'Concluir Contabilidade/IMH',
    descricao: 'Receba a planilha encaminhada pela Auditoria e, após conferir, finalize a etapa.',
  },
  DIV_MAT_CONFECCAO_SOLEMP: {
    label: 'Confeccionar Solemp',
    descricao: 'Informe o número e o valor da SOLEMP e envie para Finanças Pagamento.',
  },
}

/** Etapas aguardando outro setor — sem ação da clínica */
export const ETAPAS_AGUARDANDO_SETOR: Record<string, string> = {
  DIV_MAT_AUDITORIA: 'Aguardando Auditoria na Div. de Material.',
  DIV_MAT_CONTABILIDADE_IMH: 'Aguardando Contabilidade/IMH na Div. de Material.',
  DIV_MAT_CONFECCAO_SOLEMP: 'Aguardando Confecção de Solemp na Div. de Material.',
  DIV_MAT_FINANCAS: 'Aguardando Finanças Pagamento.',
}

export function clinicaPodeAvancar(etapaChave: string): boolean {
  return etapaChave in CLINICA_ETAPA_ACOES
}

export function ordenadorPodeAssinar(etapaChave: string): boolean {
  return etapaChave in ORDENADOR_ETAPA_ACOES
}

export function setorPodeAgir(etapaChave: string): boolean {
  return etapaChave in ORDENADOR_ETAPA_ACOES
}

export function financeiroPodeRegistrarPagamento(etapaChave: string): boolean {
  return etapaChave in FINANCEIRO_ETAPA_ACOES
}

export function financeiroPagamentoConcluido(
  pedido: {
    concluido: boolean
    etapasHistorico: { etapaId: string; etapaNome: string; dataConclusao: string | null }[]
  },
  etapas: { id: string; chave: string; nome: string }[],
): boolean {
  if (pedido.concluido) return true

  const financas = etapas.find((etapa) => etapa.chave === 'DIV_MAT_FINANCAS')
  if (!financas) return false

  return pedido.etapasHistorico.some(
    (historico) =>
      (historico.etapaId === financas.id || historico.etapaNome === financas.nome) &&
      Boolean(historico.dataConclusao),
  )
}

export function calcularProgressoTimeline(etapaAtualIndex: number, totalEtapas: number): number {
  if (totalEtapas <= 0) return 0
  return Math.round(((etapaAtualIndex + 1) / totalEtapas) * 100)
}
