import type { UserRole } from '@/types'

/** Perfis disponíveis no modal de entrada do sistema. */
export interface LoginPerfilOpcao {
  id: string
  label: string
  perfil: UserRole
  /** Gestor cria o próprio banco (tenant) e cadastra a equipe. */
  isGestor?: boolean
}

export const LOGIN_PERFIL_OPCOES: LoginPerfilOpcao[] = [
  {
    id: 'gestor',
    label: 'Gestor',
    perfil: 'GESTOR',
    isGestor: true,
  },
  {
    id: 'clinica',
    label: 'Clínica',
    perfil: 'CLINICA',
  },
  {
    id: 'medicamento',
    label: 'Medicamento',
    perfil: 'MEDICAMENTO',
  },
  {
    id: 'auditoria',
    label: 'Auditoria',
    perfil: 'AUDITORIA',
  },
  {
    id: 'contabilidade',
    label: 'Contabilidade/IMH',
    perfil: 'CONTABILIDADE_IMH',
  },
  {
    id: 'confeccao',
    label: 'Confecção de Solemp',
    perfil: 'CONFECCAO_SOLEMP',
  },
  {
    id: 'financas',
    label: 'Solemp em Rascunho',
    perfil: 'FINANCEIRO',
  },
]

export function loginPerfilLabel(perfil: UserRole): string {
  return LOGIN_PERFIL_OPCOES.find((o) => o.perfil === perfil)?.label ?? perfil
}
