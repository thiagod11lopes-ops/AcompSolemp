import type { UserRole } from '@/types'
import type { Portal } from '@/utils/portal'
import { canAccessOrdenadorRoute } from '@/utils/permissions'

export function portalForPerfil(perfil: UserRole): Portal {
  if (perfil === 'CLINICA' || perfil === 'MEDICAMENTO' || perfil === 'EMPENHADO') return 'clinica'
  if (perfil === 'FINANCEIRO') return 'financeiro'
  if (canAccessOrdenadorRoute(perfil)) return 'ordenador'
  throw new Error('Perfil sem acesso à Timeline')
}
