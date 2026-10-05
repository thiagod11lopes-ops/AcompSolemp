import type {
  ImhMedicamentoFormData,
  ImhMedicamentoLinha,
  ListaMedicamentosFormData,
  ListaMedicamentoMovimentacao,
  ListaMedicamentosLinha,
  Pedido,
} from '@/types'
import { formatValorBrasileiro, parseValorBrasileiro } from '@/utils/consumoMaterialOds'
import { formatCurrency, formatDate } from '@/utils/format'
import {
  getListaMedEstoqueStatus,
  getListaMedValidadeStatus,
  parseListaMedDataToDate,
  parseListaMedQtdNumber,
} from '@/utils/listaMedicamentosForm'

export type BalancoPeriodoTipo = 'dia' | 'mes' | 'ano'

export interface MedicamentoBalancoInput {
  listaMedicamentos: ListaMedicamentosFormData
  imhMedicamento: ImhMedicamentoFormData
  pedidos: Pedido[]
  periodoTipo: BalancoPeriodoTipo
  referencia: Date
}

export interface MedicamentoBalancoImhResumo {
  lancamentos: number
  qtdTotal: number
  valorTotal: number
  valorIndenizar: number
  topMedicamentos: { nome: string; qtd: number; valor: number }[]
}

export interface MedicamentoBalancoEstoqueResumo {
  entradas: number
  saidas: number
  saldoLiquido: number
  movimentacoes: number
}

export interface MedicamentoBalancoAlertas {
  estoqueBaixo: number
  estoqueZerado: number
  validadeVencida: number
  validadeProxima: number
  valorEstoqueEstimado: number
  itensComEstoque: number
}

export interface MedicamentoBalancoPedidosResumo {
  total: number
  emAndamento: number
  concluidos: number
  valorTotal: number
}

export interface MedicamentoBalancoResult {
  periodoLabel: string
  imh: MedicamentoBalancoImhResumo
  estoqueMov: MedicamentoBalancoEstoqueResumo
  alertas: MedicamentoBalancoAlertas
  pedidos: MedicamentoBalancoPedidosResumo
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function dateMatchesBalancoPeriodo(
  date: Date,
  tipo: BalancoPeriodoTipo,
  referencia: Date,
): boolean {
  const a = startOfDay(date)
  const b = startOfDay(referencia)
  if (tipo === 'dia') return a.getTime() === b.getTime()
  if (tipo === 'mes') {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
  }
  return a.getFullYear() === b.getFullYear()
}

export function formatBalancoPeriodoLabel(tipo: BalancoPeriodoTipo, referencia: Date): string {
  const d = startOfDay(referencia)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  if (tipo === 'dia') return `${dd}/${mm}/${yyyy}`
  if (tipo === 'mes') {
    const meses = [
      'janeiro',
      'fevereiro',
      'março',
      'abril',
      'maio',
      'junho',
      'julho',
      'agosto',
      'setembro',
      'outubro',
      'novembro',
      'dezembro',
    ]
    return `${meses[d.getMonth()]} de ${yyyy}`
  }
  return String(yyyy)
}

function parseIsoOrBrDate(raw: string): Date | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const br = parseListaMedDataToDate(trimmed)
  if (br) return br
  const iso = new Date(trimmed)
  if (Number.isNaN(iso.getTime())) return null
  return startOfDay(iso)
}

function summarizeImh(
  linhas: ImhMedicamentoLinha[],
  tipo: BalancoPeriodoTipo,
  referencia: Date,
): MedicamentoBalancoImhResumo {
  const byNome = new Map<string, { qtd: number; valor: number }>()
  let lancamentos = 0
  let qtdTotal = 0
  let valorTotal = 0
  let valorIndenizar = 0

  for (const linha of linhas) {
    const data = parseIsoOrBrDate(linha.data)
    if (!data || !dateMatchesBalancoPeriodo(data, tipo, referencia)) continue
    lancamentos += 1
    const qtd = parseListaMedQtdNumber(linha.qtd || '0')
    const total = parseValorBrasileiro(linha.total)
    const indenizar = parseValorBrasileiro(linha.valorIndenizar)
    qtdTotal += qtd
    valorTotal += total
    valorIndenizar += indenizar
    const nome = linha.itemPme.trim() || 'Sem descrição'
    const prev = byNome.get(nome) ?? { qtd: 0, valor: 0 }
    byNome.set(nome, { qtd: prev.qtd + qtd, valor: prev.valor + total })
  }

  const topMedicamentos = [...byNome.entries()]
    .map(([nome, v]) => ({ nome, qtd: v.qtd, valor: v.valor }))
    .sort((a, b) => b.valor - a.valor || b.qtd - a.qtd)
    .slice(0, 8)

  return { lancamentos, qtdTotal, valorTotal, valorIndenizar, topMedicamentos }
}

