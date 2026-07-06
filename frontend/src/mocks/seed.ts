import type {
  AppData,
  User,
  UserRole,
  WorkflowEtapa,
} from '@/types'
import { syncPagamentoPendenteNotifications } from '@/utils/workflowAdvance'
import { asStringArray } from '@/utils/format'
import {
  STORAGE_KEYS,
  storageGet,
  storageRemove,
  storageSet,
} from '@/storage/indexedDb'

const STORAGE_KEY = STORAGE_KEYS.APP_DATA
const SEED_VERSION = 'v12'

let appDataCache: AppData | null = null

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
  // Div. de Material — trilha Auditoria/Contabilidade
  {
    chave: 'DIV_MAT_AUDITORIA',
    nome: 'Auditoria',
    ordem: 2,
    prazoDias: 3,
    perfilResponsavel: 'AUDITORIA',
    ativo: true,
  },
  {
    chave: 'DIV_MAT_CONTABILIDADE_IMH',
    nome: 'Contabilidade/IMH',
    ordem: 3,
    prazoDias: 3,
    perfilResponsavel: 'CONTABILIDADE_IMH',
    ativo: true,
  },
  // Div. de Material — trilha Material (Solemp)
  {
    chave: 'DIV_MAT_CONFECCAO_SOLEMP',
    nome: 'Confecção de Solemp',
    ordem: 4,
    prazoDias: 3,
    perfilResponsavel: 'CONFECCAO_SOLEMP',
    ativo: true,
  },
  {
    chave: 'DIV_MAT_ASSINATURA_1',
    nome: 'Assinatura 1 Solemp',
    ordem: 5,
    prazoDias: 5,
    perfilResponsavel: 'ASSINATURA_1_SOLEMP',
    ativo: true,
  },
  {
    chave: 'DIV_MAT_ASSINATURA_2',
    nome: 'Assinatura 2 Solemp',
    ordem: 6,
    prazoDias: 5,
    perfilResponsavel: 'ASSINATURA_2_SOLEMP',
    ativo: true,
  },
  {
    chave: 'DIV_MAT_SDA',
    nome: 'SDA',
    ordem: 7,
    prazoDias: 3,
    perfilResponsavel: 'SDA',
    ativo: true,
  },
  {
    chave: 'DIV_MAT_FINANCAS',
    nome: 'Finanças Pagamento',
    ordem: 8,
    prazoDias: 4,
    perfilResponsavel: 'FINANCEIRO',
    ativo: true,
  },
]

export const MOCK_CREDENTIALS: Record<string, { senha: string; userId: string }> = {
  admin: { senha: 'admin123', userId: 'user-admin' },
  gestor: { senha: 'gestor123', userId: 'user-gestor' },
}

function normalizeTextoCampo(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  return typeof value === 'string' ? value : ''
}

