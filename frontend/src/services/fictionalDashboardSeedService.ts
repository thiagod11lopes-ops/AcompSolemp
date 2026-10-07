import type {
  AppData,
  Clinica,
  ImhMedicamentoLinha,
  ListaMedicamentoMovimentacao,
  ListaMedicamentosLinha,
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
  saveDemoAppDataAndWait,
  wipeDemoAppDataStore,
} from '@/mocks/seed'
import { STORAGE_KEYS, storageGet, storageRemove, storageSet } from '@/storage/indexedDb'
import { formatValorBrasileiro, parseValorBrasileiro } from '@/utils/consumoMaterialOds'
import { createLinhaVazia } from '@/utils/consumoMaterialTemplate'
import { EMPTY_CABECALHO } from '@/utils/fictionalSeedCabecalho'
import { demoInstitutionalEmail } from '@/utils/email'
import {
  DEMO_CLINICA_EXEMPLO_ID,
  DEMO_EMPENHADO_EXEMPLO_ID,
  DEMO_MEDICAMENTO_EXEMPLO_ID,
  isDemoExampleUser,
  seedDemoExampleCadastros,
} from '@/services/demoCadastrosService'

const TARGET_CONCLUIDOS = 520
const TARGET_EMPENHO = 5_000_000
/** Total indenizado (OPME clínicas + PME medicamento). */
const TARGET_INDENIZADO = 250_000
/** Fatia PME — valores das tabelas medicamento enviadas ao IMH. */
const TARGET_INDENIZADO_PME = 100_000
const TARGET_INDENIZADO_OPME = TARGET_INDENIZADO - TARGET_INDENIZADO_PME
const PME_CONCLUIDOS_SHARE = 0.4
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
  if (!data.clinicas.some((c) => c.tipo !== 'medicamento' && c.tipo !== 'empenhado')) {
    data.clinicas.push({
      id: 'fic-clinica-1',
      nome: 'Clínica Fictícia Ortopedia',
      responsavel: 'Responsável Fictício',
      telefone: '(21) 0000-0000',
      tipo: 'clinica',
    })
  }
  if (!data.clinicas.some((c) => c.tipo === 'medicamento')) {
    data.clinicas.push({
      id: 'fic-medicamento-1',
      nome: 'Medicamento Fictício PME',
      responsavel: 'Farmácia Fictícia',
      telefone: '(21) 0000-0001',
      tipo: 'medicamento',
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

function clinicasOpme(data: AppData): Clinica[] {
  return data.clinicas.filter((c) => c.tipo !== 'medicamento')
}

function clinicasPme(data: AppData): Clinica[] {
  return data.clinicas.filter((c) => c.tipo === 'medicamento')
}

function appendImhMedicamentoLivre(
  data: AppData,
  clinicaId: string,
  linha: ImhMedicamentoLinha,
  finalizada: boolean,
): void {
  if (!data.planilhasLivres) data.planilhasLivres = {}
  const atuais = data.planilhasLivres[clinicaId] ?? {
    abas: [],
    abaAtivaId: null,
  }
  const finalizedImhIds = [...(atuais.imhMedicamento?.finalizedImhIds ?? [])]
  const devolvidosImhIds = [...(atuais.imhMedicamento?.devolvidosImhIds ?? [])]
  const linhas = [...(atuais.imhMedicamento?.linhas ?? []), linha]
  if (finalizada && !finalizedImhIds.includes(linha.id)) {
    finalizedImhIds.push(linha.id)
  }
  atuais.imhMedicamento = { linhas, finalizedImhIds, devolvidosImhIds }
  data.planilhasLivres[clinicaId] = atuais
}

function appendConsumoOpmeRow(
  data: AppData,
  clinicaId: string,
  rowId: string,
  dataBr: string,
  valorIndenizar: number,
): void {
  if (!data.consumoPlanilha) data.consumoPlanilha = {}
  const state = data.consumoPlanilha[clinicaId] ?? {
    finalizedRowIds: [],
    finalizedAuditoriaRowIds: [],
    finalizedMaterialRowIds: [],
    extraRows: [],
  }
  const row = createLinhaVazia(rowId, rowId.replace(/\D/g, '').slice(-4) || '1')
  row.data = dataBr
  row.nip = String(10000000 + randInt(0, 89999999))
  row.nome = `Paciente OPME ${rowId.slice(-4)}`
  row.materiais = 'Material OPME fictício'
  row.valor = formatValorBrasileiro(valorIndenizar)
  row.valorNumerico = valorIndenizar
  row.pctIndenizar = '100'
  row.valorIndenizar = formatValorBrasileiro(valorIndenizar)
  state.extraRows = [...(state.extraRows ?? []), row]
  if (!state.finalizedAuditoriaRowIds?.includes(rowId)) {
    state.finalizedAuditoriaRowIds = [...(state.finalizedAuditoriaRowIds ?? []), rowId]
  }
  data.consumoPlanilha[clinicaId] = state
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
      email: demoInstitutionalEmail('ficticio'),
      clinicaId: null,
      ativo: true,
    }

  const opmeClinicas = clinicasOpme(data)
  const pmeClinicas = clinicasPme(data)
  if (opmeClinicas.length === 0 || pmeClinicas.length === 0) {
    throw new Error('Cadastros OPME/PME insuficientes para gerar dados fictícios.')
  }

  const nPmeConcluidos = Math.max(1, Math.round(TARGET_CONCLUIDOS * PME_CONCLUIDOS_SHARE))
  const nOpmeConcluidos = Math.max(1, TARGET_CONCLUIDOS - nPmeConcluidos)
  const empenhoValores = distributeExact(TARGET_EMPENHO, nOpmeConcluidos + nPmeConcluidos)
  const indenizadoOpmeValores = distributeExact(TARGET_INDENIZADO_OPME, nOpmeConcluidos)
  const indenizadoPmeValores = distributeExact(TARGET_INDENIZADO_PME, nPmeConcluidos)

  const novosPedidos: Pedido[] = []
  const novasSolemps: Solemp[] = []
  const planilhaEnvio: Record<string, PedidoPlanilhaEnvioState> = {
    ...(data.pedidoPlanilhaEnvio ?? {}),
  }

  const arquivadaEmFromHistorico = (
    historico: PedidoEtapaHistorico[],
    dataSolic: string,
  ): string =>
    historico.find(
      (h) => h.etapaNome.includes('IMH') || h.etapaNome.includes('Contabilidade'),
    )?.dataConclusao
    ?? historico[Math.min(2, historico.length - 1)]?.dataConclusao
    ?? dataSolic

  // —— OPME: valores provenientes das clínicas (consumo consignado) ——
  for (let i = 0; i < nOpmeConcluidos; i++) {
    const id = `fic-ped-c-opme-${String(i + 1).padStart(4, '0')}`
    const clinica = pick(opmeClinicas)
    const empresa = pick(data.empresas)
    const material = pick(data.materiais)
    const startAgo = randInt(40, 320)
    const historico = buildHistorico(etapas, usuario.nome, usuario.id, startAgo, lastIdx)
    const valorEmpenho = empenhoValores[i]
    const valorInd = indenizadoOpmeValores[i]
    const dataSolic = historico[0]?.dataInicio ?? isoDaysAgo(startAgo)
    const dataBr = brDateFromIso(dataSolic)
    const rowId = `fic-opme-row-${i + 1}`

    appendConsumoOpmeRow(data, clinica.id, rowId, dataBr, valorInd)

    novosPedidos.push({
      id,
      numero: `PED-FIC-OPME-${20260000 + i}`,
      clinicaId: clinica.id,
      empresaId: empresa.id,
      materialId: material.id,
      quantidade: randInt(1, 8),
      valor: valorEmpenho,
      observacoes: 'Pedido fictício OPME (clínica → IMH)',
      paciente: null,
      dadosClinica: null,
      dataSolicitacao: dataSolic,
      dataEntrega: historico[historico.length - 1]?.dataConclusao ?? null,
      etapaAtualId: etapaFinal.id,
      etapasAtivasIds: [etapaFinal.id],
      responsavelAtualId: usuario.id,
      concluido: true,
      etapasHistorico: historico,
      consumoRowIds: [rowId],
    })

    novasSolemps.push({
      id: `fic-solemp-opme-${i + 1}`,
      numero: `SL-FIC-OPME-${100000 + i}`,
      pedidoId: id,
      data: historico[historico.length - 1]?.dataConclusao ?? dataSolic,
      assinada: true,
      arquivoPDF: null,
      valor: valorEmpenho,
    })

    planilhaEnvio[id] = {
      formato: 'imh',
      cabecalho: { ...EMPTY_CABECALHO, data: dataBr },
      linhas: [],
      enviadoEm: dataSolic,
      arquivadaEm: arquivadaEmFromHistorico(historico, dataSolic),
    }
  }

  // —— PME: valores das tabelas medicamento enviadas ao IMH ——
  for (let i = 0; i < nPmeConcluidos; i++) {
    const id = `fic-ped-c-pme-${String(i + 1).padStart(4, '0')}`
    const clinica = pick(pmeClinicas)
    const empresa = pick(data.empresas)
    const material = pick(data.materiais)
    const startAgo = randInt(40, 320)
    const historico = buildHistorico(etapas, usuario.nome, usuario.id, startAgo, lastIdx)
    const valorEmpenho = empenhoValores[nOpmeConcluidos + i]
    const valorInd = indenizadoPmeValores[i]
    const dataSolic = historico[0]?.dataInicio ?? isoDaysAgo(startAgo)
    const dataBr = brDateFromIso(dataSolic)
    const linha = emptyImhMedLinha(`fic-pme-imh-${i + 1}`, dataBr, valorInd)

    // Tabela livre do medicamento + planilha anexada ao pedido (fluxo IMH).
    appendImhMedicamentoLivre(data, clinica.id, linha, true)

    novosPedidos.push({
      id,
      numero: `PED-FIC-PME-${20261000 + i}`,
      clinicaId: clinica.id,
      empresaId: empresa.id,
      materialId: material.id,
      quantidade: randInt(1, 8),
      valor: valorEmpenho,
      observacoes: 'Pedido fictício PME (medicamento → IMH)',
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
      id: `fic-solemp-pme-${i + 1}`,
      numero: `SL-FIC-PME-${150000 + i}`,
      pedidoId: id,
      data: historico[historico.length - 1]?.dataConclusao ?? dataSolic,
      assinada: true,
      arquivoPDF: null,
      valor: valorEmpenho,
    })

    planilhaEnvio[id] = {
      formato: 'imhMedicamento',
      cabecalho: { ...EMPTY_CABECALHO, data: dataBr },
      linhas: [],
      imhMedicamentoLinhas: [linha],
      enviadoEm: dataSolic,
      arquivadaEm: arquivadaEmFromHistorico(historico, dataSolic),
    }
  }

  const nAndamento = randInt(ANDAMENTO_MIN, ANDAMENTO_MAX)
  for (let i = 0; i < nAndamento; i++) {
    const isPme = i % 3 === 0
    const id = `fic-ped-a-${isPme ? 'pme' : 'opme'}-${String(i + 1).padStart(4, '0')}`
    const clinica = isPme ? pick(pmeClinicas) : pick(opmeClinicas)
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
    const valorInd = randInt(400, 2_500)
    const dataSolic = historico[0]?.dataInicio ?? isoDaysAgo(startAgo)
    const dataBr = brDateFromIso(dataSolic)

    const pedidoBase: Pedido = {
      id,
      numero: `PED-FIC-A-${isPme ? 'PME' : 'OPME'}-${30000 + i}`,
      clinicaId: clinica.id,
      empresaId: empresa.id,
      materialId: material.id,
      quantidade: randInt(1, 5),
      valor,
      observacoes: isPme
        ? 'Pedido fictício PME em andamento'
        : 'Pedido fictício OPME em andamento',
      paciente: null,
      dadosClinica: null,
      dataSolicitacao: dataSolic,
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
    }

    if (isPme) {
      const linha = emptyImhMedLinha(`fic-pme-and-${i + 1}`, dataBr, valorInd)
      appendImhMedicamentoLivre(data, clinica.id, linha, false)
      planilhaEnvio[id] = {
        formato: 'imhMedicamento',
        cabecalho: { ...EMPTY_CABECALHO, data: dataBr },
        linhas: [],
        imhMedicamentoLinhas: [linha],
        enviadoEm: dataSolic,
      }
    } else {
      const rowId = `fic-opme-and-${i + 1}`
      appendConsumoOpmeRow(data, clinica.id, rowId, dataBr, valorInd)
      pedidoBase.consumoRowIds = [rowId]
      planilhaEnvio[id] = {
        formato: 'imh',
        cabecalho: { ...EMPTY_CABECALHO, data: dataBr },
        linhas: [],
        enviadoEm: dataSolic,
      }
    }

    novosPedidos.push(pedidoBase)

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
      mensagem: `Dashboard preenchido com ${TARGET_CONCLUIDOS} concluídos, R$ 5 mi empenhados, R$ ${TARGET_INDENIZADO_OPME / 1000} mil OPME e R$ ${TARGET_INDENIZADO_PME / 1000} mil PME (seed local).`,
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

const ITENS_PME_FIC = [
  'ADALIMUMABE 40 MG',
  'INFLIXIMABE 100 MG',
  'RITUXIMABE 500 MG',
  'ETANERCEPTE 50 MG',
  'TOCILIZUMABE 80 MG',
  'DUPILUMABE 300 MG',
]

/** Espalha lançamentos PME no ano, com a maior parte no mês atual, sem alterar o valor a indenizar. */
function dataPmeFicticia(index: number): string {
  const now = new Date()
  const slot = index % 20
  const monthsAgo = slot < 17 ? 0 : slot - 16
  const cursor = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
  const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const maxDay =
    cursor.getFullYear() === now.getFullYear() && cursor.getMonth() === now.getMonth()
      ? now.getDate()
      : lastDay
  const day = 1 + ((index * 5) % Math.max(maxDay, 1))
  const date = new Date(cursor.getFullYear(), cursor.getMonth(), day)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${date.getFullYear()}`
}

function polishLinhaPmeFicticia(linha: ImhMedicamentoLinha, index: number): void {
  const indenizar = parseValorBrasileiro(linha.valorIndenizar)
  if (indenizar <= 0) return
  const pct = [20, 30, 30, 50, 20, 100][index % 6]
  const total = pct >= 100 ? indenizar : Math.round((indenizar / (pct / 100)) * 100) / 100
  const qtd = 3 + (index % 6)
  linha.itemPme = ITENS_PME_FIC[index % ITENS_PME_FIC.length]
  linha.data = dataPmeFicticia(index)
  linha.qtd = String(qtd)
  linha.valorUnitario = formatValorBrasileiro(total / qtd)
  linha.total = formatValorBrasileiro(total)
  linha.pctIndenizar = String(pct)
  linha.lote = `L${1200 + (index % 36)}`
}

function listaEstoquePmeFicticia(): ListaMedicamentosLinha[] {
  const now = new Date()
  const br = (offset: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() + offset)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}/${mm}/${d.getFullYear()}`
  }
  const movimentos = (index: number): ListaMedicamentoMovimentacao[] => {
    return [6, 14, 22].map((diaOffset, step) => {
      const d = new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - diaOffset))
      const data = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
      const entrada = step % 2 === 0
      return {
        id: `fic-mov-${index}-${step}`,
        tipo: entrada ? 'entrada' : 'saida',
        qtd: entrada ? String(48 + index * 4) : String(30 + index * 3),
        data,
        origemDestino: entrada ? 'Compra PME' : 'Ambulatório',
        responsavel: 'Farmácia',
        createdAt: d.toISOString(),
      }
    })
  }

  return [
    ...ITENS_PME_FIC.map((nome, index) => {
      const status = ['baixo', 'zerado', 'vencido', 'proximo', 'ok', 'ok'][index]
      return {
        id: `fic-lista-pme-${index + 1}`,
        neb: `BR26${String(3000 + index)}`,
        medicamento: nome,
        lote: `L${1200 + index}`,
        validade: status === 'vencido' ? br(-20) : status === 'proximo' ? br(12) : br(200),
        uf: 'FA',
        qtd: status === 'zerado' ? '0' : status === 'baixo' ? '8' : String(60 + index * 10),
        estoqueBaixo: status === 'baixo' ? '24' : '10',
        avisoValidadeDias: '30',
        precoReferencia: formatValorBrasileiro(980 + index * 280),
        movimentacoes: status === 'ok' ? movimentos(index) : [],
      }
    }),
    ...Array.from({ length: 14 }, (_, i) => {
      const kind = i < 3 ? 'baixo' : i < 6 ? 'zerado' : i < 10 ? 'vencido' : 'proximo'
      return {
        id: `fic-lista-extra-${i + 1}`,
        neb: `BR26${String(4000 + i)}`,
        medicamento: `LOTE PME ${kind.toUpperCase()} ${i + 1}`,
        lote: `LX${i + 1}`,
        validade: kind === 'vencido' ? br(-15) : kind === 'proximo' ? br(10) : br(160),
        uf: 'FA',
        qtd: kind === 'zerado' ? '0' : kind === 'baixo' ? '6' : '20',
        estoqueBaixo: kind === 'baixo' ? '18' : '5',
        avisoValidadeDias: '30',
        precoReferencia: formatValorBrasileiro(360 + i * 20),
        movimentacoes: [],
      }
    }),
  ]
}

/** Deixa o dashboard do medicamento legível no modo fictício, sem mudar o total a indenizar. */
export function polishMedicamentoDashboardFicticio(data: AppData): void {
  const linhas: ImhMedicamentoLinha[] = []
  for (const state of Object.values(data.planilhasLivres ?? {})) {
    for (const linha of state.imhMedicamento?.linhas ?? []) {
      if (linha.id.startsWith('fic-pme-')) linhas.push(linha)
    }
  }
  linhas.forEach(polishLinhaPmeFicticia)

  const pacientes = linhas.slice(0, 186).map((linha, index) => ({
    id: `fic-paciente-pme-${index + 1}`,
    nome: linha.nome || `Paciente PME ${index + 1}`,
    nipUsuario: linha.nip,
    nipTitular: linha.nipTitular || linha.nip,
    postoGradTitular: linha.postoGrad || '1SG',
    vinculo: linha.vinculo || 'TITULAR',
  }))

  for (const state of Object.values(data.planilhasLivres ?? {})) {
    if (!state.imhMedicamento?.linhas?.some((linha) => linha.id.startsWith('fic-pme-'))) continue
    state.listaMedicamentos = { linhas: listaEstoquePmeFicticia() }
    state.pacientesPme = pacientes
  }

  let correcoes = 0
  for (const pedido of data.pedidos) {
    if (!pedido.id.startsWith('fic-ped-a-pme-')) continue
    if (correcoes >= 6) break
    pedido.planilhaDevolvidaParaChave = 'SOLICITACAO'
    pedido.planilhaDevolvidaEm = isoDaysAgo(1 + correcoes)
    pedido.planilhaDevolvidaJustificativa = 'Ajuste de lote e quantidade na planilha PME.'
    correcoes += 1
  }
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
    for (const key of Object.keys(next.consumoPlanilha)) {
      if (key.startsWith('fic-') || DEMO_ENTIDADE_IDS.has(key)) {
        delete next.consumoPlanilha[key]
      }
    }
  }

  if (next.planilhasLivres) {
    for (const key of Object.keys(next.planilhasLivres)) {
      if (key.startsWith('fic-') || DEMO_ENTIDADE_IDS.has(key)) {
        delete next.planilhasLivres[key]
      }
    }
  }

  return next
}

