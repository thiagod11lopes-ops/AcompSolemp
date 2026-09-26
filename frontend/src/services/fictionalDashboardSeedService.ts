import type {
  AppData,
  ImhMedicamentoLinha,
  Pedido,
  PedidoEtapaHistorico,
  PedidoPlanilhaEnvioState,
  Solemp,
  WorkflowEtapa,
} from '@/types'
import { useCloudAppDataSync } from '@/config/dataSource'
import {
  loadAppData,
  replaceAppDataCache,
  wipeDemoAppDataStore,
} from '@/mocks/seed'
import { STORAGE_KEYS, storageGet, storageRemove, storageSet } from '@/storage/indexedDb'
import { formatValorBrasileiro } from '@/utils/consumoMaterialOds'
import { EMPTY_CABECALHO } from '@/utils/fictionalSeedCabecalho'
import {
  DEMO_CLINICA_EXEMPLO_ID,
  DEMO_EMPENHADO_EXEMPLO_ID,
  DEMO_MEDICAMENTO_EXEMPLO_ID,
  isDemoExampleUser,
} from '@/services/demoCadastrosService'

const TARGET_CONCLUIDOS = 520
const TARGET_EMPENHO = 5_000_000
const TARGET_INDENIZADO = 250_000
const ANDAMENTO_MIN = 80
const ANDAMENTO_MAX = 160

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)]
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function brDateFromIso(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function etapasOrdenadas(etapas: WorkflowEtapa[]): WorkflowEtapa[] {
  return [...etapas].filter((e) => e.ativo).sort((a, b) => a.ordem - b.ordem)
}

function buildHistorico(
  etapas: WorkflowEtapa[],
  usuarioNome: string,
  usuarioId: string,
  startDaysAgo: number,
  /** Quantas etapas concluir (0 = nenhuma). */
  concluirAteIndexInclusive: number,
): PedidoEtapaHistorico[] {
  const hist: PedidoEtapaHistorico[] = []
  let cursor = startDaysAgo
  for (let i = 0; i < etapas.length; i++) {
    const etapa = etapas[i]
    const inicio = isoDaysAgo(cursor)
    const concluir = i <= concluirAteIndexInclusive
    const diasEtapa = Math.max(1, etapa.prazoDias || 2)
    cursor = Math.max(0, cursor - diasEtapa)
    const fim = concluir ? isoDaysAgo(cursor) : null
    hist.push({
      etapaId: etapa.id,
      etapaNome: etapa.nome,
      responsavelId: usuarioId,
      responsavelNome: usuarioNome,
      dataInicio: inicio,
      dataConclusao: fim,
      observacao: concluir ? 'Seed fictício' : '',
      arquivos: [],
    })
    if (!concluir) break
  }
  return hist
}

function emptyImhMedLinha(
  id: string,
  dataBr: string,
  valorIndenizar: number,
): ImhMedicamentoLinha {
  const total = Math.max(valorIndenizar, valorIndenizar * 1.1)
  return {
    id,
    data: dataBr,
    nip: String(10000000 + randInt(0, 89999999)),
    nome: `Paciente fictício ${id.slice(-4)}`,
    itemPme: 'Item PME fictício',
    lote: `L${randInt(1000, 9999)}`,
    validade: '31/12/2027',
    qtd: '1',
    valorUnitario: formatValorBrasileiro(total),
    total: formatValorBrasileiro(total),
    nipTitular: '',
    postoGrad: '1SG',
    vinculo: 'TITULAR',
    pctIndenizar: '100',
    valorIndenizar: formatValorBrasileiro(valorIndenizar),
    om: 'HNMD',
    unidadeFornecimento: 'UN',
    quantidadeAdquirida: '1',
    qtdFornecidaOse: '1',
    maneiraFornecimento: 'PELA OMH',
  }
}

function ensureCadastrosBase(data: AppData): void {
  if (data.clinicas.length === 0) {
    data.clinicas.push({
      id: 'fic-clinica-1',
      nome: 'Clínica Fictícia Ortopedia',
      responsavel: 'Responsável Fictício',
      telefone: '(21) 0000-0000',
      tipo: 'clinica',
    })
  }
  if (data.empresas.length === 0) {
    data.empresas.push({
      id: 'fic-empresa-1',
      razaoSocial: 'Empresa Fictícia LTDA',
      nomeFantasia: 'Empresa Fictícia',
      cnpj: '00.000.000/0001-00',
      contato: 'Contato',
      telefone: '(21) 0000-0000',
      email: 'empresa@example.com',
    })
  }
  if (data.materiais.length === 0) {
    data.materiais.push({
      id: 'fic-material-1',
      descricao: 'Material fictício OPME',
      fabricante: 'Fabricante Fictício',
      unidade: 'UN',
    })
  }
}

function distributeExact(total: number, parts: number): number[] {
  if (parts <= 0) return []
  const base = Math.floor((total * 100) / parts) / 100
  const values = Array.from({ length: parts }, () => base)
  const sum = values.reduce((a, b) => a + b, 0)
  values[values.length - 1] = Math.round((total - (sum - values[values.length - 1])) * 100) / 100
  return values
}

/** Gera AppData fictício a partir do estado atual (cadastros/etapas preservados). */
export function buildFictionalDashboardAppData(base: AppData): AppData {
  const data: AppData = structuredClone(base)
  ensureCadastrosBase(data)

  const etapas = etapasOrdenadas(data.workflowEtapas)
  if (etapas.length === 0) {
    throw new Error('Não há etapas de workflow para gerar dados fictícios.')
  }
  const empenhadoIdx = etapas.findIndex((e) => e.chave === 'DIV_MAT_EMPENHADO')
  const lastIdx = empenhadoIdx >= 0 ? empenhadoIdx : etapas.length - 1
  const etapaFinal = etapas[lastIdx]

  const usuario =
    data.usuarios.find((u) => u.perfil === 'GESTOR') ??
    data.usuarios[0] ?? {
      id: 'fic-user',
      nome: 'Gestor Fictício',
      posto: 'CF',
      graduacao: 'CF',
      login: 'gestor-ficticio',
      perfil: 'GESTOR' as const,
      email: 'ficticio@marinha.mil.br',
      clinicaId: null,
      ativo: true,
    }

  const empenhoValores = distributeExact(TARGET_EMPENHO, TARGET_CONCLUIDOS)
  const indenizadoValores = distributeExact(TARGET_INDENIZADO, TARGET_CONCLUIDOS)

  const novosPedidos: Pedido[] = []
  const novasSolemps: Solemp[] = []
  const planilhaEnvio: Record<string, PedidoPlanilhaEnvioState> = {
    ...(data.pedidoPlanilhaEnvio ?? {}),
  }

  for (let i = 0; i < TARGET_CONCLUIDOS; i++) {
    const id = `fic-ped-c-${String(i + 1).padStart(4, '0')}`
    const clinica = pick(data.clinicas)
    const empresa = pick(data.empresas)
    const material = pick(data.materiais)
    const startAgo = randInt(40, 320)
    const historico = buildHistorico(etapas, usuario.nome, usuario.id, startAgo, lastIdx)
    const valorEmpenho = empenhoValores[i]
    const valorInd = indenizadoValores[i]
    const dataSolic = historico[0]?.dataInicio ?? isoDaysAgo(startAgo)

    novosPedidos.push({
      id,
      numero: `PED-FIC-${20260000 + i}`,
      clinicaId: clinica.id,
      empresaId: empresa.id,
      materialId: material.id,
      quantidade: randInt(1, 8),
      valor: valorEmpenho,
      observacoes: 'Pedido fictício (demonstração do dashboard)',
      paciente: null,
      dadosClinica: null,
      dataSolicitacao: dataSolic,
      dataEntrega: historico[historico.length - 1]?.dataConclusao ?? null,
      etapaAtualId: etapaFinal.id,
      etapasAtivasIds: [etapaFinal.id],
      responsavelAtualId: usuario.id,
      concluido: true,
      etapasHistorico: historico,
    })

    novasSolemps.push({
      id: `fic-solemp-${i + 1}`,
      numero: `SL-FIC-${100000 + i}`,
      pedidoId: id,
      data: historico[historico.length - 1]?.dataConclusao ?? dataSolic,
      assinada: true,
      arquivoPDF: null,
      valor: valorEmpenho,
    })

    const dataBr = brDateFromIso(dataSolic)
    planilhaEnvio[id] = {
      formato: 'imhMedicamento',
      cabecalho: { ...EMPTY_CABECALHO, data: dataBr },
      linhas: [],
      imhMedicamentoLinhas: [emptyImhMedLinha(`fic-imh-${i + 1}`, dataBr, valorInd)],
      enviadoEm: dataSolic,
      arquivadaEm: historico.find(
        (h) => h.etapaNome.includes('IMH') || h.etapaNome.includes('Contabilidade'),
      )?.dataConclusao
        ?? historico[Math.min(2, historico.length - 1)]?.dataConclusao
        ?? dataSolic,
    }
  }

  const nAndamento = randInt(ANDAMENTO_MIN, ANDAMENTO_MAX)
  for (let i = 0; i < nAndamento; i++) {
    const id = `fic-ped-a-${String(i + 1).padStart(4, '0')}`
    const clinica = pick(data.clinicas)
    const empresa = pick(data.empresas)
    const material = pick(data.materiais)
    const maxOpen = Math.max(0, lastIdx - 1)
    const openAt = randInt(0, maxOpen)
    const startAgo = randInt(3, 45)
    const historico = buildHistorico(etapas, usuario.nome, usuario.id, startAgo, openAt - 1)
    // etapa aberta
    if (historico.length === 0 || historico.every((h) => h.dataConclusao)) {
      const etapa = etapas[openAt]
      historico.push({
        etapaId: etapa.id,
        etapaNome: etapa.nome,
        responsavelId: usuario.id,
        responsavelNome: usuario.nome,
        dataInicio: isoDaysAgo(randInt(1, 12)),
        dataConclusao: null,
        observacao: '',
        arquivos: [],
      })
    }
    const etapaAtual = etapas[openAt]
    const valor = randInt(8_000, 95_000)

    novosPedidos.push({
      id,
      numero: `PED-FIC-A-${30000 + i}`,
      clinicaId: clinica.id,
      empresaId: empresa.id,
      materialId: material.id,
      quantidade: randInt(1, 5),
      valor,
      observacoes: 'Pedido fictício em andamento',
      paciente: null,
      dadosClinica: null,
      dataSolicitacao: historico[0]?.dataInicio ?? isoDaysAgo(startAgo),
      dataEntrega: null,
      etapaAtualId: etapaAtual.id,
      etapasAtivasIds: [etapaAtual.id],
      responsavelAtualId: usuario.id,
      concluido: false,
      etapasHistorico: historico,
      aguardandoEmpenho:
        etapaAtual.chave === 'DIV_MAT_FINANCAS' ? Math.random() > 0.55 : false,
      aguardandoEmpenhoEm:
        etapaAtual.chave === 'DIV_MAT_FINANCAS' && Math.random() > 0.55
          ? isoDaysAgo(randInt(0, 5))
          : undefined,
    })

    if (Math.random() > 0.4) {
      novasSolemps.push({
        id: `fic-solemp-a-${i + 1}`,
        numero: `SL-FIC-A-${200000 + i}`,
        pedidoId: id,
        data: isoDaysAgo(randInt(0, 20)),
        assinada: Math.random() > 0.5,
        arquivoPDF: null,
        valor,
      })
    }
  }

  // Remove pedidos fictícios anteriores (se houver) e mantém os reais do backup base.
  data.pedidos = [
    ...data.pedidos.filter((p) => !p.id.startsWith('fic-ped-')),
    ...novosPedidos,
  ]
  data.solemp = [
    ...data.solemp.filter((s) => !s.id.startsWith('fic-solemp-')),
    ...novasSolemps,
  ]
  data.pedidoPlanilhaEnvio = planilhaEnvio
  data.notificacoes = [
    ...data.notificacoes.filter((n) => !n.id.startsWith('fic-notif-')),
    {
      id: 'fic-notif-dashboard',
      tipo: 'ETAPA_PENDENTE',
      titulo: 'Dados fictícios ativos',
      mensagem: `Dashboard preenchido com ${TARGET_CONCLUIDOS} concluídos, R$ 5 mi empenhados e R$ 250 mil indenizados (seed local).`,
      pedidoId: null,
      reversaoId: null,
      perfilDestino: 'GESTOR',
      etapaChave: null,
      lida: false,
      data: new Date().toISOString(),
    },
  ]

  return data
}

export function isFictionalDashboardSeedActive(): boolean {
  return storageGet(STORAGE_KEYS.FICTIONAL_ACTIVE) === '1'
}

const DEMO_ENTIDADE_IDS = new Set([
  DEMO_CLINICA_EXEMPLO_ID,
  DEMO_MEDICAMENTO_EXEMPLO_ID,
  DEMO_EMPENHADO_EXEMPLO_ID,
])

/** Remove artefatos do seed fictício / demo que possam ter vazado para os dados reais. */
export function stripFictionalSeedArtifacts(data: AppData): AppData {
  const next: AppData = structuredClone(data)

  next.clinicas = next.clinicas.filter(
    (c) => !c.id.startsWith('fic-') && !DEMO_ENTIDADE_IDS.has(c.id),
  )
  next.empresas = next.empresas.filter((e) => !e.id.startsWith('fic-'))
  next.materiais = next.materiais.filter((m) => !m.id.startsWith('fic-'))
  next.usuarios = next.usuarios.filter(
    (u) => !u.id.startsWith('fic-') && !isDemoExampleUser(u),
  )
  next.pedidos = next.pedidos.filter((p) => !p.id.startsWith('fic-ped-'))
  next.solemp = next.solemp.filter((s) => !s.id.startsWith('fic-solemp-'))
  next.notificacoes = next.notificacoes.filter((n) => !n.id.startsWith('fic-notif-'))

  if (next.pedidoPlanilhaEnvio) {
    for (const key of Object.keys(next.pedidoPlanilhaEnvio)) {
      if (key.startsWith('fic-ped-')) delete next.pedidoPlanilhaEnvio[key]
    }
  }

  if (next.consumoPlanilha) {
    for (const key of [...DEMO_ENTIDADE_IDS]) {
      delete next.consumoPlanilha[key]
    }
  }

  if (next.planilhasLivres) {
    for (const key of [...DEMO_ENTIDADE_IDS]) {
      delete next.planilhasLivres[key]
    }
  }

  return next
}

export function activateFictionalDashboardSeed(): void {
  if (isFictionalDashboardSeedActive()) return

  const real = stripFictionalSeedArtifacts(loadAppData())
  storageSet(STORAGE_KEYS.FICTIONAL_BACKUP, JSON.stringify(real))

  const fictional = buildFictionalDashboardAppData(real)
  storageSet(STORAGE_KEYS.FICTIONAL_SNAPSHOT, JSON.stringify(fictional))
  storageSet(STORAGE_KEYS.FICTIONAL_ACTIVE, '1')
  replaceAppDataCache(fictional)
}

export async function deactivateFictionalDashboardSeed(): Promise<void> {
  const { invalidateSupabaseAppDataSyncGeneration, flushSupabaseAppDataSync } = await import(
    '@/data/persistence/supabaseSync'
  )

  // Cancela uploads pendentes/em voo do snapshot fictício antes de restaurar.
  invalidateSupabaseAppDataSyncGeneration()

  if (!isFictionalDashboardSeedActive()) {
    // Mesmo sem flag, remove resíduos e limpa a aba Demonstração.
    const cleaned = stripFictionalSeedArtifacts(loadAppData())
    replaceAppDataCache(cleaned)
    if (useCloudAppDataSync()) {
      await flushSupabaseAppDataSync()
    }
    await wipeDemoAppDataStore()
    return
  }

  const raw = storageGet(STORAGE_KEYS.FICTIONAL_BACKUP)
  storageRemove(STORAGE_KEYS.FICTIONAL_ACTIVE)
  storageRemove(STORAGE_KEYS.FICTIONAL_SNAPSHOT)
  storageRemove(STORAGE_KEYS.FICTIONAL_BACKUP)

  let restored: AppData
  if (raw) {
    try {
      restored = JSON.parse(raw) as AppData
    } catch {
      restored = loadAppData()
    }
  } else {
    restored = loadAppData()
  }

  replaceAppDataCache(stripFictionalSeedArtifacts(restored))

  // Garante que a nuvem volte ao snapshot real (sobrescreve flush fictício antigo).
  if (useCloudAppDataSync()) {
    await flushSupabaseAppDataSync()
  }

  // Dados fictícios do dashboard ≠ aba Demonstração — limpa as duas.
  await wipeDemoAppDataStore()
}

export async function toggleFictionalDashboardSeed(): Promise<boolean> {
  if (isFictionalDashboardSeedActive()) {
    await deactivateFictionalDashboardSeed()
    return false
  }
  activateFictionalDashboardSeed()
  return true
}