function normalizeClinicas(data: AppData): { data: AppData; changed: boolean } {
  let changed = false

  for (const user of data.usuarios) {
    if (user.perfil !== 'CLINICA' || !user.clinicaId) continue
    if (data.clinicas.some((c) => c.id === user.clinicaId)) continue

    data.clinicas.push({
      id: user.clinicaId,
      nome: user.nome,
      responsavel: user.nome,
      telefone: '',
    })
    changed = true
  }

  const etapaIds = new Set(data.workflowEtapas.map((e) => e.id))

  for (const pedido of data.pedidos) {
    if (!data.clinicas.some((c) => c.id === pedido.clinicaId)) {
      const nome =
        pedido.dadosClinica?.nomeClinica?.trim() ||
        data.usuarios.find((u) => u.clinicaId === pedido.clinicaId)?.nome ||
        `Clínica ${pedido.clinicaId}`
      data.clinicas.push({
        id: pedido.clinicaId,
        nome,
        responsavel: nome,
        telefone: '',
      })
      changed = true
    }

    if (!data.empresas.some((e) => e.id === pedido.empresaId)) {
      const nome = pedido.dadosClinica?.empresaConsignada?.trim() || 'Empresa não informada'
      if (!pedido.empresaId) pedido.empresaId = `empresa-${pedido.id}`
      data.empresas.push({
        id: pedido.empresaId,
        razaoSocial: nome,
        nomeFantasia: nome,
        cnpj: '',
        contato: '',
        telefone: '',
        email: '',
      })
      changed = true
    }

    if (!data.materiais.some((m) => m.id === pedido.materialId)) {
      const descricao = pedido.dadosClinica?.materialUtilizado?.trim() || 'Material não informado'
      if (!pedido.materialId) pedido.materialId = `material-${pedido.id}`
      data.materiais.push({
        id: pedido.materialId,
        descricao,
        fabricante: '',
        unidade: 'UN',
      })
      changed = true
    }

    if (!etapaIds.has(pedido.etapaAtualId)) {
      const ativaValida = (pedido.etapasAtivasIds ?? []).find((id) => etapaIds.has(id))
      const historicoAberto = pedido.etapasHistorico.find((h) => h.dataConclusao === null)
      const historicoValido =
        historicoAberto && etapaIds.has(historicoAberto.etapaId)
          ? historicoAberto.etapaId
          : null
      const solicitacao = data.workflowEtapas.find((e) => e.chave === 'SOLICITACAO')?.id
      const novoId = ativaValida ?? historicoValido ?? solicitacao
      if (novoId) {
        pedido.etapaAtualId = novoId
        if (!pedido.etapasAtivasIds?.length) {
          pedido.etapasAtivasIds = [novoId]
        }
        changed = true
      }
    }
  }

  return { data, changed }
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

function normalizeAppData(raw: AppData): { data: AppData; changed: boolean } {
  const { data, changed } = normalizeClinicas(raw)
  if (!data.reversoes) data.reversoes = []
  if (!data.credenciais) data.credenciais = {}
  data.pedidos = (data.pedidos ?? []).map((p) => ({
    ...p,
    paciente: p.paciente ?? null,
    etapasAtivasIds: p.etapasAtivasIds ?? (p.etapaAtualId ? [p.etapaAtualId] : []),
    dadosClinica: p.dadosClinica
      ? {
          ...p.dadosClinica,
          folhaSala: normalizeTextoCampo(p.dadosClinica.folhaSala),
          descricaoCirurgica: normalizeTextoCampo(p.dadosClinica.descricaoCirurgica),
          etiquetas: normalizeTextoCampo(p.dadosClinica.etiquetas),
          fotos: asStringArray(p.dadosClinica.fotos as unknown),
        }
      : null,
  }))
  data.notificacoes = (data.notificacoes ?? []).map((n) => ({
    ...n,
    reversaoId: n.reversaoId ?? null,
    perfilDestino: n.perfilDestino ?? null,
    etapaChave: n.etapaChave ?? null,
  }))
  const beforeNotifCount = data.notificacoes.length
  syncPagamentoPendenteNotifications(data)
  const notifChanged = data.notificacoes.length > beforeNotifCount
  return { data, changed: changed || notifChanged }
}

function cloneData(data: AppData): AppData {
  return JSON.parse(JSON.stringify(data)) as AppData
}

/** Carrega dados do IndexedDB (cache em memória) — chamar após initStorage() */
export function initAppData(): AppData {
  const stored = storageGet(STORAGE_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as AppData & { _version?: string }
      if (parsed._version === SEED_VERSION) {
        const { _version: _, ...raw } = parsed
        const { data, changed } = normalizeAppData(raw as AppData)
        appDataCache = data
        if (changed) persistAppData(data)
        return cloneData(data)
      }
    } catch {
      // regenera dados vazios
    }
  }

  const data = generateSeedData()
  appDataCache = data
  persistAppData(data)
  return cloneData(data)
}

export function loadAppData(): AppData {
  if (!appDataCache) {
    return initAppData()
  }
  return cloneData(appDataCache)
}

function persistAppData(data: AppData): void {
  storageSet(STORAGE_KEY, JSON.stringify({ ...data, _version: SEED_VERSION }))
}

export function saveAppData(data: AppData): void {
  appDataCache = cloneData(data)
  persistAppData(appDataCache)
}

export function resetAppData(): AppData {
  storageRemove(STORAGE_KEY)
  appDataCache = null
  return initAppData()
}

/** Remove todos os dados persistidos e sessões */
export function clearAllSystemData(): AppData {
  Object.values(STORAGE_KEYS).forEach((key) => storageRemove(key))
  appDataCache = null
  return initAppData()
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
    FINANCEIRO: 'Finanças Pagamento',
    AUDITORIA: 'Auditoria',
    CONTABILIDADE_IMH: 'Contabilidade/IMH',
    CONFECCAO_SOLEMP: 'Confecção de Solemp',
    ASSINATURA_1_SOLEMP: 'Assinatura 1 Solemp',
    ASSINATURA_2_SOLEMP: 'Assinatura 2 Solemp',
    SDA: 'SDA',
    CONSULTA: 'Consulta',
  }
  return labels[role]
}