function summarizeMovimentacoes(
  linhas: ListaMedicamentosLinha[],
  tipo: BalancoPeriodoTipo,
  referencia: Date,
): MedicamentoBalancoEstoqueResumo {
  let entradas = 0
  let saidas = 0
  let movimentacoes = 0

  for (const linha of linhas) {
    const movs: ListaMedicamentoMovimentacao[] = linha.movimentacoes ?? []
    for (const mov of movs) {
      const data = parseIsoOrBrDate(mov.data)
      if (!data || !dateMatchesBalancoPeriodo(data, tipo, referencia)) continue
      movimentacoes += 1
      const qtd = parseListaMedQtdNumber(mov.qtd)
      if (mov.tipo === 'entrada') entradas += qtd
      else saidas += qtd
    }
  }

  return {
    entradas,
    saidas,
    saldoLiquido: entradas - saidas,
    movimentacoes,
  }
}

function summarizeAlertas(linhas: ListaMedicamentosLinha[]): MedicamentoBalancoAlertas {
  let estoqueBaixo = 0
  let estoqueZerado = 0
  let validadeVencida = 0
  let validadeProxima = 0
  let valorEstoqueEstimado = 0
  let itensComEstoque = 0

  for (const linha of linhas) {
    if (!linha) continue
    const statusEstoque = getListaMedEstoqueStatus(linha)
    if (statusEstoque === 'baixo') estoqueBaixo += 1
    if (statusEstoque === 'zerado') estoqueZerado += 1
    const statusValidade = getListaMedValidadeStatus(linha)
    if (statusValidade === 'vencido') validadeVencida += 1
    if (statusValidade === 'proximo') validadeProxima += 1
    const qtd = parseListaMedQtdNumber(String(linha.qtd ?? ''))
    if (qtd > 0) {
      itensComEstoque += 1
      valorEstoqueEstimado += qtd * parseValorBrasileiro(String(linha.precoReferencia ?? ''))
    }
  }

  return {
    estoqueBaixo,
    estoqueZerado,
    validadeVencida,
    validadeProxima,
    valorEstoqueEstimado,
    itensComEstoque,
  }
}

function summarizePedidos(
  pedidos: Pedido[],
  tipo: BalancoPeriodoTipo,
  referencia: Date,
): MedicamentoBalancoPedidosResumo {
  let total = 0
  let emAndamento = 0
  let concluidos = 0
  let valorTotal = 0

  for (const pedido of pedidos) {
    const data = parseIsoOrBrDate(pedido.dataSolicitacao)
    if (!data || !dateMatchesBalancoPeriodo(data, tipo, referencia)) continue
    total += 1
    valorTotal += Number.isFinite(pedido.valor) ? pedido.valor : 0
    if (pedido.concluido) concluidos += 1
    else emAndamento += 1
  }

  return { total, emAndamento, concluidos, valorTotal }
}

export function buildMedicamentoBalanco(input: MedicamentoBalancoInput): MedicamentoBalancoResult {
  const { listaMedicamentos, imhMedicamento, pedidos, periodoTipo, referencia } = input
  return {
    periodoLabel: formatBalancoPeriodoLabel(periodoTipo, referencia),
    imh: summarizeImh(imhMedicamento.linhas, periodoTipo, referencia),
    estoqueMov: summarizeMovimentacoes(listaMedicamentos.linhas, periodoTipo, referencia),
    alertas: summarizeAlertas(listaMedicamentos.linhas),
    pedidos: summarizePedidos(pedidos, periodoTipo, referencia),
  }
}

export interface MedicamentoPmeEvolucaoPoint {
  ponto: string
  consumo: number
  indenizar: number
  quantidade: number
}

export interface MedicamentoPmeChartData {
  evolucao: MedicamentoPmeEvolucaoPoint[]
  topMedicamentos: { nome: string; valor: number; qtd: number }[]
  alertas: { nome: string; valor: number }[]
  fluxoEstoque: { nome: string; valor: number }[]
}

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function seedEvolucao(
  tipo: BalancoPeriodoTipo,
  referencia: Date,
): Map<number, MedicamentoPmeEvolucaoPoint> {
  const buckets = new Map<number, MedicamentoPmeEvolucaoPoint>()
  if (tipo === 'ano') {
    const year = startOfDay(referencia).getFullYear()
    for (let month = 0; month < 12; month += 1) {
      const time = new Date(year, month, 1).getTime()
      buckets.set(time, {
        ponto: MESES_CURTOS[month],
        consumo: 0,
        indenizar: 0,
        quantidade: 0,
      })
    }
    return buckets
  }

  for (const day of daysInBalancoPeriodo(tipo, referencia)) {
    const time = startOfDay(day).getTime()
    const dd = String(day.getDate()).padStart(2, '0')
    const mm = String(day.getMonth() + 1).padStart(2, '0')
    buckets.set(time, {
      ponto: `${dd}/${mm}`,
      consumo: 0,
      indenizar: 0,
      quantidade: 0,
    })
  }
  return buckets
}

