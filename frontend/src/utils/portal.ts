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
  if (portal === 'clinica') return '/clinica/pedidos'
  if (portal === 'ordenador') return '/ordenador/timelines'
  if (portal === 'financeiro') return '/financeiro/pagamentos'
  if (portal === 'gestor') return '/gestor/dashboard'
  return '/login'
}

export function getHomeRouteForPortal(portal: Portal): string {
  if (portal === 'clinica') return '/clinica/pedidos'
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

/** Ações que a clínica executa clicando na timeline */
export const CLINICA_ETAPA_ACOES: Record<
  string,
  { label: string; descricao: string; proximaObservacao: string }
> = {
  MATERIAL_ENTREGUE: {
    label: 'Confirmar recebimento do material',
    descricao: 'A empresa entregou o material. Clique para registrar o recebimento.',
    proximaObservacao: 'Material recebido e conferido pela clínica.',
  },
  SOLEMP_CRIADA: {
    label: 'Confeccionar SOLEMP',
    descricao: 'Clique para registrar a confecção da SOLEMP.',
    proximaObservacao: 'SOLEMP confeccionada pela clínica.',
  },
  SOLEMP_ASSINADA: {
    label: 'Anexar Nota Fiscal e enviar ao Financeiro',
    descricao: 'Clique para registrar o anexo da nota fiscal e encaminhar ao financeiro.',
    proximaObservacao: 'Nota fiscal anexada e processo enviado ao financeiro pela clínica.',
  },
  NF_ANEXADA: {
    label: 'Anexar Nota Fiscal e enviar ao Financeiro',
    descricao: 'Clique para registrar o anexo da nota fiscal e encaminhar ao financeiro.',
    proximaObservacao: 'Nota fiscal anexada e processo enviado ao financeiro pela clínica.',
  },
}

export const FINANCEIRO_ETAPA_ACOES: Record<
  string,
  { label: string; descricao: string }
> = {
  ENVIADO_FINANCEIRO: {
    label: 'Pagamento realizado',
    descricao: 'Selecione a SOLEMP e confirme o pagamento da nota fiscal.',
  },
  PAGAMENTO_REALIZADO: {
    label: 'Finalizar processo',
    descricao: 'Pagamento registrado. Confirme para encerrar o processo.',
  },
}

export const ORDENADOR_ETAPA_ACOES: Record<
  string,
  { label: string; descricao: string }
> = {
  SOLEMP_CRIADA: {
    label: 'Assinar SOLEMP',
    descricao: 'SOLEMP confeccionada. Clique para assinar e concluir as etapas de assinatura.',
  },
  AGUARDANDO_ASSINATURA: {
    label: 'Assinar SOLEMP',
    descricao: 'Clique para assinar a SOLEMP e registrar as etapas de assinatura.',
  },
}

/** Etapas aguardando outro setor — sem ação da clínica */
export const ETAPAS_AGUARDANDO_SETOR: Record<string, string> = {
  AGUARDANDO_ASSINATURA: 'Aguardando assinatura da SOLEMP pelo ordenador de despesa.',
  SOLEMP_ASSINADA: 'SOLEMP assinada. Aguardando anexo da nota fiscal.',
  ENVIADO_FINANCEIRO: 'Pagamento pendente — aguardando confirmação pelo financeiro.',
  PAGAMENTO_REALIZADO: 'Pagamento registrado — aguardando encerramento pelo financeiro.',
}

export function clinicaPodeAvancar(etapaChave: string): boolean {
  return etapaChave in CLINICA_ETAPA_ACOES
}

export function ordenadorPodeAssinar(etapaChave: string): boolean {
  return etapaChave in ORDENADOR_ETAPA_ACOES
}

export function financeiroPodeRegistrarPagamento(etapaChave: string): boolean {
  return etapaChave in FINANCEIRO_ETAPA_ACOES
}

export function calcularProgressoTimeline(etapaAtualIndex: number, totalEtapas: number): number {
  if (totalEtapas <= 0) return 0
  return Math.round(((etapaAtualIndex + 1) / totalEtapas) * 100)
}
