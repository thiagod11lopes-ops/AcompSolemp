import type { UserRole } from '@/types'

export interface CadastroPerfilOpcao {
  id: string
  label: string
  perfil: UserRole
  graduacao: string
  /** Clínica usa nome da clínica; demais usam nome do usuário */
  campoNomeLabel: string
  campoNomePlaceholder: string
  descricao: string
  isClinica?: boolean
}

/** Opções de cadastro da aba Cadastros (nome + e-mail Google) */
export const CADASTRO_PERFIS: CadastroPerfilOpcao[] = [
  {
    id: 'clinica',
    label: 'Clínica',
    perfil: 'CLINICA',
    graduacao: 'Clínica',
    campoNomeLabel: 'Nome da clínica',
    campoNomePlaceholder: 'Ex.: Clínica de Ortopedia',
    descricao: 'Acesso ao portal da clínica para lançamentos e visualização da timeline.',
    isClinica: true,
  },
  {
    id: 'auditoria',
    label: 'Auditoria',
    perfil: 'AUDITORIA',
    graduacao: 'Auditoria',
    campoNomeLabel: 'Nome',
    campoNomePlaceholder: 'Ex.: Cap. Ana Paula',
    descricao: 'Responsável pela etapa Auditoria na Div. de Material.',
  },
  {
    id: 'contabilidade',
    label: 'Contabilidade/IMH',
    perfil: 'CONTABILIDADE_IMH',
    graduacao: 'Contabilidade/IMH',
    campoNomeLabel: 'Nome',
    campoNomePlaceholder: 'Ex.: Ten. Roberto Lima',
    descricao: 'Responsável pela etapa Contabilidade/IMH na Div. de Material.',
  },
  {
    id: 'confeccao',
    label: 'Confecção de Solemp',
    perfil: 'CONFECCAO_SOLEMP',
    graduacao: 'Confecção de Solemp',
    campoNomeLabel: 'Nome',
    campoNomePlaceholder: 'Ex.: Sgt. Maria Souza',
    descricao: 'Responsável pela etapa Confecção de Solemp.',
  },
  {
    id: 'financas',
    label: 'Finanças Pagamento',
    perfil: 'FINANCEIRO',
    graduacao: 'Finanças Pagamento',
    campoNomeLabel: 'Nome',
    campoNomePlaceholder: 'Ex.: Ten. Santos',
    descricao: 'Responsável pela etapa Finanças Pagamento.',
  },
]
