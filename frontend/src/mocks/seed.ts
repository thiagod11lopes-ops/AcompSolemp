import {
  ALERTA_VENCIMENTO_PADRAO_DIAS,
  PRAZO_CORRECAO_PADRAO_DIAS,
  type AppData,
  type ArquivoAnexo,
  type Pedido,
  type PedidoPlanilhaEnvioState,
  type User,
  type UserRole,
  type WorkflowEtapa,
} from '@/types'
import { syncPagamentoPendenteNotifications } from '@/utils/workflowAdvance'
import { syncPrazoCorrecaoNotifications } from '@/utils/prazoCorrecao'
import { asStringArray } from '@/utils/format'
import {
  STORAGE_KEYS,
  storageGet,
  storageRemove,
  storageRemoveAndWait,
  storageReloadKey,
  storageSet,
  storageSetAndWait,
} from '@/storage/indexedDb'
import {
  isDemoDataSession,
  useCloudAppDataSync,
  usesIndexedDbAppData,
} from '@/config/dataSource'
import {
  buildPedidosConsumoMaterialSeed,
  USUARIO_CLINICA_OPME_ID,
} from '@/mocks/consumoMaterialPedidosSeed'
import { normalizeUserPerfis, userHasPerfil } from '@/utils/userPerfis'
import {
  CLINICA_CONSUMO_OPME_NOME,
  CONSUMO_MATERIAL_SEED,
} from '@/utils/consumoMaterialTemplate'
import {
  archiveActivePedidosAsFinalized,
  purgeOrphanPedidoSideData,
  removePedidosFromAppData,
} from '@/utils/pedidoCleanup'
import { ETAPAS_REMOVIDAS_SET } from '@/utils/timelineFlow'
import { env } from '@/config/env'
import { isMarinhaEmail } from '@/utils/email'
import { scheduleSupabaseAppDataSync } from '@/data/persistence/supabaseSync'

const SEED_VERSION = 'v16'

const PERFIS_REMOVIDOS = new Set<UserRole>([
  'ASSINATURA_1_SOLEMP',
  'ASSINATURA_2_SOLEMP',
  'SDA',
])
export const USUARIO_CONFECCAO_SOLEMP_ID = 'user-confeccao-solemp'

let appDataCache: AppData | null = null

function getAppDataStorageKey(): string {
  if (isDemoDataSession()) return STORAGE_KEYS.DEMO_APP_DATA
  return STORAGE_KEYS.APP_DATA
}