/**
 * Espalha pedidos fictícios nas entidades demo preservando a origem:
 * PME continua em medicamento (com tabelas IMH); OPME em clínica/empenhado.
 */
function espelharPedidosNasEntidadesDemo(data: AppData): void {
  const demoMed = data.clinicas.find((c) => c.id === DEMO_MEDICAMENTO_EXEMPLO_ID)
  const demoCli = data.clinicas.find((c) => c.id === DEMO_CLINICA_EXEMPLO_ID)
  const demoEmp = data.clinicas.find((c) => c.id === DEMO_EMPENHADO_EXEMPLO_ID)
  if (!demoMed && !demoCli && !demoEmp) return

  // Consolida tabelas PME (imhMedicamento) no medicamento demo.
  if (demoMed && data.planilhasLivres) {
    for (const [clinicaId, state] of Object.entries(data.planilhasLivres)) {
      if (clinicaId === demoMed.id) continue
      const clinica = data.clinicas.find((c) => c.id === clinicaId)
      if (clinica?.tipo !== 'medicamento') continue
      const form = state.imhMedicamento
      if (!form?.linhas?.length) continue
      for (const linha of form.linhas) {
        appendImhMedicamentoLivre(
          data,
          demoMed.id,
          linha,
          Boolean(form.finalizedImhIds?.includes(linha.id)),
        )
      }
      state.imhMedicamento = { linhas: [], finalizedImhIds: [], devolvidosImhIds: [] }
    }
  }

  data.pedidos.forEach((pedido, index) => {
    if (!pedido.id.startsWith('fic-ped-')) return
    const isPme = pedido.id.includes('-pme-')

    if (isPme) {
      if (demoMed) pedido.clinicaId = demoMed.id
      return
    }

    // OPME: só remapeia clínica quando não há consumoRowIds (evita quebrar vínculo da planilha).
    if (pedido.consumoRowIds?.length) return
    if (index % 3 === 0 && demoCli) pedido.clinicaId = demoCli.id
    else if (index % 3 === 1 && demoEmp) pedido.clinicaId = demoEmp.id
  })
}