function evolucaoKey(date: Date, tipo: BalancoPeriodoTipo): number {
  const day = startOfDay(date)
  if (tipo === 'ano') return new Date(day.getFullYear(), day.getMonth(), 1).getTime()
  return day.getTime()
}

/** Séries reais da IMH PME e do estoque, no período escolhido. */
export function buildMedicamentoPmeChartData(
  input: MedicamentoBalancoInput,
): MedicamentoPmeChartData {
  const { listaMedicamentos, imhMedicamento, periodoTipo, referencia } = input
  const imh = summarizeImh(imhMedicamento.linhas, periodoTipo, referencia)
  const estoque = summarizeMovimentacoes(listaMedicamentos.linhas, periodoTipo, referencia)
  const alertas = summarizeAlertas(listaMedicamentos.linhas)
  const evolucao = seedEvolucao(periodoTipo, referencia)

  for (const linha of imhMedicamento.linhas) {
    const data = parseIsoOrBrDate(linha.data)
    if (!data || !dateMatchesBalancoPeriodo(data, periodoTipo, referencia)) continue
    const bucket = evolucao.get(evolucaoKey(data, periodoTipo))
    if (!bucket) continue
    bucket.consumo += parseValorBrasileiro(linha.total)
    bucket.indenizar += parseValorBrasileiro(linha.valorIndenizar)
    bucket.quantidade += parseListaMedQtdNumber(linha.qtd || '0')
  }

  return {
    evolucao: [...evolucao.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, point]) => point),
    topMedicamentos: imh.topMedicamentos.map((item) => ({
      nome: item.nome.length > 22 ? `${item.nome.slice(0, 20)}…` : item.nome,
      valor: item.valor,
      qtd: item.qtd,
    })),
    alertas: [
      { nome: 'Estoque baixo', valor: alertas.estoqueBaixo },
      { nome: 'Zerado', valor: alertas.estoqueZerado },
      { nome: 'Vencido', valor: alertas.validadeVencida },
      { nome: 'Próximo', valor: alertas.validadeProxima },
    ],
    fluxoEstoque: [
      { nome: 'Entradas', valor: estoque.entradas },
      { nome: 'Saídas', valor: estoque.saidas },
    ],
  }
}

function formatBrDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return startOfDay(d)
}

function daysInBalancoPeriodo(tipo: BalancoPeriodoTipo, referencia: Date): Date[] {
  const ref = startOfDay(referencia)
  if (tipo === 'dia') return [ref]

  if (tipo === 'mes') {
    const year = ref.getFullYear()
    const month = ref.getMonth()
    const lastDay = new Date(year, month + 1, 0).getDate()
    return Array.from({ length: lastDay }, (_, i) => startOfDay(new Date(year, month, i + 1)))
  }

  const year = ref.getFullYear()
  const days: Date[] = []
  for (let month = 0; month < 12; month += 1) {
    const lastDay = new Date(year, month + 1, 0).getDate()
    for (let day = 1; day <= lastDay; day += 1) {
      days.push(startOfDay(new Date(year, month, day)))
    }
  }
  return days
}

const EXEMPLO_ITENS_PME = [
  { nome: 'ADALIMUMABE 40 MG', peso: 1.45, preco: 1850 },
  { nome: 'INFLIXIMABE 100 MG', peso: 1.2, preco: 2100 },
  { nome: 'RITUXIMABE 500 MG', peso: 1.05, preco: 3200 },
  { nome: 'ETANERCEPTE 50 MG', peso: 0.9, preco: 980 },
  { nome: 'TOCILIZUMABE 80 MG', peso: 0.75, preco: 1450 },
  { nome: 'DUPILUMABE 300 MG', peso: 0.62, preco: 2750 },
] as const

function consumoDiaExemplo(index: number, total: number): number {
  const t = total <= 1 ? 0.55 : index / (total - 1)
  const base = 4800
  const mes = Math.sin(t * Math.PI * 2) * 700
  const semana = Math.sin(t * Math.PI * 6) * 280
  return Math.round(base + mes + semana)
}

function linhasPorDiaExemplo(periodoTipo: BalancoPeriodoTipo): number {
  if (periodoTipo === 'dia') return 16
  if (periodoTipo === 'ano') return 2
  return 8
}

