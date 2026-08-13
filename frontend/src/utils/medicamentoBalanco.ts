import type {
  ImhMedicamentoFormData,
  ImhMedicamentoLinha,
  ListaMedicamentosFormData,
  ListaMedicamentoMovimentacao,
  ListaMedicamentosLinha,
  Pedido,
} from '@/types'
import { parseValorBrasileiro } from '@/utils/consumoMaterialOds'
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

/** Dados fictícios alinhados ao período selecionado, só para pré-visualização. */
export function createMedicamentoBalancoExemploInput(
  periodoTipo: BalancoPeriodoTipo,
  referencia: Date,
): MedicamentoBalancoInput {
  const ref = startOfDay(referencia)
  const d1 = formatBrDate(ref)
  const d2 = formatBrDate(addDays(ref, periodoTipo === 'dia' ? 0 : -2))
  const d3 = formatBrDate(addDays(ref, periodoTipo === 'dia' ? 0 : -5))
  const validadeOk = formatBrDate(addDays(ref, 180))
  const validadeProxima = formatBrDate(addDays(ref, 20))
  const validadeVencida = formatBrDate(addDays(ref, -10))

  const listaMedicamentos: ListaMedicamentosFormData = {
    linhas: [
      {
        id: 'ex-lista-1',
        neb: 'BR1000001',
        medicamento: 'DIPIRONA 500 MG COMP',
        lote: 'L-EX01',
        validade: validadeOk,
        uf: 'SE',
        qtd: '120',
        estoqueBaixo: '30',
        avisoValidadeDias: '30',
        precoReferencia: 'R$ 2,50',
        movimentacoes: [
          {
            id: 'ex-mov-1',
            tipo: 'entrada',
            qtd: '80',
            data: d1,
            origemDestino: 'Farmácia central',
            responsavel: 'Exemplo',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'ex-mov-2',
            tipo: 'saida',
            qtd: '25',
            data: d2,
            origemDestino: 'Ambulatório',
            responsavel: 'Exemplo',
            createdAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'ex-lista-2',
        neb: 'BR1000002',
        medicamento: 'AMOXICILINA 500 MG CAP',
        lote: 'L-EX02',
        validade: validadeProxima,
        uf: 'SE',
        qtd: '18',
        estoqueBaixo: '20',
        avisoValidadeDias: '45',
        precoReferencia: 'R$ 4,90',
        movimentacoes: [
          {
            id: 'ex-mov-3',
            tipo: 'entrada',
            qtd: '50',
            data: d3,
            origemDestino: 'Compra PME',
            responsavel: 'Exemplo',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'ex-mov-4',
            tipo: 'saida',
            qtd: '32',
            data: d1,
            origemDestino: 'Pronto atendimento',
            responsavel: 'Exemplo',
            createdAt: new Date().toISOString(),
          },
        ],
      },
      {
        id: 'ex-lista-3',
        neb: 'BR1000003',
        medicamento: 'LOSARTANA 50 MG COMP',
        lote: 'L-EX03',
        validade: validadeVencida,
        uf: 'SE',
        qtd: '0',
        estoqueBaixo: '10',
        avisoValidadeDias: '30',
        precoReferencia: 'R$ 1,80',
        movimentacoes: [],
      },
    ],
  }

  const imhMedicamento: ImhMedicamentoFormData = {
    linhas: [
      {
        id: 'ex-imh-1',
        data: d1,
        nip: '12.3456.78',
        nome: 'PACIENTE EXEMPLO A',
        itemPme: 'DIPIRONA 500 MG COMP',
        lote: 'L-EX01',
        validade: validadeOk,
        qtd: '10',
        valorUnitario: 'R$ 2,50',
        total: 'R$ 25,00',
        nipTitular: '12.3456.78',
        postoGrad: 'CB',
        vinculo: 'TITULAR',
        pctIndenizar: '0%',
        valorIndenizar: 'R$ 0,00',
        om: 'HNMD',
        unidadeFornecimento: 'COMP',
        quantidadeAdquirida: '10',
      },
      {
        id: 'ex-imh-2',
        data: d2,
        nip: '98.7654.32',
        nome: 'PACIENTE EXEMPLO B',
        itemPme: 'AMOXICILINA 500 MG CAP',
        lote: 'L-EX02',
        validade: validadeProxima,
        qtd: '21',
        valorUnitario: 'R$ 4,90',
        total: 'R$ 102,90',
        nipTitular: '11.2233.44',
        postoGrad: '1T',
        vinculo: 'DEPENDENTE DIRETO',
        pctIndenizar: '20%',
        valorIndenizar: 'R$ 20,58',
        om: 'HNMD',
        unidadeFornecimento: 'CAP',
        quantidadeAdquirida: '21',
      },
      {
        id: 'ex-imh-3',
        data: d3,
        nip: '55.6677.88',
        nome: 'PACIENTE EXEMPLO C',
        itemPme: 'DIPIRONA 500 MG COMP',
        lote: 'L-EX01',
        validade: validadeOk,
        qtd: '6',
        valorUnitario: 'R$ 2,50',
        total: 'R$ 15,00',
        nipTitular: '55.6677.88',
        postoGrad: 'MN',
        vinculo: 'TITULAR',
        pctIndenizar: '0%',
        valorIndenizar: 'R$ 0,00',
        om: 'HNMD',
        unidadeFornecimento: 'COMP',
        quantidadeAdquirida: '6',
      },
    ],
  }

  const iso = (d: Date) => {
    const x = startOfDay(d)
    return new Date(x.getFullYear(), x.getMonth(), x.getDate(), 12, 0, 0).toISOString()
  }

  const pedidos: Pedido[] = [
    {
      id: 'ex-ped-1',
      numero: 'EX-2026-001',
      clinicaId: 'ex',
      empresaId: 'ex',
      materialId: 'ex',
      quantidade: 1,
      valor: 128.9,
      observacoes: '',
      paciente: null,
      dadosClinica: null,
      dataSolicitacao: iso(ref),
      dataEntrega: null,
      etapaAtualId: 'ex',
      etapasAtivasIds: [],
      responsavelAtualId: null,
      concluido: false,
      etapasHistorico: [],
    },
    {
      id: 'ex-ped-2',
      numero: 'EX-2026-002',
      clinicaId: 'ex',
      empresaId: 'ex',
      materialId: 'ex',
      quantidade: 1,
      valor: 256.4,
      observacoes: '',
      paciente: null,
      dadosClinica: null,
      dataSolicitacao: iso(addDays(ref, periodoTipo === 'dia' ? 0 : -3)),
      dataEntrega: null,
      etapaAtualId: 'ex',
      etapasAtivasIds: [],
      responsavelAtualId: null,
      concluido: true,
      etapasHistorico: [],
    },
  ]

  return {
    listaMedicamentos,
    imhMedicamento,
    pedidos,
    periodoTipo,
    referencia: ref,
  }
}

export function formatBalancoQtd(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 3,
  }).format(value)
}
