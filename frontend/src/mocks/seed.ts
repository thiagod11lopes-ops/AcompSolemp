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
import {
  buildPedidosConsumoMaterialSeed,
  USUARIO_CLINICA_OPME_ID,
} from '@/mocks/consumoMaterialPedidosSeed'
import {
  CLINICA_CONSUMO_OPME_NOME,
  CONSUMO_MATERIAL_SEED,
} from '@/utils/consumoMaterialTemplate'
import {
  archiveActivePedidosAsFinalized,
  removePedidosFromAppData,
} from '@/utils/pedidoCleanup'

const STORAGE_KEY = STORAGE_KEYS.APP_DATA
const SEED_VERSION = 'v14'
export const USUARIO_CONFECCAO_SOLEMP_ID = 'user-confeccao-solemp'

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
  opme: { senha: 'opme123', userId: USUARIO_CLINICA_OPME_ID },
  solemp: { senha: '123456', userId: USUARIO_CONFECCAO_SOLEMP_ID },
}

function normalizeTextoCampo(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  return typeof value === 'string' ? value : ''
}

function resolveEtapaId(
  etapaId: string | undefined,
  etapaNome: string | undefined,
  etapas: WorkflowEtapa[],
): string | null {
  if (etapaId && etapas.some((etapa) => etapa.id === etapaId)) return etapaId

  if (etapaId?.startsWith('etapa-')) {
    const chaveGuess = etapaId.slice('etapa-'.length)
    const porChave = etapas.find((etapa) => etapa.chave.toLowerCase() === chaveGuess)
    if (porChave) return porChave.id
  }

  if (etapaNome) {
    const porNome = etapas.find((etapa) => etapa.nome === etapaNome)
    if (porNome) return porNome.id
  }

  return null
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
      const remapeado = resolveEtapaId(
        pedido.etapaAtualId,
        historicoAberto?.etapaNome,
        data.workflowEtapas,
      )
      const novoId = remapeado ?? ativaValida ?? historicoValido ?? solicitacao
      if (novoId) {
        pedido.etapaAtualId = novoId
        if (!pedido.etapasAtivasIds?.length) {
          pedido.etapasAtivasIds = [novoId]
        }
        changed = true
      }
    }

    const ativasRemapeadas = (pedido.etapasAtivasIds ?? [])
      .map((id) => resolveEtapaId(id, undefined, data.workflowEtapas) ?? id)
      .filter((id) => etapaIds.has(id))
    if (
      ativasRemapeadas.length > 0 &&
      JSON.stringify(ativasRemapeadas) !== JSON.stringify(pedido.etapasAtivasIds ?? [])
    ) {
      pedido.etapasAtivasIds = ativasRemapeadas
      changed = true
    } else if (
      !pedido.etapasAtivasIds?.length &&
      pedido.etapaAtualId &&
      etapaIds.has(pedido.etapaAtualId)
    ) {
      pedido.etapasAtivasIds = [pedido.etapaAtualId]
      changed = true
    }

    for (const historico of pedido.etapasHistorico) {
      const remapeado = resolveEtapaId(
        historico.etapaId,
        historico.etapaNome,
        data.workflowEtapas,
      )
      if (remapeado && remapeado !== historico.etapaId) {
        historico.etapaId = remapeado
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

  const consumoSeed = buildPedidosConsumoMaterialSeed(workflowEtapas)

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
    {
      id: USUARIO_CLINICA_OPME_ID,
      nome: CLINICA_CONSUMO_OPME_NOME,
      posto: 'HN',
      graduacao: 'Clínica OPME',
      login: 'opme',
      perfil: 'CLINICA',
      clinicaId: consumoSeed.clinica.id,
      ativo: true,
    },
    {
      id: USUARIO_CONFECCAO_SOLEMP_ID,
      nome: 'Solemp',
      posto: '',
      graduacao: 'Confecção de Solemp',
      login: 'solemp',
      perfil: 'CONFECCAO_SOLEMP',
      clinicaId: null,
      ativo: true,
    },
  ]

  return {
    usuarios,
    clinicas: [consumoSeed.clinica],
    empresas: consumoSeed.empresas,
    materiais: consumoSeed.materiais,
    workflowEtapas,
    pedidos: [],
    solemp: [],
    notasFiscais: [],
    historico: [],
    arquivos: [],
    notificacoes: [],
    reversoes: [],
    credenciais: {},
    consumoPlanilha: {
      [consumoSeed.clinica.id]: {
        finalizedRowIds: CONSUMO_MATERIAL_SEED.map((row) => row.id),
        extraRows: CONSUMO_MATERIAL_SEED.map((row) => ({ ...row })),
      },
    },
  }
}

function ensureDefaultConfeccaoUser(data: AppData): boolean {
  if (data.usuarios.some((user) => user.perfil === 'CONFECCAO_SOLEMP' && user.ativo)) {
    return false
  }

  data.usuarios.push({
    id: USUARIO_CONFECCAO_SOLEMP_ID,
    nome: 'Solemp',
    posto: '',
    graduacao: 'Confecção de Solemp',
    login: 'solemp',
    perfil: 'CONFECCAO_SOLEMP',
    clinicaId: null,
    ativo: true,
  })

  if (!data.credenciais) data.credenciais = {}
  if (!data.credenciais.solemp) {
    data.credenciais.solemp = { senha: '123456', userId: USUARIO_CONFECCAO_SOLEMP_ID }
  }

  return true
}

function normalizeAppData(raw: AppData): { data: AppData; changed: boolean } {
  const { data, changed } = normalizeClinicas(raw)
  if (!data.reversoes) data.reversoes = []
  if (!data.credenciais) data.credenciais = {}
  if (!data.pedidoPlanilhaEnvio) data.pedidoPlanilhaEnvio = {}
  if (!data.processosArquivados) data.processosArquivados = []
  const confeccaoUserChanged = ensureDefaultConfeccaoUser(data)
  data.pedidos = (data.pedidos ?? []).map((p) => ({
    ...p,
    paciente: p.paciente ?? null,
    etapasAtivasIds: p.etapasAtivasIds?.length
      ? p.etapasAtivasIds
      : p.etapaAtualId
        ? [p.etapaAtualId]
        : [],
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
  return { data, changed: changed || notifChanged || confeccaoUserChanged }
}

function migrateRemoveActiveTimelines(data: AppData): AppData {
  const activePedidos = data.pedidos.filter((pedido) => !pedido.concluido)
  if (activePedidos.length === 0) return data

  archiveActivePedidosAsFinalized(data, activePedidos)
  const activeIds = new Set(activePedidos.map((pedido) => pedido.id))
  removePedidosFromAppData(data, activeIds)
  return data
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
      if (parsed._version === 'v13') {
        const { _version: _, ...raw } = parsed
        let data = migrateRemoveActiveTimelines(raw as AppData)
        const { data: normalized } = normalizeAppData(data)
        appDataCache = normalized
        persistAppData(normalized)
        return cloneData(normalized)
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

/** Recarrega do IndexedDB — garante dados atualizados após envio em outra aba/sessão */
export function reloadAppDataFromStorage(): AppData {
  const stored = storageGet(STORAGE_KEY)
  if (!stored) {
    return loadAppData()
  }

  try {
    const parsed = JSON.parse(stored) as AppData & { _version?: string }
    const { _version: _, ...raw } = parsed
    const { data, changed } = normalizeAppData(raw as AppData)
    appDataCache = data
    if (changed) persistAppData(data)
    return cloneData(data)
  } catch {
    return loadAppData()
  }
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