/** Dados fictícios alinhados ao período selecionado, só para pré-visualização. */
export function createMedicamentoBalancoExemploInput(
  periodoTipo: BalancoPeriodoTipo,
  referencia: Date,
  opcoes?: { linhasPorDia?: number },
): MedicamentoBalancoInput {
  const ref = startOfDay(referencia)
  const periodDays = daysInBalancoPeriodo(periodoTipo, ref)
  const linhasPorDia = Math.max(1, opcoes?.linhasPorDia ?? linhasPorDiaExemplo(periodoTipo))
  const validadeOk = formatBrDate(addDays(ref, 180))
  const validadeProxima = formatBrDate(addDays(ref, 18))
  const validadeVencida = formatBrDate(addDays(ref, -12))

  const passosMov = Math.min(10, Math.max(1, Math.round(periodDays.length / 3)))
  const movDias = Array.from({ length: passosMov }, (_, i) => {
    const idx = Math.min(
      periodDays.length - 1,
      Math.round((i * (periodDays.length - 1)) / Math.max(passosMov - 1, 1)),
    )
    return periodDays[idx]
  })

  const listaMedicamentos: ListaMedicamentosFormData = {
    linhas: [...EXEMPLO_ITENS_PME.flatMap((item, index) => {
      const status =
        index < 2 ? 'baixo' : index === 2 ? 'zerado' : index === 3 ? 'vencido' : index === 4 ? 'proximo' : 'ok'
      const qtd = status === 'zerado' ? '0' : status === 'baixo' ? '12' : String(40 + index * 8)
      const estoqueBaixo = status === 'baixo' ? '30' : '8'
      const validade =
        status === 'vencido' ? validadeVencida : status === 'proximo' ? validadeProxima : validadeOk
      const movimentacoes: ListaMedicamentoMovimentacao[] =
        status === 'ok'
          ? movDias.flatMap((day, step) => {
              const data = formatBrDate(day)
              const createdAt = new Date(
                day.getFullYear(),
                day.getMonth(),
                day.getDate(),
                10,
                0,
                0,
              ).toISOString()
              return [
                {
                  id: `ex-mov-${index}-e-${step}`,
                  tipo: 'entrada' as const,
                  qtd: String(36 + ((index + step) % 5) * 4),
                  data,
                  origemDestino: 'Compra PME',
                  responsavel: 'Farmácia',
                  createdAt,
                },
                {
                  id: `ex-mov-${index}-s-${step}`,
                  tipo: 'saida' as const,
                  qtd: String(22 + ((index + step) % 4) * 3),
                  data,
                  origemDestino: 'Ambulatório',
                  responsavel: 'Farmácia',
                  createdAt,
                },
              ]
            })
          : []
      return [
        {
          id: `ex-lista-${index + 1}`,
          neb: `BR26${String(1000 + index)}`,
          medicamento: item.nome,
          lote: `L-PME-${index + 1}`,
          validade,
          uf: 'FA',
          qtd,
          estoqueBaixo,
          avisoValidadeDias: '30',
          precoReferencia: formatValorBrasileiro(item.preco),
          movimentacoes,
        },
      ]
    }),
    ...Array.from({ length: 22 }, (_, i) => {
      const kind = i < 6 ? 'baixo' : i < 11 ? 'zerado' : i < 17 ? 'vencido' : 'proximo'
      return {
        id: `ex-lista-extra-${i + 1}`,
        neb: `BR26${String(2000 + i)}`,
        medicamento: `LOTE PME ${kind.toUpperCase()} ${i + 1}`,
        lote: `L-EX-${i + 1}`,
        validade: kind === 'vencido' ? validadeVencida : kind === 'proximo' ? validadeProxima : validadeOk,
        uf: 'FA',
        qtd: kind === 'zerado' ? '0' : kind === 'baixo' ? '6' : '24',
        estoqueBaixo: kind === 'baixo' ? '20' : '5',
        avisoValidadeDias: '30',
        precoReferencia: formatValorBrasileiro(420 + i * 15),
        movimentacoes: [],
      }
    }),
    ],
  }

  const imhMedicamento: ImhMedicamentoFormData = {
    linhas: periodDays.flatMap((day, dayIndex) => {
      const consumoDia = consumoDiaExemplo(dayIndex, periodDays.length)
      return Array.from({ length: linhasPorDia }, (_, slot) => {
        const item = EXEMPLO_ITENS_PME[(dayIndex + slot) % EXEMPLO_ITENS_PME.length]
        const fatia = (slot + 1) / ((linhasPorDia * (linhasPorDia + 1)) / 2)
        const total = Math.round(consumoDia * fatia * item.peso * 10) / 10
        const qtd = 4 + ((dayIndex * 3 + slot) % 5)
        const pct = [20, 30, 50][(dayIndex + slot) % 3]
        const indenizar = Math.round(total * (pct / 100) * 100) / 100
        return {
          id: `ex-imh-${dayIndex + 1}-${slot + 1}`,
          data: formatBrDate(day),
          nip: `${80 + (dayIndex % 90)}.${2000 + dayIndex}.${10 + slot}`,
          nome: `PACIENTE PME ${dayIndex + 1}`,
          itemPme: item.nome,
          lote: `L-PME-${(dayIndex % 6) + 1}`,
          validade: validadeOk,
          qtd: String(qtd),
          valorUnitario: formatValorBrasileiro(total / qtd),
          total: formatValorBrasileiro(total),
          nipTitular: `${80 + (dayIndex % 90)}.${2000 + dayIndex}.${10 + slot}`,
          postoGrad: ['CB', '1T', 'MN', 'SO'][dayIndex % 4],
          vinculo: pct >= 50 ? 'DEPENDENTE DIRETO' : 'TITULAR',
          pctIndenizar: `${pct}%`,
          valorIndenizar: formatValorBrasileiro(indenizar),
          om: 'HNMD',
          unidadeFornecimento: 'FA',
          quantidadeAdquirida: String(qtd),
          qtdFornecidaOse: '',
          maneiraFornecimento: slot === 0 ? 'PELA OMH' : 'POR OSE',
        }
      })
    }),
  }

  const iso = (d: Date) => {
    const x = startOfDay(d)
    return new Date(x.getFullYear(), x.getMonth(), x.getDate(), 12, 0, 0).toISOString()
  }

  const justificativasCorrecao = [
    'Ajuste de lote na planilha PME.',
    'Quantidade divergente do estoque.',
    'Validade do lote não confere.',
    'Paciente ou vínculo incompleto.',
  ]
  const pedidos: Pedido[] = Array.from({ length: 8 }, (_, i) => ({
    id: `ex-ped-${i + 1}`,
    numero: `PME-CORR-${String(i + 1).padStart(3, '0')}`,
    clinicaId: 'ex',
    empresaId: 'ex',
    materialId: 'ex',
    quantidade: 1,
    valor: 80 + i * 35,
    observacoes: '',
    paciente: null,
    dadosClinica: null,
    dataSolicitacao: iso(addDays(ref, periodoTipo === 'dia' ? 0 : -i)),
    dataEntrega: null,
    etapaAtualId: 'ex',
    etapasAtivasIds: [],
    responsavelAtualId: null,
    concluido: false,
    etapasHistorico: [],
    planilhaDevolvidaParaChave: 'SOLICITACAO',
    planilhaDevolvidaEm: iso(addDays(ref, periodoTipo === 'dia' ? 0 : -i)),
    planilhaDevolvidaJustificativa: justificativasCorrecao[i % justificativasCorrecao.length],
  }))

  return {
    listaMedicamentos,
    imhMedicamento,
    pedidos,
    periodoTipo,
    referencia: ref,
  }
}

