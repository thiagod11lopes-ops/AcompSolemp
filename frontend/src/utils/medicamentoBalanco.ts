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

function buildExemploMovimentacoesDiarias(
  days: Date[],
): ListaMedicamentoMovimentacao[][] {
  /** Uma lista de movimentações por medicamento (3 lotes de exemplo). */
  const porMedicamento: ListaMedicamentoMovimentacao[][] = [[], [], []]
  const origensEntrada = ['Farmácia central', 'Compra PME', 'Devolução setor']
  const destinosSaida = ['Ambulatório', 'Pronto atendimento', 'Enfermaria', 'UTI']
  const responsaveis = ['Exemplo', 'Téc. Farmácia', 'Enf. Plantão']
  let seq = 0

  for (let i = 0; i < days.length; i += 1) {
    const day = days[i]
    const data = formatBrDate(day)
    const createdAt = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      9 + (i % 8),
      (i * 7) % 60,
      0,
    ).toISOString()

    // 2 movimentações/dia: 1 entrada + 1 saída (mês de 31 dias → 62 registros).
    const medEntrada = i % 3
    const medSaida = (i + 1) % 3
    const qtdEntrada = String(8 + (i % 12))
    const qtdSaida = String(3 + (i % 9))

    porMedicamento[medEntrada].push({
      id: `ex-mov-${++seq}`,
      tipo: 'entrada',
      qtd: qtdEntrada,
      data,
      origemDestino: origensEntrada[i % origensEntrada.length],
      responsavel: responsaveis[i % responsaveis.length],
      createdAt,
    })

    porMedicamento[medSaida].push({
      id: `ex-mov-${++seq}`,
      tipo: 'saida',
      qtd: qtdSaida,
      data,
      origemDestino: destinosSaida[i % destinosSaida.length],
      responsavel: responsaveis[(i + 1) % responsaveis.length],
      createdAt,
    })
  }

  return porMedicamento
}

/** Dados fictícios alinhados ao período selecionado, só para pré-visualização. */
export function createMedicamentoBalancoExemploInput(
  periodoTipo: BalancoPeriodoTipo,
  referencia: Date,
): MedicamentoBalancoInput {
  const ref = startOfDay(referencia)
  const periodDays = daysInBalancoPeriodo(periodoTipo, ref)
  const movPorMedicamento = buildExemploMovimentacoesDiarias(periodDays)

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
        movimentacoes: movPorMedicamento[0],
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
        movimentacoes: movPorMedicamento[1],
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
        movimentacoes: movPorMedicamento[2],
      },
    ],
  }

  // Lançamentos IMH espalhados pelo período (além das movimentações diárias).
  const imhSeedDays =
    periodoTipo === 'dia'
      ? [ref]
      : periodDays.filter((_, idx) => idx % Math.max(1, Math.floor(periodDays.length / 12)) === 0).slice(0, 12)

  const imhMedicamento: ImhMedicamentoFormData = {
    linhas: imhSeedDays.map((day, idx) => {
      const isAmox = idx % 2 === 1
      const qtd = isAmox ? 14 + (idx % 5) : 6 + (idx % 8)
      const unit = isAmox ? 4.9 : 2.5
      const total = qtd * unit
      const pct = idx % 3 === 0 ? 0.2 : 0
      return {
        id: `ex-imh-${idx + 1}`,
        data: formatBrDate(day),
        nip: `${10 + idx}.${1000 + idx}.${20 + idx}`,
        nome: `PACIENTE EXEMPLO ${String.fromCharCode(65 + (idx % 26))}`,
        itemPme: isAmox ? 'AMOXICILINA 500 MG CAP' : 'DIPIRONA 500 MG COMP',
        lote: isAmox ? 'L-EX02' : 'L-EX01',
        validade: isAmox ? validadeProxima : validadeOk,
        qtd: String(qtd),
        valorUnitario: isAmox ? 'R$ 4,90' : 'R$ 2,50',
        total: `R$ ${total.toFixed(2).replace('.', ',')}`,
        nipTitular: `${10 + idx}.${1000 + idx}.${20 + idx}`,
        postoGrad: ['CB', '1T', 'MN', 'SO'][idx % 4],
        vinculo: pct > 0 ? 'DEPENDENTE DIRETO' : 'TITULAR',
        pctIndenizar: pct > 0 ? '20%' : '0%',
        valorIndenizar: `R$ ${(total * pct).toFixed(2).replace('.', ',')}`,
        om: 'HNMD',
        unidadeFornecimento: isAmox ? 'CAP' : 'COMP',
        quantidadeAdquirida: String(qtd),
      }
    }),
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
    {
      id: 'ex-ped-3',
      numero: 'EX-2026-003',
      clinicaId: 'ex',
      empresaId: 'ex',
      materialId: 'ex',
      quantidade: 1,
      valor: 89.5,
      observacoes: '',
      paciente: null,
      dadosClinica: null,
      dataSolicitacao: iso(addDays(ref, periodoTipo === 'dia' ? 0 : -8)),
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
