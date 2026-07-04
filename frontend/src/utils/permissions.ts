import type { UserRole } from '@/types'

export type Permission =
  | 'dashboard:read'
  | 'processos:read'
  | 'processos:write'
  | 'processos:advance'
  | 'cadastros:read'
  | 'cadastros:write'
  | 'workflow:read'
  | 'workflow:write'
  | 'relatorios:read'
  | 'historico:read'
  | 'notificacoes:read'

const ALL_GESTOR_PERMISSIONS: Permission[] = [
  'dashboard:read',
  'processos:read',
  'processos:write',
  'processos:advance',
  'cadastros:read',
  'cadastros:write',
  'workflow:read',
  'workflow:write',
  'relatorios:read',
  'historico:read',
  'notificacoes:read',
]

const PROCESSO_PERMISSIONS: Permission[] = [
  'processos:read',
  'processos:advance',
  'historico:read',
  'notificacoes:read',
]

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMINISTRADOR: ALL_GESTOR_PERMISSIONS,
  GESTOR: ALL_GESTOR_PERMISSIONS,
  CLINICA: [
    'processos:read',
    'processos:write',
    'processos:advance',
    'historico:read',
    'notificacoes:read',
  ],
  ASSINANTE: PROCESSO_PERMISSIONS,
  FINANCEIRO: PROCESSO_PERMISSIONS,
  AUDITORIA: PROCESSO_PERMISSIONS,
  CONTABILIDADE_IMH: PROCESSO_PERMISSIONS,
  CONFECCAO_SOLEMP: PROCESSO_PERMISSIONS,
  ASSINATURA_1_SOLEMP: PROCESSO_PERMISSIONS,
  ASSINATURA_2_SOLEMP: PROCESSO_PERMISSIONS,
  SDA: PROCESSO_PERMISSIONS,
  CONSULTA: [],
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function canAccessGestorRoute(role: UserRole): boolean {
  return role === 'GESTOR' || role === 'ADMINISTRADOR'
}

export function canAccessOrdenadorRoute(role: UserRole): boolean {
  return (
    role === 'ASSINANTE' ||
    role === 'CONFECCAO_SOLEMP' ||
    role === 'ASSINATURA_1_SOLEMP' ||
    role === 'ASSINATURA_2_SOLEMP' ||
    role === 'AUDITORIA' ||
    role === 'CONTABILIDADE_IMH' ||
    role === 'SDA'
  )
}

export function canAccessClinicaRoute(role: UserRole): boolean {
  return role === 'CLINICA'
}

export function canAccessFinanceiroRoute(role: UserRole): boolean {
  return role === 'FINANCEIRO'
}