const DEMO_DASH_PREFIX = 'demo-pme-dash-v2-'
const DEMO_LISTA_PREFIX = 'demo-lista-v2-'

/** Planilha PME do Medicamento Exemplo: mês atual com mais de 200 lançamentos e alertas de estoque. */
export function createDemoMedicamentoDashboardConteudo(now = new Date()): {
  listaMedicamentos: ListaMedicamentosFormData
  imhMedicamento: ImhMedicamentoFormData
} {
  const atual = createMedicamentoBalancoExemploInput('mes', now)
  const linhas: ImhMedicamentoLinha[] = atual.imhMedicamento.linhas.map((linha, index) => ({
    ...linha,
    id: `${DEMO_DASH_PREFIX}atual-${index + 1}`,
  }))

  for (let month = 0; month < now.getMonth(); month += 1) {
    const ref = new Date(now.getFullYear(), month, 15)
    const mes = createMedicamentoBalancoExemploInput('mes', ref, { linhasPorDia: 1 })
    mes.imhMedicamento.linhas
      .filter((_, index) => index % 4 === 0)
      .slice(0, 10)
      .forEach((linha, index) => {
        linhas.push({ ...linha, id: `${DEMO_DASH_PREFIX}m${month}-${index + 1}` })
      })
  }

  return {
    listaMedicamentos: {
      linhas: atual.listaMedicamentos.linhas.map((linha, index) => ({
        ...linha,
        id: `${DEMO_LISTA_PREFIX}${index + 1}`,
        movimentacoes: (linha.movimentacoes ?? []).map((mov, movIndex) => ({
          ...mov,
          id: `${DEMO_LISTA_PREFIX}${index + 1}-mov-${movIndex + 1}`,
        })),
      })),
    },
    imhMedicamento: {
      linhas,
      finalizedImhIds: linhas.map((linha) => linha.id),
      devolvidosImhIds: [],
    },
  }
}