export function clearAppDataCache(): void {
  appDataCache = null
}

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
    alertaVencimentoDias: 2,
    prazoCorrecaoDias: 3,
    perfilResponsavel: 'CLINICA',
    ativo: true,
  },
  // Div. de Material — trilha Auditoria/IMH
  {
    chave: 'DIV_MAT_AUDITORIA',
    nome: 'Auditoria',
    ordem: 2,
    prazoDias: 3,
    alertaVencimentoDias: 2,
    prazoCorrecaoDias: 3,
    perfilResponsavel: 'AUDITORIA',
    ativo: true,
  },
  {
    chave: 'DIV_MAT_CONTABILIDADE_IMH',
    nome: 'IMH',
    ordem: 3,
    prazoDias: 3,
    alertaVencimentoDias: 2,
    prazoCorrecaoDias: 3,
    perfilResponsavel: 'CONTABILIDADE_IMH',
    ativo: true,
  },
  {
    chave: 'DIV_MAT_INDENIZADO',
    nome: 'Indenizado',
    ordem: 4,
    prazoDias: 1,
    alertaVencimentoDias: 1,
    prazoCorrecaoDias: 3,
    perfilResponsavel: 'CONTABILIDADE_IMH',
    ativo: true,
  },
  // Div. de Material — trilha Material (Solemp)
  {
    chave: 'DIV_MAT_CONFECCAO_SOLEMP',
    nome: 'Confecção de Solemp',
    ordem: 5,
    prazoDias: 3,
    alertaVencimentoDias: 2,
    prazoCorrecaoDias: 3,
    perfilResponsavel: 'CONFECCAO_SOLEMP',
    ativo: true,
  },
  {
    chave: 'DIV_MAT_FINANCAS',
    nome: 'Solemp em Rascunho',
    ordem: 6,
    prazoDias: 4,
    alertaVencimentoDias: 2,
    prazoCorrecaoDias: 3,
    perfilResponsavel: 'FINANCEIRO',
    ativo: true,
  },
  {
    chave: 'DIV_MAT_EMPENHADO',
    nome: 'Empenhado',
    ordem: 7,
    prazoDias: 4,
    alertaVencimentoDias: 2,
    prazoCorrecaoDias: 3,
    perfilResponsavel: 'EMPENHADO',
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

export function generateEmptyTenantData(): AppData {
  const workflowEtapas: WorkflowEtapa[] = DEFAULT_WORKFLOW_ETAPAS.map((etapa) => ({
    ...etapa,
    id: `etapa-${etapa.chave.toLowerCase()}`,
  }))

  return {
    usuarios: [],
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
    consumoPlanilha: {},
    planilhasLivres: {},
    pedidoPlanilhaEnvio: {},
    planilhaAnexosPorPedido: {},
    processosArquivados: [],
    pedidosExcluidosIds: [],
  }
}

export function createOwnerGestor(uid: string, email: string, displayName?: string | null): User {
  const nomeBase = displayName?.trim() || email.split('@')[0] || 'Gestor'
  return {
    id: `user-owner-${uid}`,
    nome: nomeBase,
    posto: '',
    graduacao: 'Gestor Geral',
    login: 'gestor',
    email,
    perfil: 'GESTOR',
    clinicaId: null,
    ativo: true,
  }
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
      perfis: ['CONFECCAO_SOLEMP'],
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
  if (data.tenantMeta) return false
  if (data.usuarios.some((user) => userHasPerfil(user, 'CONFECCAO_SOLEMP') && user.ativo)) {
    return false
  }

  data.usuarios.push({
    id: USUARIO_CONFECCAO_SOLEMP_ID,
    nome: 'Solemp',
    posto: '',
    graduacao: 'Confecção de Solemp',
    login: 'solemp',
    perfil: 'CONFECCAO_SOLEMP',
    perfis: ['CONFECCAO_SOLEMP'],
    clinicaId: null,
    ativo: true,
  })

  if (!data.credenciais) data.credenciais = {}
  if (!data.credenciais.solemp) {
    data.credenciais.solemp = { senha: '123456', userId: USUARIO_CONFECCAO_SOLEMP_ID }
  }

  return true
}

function ensureBootstrapGoogleEmails(data: AppData): boolean {
  if (data.tenantMeta) return false
  const email = env.gestorGoogleEmail
  if (!email || !isMarinhaEmail(email)) return false

  let changed = false
  for (const user of data.usuarios) {
    if (
      user.ativo &&
      (user.perfil === 'GESTOR' || user.perfil === 'ADMINISTRADOR') &&
      !user.email
    ) {
      user.email = email
      changed = true
    }
  }
  return changed
}

function normalizeAppData(raw: AppData): { data: AppData; changed: boolean } {
  const { data, changed } = normalizeClinicas(raw)
  const workflowChanged = ensureWorkflowSemEtapasRemovidas(data)
  if (!data.reversoes) data.reversoes = []
  if (!data.credenciais) data.credenciais = {}
  if (!data.pedidoPlanilhaEnvio) data.pedidoPlanilhaEnvio = {}
  if (!data.planilhaAnexosPorPedido) data.planilhaAnexosPorPedido = {}
  if (!data.processosArquivados) data.processosArquivados = []
  if (!data.pedidosExcluidosIds) data.pedidosExcluidosIds = []
  if (!data.chatMensagens) data.chatMensagens = []
  data.chatMensagens = (data.chatMensagens ?? []).map((m) => ({
    ...m,
    lidasPor: Array.isArray(m.lidasPor) ? m.lidasPor : [],
  }))
  const confeccaoUserChanged = ensureDefaultConfeccaoUser(data)
  const bootstrapEmailChanged = ensureBootstrapGoogleEmails(data)
  let perfisChanged = false
  data.usuarios = (data.usuarios ?? []).map((user) => {
    const normalized = normalizeUserPerfis(user)
    if (
      normalized.perfil !== user.perfil ||
      JSON.stringify(normalized.perfis ?? []) !== JSON.stringify(user.perfis ?? [])
    ) {
      perfisChanged = true
    }
    return normalized
  })
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
  syncPrazoCorrecaoNotifications(data)
  const notifChanged = data.notificacoes.length > beforeNotifCount
  const orphanChanged = purgeOrphanPedidoSideData(data)
  return {
    data,
    changed:
      changed ||
      notifChanged ||
      confeccaoUserChanged ||
      bootstrapEmailChanged ||
      workflowChanged ||
      perfisChanged ||
      orphanChanged,
  }
}

function ensureWorkflowSemEtapasRemovidas(data: AppData): boolean {
  let changed = false

  for (const etapa of data.workflowEtapas) {
    if (ETAPAS_REMOVIDAS_SET.has(etapa.chave) && etapa.ativo) {
      etapa.ativo = false
      changed = true
    }
  }

  const defByChave = new Map(DEFAULT_WORKFLOW_ETAPAS.map((e) => [e.chave, e]))
  for (const def of DEFAULT_WORKFLOW_ETAPAS) {
    const existente = data.workflowEtapas.find((e) => e.chave === def.chave)
    if (!existente) {
      data.workflowEtapas.push({
        id: `etapa-${def.chave.toLowerCase().replace(/_/g, '-')}`,
        ...def,
      })
      changed = true
      continue
    }
    if (existente.ordem !== def.ordem || !existente.ativo) {
      existente.ordem = def.ordem
      existente.ativo = true
      changed = true
    }
    if (existente.nome !== def.nome) {
      existente.nome = def.nome
      changed = true
    }
    if (existente.perfilResponsavel !== def.perfilResponsavel) {
      existente.perfilResponsavel = def.perfilResponsavel
      changed = true
    }
    if (
      typeof existente.alertaVencimentoDias !== 'number' ||
      !Number.isFinite(existente.alertaVencimentoDias)
    ) {
      existente.alertaVencimentoDias = def.alertaVencimentoDias ?? ALERTA_VENCIMENTO_PADRAO_DIAS
      changed = true
    }
    if (
      typeof existente.prazoCorrecaoDias !== 'number' ||
      !Number.isFinite(existente.prazoCorrecaoDias)
    ) {
      existente.prazoCorrecaoDias = def.prazoCorrecaoDias ?? PRAZO_CORRECAO_PADRAO_DIAS
      changed = true
    }
  }

  // Garante sincronização mesmo se chave já existir com nome legado
  for (const etapa of data.workflowEtapas) {
    const def = defByChave.get(etapa.chave)
    if (!def) continue
    if (etapa.nome !== def.nome) {
      etapa.nome = def.nome
      changed = true
    }
  }

  for (const etapa of data.workflowEtapas) {
    if (
      typeof etapa.alertaVencimentoDias !== 'number' ||
      !Number.isFinite(etapa.alertaVencimentoDias)
    ) {
      etapa.alertaVencimentoDias = ALERTA_VENCIMENTO_PADRAO_DIAS
      changed = true
    }
    if (
      typeof etapa.prazoCorrecaoDias !== 'number' ||
      !Number.isFinite(etapa.prazoCorrecaoDias)
    ) {
      etapa.prazoCorrecaoDias = PRAZO_CORRECAO_PADRAO_DIAS
      changed = true
    }
  }

  if (backfillEmpenhadoHistorico(data)) changed = true
  if (backfillIndenizadoHistorico(data)) changed = true

  return changed
}

/** Pedidos com IMH concluída passam a ter Indenizado concluído no histórico. */
function backfillIndenizadoHistorico(data: AppData): boolean {
  const contabilidade = data.workflowEtapas.find((e) => e.chave === 'DIV_MAT_CONTABILIDADE_IMH')
  const indenizado = data.workflowEtapas.find((e) => e.chave === 'DIV_MAT_INDENIZADO')
  if (!contabilidade || !indenizado) return false

  let changed = false
  for (const pedido of data.pedidos) {
    const contabHist = pedido.etapasHistorico.find((h) => h.etapaId === contabilidade.id)
    if (!contabHist?.dataConclusao) continue

    const indenizadoHist = pedido.etapasHistorico.find((h) => h.etapaId === indenizado.id)
    if (indenizadoHist) {
      if (!indenizadoHist.dataConclusao) {
        indenizadoHist.dataConclusao = contabHist.dataConclusao
        indenizadoHist.observacao =
          indenizadoHist.observacao ||
          'Indenizado registrado automaticamente com a conclusão da IMH.'
        changed = true
      }
      continue
    }

    pedido.etapasHistorico.push({
      etapaId: indenizado.id,
      etapaNome: indenizado.nome,
      responsavelId: contabHist.responsavelId,
      responsavelNome: contabHist.responsavelNome,
      dataInicio: contabHist.dataConclusao,
      dataConclusao: contabHist.dataConclusao,
      observacao: 'Indenizado registrado automaticamente com a conclusão da IMH.',
      arquivos: [],
    })
    changed = true
  }
  return changed
}

/** Pedidos que já passaram por Solemp em Rascunho passam a ter Empenhado no histórico. */
function backfillEmpenhadoHistorico(data: AppData): boolean {
  const financas = data.workflowEtapas.find((e) => e.chave === 'DIV_MAT_FINANCAS')
  const empenhado = data.workflowEtapas.find((e) => e.chave === 'DIV_MAT_EMPENHADO')
  if (!financas || !empenhado) return false

  let changed = false
  for (const pedido of data.pedidos) {
    const financasHist = pedido.etapasHistorico.find((h) => h.etapaId === financas.id)
    if (!financasHist?.dataConclusao) continue

    const empenhadoHist = pedido.etapasHistorico.find((h) => h.etapaId === empenhado.id)
    if (empenhadoHist) {
      if (!empenhadoHist.dataConclusao && (pedido.concluido || financasHist.dataConclusao)) {
        empenhadoHist.dataConclusao = financasHist.dataConclusao
        empenhadoHist.observacao =
          empenhadoHist.observacao || 'Empenhado registrado com a Solemp em Rascunho.'
        changed = true
      }
      continue
    }

    pedido.etapasHistorico.push({
      etapaId: empenhado.id,
      etapaNome: empenhado.nome,
      responsavelId: financasHist.responsavelId,
      responsavelNome: financasHist.responsavelNome,
      dataInicio: financasHist.dataConclusao,
      dataConclusao: financasHist.dataConclusao,
      observacao: 'Empenhado registrado com a Solemp em Rascunho.',
      arquivos: [],
    })
    changed = true
  }
  return changed
}

function migrateSimplifyFluxoFinancas(data: AppData): AppData {
  for (const etapa of data.workflowEtapas) {
    if (ETAPAS_REMOVIDAS_SET.has(etapa.chave)) {
      etapa.ativo = false
    }
  }

  const financasDef = DEFAULT_WORKFLOW_ETAPAS.find((e) => e.chave === 'DIV_MAT_FINANCAS')
  const confeccaoDef = DEFAULT_WORKFLOW_ETAPAS.find((e) => e.chave === 'DIV_MAT_CONFECCAO_SOLEMP')
  for (const etapa of data.workflowEtapas) {
    if (etapa.chave === 'DIV_MAT_FINANCAS' && financasDef) {
      etapa.ordem = financasDef.ordem
      etapa.ativo = true
    }
    if (etapa.chave === 'DIV_MAT_CONFECCAO_SOLEMP' && confeccaoDef) {
      etapa.ordem = confeccaoDef.ordem
    }
  }

  for (const user of data.usuarios) {
    if (PERFIS_REMOVIDOS.has(user.perfil)) {
      user.ativo = false
    }
  }

  const financasEtapa = data.workflowEtapas.find(
    (e) => e.chave === 'DIV_MAT_FINANCAS' && e.ativo,
  )
  if (!financasEtapa) return data

  const etapaChaveById = new Map(data.workflowEtapas.map((e) => [e.id, e.chave]))

  for (const pedido of data.pedidos) {
    if (pedido.concluido) continue

    const ativasIds = pedido.etapasAtivasIds?.length
      ? pedido.etapasAtivasIds
      : [pedido.etapaAtualId]
    const temRemovida = ativasIds.some((id) =>
      ETAPAS_REMOVIDAS_SET.has(etapaChaveById.get(id) ?? ''),
    )
    if (!temRemovida) continue

    for (const historico of pedido.etapasHistorico) {
      if (historico.dataConclusao) continue
      const chave = etapaChaveById.get(historico.etapaId) ?? ''
      if (!ETAPAS_REMOVIDAS_SET.has(chave)) continue
      historico.dataConclusao = new Date().toISOString()
      historico.observacao =
        'Etapa descontinuada — processo encaminhado para Solemp em Rascunho.'
    }

    pedido.etapaAtualId = financasEtapa.id
    pedido.etapasAtivasIds = [financasEtapa.id]

    const jaTemFinancas = pedido.etapasHistorico.some(
      (historico) => historico.etapaId === financasEtapa.id && !historico.dataConclusao,
    )
    if (!jaTemFinancas) {
      pedido.etapasHistorico.push({
        etapaId: financasEtapa.id,
        etapaNome: financasEtapa.nome,
        responsavelId: null,
        responsavelNome: 'Sistema',
        dataInicio: new Date().toISOString(),
        dataConclusao: null,
        observacao: 'Encaminhado automaticamente após simplificação do fluxo.',
        arquivos: [],
      })
    }
  }

  return data
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

/** Carrega dados do IndexedDB (local/demo) ou cache em memória (Supabase) */
export function initAppData(): AppData {
  if (useCloudAppDataSync()) {
    if (appDataCache) return cloneData(appDataCache)
    const { data } = normalizeAppData(generateEmptyTenantData())
    appDataCache = data
    return cloneData(data)
  }

  const storageKey = getAppDataStorageKey()
  const stored = storageGet(storageKey)
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as AppData & { _version?: string }
      if (parsed._version === SEED_VERSION) {
        const { _version: _, ...raw } = parsed
        const { data, changed } = normalizeAppData(raw as AppData)
        appDataCache = data
        if (changed) persistAppData(data, { silent: true })
        return cloneData(data)
      }
      if (parsed._version === 'v14') {
        const { _version: _, ...raw } = parsed
        let data = migrateSimplifyFluxoFinancas(raw as AppData)
        const { data: normalized } = normalizeAppData(data)
        appDataCache = normalized
        persistAppData(normalized)
        return cloneData(normalized)
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

  if (isDemoDataSession()) {
    const data = generateEmptyTenantData()
    appDataCache = data
    return cloneData(data)
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

/** Recarrega dados do IndexedDB ou cache em memória (Supabase) */
export function reloadAppDataFromStorage(): AppData {
  if (useCloudAppDataSync()) {
    return loadAppData()
  }

  const stored = storageGet(getAppDataStorageKey())
  if (!stored) {
    return loadAppData()
  }

  try {
    const parsed = JSON.parse(stored) as AppData & { _version?: string }
    const { _version: _, ...raw } = parsed
    const { data, changed } = normalizeAppData(raw as AppData)
    appDataCache = data
    // Persistência silenciosa: evita notificar/invalidar queries a cada leitura+normalize
    // (loop: normalize → persist → invalidate → refetch → normalize…).
    if (changed) persistAppData(data, { silent: true })
    return cloneData(data)
  } catch {
    return loadAppData()
  }
}

/** Sequência local para o schedule na nuvem — evita import() atrasado com AppData velho. */
let persistScheduleSeq = 0

function persistAppData(data: AppData, options?: { silent?: boolean }): void {
  // Seed fictício: só atualiza o snapshot local — nunca AppData real nem Supabase.
  if (storageGet(STORAGE_KEYS.FICTIONAL_ACTIVE) === '1') {
    storageSet(STORAGE_KEYS.FICTIONAL_SNAPSHOT, JSON.stringify(data))
    if (!options?.silent) notifyAppDataChanged()
    return
  }

  if (useCloudAppDataSync()) {
    // Schedule síncrono (sem import dinâmico): evita race em que um schedule
    // atrasado reenvia AppData velho e apaga cadastro acabado de criar.
    scheduleSupabaseAppDataSync(data, SEED_VERSION, ++persistScheduleSeq)
    // Notifica abas locais imediatamente; outras sessões entram via realtime.
    if (!options?.silent) notifyAppDataChanged()
    return
  }

  storageSet(getAppDataStorageKey(), JSON.stringify({ ...data, _version: SEED_VERSION }))
  if (!options?.silent) {
    notifyAppDataChanged()
  }
}

const APP_DATA_CHANGED_EVENT = 'acomp-app-data-changed'
const APP_DATA_BROADCAST = 'acomp-app-data'
/** @deprecated alias — mantido para listeners antigos */
const DEMO_DATA_CHANGED_EVENT = 'acomp-demo-data-changed'
const DEMO_DATA_BROADCAST = 'acomp-demo-data'

const APP_DATA_TAB_ID =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`

export function notifyAppDataChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(APP_DATA_CHANGED_EVENT))
  // Compat: listeners de demo ainda escutam o evento legado.
  window.dispatchEvent(new CustomEvent(DEMO_DATA_CHANGED_EVENT))
  const message = { type: APP_DATA_CHANGED_EVENT, tabId: APP_DATA_TAB_ID }
  try {
    const channel = new BroadcastChannel(APP_DATA_BROADCAST)
    channel.postMessage(message)
    channel.close()
  } catch {
    // BroadcastChannel indisponível
  }
  try {
    const demoChannel = new BroadcastChannel(DEMO_DATA_BROADCAST)
    demoChannel.postMessage({ type: DEMO_DATA_CHANGED_EVENT, tabId: APP_DATA_TAB_ID })
    demoChannel.close()
  } catch {
    // ignore
  }
}

export function notifyDemoAppDataChanged(): void {
  notifyAppDataChanged()
}

async function reloadCacheFromPeerStorage(): Promise<void> {
  if (useCloudAppDataSync()) return
  const key = getAppDataStorageKey()
  await storageReloadKey(key)
  reloadAppDataFromStorage()
}

/**
 * Escuta alterações de AppData nesta aba e em outras abas do mesmo origin.
 * Em modo nuvem, use também `subscribeAppStateRealtime` (Supabase).
 */
export function subscribeAppDataChanged(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined

  const handleLocal = () => {
    listener()
  }

  const handlePeerMessage = (event: MessageEvent) => {
    const tabId =
      event.data && typeof event.data === 'object' && 'tabId' in event.data
        ? String((event.data as { tabId?: unknown }).tabId ?? '')
        : ''
    // Ignora eco da própria aba (evita sobrescrever cache com IDB ainda não gravado).
    if (tabId && tabId === APP_DATA_TAB_ID) return
    void reloadCacheFromPeerStorage().then(() => listener())
  }

  window.addEventListener(APP_DATA_CHANGED_EVENT, handleLocal)
  window.addEventListener(DEMO_DATA_CHANGED_EVENT, handleLocal)

  let channel: BroadcastChannel | null = null
  let demoChannel: BroadcastChannel | null = null
  try {
    channel = new BroadcastChannel(APP_DATA_BROADCAST)
    channel.onmessage = handlePeerMessage
  } catch {
    channel = null
  }
  try {
    demoChannel = new BroadcastChannel(DEMO_DATA_BROADCAST)
    demoChannel.onmessage = handlePeerMessage
  } catch {
    demoChannel = null
  }

  return () => {
    window.removeEventListener(APP_DATA_CHANGED_EVENT, handleLocal)
    window.removeEventListener(DEMO_DATA_CHANGED_EVENT, handleLocal)
    channel?.close()
    demoChannel?.close()
  }
}

export function subscribeDemoAppDataChanged(listener: () => void): () => void {
  return subscribeAppDataChanged(listener)
}

/** Persiste AppData de demonstração sem depender da rota atual. */
export function saveDemoAppData(data: AppData): void {
  const cloned = cloneData(data)
  storageSet(STORAGE_KEYS.DEMO_APP_DATA, JSON.stringify({ ...cloned, _version: SEED_VERSION }))
  if (isDemoDataSession()) {
    appDataCache = cloned
  }
  notifyDemoAppDataChanged()
}

/** Persiste demo data e aguarda IndexedDB (para sincronizar outras abas). */
export async function saveDemoAppDataAndWait(data: AppData): Promise<void> {
  const cloned = cloneData(data)
  await storageSetAndWait(
    STORAGE_KEYS.DEMO_APP_DATA,
    JSON.stringify({ ...cloned, _version: SEED_VERSION }),
  )
  if (isDemoDataSession()) {
    appDataCache = cloned
  }
  notifyDemoAppDataChanged()
}

/** Lê snapshot de demonstração no IndexedDB (sem exigir sessão demo ativa). */
export function peekDemoAppData(): AppData | null {
  const stored = storageGet(STORAGE_KEYS.DEMO_APP_DATA)
  if (!stored) return null

  try {
    const parsed = JSON.parse(stored) as AppData & { _version?: string }
    const { _version: _, ...raw } = parsed
    const { data } = normalizeAppData(raw as AppData)
    return cloneData(data)
  } catch {
    return null
  }
}

/**
 * Remove todas as timelines (pedidos e vínculos) do armazenamento de demonstração.
 * Usado ao sair do modo demonstração — deixa a aba Demonstração zerada.
 */
export async function clearDemoTimelines(): Promise<void> {
  const data = peekDemoAppData()
  if (!data) {
    notifyDemoAppDataChanged()
    return
  }

  if (data.pedidos.length > 0) {
    const ids = new Set(data.pedidos.map((pedido) => pedido.id))
    removePedidosFromAppData(data, ids)
  }

  await saveDemoAppDataAndWait(data)
}

/**
 * Apaga por completo o armazenamento local de demonstração (IndexedDB).
 * A aba Timeline → Demonstração fica vazia até a próxima sessão demo.
 */
export async function wipeDemoAppDataStore(): Promise<void> {
  await storageRemoveAndWait(STORAGE_KEYS.DEMO_APP_DATA)
  if (isDemoDataSession()) {
    appDataCache = null
  }
  notifyDemoAppDataChanged()
}

export function saveAppData(data: AppData): void {
  appDataCache = cloneData(data)
  persistAppData(appDataCache)
}

function mergeAnexoLists(
  localList: ArquivoAnexo[] | undefined,
  remoteList: ArquivoAnexo[] | undefined,
): ArquivoAnexo[] {
  const byId = new Map<string, ArquivoAnexo>()
  for (const arquivo of [...(remoteList ?? []), ...(localList ?? [])]) {
    const prev = byId.get(arquivo.id)
    if (!prev) {
      byId.set(arquivo.id, { ...arquivo })
      continue
    }
    const prevScore = (prev.storagePath ? 2 : 0) + (prev.conteudoBase64 ? 1 : 0)
    const nextScore = (arquivo.storagePath ? 2 : 0) + (arquivo.conteudoBase64 ? 1 : 0)
    byId.set(arquivo.id, nextScore >= prevScore ? { ...arquivo } : prev)
  }
  return [...byId.values()]
}

function mergeById<T extends { id: string }>(remoteList: T[], localList: T[]): T[] {
  const byId = new Map<string, T>()
  for (const item of remoteList) byId.set(item.id, item)
  for (const item of localList) {
    if (!byId.has(item.id)) byId.set(item.id, item)
  }
  return [...byId.values()]
}

/** Mantém pedidos locais recém-criados e evita regressão de histórico por sync atrasado. */
function mergePedidosPreservingLocal(
  remoteList: Pedido[],
  localList: Pedido[],
  excludedIds?: Iterable<string>,
): Pedido[] {
  const excluded = new Set(excludedIds ?? [])
  const byId = new Map<string, Pedido>()
  for (const item of remoteList) {
    if (excluded.has(item.id)) continue
    byId.set(item.id, item)
  }
  for (const item of localList) {
    if (excluded.has(item.id)) {
      byId.delete(item.id)
      continue
    }
    const existing = byId.get(item.id)
    if (!existing) {
      byId.set(item.id, item)
      continue
    }
    const score = (pedido: Pedido) => {
      const hist = pedido.etapasHistorico ?? []
      const concluidas = hist.filter((h) => h.dataConclusao).length
      const abertas = hist.filter((h) => !h.dataConclusao).length
      // Preferir mais conclusões (avanço real) e mais etapas ativas (fork Auditoria→IMH+Confecção).
      return concluidas * 100 + (pedido.etapasAtivasIds?.length ?? 0) * 10 + abertas + hist.length
    }
    if (score(item) >= score(existing)) {
      byId.set(item.id, item)
    }
  }
  return [...byId.values()]
}

function pickNewerIso(a?: string, b?: string): string | undefined {
  if (!a) return b
  if (!b) return a
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b
}

/** Mantém flags de receber/enviar locais que o remoto atrasado ainda não tem. */
function mergePlanilhaEnvioSnapshots(
  localSnap: PedidoPlanilhaEnvioState | undefined,
  remoteSnap: PedidoPlanilhaEnvioState | undefined,
): PedidoPlanilhaEnvioState | undefined {
  if (!localSnap && !remoteSnap) return undefined
  if (!localSnap) return remoteSnap ? { ...remoteSnap } : undefined
  if (!remoteSnap) return { ...localSnap }

  const localLinhas = localSnap.linhas?.length ?? 0
  const remoteLinhas = remoteSnap.linhas?.length ?? 0
  const base = remoteLinhas >= localLinhas ? remoteSnap : localSnap
  const other = base === remoteSnap ? localSnap : remoteSnap

  return {
    ...other,
    ...base,
    cabecalho: base.cabecalho ?? other.cabecalho,
    linhas: (base.linhas?.length ? base.linhas : other.linhas) ?? [],
    controleSolempLinhas: base.controleSolempLinhas?.length
      ? base.controleSolempLinhas
      : other.controleSolempLinhas,
    imhAbaLinhas: base.imhAbaLinhas?.length ? base.imhAbaLinhas : other.imhAbaLinhas,
    imhMedicamentoLinhas: base.imhMedicamentoLinhas?.length
      ? base.imhMedicamentoLinhas
      : other.imhMedicamentoLinhas,
    divMaterialLinhas: base.divMaterialLinhas?.length
      ? base.divMaterialLinhas
      : other.divMaterialLinhas,
    enviadoEm:
      pickNewerIso(localSnap.enviadoEm, remoteSnap.enviadoEm) ??
      localSnap.enviadoEm ??
      remoteSnap.enviadoEm ??
      new Date().toISOString(),
    recebidaEm: pickNewerIso(localSnap.recebidaEm, remoteSnap.recebidaEm),
    encaminhadaImhEm: pickNewerIso(localSnap.encaminhadaImhEm, remoteSnap.encaminhadaImhEm),
    recebidaImhEm: pickNewerIso(localSnap.recebidaImhEm, remoteSnap.recebidaImhEm),
    recebidaConfeccaoEm: pickNewerIso(
      localSnap.recebidaConfeccaoEm,
      remoteSnap.recebidaConfeccaoEm,
    ),
    recebidaRascunhoEm: pickNewerIso(
      localSnap.recebidaRascunhoEm,
      remoteSnap.recebidaRascunhoEm,
    ),
    recebidaEmpenhadoEm: pickNewerIso(
      localSnap.recebidaEmpenhadoEm,
      remoteSnap.recebidaEmpenhadoEm,
    ),
    arquivadaEm: pickNewerIso(localSnap.arquivadaEm, remoteSnap.arquivadaEm),
    // Se o local reenviou depois da devolução remota, não ressuscita a devolução.
    ...((): Pick<PedidoPlanilhaEnvioState, 'devolvidaEm' | 'devolvidaParaChave'> => {
      const localEnvio = localSnap.enviadoEm ? Date.parse(localSnap.enviadoEm) : 0
      const remoteDev = remoteSnap.devolvidaEm ? Date.parse(remoteSnap.devolvidaEm) : 0
      const localClearedDevolucao =
        !localSnap.devolvidaEm &&
        !localSnap.devolvidaParaChave &&
        localEnvio > 0 &&
        localEnvio >= remoteDev
      if (localClearedDevolucao) {
        return { devolvidaEm: undefined, devolvidaParaChave: undefined }
      }
      return {
        devolvidaEm: pickNewerIso(localSnap.devolvidaEm, remoteSnap.devolvidaEm),
        devolvidaParaChave: localSnap.devolvidaParaChave ?? remoteSnap.devolvidaParaChave,
      }
    })(),
  }
}

/** Preserva anexos e cadastros locais que um snapshot remoto antigo ainda não contém. */
function mergeRemotePreservingAnexos(local: AppData | null, remote: AppData): AppData {
  if (!local) return remote

  // Cadastros / pedidos acabaram de ser criados localmente: um poll/realtime
  // atrasado não deve apagá-los antes do flush refletir na nuvem.
  remote.usuarios = mergeById(remote.usuarios ?? [], local.usuarios ?? [])
  remote.clinicas = mergeById(remote.clinicas ?? [], local.clinicas ?? [])
  remote.empresas = mergeById(remote.empresas ?? [], local.empresas ?? [])
  remote.materiais = mergeById(remote.materiais ?? [], local.materiais ?? [])

  const excludedIds = [
    ...new Set([...(remote.pedidosExcluidosIds ?? []), ...(local.pedidosExcluidosIds ?? [])]),
  ]
  remote.pedidosExcluidosIds = excludedIds
  remote.pedidos = mergePedidosPreservingLocal(
    remote.pedidos ?? [],
    local.pedidos ?? [],
    excludedIds,
  )
  const alivePedidoIds = new Set(remote.pedidos.map((p) => p.id))

  remote.historico = mergeById(remote.historico ?? [], local.historico ?? []).filter(
    (item) => alivePedidoIds.has(item.pedidoId),
  )
  remote.solemp = mergeById(remote.solemp ?? [], local.solemp ?? []).filter((item) =>
    alivePedidoIds.has(item.pedidoId),
  )
  remote.notasFiscais = mergeById(remote.notasFiscais ?? [], local.notasFiscais ?? []).filter(
    (item) => alivePedidoIds.has(item.pedidoId),
  )
  remote.processosArquivados = mergeById(
    remote.processosArquivados ?? [],
    local.processosArquivados ?? [],
  ).filter((item) => alivePedidoIds.has(item.pedidoId))
  if (local.notificacoes?.length || remote.notificacoes?.length) {
    remote.notificacoes = mergeById(remote.notificacoes ?? [], local.notificacoes ?? []).filter(
      (item) => !item.pedidoId || alivePedidoIds.has(item.pedidoId),
    )
  }

  const localIndex = local.planilhaAnexosPorPedido ?? {}
  const remoteIndex = { ...(remote.planilhaAnexosPorPedido ?? {}) }
  const pedidoIds = new Set([
    ...Object.keys(localIndex),
    ...Object.keys(remoteIndex),
    ...Object.keys(local.pedidoPlanilhaEnvio ?? {}),
    ...Object.keys(remote.pedidoPlanilhaEnvio ?? {}),
  ])

  if (!remote.pedidoPlanilhaEnvio) remote.pedidoPlanilhaEnvio = {}

  for (const pedidoId of pedidoIds) {
    // Timeline excluída: não ressuscita planilha (Pessoas/Procedimentos).
    if (!alivePedidoIds.has(pedidoId) || excludedIds.includes(pedidoId)) {
      delete remote.pedidoPlanilhaEnvio[pedidoId]
      delete remoteIndex[pedidoId]
      continue
    }

    const localSnap = local.pedidoPlanilhaEnvio?.[pedidoId]
    const remoteSnap = remote.pedidoPlanilhaEnvio[pedidoId]
    const mergedAnexos = mergeAnexoLists(
      [
        ...(localIndex[pedidoId] ?? []),
        ...(localSnap?.anexos ?? []),
      ],
      [
        ...(remoteIndex[pedidoId] ?? []),
        ...(remoteSnap?.anexos ?? []),
      ],
    )

    const mergedSnap = mergePlanilhaEnvioSnapshots(localSnap, remoteSnap)
    if (mergedSnap) {
      remote.pedidoPlanilhaEnvio[pedidoId] = {
        ...mergedSnap,
        anexos:
          mergedAnexos.length > 0
            ? mergedAnexos.map((arquivo) => ({ ...arquivo }))
            : mergedSnap.anexos,
      }
    }

    if (mergedAnexos.length > 0) {
      remoteIndex[pedidoId] = mergedAnexos.map((arquivo) => ({ ...arquivo }))
    }
  }

  remote.planilhaAnexosPorPedido = remoteIndex

  const arquivosById = new Map<string, ArquivoAnexo>()
  for (const arquivo of [...(remote.arquivos ?? []), ...(local.arquivos ?? [])]) {
    if (!arquivo.pedidoId || !alivePedidoIds.has(arquivo.pedidoId)) continue
    arquivosById.set(arquivo.id, { ...arquivo })
  }
  remote.arquivos = [...arquivosById.values()]

  purgeOrphanPedidoSideData(remote)

  return remote
}

/** Aplica dados vindos do Supabase no cache em memória */
export function applyRemoteAppData(raw: AppData): AppData {
  // Com seed fictício ativo, ignora realtime/hidratação remota para não misturar dados.
  if (storageGet(STORAGE_KEYS.FICTIONAL_ACTIVE) === '1' && appDataCache) {
    return cloneData(appDataCache)
  }

  const mergedRaw = mergeRemotePreservingAnexos(appDataCache, cloneData(raw))
  const { data, changed } = normalizeAppData(mergedRaw)
  appDataCache = data
  if (usesIndexedDbAppData() && !isDemoDataSession()) {
    persistAppData(data)
  }
  if (changed && import.meta.env.DEV) {
    console.info('[AcompSolemp] AppData normalizado após hidratação Supabase')
  }
  return cloneData(data)
}

export function resetAppData(): AppData {
  if (usesIndexedDbAppData()) {
    storageRemove(getAppDataStorageKey())
  }
  appDataCache = null
  return initAppData()
}

/** Remove dados persistidos e sessões (mantém tema) */
export function clearAllSystemData(): AppData {
  if (useCloudAppDataSync()) {
    storageRemove(STORAGE_KEYS.AUTH_LEGACY)
    storageRemove(STORAGE_KEYS.AUTH_GESTOR)
    storageRemove(STORAGE_KEYS.AUTH_CLINICA)
    storageRemove(STORAGE_KEYS.AUTH_ORDENADOR)
    storageRemove(STORAGE_KEYS.AUTH_FINANCEIRO)
    storageRemove(STORAGE_KEYS.AUTH_OPEN_ACCESS)
  } else {
    Object.values(STORAGE_KEYS).forEach((key) => storageRemove(key))
  }
  appDataCache = null
  return initAppData()
}

/** Recarrega da fonte ativa — Supabase em nuvem, IndexedDB em local/demo */
export async function reloadFreshAppData(): Promise<AppData> {
  if (useCloudAppDataSync()) {
    const { refreshAppDataFromCloud, shouldPreferLocalAppData } = await import(
      '@/data/persistence/supabaseSync'
    )
    // Em janela de mutação/flush local, não puxa remoto (evita apagar pedido/flags).
    if (shouldPreferLocalAppData()) {
      return loadAppData()
    }
    const remote = await refreshAppDataFromCloud()
    if (remote) return applyRemoteAppData(remote)
    return loadAppData()
  }
  return reloadAppDataFromStorage()
}

/** Carrega AppData atualizado antes de listagens compartilhadas entre portais/abas */
export async function loadFreshAppData(): Promise<AppData> {
  // Com seed fictício ativo, mantém o snapshot em memória (não volta ao remoto/IDB real).
  if (storageGet(STORAGE_KEYS.FICTIONAL_ACTIVE) === '1' && appDataCache) {
    return cloneData(appDataCache)
  }

  if (useCloudAppDataSync()) {
    // Preferência: cache em memória já hidratado — evita refetch na nuvem a cada listagem,
    // que deixava a UI do gestor "piscando" enquanto esperava a rede.
    if (appDataCache) return cloneData(appDataCache)
    return reloadFreshAppData()
  }
  return reloadAppDataFromStorage()
}

/**
 * Sempre busca a versão mais recente (nuvem ou IndexedDB).
 * Usar em polling de chat/badge — `loadFreshAppData` pode devolver cache obsoleto.
 */
export async function loadLatestAppData(): Promise<AppData> {
  if (storageGet(STORAGE_KEYS.FICTIONAL_ACTIVE) === '1' && appDataCache) {
    return cloneData(appDataCache)
  }

  if (useCloudAppDataSync()) {
    return reloadFreshAppData()
  }

  await storageReloadKey(getAppDataStorageKey())
  return reloadAppDataFromStorage()
}

/**
 * Aplica AppData no cache (e no IndexedDB local). Não sincroniza com Supabase
 * enquanto o seed fictício estiver ativo.
 */
export function replaceAppDataCache(data: AppData): void {
  appDataCache = cloneData(data)
  persistAppData(appDataCache, { silent: true })
}

/** Reaplica o snapshot fictício após boot (ex.: reload da página). */
export function tryRestoreFictionalSnapshotIntoCache(): boolean {
  if (storageGet(STORAGE_KEYS.FICTIONAL_ACTIVE) !== '1') return false
  const raw = storageGet(STORAGE_KEYS.FICTIONAL_SNAPSHOT)
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw) as AppData
    const { data } = normalizeAppData(parsed)
    appDataCache = data
    return true
  } catch {
    return false
  }
}

export function delay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    ADMINISTRADOR: 'Administrador',
    GESTOR: 'Gestor',
    CLINICA: 'Clínica',
    MEDICAMENTO: 'Medicamento',
    EMPENHADO: 'Empenhado',
    ASSINANTE: 'Ordenador de Despesa',
    FINANCEIRO: 'Solemp em Rascunho',
    AUDITORIA: 'Auditoria',
    CONTABILIDADE_IMH: 'IMH',
    CONFECCAO_SOLEMP: 'Confecção de Solemp',
    ASSINATURA_1_SOLEMP: 'Assinatura 1 Solemp',
    ASSINATURA_2_SOLEMP: 'Assinatura 2 Solemp',
    SDA: 'SDA',
    CONSULTA: 'Consulta',
  }
  return labels[role]
}
