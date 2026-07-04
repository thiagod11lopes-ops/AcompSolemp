import type { UserRole } from '@/types'

export type Portal = 'gestor' | 'clinica' | 'ordenador' | 'financeiro'

const GESTOR_ROLES: UserRole[] = ['GESTOR', 'ADMINISTRADOR']

export function isGestorPortalRole(role: UserRole): boolean {
  return GESTOR_ROLES.includes(role)
}

export function isClinicaPortalRole(role: UserRole): boolean {
  return role === 'CLINICA'
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
  { label: string; descricao: string }
> = {
  DIV_MAT_FINANCAS: {
    label: 'Registrar pagamento',
    descricao: 'Confirme o pagamento na etapa Finanças Pagamento.',
  },
}

export const ORDENADOR_ETAPA_ACOES: Record<
  string,
  { label: string; descricao: string }
> = {
  DIV_MAT_AUDITORIA: {
    label: 'Concluir Auditoria',
    descricao: 'Conclua a auditoria e envie o processo para Contabilidade/IMH.',
  },
  DIV_MAT_CONTABILIDADE_IMH: {
    label: 'Concluir Contabilidade/IMH',
    descricao: 'Conclua a Contabilidade/IMH e registre anotações, se necessário.',
  },
  DIV_MAT_CONFECCAO_SOLEMP: {
    label: 'Confeccionar Solemp',
    descricao: 'Clique para registrar a confecção da SOLEMP.',
  },
  DIV_MAT_ASSINATURA_1: {
    label: 'Registrar Assinatura 1 Solemp',
    descricao: 'Clique para registrar a primeira assinatura da SOLEMP.',
  },
  DIV_MAT_ASSINATURA_2: {
    label: 'Registrar Assinatura 2 Solemp',
    descricao: 'Clique para registrar a segunda assinatura da SOLEMP.',
  },
  DIV_MAT_SDA: {
    label: 'Concluir SDA',
    descricao: 'Clique para concluir a etapa SDA.',
  },
}

/** Etapas aguardando outro setor — sem ação da clínica */
export const ETAPAS_AGUARDANDO_SETOR: Record<string, string> = {
  DIV_MAT_AUDITORIA: 'Aguardando Auditoria na Div. de Material.',
  DIV_MAT_CONTABILIDADE_IMH: 'Aguardando Contabilidade/IMH na Div. de Material.',
  DIV_MAT_CONFECCAO_SOLEMP: 'Aguardando Confecção de Solemp na Div. de Material.',
  DIV_MAT_ASSINATURA_1: 'Aguardando Assinatura 1 Solemp na timeline Finanças.',
  DIV_MAT_ASSINATURA_2: 'Aguardando Assinatura 2 Solemp na timeline Finanças.',
  DIV_MAT_SDA: 'Aguardando SDA na timeline Finanças.',
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

export function calcularProgressoTimeline(etapaAtualIndex: number, totalEtapas: number): number {
  if (totalEtapas <= 0) return 0
  return Math.round(((etapaAtualIndex + 1) / totalEtapas) * 100)
}