export type PmeCardDetalheId =
  | 'pacientes'
  | 'estoque-baixo'
  | 'estoque-zerado'
  | 'validade-vencida'
  | 'validade-proxima'
  | 'planilhas'
  | 'lancamentos'
  | 'quantidade'
  | 'consumido'
  | 'indenizar'

export interface PmePacienteDetalhe {
  nome: string
  nipUsuario: string
  postoGradTitular: string
  vinculo: string
}

export interface PmeCardDetalhe {
  id: PmeCardDetalheId
  titulo: string
  descricao: string
  colunas: string[]
  linhas: string[][]
}

const NOMES_EXEMPLO = [
  'ANA BEATRIZ COSTA',
  'CARLOS EDUARDO NUNES',
  'MARIA FERNANDA ALVES',
  'JOÃO PEDRO MARTINS',
  'PATRICIA HELENA SOUZA',
  'ROBERTO SILVA FREITAS',
  'CAMILA RODRIGUES MELO',
  'FELIPE AUGUSTO DIAS',
]
const POSTOS_EXEMPLO = ['CB', 'MN', '1T', 'SO', 'CF']
const VINCULOS_EXEMPLO = ['TITULAR', 'DEPENDENTE DIRETO', 'DEPENDENTE INDIRETO']

export function createPacientesAtendidosExemplo(total = 186): PmePacienteDetalhe[] {
  return Array.from({ length: total }, (_, index) => ({
    nome: `${NOMES_EXEMPLO[index % NOMES_EXEMPLO.length]} ${index + 1}`,
    nipUsuario: `${String(10 + (index % 80)).padStart(2, '0')}.${1000 + index}.${String(10 + (index % 90)).padStart(2, '0')}`,
    postoGradTitular: POSTOS_EXEMPLO[index % POSTOS_EXEMPLO.length],
    vinculo: VINCULOS_EXEMPLO[index % VINCULOS_EXEMPLO.length],
  }))
}

function linhasImhNoPeriodo(input: MedicamentoBalancoInput): ImhMedicamentoLinha[] {
  return input.imhMedicamento.linhas
    .filter((linha) => {
      const data = parseIsoOrBrDate(linha.data)
      return Boolean(data && dateMatchesBalancoPeriodo(data, input.periodoTipo, input.referencia))
    })
    .sort((a, b) => (parseIsoOrBrDate(b.data)?.getTime() ?? 0) - (parseIsoOrBrDate(a.data)?.getTime() ?? 0))
}

function estoquePorStatus(
  linhas: ListaMedicamentosLinha[],
  status: 'baixo' | 'zerado',
): ListaMedicamentosLinha[] {
  return linhas.filter((linha) => getListaMedEstoqueStatus(linha) === status)
}

function validadePorStatus(
  linhas: ListaMedicamentosLinha[],
  status: 'vencido' | 'proximo',
): ListaMedicamentosLinha[] {
  return linhas.filter((linha) => getListaMedValidadeStatus(linha) === status)
}

