import type { UserRole } from '@/types'

/** Mapeia perfil cadastrado para a chave da etapa na timeline */
export const PERFIL_PARA_CHAVE_ETAPA: Partial<Record<UserRole, string>> = {
  AUDITORIA: 'DIV_MAT_AUDITORIA',
  CONTABILIDADE_IMH: 'DIV_MAT_CONTABILIDADE_IMH',
  CONFECCAO_SOLEMP: 'DIV_MAT_CONFECCAO_SOLEMP',
  ASSINATURA_1_SOLEMP: 'DIV_MAT_ASSINATURA_1',
  ASSINATURA_2_SOLEMP: 'DIV_MAT_ASSINATURA_2',
  SDA: 'DIV_MAT_SDA',
  FINANCEIRO: 'DIV_MAT_FINANCAS',
  ASSINANTE: 'DIV_MAT_ASSINATURA_1',
}

export const PERFIS_SOLEMP: UserRole[] = [
  'CONFECCAO_SOLEMP',
  'ASSINATURA_1_SOLEMP',
  'ASSINATURA_2_SOLEMP',
  'ASSINANTE',
]

export const PERFIS_SETOR: UserRole[] = [
  'AUDITORIA',
  'CONTABILIDADE_IMH',
  'CONFECCAO_SOLEMP',
  'ASSINATURA_1_SOLEMP',
  'ASSINATURA_2_SOLEMP',
  'SDA',
  'ASSINANTE',
]

export function getHomeRouteForPerfil(perfil: UserRole): string {
  if (perfil === 'CLINICA') return '/clinica/timeline'
  if (perfil === 'FINANCEIRO') return '/financeiro/pagamentos'
  if (PERFIS_SETOR.includes(perfil)) return '/ordenador/timelines'
  return '/login'
}