export async function activateFictionalDashboardSeed(): Promise<void> {
  if (isFictionalDashboardSeedActive()) return

  const real = stripFictionalSeedArtifacts(loadAppData())
  storageSet(STORAGE_KEYS.FICTIONAL_BACKUP, JSON.stringify(real))

  // Inclui clínicas/usuários dos setores demo no pool antes de gerar pedidos.
  const base = structuredClone(real)
  seedDemoExampleCadastros(base)

  const fictional = buildFictionalDashboardAppData(base)
  seedDemoExampleCadastros(fictional)
  espelharPedidosNasEntidadesDemo(fictional)
  polishMedicamentoDashboardFicticio(fictional)

  storageSet(STORAGE_KEYS.FICTIONAL_SNAPSHOT, JSON.stringify(fictional))
  storageSet(STORAGE_KEYS.FICTIONAL_ACTIVE, '1')
  replaceAppDataCache(fictional)
  // Espelha na aba Demonstração e nos portais demo de todos os setores.
  await saveDemoAppDataAndWait(fictional)
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

  // Remove o espelho da aba Demonstração / portais demo.
  await wipeDemoAppDataStore()
}

export async function toggleFictionalDashboardSeed(): Promise<boolean> {
  if (isFictionalDashboardSeedActive()) {
    await deactivateFictionalDashboardSeed()
    return false
  }
  await activateFictionalDashboardSeed()
  return true
}