/** Listas que explicam cada card do dashboard e do balanço. */
export function buildPmeCardDetalhes(
  input: MedicamentoBalancoInput,
  pacientes: PmePacienteDetalhe[],
): PmeCardDetalhe[] {
  const periodo = formatBalancoPeriodoLabel(input.periodoTipo, input.referencia)
  const imh = linhasImhNoPeriodo(input)
  const lista = input.listaMedicamentos.linhas
  const correcoes = input.pedidos.filter((pedido) => pedido.planilhaDevolvidaParaChave === 'SOLICITACAO')

  const linhaImh = (linha: ImhMedicamentoLinha, extra: string[]) => [
    linha.data || '—',
    linha.nome || '—',
    linha.itemPme || '—',
    formatBalancoQtd(parseListaMedQtdNumber(linha.qtd || '0')),
    ...extra,
  ]

  return [
    {
      id: 'pacientes',
      titulo: 'Pacientes atendidos',
      descricao: 'Pacientes do cadastro da farmácia PME.',
      colunas: ['Nome', 'NIP', 'Posto/Grad', 'Vínculo'],
      linhas: pacientes.map((paciente) => [
        paciente.nome || '—',
        paciente.nipUsuario || '—',
        paciente.postoGradTitular || '—',
        paciente.vinculo || '—',
      ]),
    },
    {
      id: 'estoque-baixo',
      titulo: 'Estoque baixo',
      descricao: 'Lotes com quantidade igual ou abaixo do limite definido.',
      colunas: ['Medicamento', 'Lote', 'Qtd', 'Limite', 'Validade'],
      linhas: estoquePorStatus(lista, 'baixo').map((linha) => [
        linha.medicamento || '—',
        linha.lote || '—',
        linha.qtd || '0',
        linha.estoqueBaixo || '—',
        linha.validade || '—',
      ]),
    },
    {
      id: 'estoque-zerado',
      titulo: 'Estoque zerado',
      descricao: 'Lotes sem saldo na lista PME.',
      colunas: ['Medicamento', 'Lote', 'Qtd', 'Validade'],
      linhas: estoquePorStatus(lista, 'zerado').map((linha) => [
        linha.medicamento || '—',
        linha.lote || '—',
        linha.qtd || '0',
        linha.validade || '—',
      ]),
    },
    {
      id: 'validade-vencida',
      titulo: 'Validade vencida',
      descricao: 'Lotes cuja validade já passou.',
      colunas: ['Medicamento', 'Lote', 'Validade', 'Qtd'],
      linhas: validadePorStatus(lista, 'vencido').map((linha) => [
        linha.medicamento || '—',
        linha.lote || '—',
        linha.validade || '—',
        linha.qtd || '0',
      ]),
    },
    {
      id: 'validade-proxima',
      titulo: 'Validade próxima',
      descricao: 'Lotes dentro do prazo de aviso de cada item.',
      colunas: ['Medicamento', 'Lote', 'Validade', 'Qtd'],
      linhas: validadePorStatus(lista, 'proximo').map((linha) => [
        linha.medicamento || '—',
        linha.lote || '—',
        linha.validade || '—',
        linha.qtd || '0',
      ]),
    },
    {
      id: 'planilhas',
      titulo: 'Planilhas em correção',
      descricao: 'Planilhas PME devolvidas para a solicitação corrigir.',
      colunas: ['Número', 'Devolvida em', 'Justificativa'],
      linhas: correcoes.map((pedido) => [
        pedido.numero || '—',
        formatDate(pedido.planilhaDevolvidaEm || pedido.dataSolicitacao),
        pedido.planilhaDevolvidaJustificativa?.trim() || '—',
      ]),
    },
    {
      id: 'lancamentos',
      titulo: 'Lançamentos',
      descricao: `Linhas da IMH PME em ${periodo}.`,
      colunas: ['Data', 'Paciente', 'Item', 'Qtd', 'Total'],
      linhas: imh.map((linha) => linhaImh(linha, [formatCurrency(parseValorBrasileiro(linha.total))])),
    },
    {
      id: 'quantidade',
      titulo: 'Qtd. fornecida',
      descricao: `Quantidade somada das linhas da IMH PME em ${periodo}.`,
      colunas: ['Data', 'Paciente', 'Item', 'Qtd'],
      linhas: [...imh]
        .sort(
          (a, b) =>
            parseListaMedQtdNumber(b.qtd || '0') - parseListaMedQtdNumber(a.qtd || '0'),
        )
        .map((linha) => linhaImh(linha, []).slice(0, 4)),
    },
    {
      id: 'consumido',
      titulo: 'Valor consumido',
      descricao: `Soma do total das linhas da IMH PME em ${periodo}.`,
      colunas: ['Data', 'Paciente', 'Item', 'Qtd', 'Total'],
      linhas: [...imh]
        .sort((a, b) => parseValorBrasileiro(b.total) - parseValorBrasileiro(a.total))
        .map((linha) => linhaImh(linha, [formatCurrency(parseValorBrasileiro(linha.total))])),
    },
    {
      id: 'indenizar',
      titulo: 'A indenizar',
      descricao: `Soma do valor a indenizar das linhas da IMH PME em ${periodo}.`,
      colunas: ['Data', 'Paciente', 'Item', '%', 'A indenizar'],
      linhas: [...imh]
        .sort(
          (a, b) => parseValorBrasileiro(b.valorIndenizar) - parseValorBrasileiro(a.valorIndenizar),
        )
        .map((linha) => [
          linha.data || '—',
          linha.nome || '—',
          linha.itemPme || '—',
          linha.pctIndenizar || '—',
          formatCurrency(parseValorBrasileiro(linha.valorIndenizar)),
        ]),
    },
  ]
}

export function formatBalancoQtd(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 3,
  }).format(value)
}

export interface MedicamentoBalancoChartBundles {
  kpis: { key: string; label: string; value: number; format: 'qtd' | 'moeda' | 'int' }[]
  topMedicamentos: { nome: string; nomeCurto: string; qtd: number; valor: number }[]
  estoqueMov: { nome: string; valor: number; fill: string }[]
  valoresImh: { nome: string; valor: number }[]
  alertas: { nome: string; valor: number; fill: string }[]
  pedidos: { nome: string; valor: number; fill: string }[]
  radialPedidos: { nome: string; valor: number; fill: string }[]
  areaTendencia: { ponto: string; consumo: number; indenizar: number; entradas: number; saidas: number }[]
}

