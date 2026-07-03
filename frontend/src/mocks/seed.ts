import type {
  AppData,
  User,
  UserRole,
  WorkflowEtapa,
} from '@/types'
import { syncPagamentoPendenteNotifications } from '@/utils/workflowAdvance'

const STORAGE_KEY = 'acomp_solemp_data'
const SEED_VERSION = 'v6'

/** Nomes sugeridos para cadastro de clínicas */
export const CLINICAS_HOSPITALARES = [
  'Clínica de Ortopedia',
  'Clínica de Cardiologia',
  'Clínica de Neurologia',
  'Clínica de Oftalmologia',
  'Clínica de Dermatologia',
  'Clínica de Ginecologia e Obstetrícia',
  'Clínica de Pediatria',
  'Clínica de Cirurgia Geral',
  'Clínica de Urologia',
  'Clínica de Otorrinolaringologia',
  'Clínica de Endocrinologia',
  'Clínica de Psiquiatria',
  'Clínica de Reumatologia',
  'Clínica de Oncologia',
  'Clínica de Anestesiologia',
] as const

export const DEFAULT_WORKFLOW_ETAPAS: Omit<WorkflowEtapa, 'id'>[] = [
  {
    chave: 'SOLICITACAO',
    nome: 'Solicitação da Clínica',
    ordem: 1,
    prazoDias: 2,
    perfilResponsavel: 'CLINICA',
    ativo: true,
  },
  {
    chave: 'MATERIAL_ENTREGUE',
    nome: 'Material entregue pela empresa',
    ordem: 2,
    prazoDias: 3,
    perfilResponsavel: 'CLINICA',
    ativo: true,
  },
  {
    chave: 'SOLEMP_CRIADA',
    nome: 'SOLEMP criada',
    ordem: 3,
    prazoDias: 3,
    perfilResponsavel: 'CLINICA',
    ativo: true,
  },
  {
    chave: 'AGUARDANDO_ASSINATURA',
    nome: 'Aguardando assinatura',
    ordem: 4,
    prazoDias: 5,
    perfilResponsavel: 'ASSINANTE',
    ativo: true,
  },
  {
    chave: 'SOLEMP_ASSINADA',
    nome: 'SOLEMP assinada',
    ordem: 5,
    prazoDias: 2,
    perfilResponsavel: 'CLINICA',
    ativo: true,
  },
  {
    chave: 'NF_ANEXADA',
    nome: 'Nota Fiscal anexada',
    ordem: 6,
    prazoDias: 2,
    perfilResponsavel: 'CLINICA',
    ativo: true,
  },
  {
    chave: 'ENVIADO_FINANCEIRO',
    nome: 'Enviado ao Financeiro',
    ordem: 7,
    prazoDias: 4,
    perfilResponsavel: 'FINANCEIRO',
    ativo: true,
  },
  {
    chave: 'PAGAMENTO_REALIZADO',
    nome: 'Pagamento realizado',
    ordem: 8,
    prazoDias: 3,
    perfilResponsavel: 'FINANCEIRO',
    ativo: true,
  },
  {
    chave: 'ENCERRADO',
    nome: 'Processo encerrado',
    ordem: 9,
    prazoDias: 0,
    perfilResponsavel: 'GESTOR',
    ativo: true,
  },
]

export const MOCK_CREDENTIALS: Record<string, { senha: string; userId: string }> = {
  admin: { senha: 'admin123', userId: 'user-admin' },
  gestor: { senha: 'gestor123', userId: 'user-gestor' },
}

function normalizeClinicas(data: AppData): { data: AppData; changed: boolean } {
  return { data, changed: false }
}

export function generateSeedData(): AppData {
  const workflowEtapas: WorkflowEtapa[] = DEFAULT_WORKFLOW_ETAPAS.map((etapa) => ({
    ...etapa,
    id: `etapa-${etapa.chave.toLowerCase()}`,
  }))

  const usuarios: User[] = [
    {
      id: 'user-admin',
      nome: 'Almirante Santos',
      posto: 'VA',
      graduacao: 'Administrador',
      login: 'admin',
      perfil: 'ADMINISTRADOR',
      clinicaId: null,
      ativo: true,
    },
    {
      id: 'user-gestor',
      nome: 'Capitão de Mar e Guerra Silva',
      posto: 'CMG',
      graduacao: 'Gestor',
      login: 'gestor',
      perfil: 'GESTOR',
      clinicaId: null,
      ativo: true,
    },
  ]

  return {
    usuarios,
    clinicas: [],
    empresas: [],
    materiais: [],
    workflowEtapas,
    pedidos: [],
    solemp: [],
    notasFiscais: [],
    historico: [],
    arquivos: [],
    notificacoes: [],
    reversoes: [],
    credenciais: {},
  }
}

export function loadAppData(): AppData {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as AppData & { _version?: string }
      if (parsed._version === SEED_VERSION) {
        const { _version: _, ...raw } = parsed
        const { data, changed } = normalizeClinicas(raw as AppData)
        if (!data.reversoes) data.reversoes = []
        if (!data.credenciais) data.credenciais = {}
        data.pedidos = (data.pedidos ?? []).map((p) => ({
          ...p,
          paciente: p.paciente ?? null,
        }))
        data.notificacoes = (data.notificacoes ?? []).map((n) => ({
          ...n,
          reversaoId: n.reversaoId ?? null,
        }))
        const beforeNotifCount = data.notificacoes.length
        syncPagamentoPendenteNotifications(data)
        const notifChanged = data.notificacoes.length > beforeNotifCount
        if (changed || notifChanged) saveAppData(data)
        return data
      }
    } catch {
      // regenera dados vazios
    }
  }

  const data = generateSeedData()
  saveAppData(data)
  return data
}

export function saveAppData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, _version: SEED_VERSION }))
}

export function resetAppData(): AppData {
  localStorage.removeItem(STORAGE_KEY)
  return loadAppData()
}

/** Remove todos os dados persistidos e sessões dos portais clínica/ordenador */
export function clearAllSystemData(): AppData {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem('acomp_solemp_auth')
  localStorage.removeItem('acomp_solemp_auth_clinica')
  localStorage.removeItem('acomp_solemp_auth_ordenador')
  return loadAppData()
}

export function delay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    ADMINISTRADOR: 'Administrador',
    GESTOR: 'Gestor',
    CLINICA: 'Clínica',
    ASSINANTE: 'Ordenador de Despesa',
    FINANCEIRO: 'Financeiro',
    CONSULTA: 'Consulta',
  }
  return labels[role]
}
