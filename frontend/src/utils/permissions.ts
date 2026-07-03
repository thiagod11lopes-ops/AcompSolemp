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
  ASSINANTE: [
    'processos:read',
    'processos:advance',
    'historico:read',
    'notificacoes:read',
  ],
  FINANCEIRO: [
    'processos:read',
    'processos:advance',
    'historico:read',
    'notificacoes:read',
  ],
  AUDITORIA: [
    'processos:read',
    'processos:advance',
    'historico:read',
    'notificacoes:read',
  ],
  CONTABILIDADE_IMH: [
    'processos:read',
    'processos:advance',
    'historico:read',
    'notificacoes:read',
  ],
  CONSULTA: [],
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function canAccessGestorRoute(role: UserRole): boolean {
  return role === 'GESTOR' || role === 'ADMINISTRADOR'
}

export function canAccessOrdenadorRoute(role: UserRole): boolean {
  return role === 'ASSINANTE'
}

export function canAccessClinicaRoute(role: UserRole): boolean {
  return role === 'CLINICA'
}

export function canAccessFinanceiroRoute(role: UserRole): boolean {
  return role === 'FINANCEIRO'
}