/** Séries prontas para os gráficos do Balanço Geral. */
export function buildMedicamentoBalancoChartBundles(
  balanco: MedicamentoBalancoResult,
): MedicamentoBalancoChartBundles {
  const topMedicamentos = balanco.imh.topMedicamentos.map((item) => ({
    nome: item.nome,
    nomeCurto: item.nome.length > 22 ? `${item.nome.slice(0, 20)}…` : item.nome,
    qtd: item.qtd,
    valor: item.valor,
  }))

  const estoqueMov = [
    { nome: 'Entradas', valor: balanco.estoqueMov.entradas, fill: '#22C55E' },
    { nome: 'Saídas', valor: balanco.estoqueMov.saidas, fill: '#F97316' },
    {
      nome: 'Saldo',
      valor: Math.abs(balanco.estoqueMov.saldoLiquido),
      fill: balanco.estoqueMov.saldoLiquido >= 0 ? '#3B82F6' : '#EF4444',
    },
  ]

  const valoresImh = [
    { nome: 'Valor total', valor: balanco.imh.valorTotal },
    { nome: 'A indenizar', valor: balanco.imh.valorIndenizar },
  ]

  const alertas = [
    { nome: 'Estoque baixo', valor: balanco.alertas.estoqueBaixo, fill: '#F97316' },
    { nome: 'Zerado', valor: balanco.alertas.estoqueZerado, fill: '#EF4444' },
    { nome: 'Vencido', valor: balanco.alertas.validadeVencida, fill: '#BE123C' },
    { nome: 'Próximo', valor: balanco.alertas.validadeProxima, fill: '#F59E0B' },
  ].filter((item) => item.valor > 0)

  const pedidos = [
    { nome: 'Em andamento', valor: balanco.pedidos.emAndamento, fill: '#3B82F6' },
    { nome: 'Concluídos', valor: balanco.pedidos.concluidos, fill: '#22C55E' },
  ]

  const maxPedidos = Math.max(balanco.pedidos.total, 1)
  const radialPedidos = [
    {
      nome: 'Andamento',
      valor: Math.round((balanco.pedidos.emAndamento / maxPedidos) * 100),
      fill: '#3B82F6',
    },
    {
      nome: 'Concluídos',
      valor: Math.round((balanco.pedidos.concluidos / maxPedidos) * 100),
      fill: '#22C55E',
    },
  ]

  // Mini tendência sintética a partir dos totais (visual moderno; escala proporcional).
  const c = Math.max(balanco.imh.valorTotal, 1)
  const i = Math.max(balanco.imh.valorIndenizar, 0)
  const e = Math.max(balanco.estoqueMov.entradas, 0)
  const s = Math.max(balanco.estoqueMov.saidas, 0)
  const areaTendencia = [
    { ponto: 'Início', consumo: c * 0.35, indenizar: i * 0.25, entradas: e * 0.4, saidas: s * 0.3 },
    { ponto: 'Meio', consumo: c * 0.7, indenizar: i * 0.55, entradas: e * 0.75, saidas: s * 0.65 },
    { ponto: 'Atual', consumo: c, indenizar: i, entradas: e, saidas: s },
  ]

  const kpis: MedicamentoBalancoChartBundles['kpis'] = [
    { key: 'lanc', label: 'Lançamentos IMH', value: balanco.imh.lancamentos, format: 'int' },
    { key: 'qtd', label: 'QTD consumida', value: balanco.imh.qtdTotal, format: 'qtd' },
    { key: 'valor', label: 'Valor total', value: balanco.imh.valorTotal, format: 'moeda' },
    { key: 'inden', label: 'A indenizar', value: balanco.imh.valorIndenizar, format: 'moeda' },
    { key: 'mov', label: 'Movimentações', value: balanco.estoqueMov.movimentacoes, format: 'int' },
    { key: 'ped', label: 'Pedidos', value: balanco.pedidos.total, format: 'int' },
    {
      key: 'est',
      label: 'Estoque estimado',
      value: balanco.alertas.valorEstoqueEstimado,
      format: 'moeda',
    },
    {
      key: 'itens',
      label: 'Itens com estoque',
      value: balanco.alertas.itensComEstoque,
      format: 'int',
    },
  ]

  return {
    kpis,
    topMedicamentos,
    estoqueMov,
    valoresImh,
    alertas:
      alertas.length > 0
        ? alertas
        : [{ nome: 'Sem alertas', valor: 1, fill: '#94A3B8' }],
    pedidos,
    radialPedidos,
    areaTendencia,
  }
}
